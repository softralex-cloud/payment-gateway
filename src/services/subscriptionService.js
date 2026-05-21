const { v4: uuidv4 } = require('uuid');
const PaymentService = require('./paymentService');
const TronService = require('./tronService');
const moment = require('moment');

class SubscriptionService {
  /**
   * Create new subscription
   */
  static async createSubscription(subscriptionData) {
    try {
      // Process first payment immediately
      const paymentResult = await PaymentService.processPayment({
        user_id: subscriptionData.user_id,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency || 'USD',
        card: subscriptionData.card,
        billing_address: subscriptionData.billing_address,
        description: `Subscription: ${subscriptionData.plan_id}`,
        metadata: {
          plan_id: subscriptionData.plan_id,
          billing_cycle: subscriptionData.billing_cycle,
        },
      });

      if (!paymentResult.success) {
        return paymentResult;
      }

      // Calculate next billing date
      const nextBillingDate = this.calculateNextBillingDate(
        subscriptionData.billing_cycle
      );

      const subscription = await this.saveSubscription({
        id: `sub_${uuidv4()}`,
        user_id: subscriptionData.user_id,
        plan_id: subscriptionData.plan_id,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency || 'USD',
        billing_cycle: subscriptionData.billing_cycle,
        status: 'active',
        first_payment_id: paymentResult.payment_id,
        next_billing_date: nextBillingDate,
      });

      return {
        success: true,
        subscription_id: subscription.id,
        status: subscription.status,
        amount: subscription.amount,
        billing_cycle: subscription.billing_cycle,
        next_billing_date: subscription.next_billing_date,
        created_at: subscription.created_at,
      };
    } catch (error) {
      console.error('Subscription creation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get subscription details
   */
  static async getSubscription(subscriptionId) {
    try {
      const query = 'SELECT * FROM subscriptions WHERE id = $1';
      const result = await global.dbPool.query(query, [subscriptionId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  /**
   * Update subscription
   */
  static async updateSubscription(subscriptionId, updateData) {
    try {
      const subscription = await this.getSubscription(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: 'Subscription not found',
        };
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (updateData.amount !== undefined) {
        updates.push(`amount = $${paramCount}`);
        values.push(updateData.amount);
        paramCount++;
      }

      if (updateData.billing_cycle !== undefined) {
        updates.push(`billing_cycle = $${paramCount}`);
        values.push(updateData.billing_cycle);
        paramCount++;

        // Recalculate next billing date
        const nextBillingDate = this.calculateNextBillingDate(updateData.billing_cycle);
        updates.push(`next_billing_date = $${paramCount}`);
        values.push(nextBillingDate);
        paramCount++;
      }

      updates.push(`updated_at = $${paramCount}`);
      values.push(new Date());
      values.push(subscriptionId);

      const query = `
        UPDATE subscriptions
        SET ${updates.join(', ')}
        WHERE id = $${paramCount + 1}
        RETURNING *
      `;

      const result = await global.dbPool.query(query, values);
      return {
        success: true,
        subscription: result.rows[0],
      };
    } catch (error) {
      console.error('Update subscription error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId, reason = '') {
    try {
      const query = `
        UPDATE subscriptions
        SET status = 'cancelled', cancelled_at = $1, cancel_reason = $2, updated_at = $3
        WHERE id = $4
        RETURNING *
      `;

      const result = await global.dbPool.query(query, [new Date(), reason, new Date(), subscriptionId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Subscription not found',
        };
      }

      return {
        success: true,
        message: 'Subscription cancelled',
        cancelled_at: result.rows[0].cancelled_at,
      };
    } catch (error) {
      console.error('Cancel subscription error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process subscription billing
   * Run periodically to charge active subscriptions
   */
  static async processBilling() {
    try {
      const query = `
        SELECT * FROM subscriptions
        WHERE status = 'active'
        AND next_billing_date <= CURRENT_DATE
      `;

      const result = await global.dbPool.query(query);
      const subscriptions = result.rows;

      for (const subscription of subscriptions) {
        try {
          // Get latest card for user
          const cardQuery = 'SELECT * FROM payment_cards WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1';
          const cardResult = await global.dbPool.query(cardQuery, [subscription.user_id]);

          if (cardResult.rows.length === 0) {
            // No card on file
            await this.updateBillingStatus(subscription.id, 'failed', 'No card on file');
            continue;
          }

          const card = cardResult.rows[0];

          // Process payment
          const paymentResult = await PaymentService.processPayment({
            user_id: subscription.user_id,
            amount: subscription.amount,
            currency: subscription.currency,
            card: JSON.parse(card.card_data),
            billing_address: JSON.parse(card.billing_address || '{}'),
            description: `Subscription renewal: ${subscription.plan_id}`,
            metadata: {
              subscription_id: subscription.id,
              billing_cycle: subscription.billing_cycle,
            },
          });

          if (paymentResult.success) {
            // Update next billing date
            const nextBillingDate = this.calculateNextBillingDate(subscription.billing_cycle);
            await global.dbPool.query(
              'UPDATE subscriptions SET next_billing_date = $1 WHERE id = $2',
              [nextBillingDate, subscription.id]
            );
          } else {
            await this.updateBillingStatus(subscription.id, 'failed', paymentResult.error.message);
          }
        } catch (error) {
          console.error(`Error processing subscription ${subscription.id}:`, error);
          await this.updateBillingStatus(subscription.id, 'failed', error.message);
        }
      }
    } catch (error) {
      console.error('Billing process error:', error);
    }
  }

  /**
   * Get subscriptions for user
   */
  static async getUserSubscriptions(userId, status = null) {
    try {
      let query = 'SELECT * FROM subscriptions WHERE user_id = $1';
      const params = [userId];

      if (status) {
        query += ` AND status = $2`;
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';
      const result = await global.dbPool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get subscriptions: ${error.message}`);
    }
  }

  /**
   * Save subscription record
   */
  static async saveSubscription(subscriptionData) {
    try {
      const query = `
        INSERT INTO subscriptions (
          id, user_id, plan_id, amount, currency, billing_cycle,
          status, first_payment_id, next_billing_date, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING *
      `;

      const values = [
        subscriptionData.id,
        subscriptionData.user_id,
        subscriptionData.plan_id,
        subscriptionData.amount,
        subscriptionData.currency,
        subscriptionData.billing_cycle,
        subscriptionData.status,
        subscriptionData.first_payment_id,
        subscriptionData.next_billing_date,
        new Date(),
        new Date(),
      ];

      const result = await global.dbPool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to save subscription: ${error.message}`);
    }
  }

  /**
   * Calculate next billing date
   */
  static calculateNextBillingDate(billingCycle) {
    const now = moment();
    if (billingCycle === 'monthly') {
      return now.add(1, 'month').toDate();
    } else if (billingCycle === 'yearly') {
      return now.add(1, 'year').toDate();
    } else if (billingCycle === 'weekly') {
      return now.add(1, 'week').toDate();
    }
    return now.add(1, 'month').toDate();
  }

  /**
   * Update billing status
   */
  static async updateBillingStatus(subscriptionId, status, reason = '') {
    try {
      await global.dbPool.query(
        'UPDATE subscriptions SET last_billing_status = $1, last_billing_reason = $2 WHERE id = $3',
        [status, reason, subscriptionId]
      );
    } catch (error) {
      console.error('Error updating billing status:', error);
    }
  }
}

module.exports = SubscriptionService;