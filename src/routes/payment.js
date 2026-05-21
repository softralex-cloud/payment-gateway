const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const PaymentService = require('../services/paymentService');
const CardValidationService = require('../services/cardValidation');

const router = express.Router();

// Create payment
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { amount, currency, card, billing_address, description, metadata } = req.body;

    if (!amount || !card) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'amount and card are required',
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

    const result = await PaymentService.processPayment({
      user_id: req.user.id,
      amount,
      currency: currency || 'USD',
      card,
      billing_address,
      description,
      metadata,
    });

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(402).json(result);
    }
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message,
      },
    });
  }
});

// Get payment
router.get('/:paymentId', authMiddleware, async (req, res) => {
  try {
    const payment = await PaymentService.getPayment(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment not found',
        },
      });
    }

    res.json({
      success: true,
      payment,
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

// Get payment history
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;
    const payments = await PaymentService.getPaymentHistory(
      req.user.id,
      parseInt(limit),
      parseInt(offset),
      status
    );

    res.json({
      success: true,
      total: payments.length,
      payments,
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