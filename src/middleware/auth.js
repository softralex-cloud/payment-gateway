const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'No token provided',
        },
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
};

const generateToken = (userId, email) => {
  return jwt.sign(
    { id: userId, email: email },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

module.exports = { authMiddleware, generateToken };