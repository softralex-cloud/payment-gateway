const { v4: uuidv4 } = require('uuid');
const EncryptionService = require('./encryptionService');
const TronService = require('./tronService');
const CardValidationService = require('./cardValidation');

class PaymentService {
  /**
   * Process one-time payment
   */
  static async processPayment(paymentData) {
    try {
      // Validate card
      const cardValidation = CardValidationService.validateCard(paymentData.card);
      if (!cardValidation.valid) {
        return {
          success: false,
          error: {
            code: 'INVALID_CARD',
            message: 'Card validation failed',
            details: cardValidation.errors,
          },
        };
      }

      // Simulate payment processing (in real scenario, connect to payment processor)
      const paymentResult = await this.simulateCardPayment(paymentData);

      if (!paymentResult.success) {
        return {
          success: false,
          error: {
            code: 'PAYMENT_FAILED',
            message: paymentResult.error,
          },
        };
      }

      // Convert to USDT
      const usdtAmount = TronService.convertToUSDT(paymentData.amount);

      // Transfer USDT to wallet
      const tronTransfer = await TronService.transferUSDT(
        process.env.TRON_ADDRESS,
        usdtAmount
      );

      // Encrypt card data for storage
      const encryptedCard = EncryptionService.encryptCard({
        number: paymentData.card.number,
        expiry_month: paymentData.card.expiry_month,
        expiry_year: paymentData.card.expiry_year,
        cardholder_name: paymentData.card.cardholder_name,
      });

      // Save payment to database
      const payment = await this.savePaymentRecord({
        id: `pay_${uuidv4()}`,
        user_id: paymentData.user_id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        card_last_four: CardValidationService.getLastFour(paymentData.card.number),
        card_type: cardValidation.cardType,
        encrypted_card: encryptedCard.encrypted,
        card_iv: encryptedCard.iv,
        usdt_amount: usdtAmount,
        tron_tx_hash: tronTransfer.txHash,
        status: 'completed',
        billing_address: paymentData.billing_address,
        description: paymentData.description,
        metadata: paymentData.metadata,
      });

      return {
        success: true,
        payment_id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        usdt_amount: payment.usdt_amount,
        tron_tx_hash: payment.tron_tx_hash,
        timestamp: payment.created_at,
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * Simulate card payment processing
   * In production, integrate with real payment processor API
   */
  static async simulateCardPayment(paymentData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate random success/failure for testing
        const success = Math.random() > 0.05; // 95% success rate

        if (success) {
          resolve({
            success: true,
            transaction_id: `txn_${uuidv4()}`,
          });
        } else {
          resolve({
            success: false,
            error: 'Card declined',
          });
        }
      }, 1000);
    });
  }

  /**
   * Save payment record to database
   */
  static async savePaymentRecord(paymentData) {
    try {
      const query = `
        INSERT INTO payments (
          id, user_id, amount, currency, card_last_four, card_type,
          encrypted_card, card_iv, usdt_amount, tron_tx_hash, status,
          billing_address, description, metadata, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING *
      `;

      const values = [
        paymentData.id,
        paymentData.user_id,
        paymentData.amount,
        paymentData.currency,
        paymentData.card_last_four,
        paymentData.card_type,
        paymentData.encrypted_card,
        paymentData.card_iv,
        paymentData.usdt_amount,
        paymentData.tron_tx_hash,
        paymentData.status,
        JSON.stringify(paymentData.billing_address),
        paymentData.description,
        JSON.stringify(paymentData.metadata),
        new Date(),
        new Date(),
      ];

      const result = await global.dbPool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to save payment: ${error.message}`);
    }
  }

  /**
   * Get payment by ID
   */
  static async getPayment(paymentId) {
    try {
      const query = 'SELECT * FROM payments WHERE id = $1';
      const result = await global.dbPool.query(query, [paymentId]);

      if (result.rows.length === 0) {
        return null;
      }

      const payment = result.rows[0];
      payment.billing_address = JSON.parse(payment.billing_address || '{}');
      payment.metadata = JSON.parse(payment.metadata || '{}');

      return payment;
    } catch (error) {
      throw new Error(`Failed to get payment: ${error.message}`);
    }
  }

  /**
   * Get payment history for user
   */
  static async getPaymentHistory(userId, limit = 20, offset = 0, status = null) {
    try {
      let query = 'SELECT * FROM payments WHERE user_id = $1';
      const params = [userId];

      if (status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${
        params.length + 2
      }`;
      params.push(limit, offset);

      const result = await global.dbPool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get payment history: ${error.message}`);
    }
  }

  /**
   * Process refund
   */
  static async processRefund(paymentId, amount = null, reason = '') {
    try {
      const payment = await this.getPayment(paymentId);

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found',
        };
      }

      if (payment.status === 'refunded') {
        return {
          success: false,
          error: 'Payment already refunded',
        };
      }

      const refundAmount = amount || payment.amount;
      const refundUSDT = TronService.convertToUSDT(refundAmount);

      // Transfer USDT back from merchant wallet to customer
      // Note: In real scenario, you'd transfer from your wallet to customer's wallet
      // For now, we simulate this

      const refund = await this.saveRefundRecord({
        id: `ref_${uuidv4()}`,
        payment_id: paymentId,
        amount: refundAmount,
        usdt_amount: refundUSDT,
        reason: reason,
        status: 'completed',
      });

      // Update payment status
      await global.dbPool.query(
        'UPDATE payments SET status = $1, updated_at = $2 WHERE id = $3',
        [refundAmount === payment.amount ? 'refunded' : 'partially_refunded', new Date(), paymentId]
      );

      return {
        success: true,
        refund_id: refund.id,
        payment_id: paymentId,
        amount: refund.amount,
        status: refund.status,
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Save refund record
   */
  static async saveRefundRecord(refundData) {
    try {
      const query = `
        INSERT INTO refunds (
          id, payment_id, amount, usdt_amount, reason, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *
      `;

      const values = [
        refundData.id,
        refundData.payment_id,
        refundData.amount,
        refundData.usdt_amount,
        refundData.reason,
        refundData.status,
        new Date(),
        new Date(),
      ];

      const result = await global.dbPool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to save refund: ${error.message}`);
    }
  }

  /**
   * Get dashboard statistics
   */
  static async getDashboardStats() {
    try {
      const query = `
        SELECT
          COUNT(*) as total_transactions,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_revenue,
          COALESCE(COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END), 0) as today_transactions,
          COALESCE(SUM(CASE WHEN status = 'completed' AND created_at::date = CURRENT_DATE THEN amount ELSE 0 END), 0) as today_revenue,
          COALESCE(COUNT(CASE WHEN status = 'pending' THEN 1 END), 0) as pending_payments,
          COALESCE(COUNT(CASE WHEN status = 'failed' THEN 1 END), 0) as failed_payments
        FROM payments
      `;

      const result = await global.dbPool.query(query);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }
}

module.exports = PaymentService;
