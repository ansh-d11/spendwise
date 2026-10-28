const Transaction = require('../models/Transaction');
const { getDBStatus } = require('../config/db');
let { mockTransactions } = require('../config/inMemoryStore');

// @desc    Get user transactions with optional filtering
// @route   GET /api/v1/transactions
const getTransactions = async (req, res) => {
  try {
    const { type, category, search, startDate, endDate, month, year } = req.query;
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const query = { user: req.user._id };

      if (type && ['income', 'expense'].includes(type)) {
        query.type = type;
      }

      if (category && category !== 'All') {
        query.category = category;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
        ];
      }

      // Date range filtering
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      } else if (month && year) {
        const start = new Date(parseInt(year), parseInt(month) - 1, 1);
        const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        query.date = { $gte: start, $lte: end };
      }

      const transactions = await Transaction.find(query).sort({ date: -1, createdAt: -1 });
      return res.json({ success: true, count: transactions.length, data: transactions });
    } else {
      // In-memory fallback
      let filtered = [...mockTransactions];
      if (type) filtered = filtered.filter((t) => t.type === type);
      if (category && category !== 'All') filtered = filtered.filter((t) => t.category === category);
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter((t) => t.title.toLowerCase().includes(s) || (t.notes && t.notes.toLowerCase().includes(s)));
      }
      return res.json({ success: true, count: filtered.length, data: filtered });
    }
  } catch (error) {
    console.error('Fetch transactions error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions.', error: error.message });
  }
};

// @desc    Create a new transaction
// @route   POST /api/v1/transactions
const createTransaction = async (req, res) => {
  try {
    const { title, amount, type, category, date, paymentMethod, notes, tags } = req.body;

    if (!title || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid title and amount greater than 0.' });
    }

    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const transaction = await Transaction.create({
        user: req.user._id,
        title: title.trim(),
        amount: Number(amount),
        type: type || 'expense',
        category: category || 'Other',
        date: date ? new Date(date) : new Date(),
        paymentMethod: paymentMethod || 'Debit Card',
        notes: notes ? notes.trim() : '',
        tags: Array.isArray(tags) ? tags : [],
      });

      return res.status(201).json({
        success: true,
        message: 'Transaction saved to MongoDB!',
        data: transaction,
      });
    } else {
      const newTx = {
        _id: `tx_${Date.now()}`,
        user: req.user._id || 'demo_user_123',
        title: title.trim(),
        amount: Number(amount),
        type: type || 'expense',
        category: category || 'Other',
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        paymentMethod: paymentMethod || 'Debit Card',
        notes: notes ? notes.trim() : '',
        tags: Array.isArray(tags) ? tags : [],
      };
      mockTransactions.unshift(newTx);
      return res.status(201).json({
        success: true,
        message: 'Transaction saved in demo mode.',
        data: newTx,
      });
    }
  } catch (error) {
    console.error('Create transaction error:', error.message);
    res.status(400).json({ success: false, message: 'Failed to create transaction.', error: error.message });
  }
};

// @desc    Update a transaction
// @route   PATCH /api/v1/transactions/:id
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, type, category, date, paymentMethod, notes, tags } = req.body;
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const transaction = await Transaction.findOne({ _id: id, user: req.user._id });
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found.' });
      }

      if (title) transaction.title = title.trim();
      if (amount && !isNaN(Number(amount))) transaction.amount = Number(amount);
      if (type) transaction.type = type;
      if (category) transaction.category = category;
      if (date) transaction.date = new Date(date);
      if (paymentMethod) transaction.paymentMethod = paymentMethod;
      if (notes !== undefined) transaction.notes = notes;
      if (tags) transaction.tags = tags;

      await transaction.save();

      return res.json({
        success: true,
        message: 'Transaction updated in MongoDB!',
        data: transaction,
      });
    } else {
      const idx = mockTransactions.findIndex((t) => t._id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Transaction not found.' });
      }
      mockTransactions[idx] = { ...mockTransactions[idx], ...req.body, amount: Number(req.body.amount || mockTransactions[idx].amount) };
      return res.json({
        success: true,
        message: 'Transaction updated in demo mode.',
        data: mockTransactions[idx],
      });
    }
  } catch (error) {
    console.error('Update transaction error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update transaction.', error: error.message });
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/v1/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const transaction = await Transaction.findOneAndDelete({ _id: id, user: req.user._id });
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found.' });
      }
      return res.json({ success: true, message: 'Transaction deleted from MongoDB.', data: { _id: id } });
    } else {
      mockTransactions = mockTransactions.filter((t) => t._id !== id);
      return res.json({ success: true, message: 'Transaction deleted.', data: { _id: id } });
    }
  } catch (error) {
    console.error('Delete transaction error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete transaction.', error: error.message });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
