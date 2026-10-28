const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getDBStatus } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'spendwise_jwt_secret_key_development_2026';

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please log in to access this resource.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const dbStatus = getDBStatus();
    if (dbStatus.isConnected) {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ success: false, message: 'User belonging to this token no longer exists.' });
      }
      req.user = user;
    } else {
      // In demo/fallback mode
      req.user = {
        _id: decoded.id || 'demo_user_123',
        id: decoded.id || 'demo_user_123',
        name: decoded.name || 'Demo User',
        email: decoded.email || 'demo@spendwise.com',
        currency: 'USD',
      };
    }

    next();
  } catch (error) {
    console.error('Auth verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid token. Please log in again.',
    });
  }
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = { protect, generateToken };
