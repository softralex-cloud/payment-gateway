const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const PaymentService = require('../services/paymentService');

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const stats = await PaymentService.getDashboardStats();
    res.json({
      success: true,
      stats,
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

// Get all payments
router.get('/payments', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, user_id } = req.query;
    let query = 'SELECT * FROM payments WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (user_id) {
      params.push(user_id);
      query += ` AND user_id = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await global.dbPool.query(query, params);
    res.json({
      success: true,
      payments: result.rows,
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