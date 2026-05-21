const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const SubscriptionService = require('../services/subscriptionService');
const CardValidationService = require('../services/cardValidation');

const router = express.Router();

// Create subscription
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { plan_id, amount, currency, billing_cycle, card, billing_address } = req.body;

    if (!plan_id || !amount || !billing_cycle || !card) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'plan_id, amount, billing_cycle, and card are required',
        },
      });
    }

    // Validate card
    const cardValidation = CardValidationService.validateCard(card);
    if (!cardValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CARD',
          message: 'Card validation failed',
          details: cardValidation.errors,
        },
      });
    }

    const result = await SubscriptionService.createSubscription({
      user_id: req.user.id,
      plan_id,
      amount,
      currency: currency || 'USD',
      billing_cycle,
      card,
      billing_address,
    });

    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message,
      },
    });
  }
});

// Get subscription
router.get('/:subscriptionId', authMiddleware, async (req, res) => {
  try {
    const subscription = await SubscriptionService.getSubscription(req.params.subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subscription not found',
        },
      });
    }

    res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message,
      },
    });
  }
});

// Update subscription
router.post('/:subscriptionId/update', authMiddleware, async (req, res) => {
  try {
    const { amount, billing_cycle, card } = req.body;
    const updateData = {};

    if (amount !== undefined) updateData.amount = amount;
    if (billing_cycle !== undefined) updateData.billing_cycle = billing_cycle;

    const result = await SubscriptionService.updateSubscription(
      req.params.subscriptionId,
      updateData
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message,
      },
    });
  }
});

// Cancel subscription
router.post('/:subscriptionId/cancel', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await SubscriptionService.cancelSubscription(req.params.subscriptionId, reason);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message,
      },
    });
  }
});

// List subscriptions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const subscriptions = await SubscriptionService.getUserSubscriptions(req.user.id, status);

    res.json({
      success: true,
      total: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message,
      },
    });
  }
});

module.exports = router;