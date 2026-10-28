const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { getDBStatus } = require('../config/db');
const { mockUsers } = require('../config/inMemoryStore');

// @desc    Register a new user
// @route   POST /api/v1/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      }

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        currency: 'USD',
      });

      const token = generateToken(user);
      return res.status(201).json({
        success: true,
        message: 'Account created successfully in MongoDB!',
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            currency: user.currency,
          },
          token,
        },
      });
    } else {
      // In-memory fallback
      const newUser = {
        _id: `user_${Date.now()}`,
        name,
        email: email.toLowerCase(),
        currency: 'USD',
      };
      mockUsers.push(newUser);
      const token = generateToken(newUser);
      return res.status(201).json({
        success: true,
        message: 'Account created in demo mode (MongoDB not connected).',
        data: {
          user: newUser,
          token,
        },
      });
    }
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ success: false, message: 'Registration failed.', error: error.message });
  }
};

// @desc    Login user & get JWT token
// @route   POST /api/v1/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const token = generateToken(user);
      return res.json({
        success: true,
        message: 'Login successful!',
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            currency: user.currency,
          },
          token,
        },
      });
    } else {
      // Fallback in-memory login
      const user = mockUsers.find((u) => u.email === email.toLowerCase()) || {
        _id: 'demo_user_123',
        name: 'Demo User',
        email: email.toLowerCase(),
        currency: 'USD',
      };

      const token = generateToken(user);
      return res.json({
        success: true,
        message: 'Demo login successful!',
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            currency: user.currency || 'USD',
          },
          token,
        },
      });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'Login failed.', error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
const getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
};

// @desc    Update user profile
// @route   PATCH /api/v1/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, currency } = req.body;
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

      if (name) user.name = name;
      if (currency) user.currency = currency;
      await user.save();

      return res.json({
        success: true,
        message: 'Profile updated in MongoDB.',
        data: { user },
      });
    } else {
      if (name) req.user.name = name;
      if (currency) req.user.currency = currency;
      return res.json({
        success: true,
        message: 'Profile updated.',
        data: { user: req.user },
      });
    }
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update profile.', error: error.message });
  }
};

// @desc    Change user password
// @route   PATCH /api/v1/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new passwords.' });
    }

    const dbStatus = getDBStatus();
    if (dbStatus.isConnected) {
      const user = await User.findById(req.user._id);
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }

      user.password = newPassword;
      await user.save();
      return res.json({ success: true, message: 'Password updated successfully!' });
    } else {
      return res.json({ success: true, message: 'Password updated in demo mode.' });
    }
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update password.', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};
