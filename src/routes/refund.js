const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const PaymentService = require('../services/paymentService');

const router = express.Router();

// Create refund
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { payment_id, amount, reason } = req.body;

    if (!payment_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'payment_id is required',
        },
      });
    }

    const result = await PaymentService.processRefund(payment_id, amount, reason);
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

module.exports = router;