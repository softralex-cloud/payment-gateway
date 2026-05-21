const express = require('express');
const { v4: uuidv4 } = require('uuid');
const EncryptionService = require('../services/encryptionService');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, country } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'email and password are required',
        },
      });
    }

    // Check if user exists
    const existingUser = await global.dbPool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User already exists',
        },
      });
    }

    const userId = uuidv4();
    const passwordHash = await EncryptionService.hashPassword(password);

    await global.dbPool.query(
      'INSERT INTO users (id, email, password_hash, name, country) VALUES ($1, $2, $3, $4, $5)',
      [userId, email, passwordHash, name, country]
    );

    const token = generateToken(userId, email);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        name,
      },
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

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'email and password are required',
        },
      });
    }

    const result = await global.dbPool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const user = result.rows[0];
    const passwordMatch = await EncryptionService.comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
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