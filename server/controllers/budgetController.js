const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { getDBStatus } = require('../config/db');
let { mockBudgets, mockTransactions } = require('../config/inMemoryStore');

// Helper to compute budget progress and spending
const computeBudgetProgress = async (budget, userId, isMongo) => {
  const { category, limitAmount, month, year, alertThreshold = 80, _id } = budget;

  let spent = 0;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  if (isMongo) {
    const expenses = await Transaction.find({
      user: userId,
      type: 'expense',
      category: category,
      date: { $gte: start, $lte: end },
    });
    spent = expenses.reduce((sum, t) => sum + t.amount, 0);
  } else {
    const expenses = mockTransactions.filter((t) => {
      const tDate = new Date(t.date);
      return (
        t.type === 'expense' &&
        t.category === category &&
        tDate.getMonth() + 1 === month &&
        tDate.getFullYear() === year
      );
    });
    spent = expenses.reduce((sum, t) => sum + t.amount, 0);
  }

  const remaining = Math.max(0, limitAmount - spent);
  const percentage = limitAmount > 0 ? Math.round((spent / limitAmount) * 100) : 0;
  const isWarning = percentage >= alertThreshold && percentage <= 100;
  const isOverBudget = spent > limitAmount;

  return {
    _id,
    category,
    limitAmount,
    spentAmount: Number(spent.toFixed(2)),
    remainingAmount: Number(remaining.toFixed(2)),
    percentage,
    isWarning,
    isOverBudget,
    alertThreshold,
    month,
    year,
  };
};

// @desc    Get user monthly budgets with live spending calculations
// @route   GET /api/v1/budgets
const getBudgets = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const budgets = await Budget.find({
        user: req.user._id,
        month,
        year,
      });

      const processed = await Promise.all(
        budgets.map((b) => computeBudgetProgress(b, req.user._id, true))
      );

      return res.json({ success: true, count: processed.length, data: processed });
    } else {
      const userBudgets = mockBudgets.filter((b) => b.month === month && b.year === year);
      const processed = await Promise.all(
        userBudgets.map((b) => computeBudgetProgress(b, req.user._id, false))
      );
      return res.json({ success: true, count: processed.length, data: processed });
    }
  } catch (error) {
    console.error('Fetch budgets error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch budgets.', error: error.message });
  }
};

// @desc    Create a monthly budget
// @route   POST /api/v1/budgets
const createBudget = async (req, res) => {
  try {
    const { category, limitAmount, month, year, alertThreshold } = req.body;
    const now = new Date();
    const bMonth = parseInt(month) || now.getMonth() + 1;
    const bYear = parseInt(year) || now.getFullYear();

    if (!category || !limitAmount || isNaN(Number(limitAmount)) || Number(limitAmount) <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a category and valid limit amount.' });
    }

    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      // Upsert: if budget already exists for this category/month/year, update it
      const budget = await Budget.findOneAndUpdate(
        {
          user: req.user._id,
          category: category.trim(),
          month: bMonth,
          year: bYear,
        },
        {
          limitAmount: Number(limitAmount),
          alertThreshold: alertThreshold ? Number(alertThreshold) : 80,
        },
        { new: true, upsert: true, runValidators: true }
      );

      const computed = await computeBudgetProgress(budget, req.user._id, true);
      return res.status(201).json({
        success: true,
        message: 'Budget saved to MongoDB!',
        data: computed,
      });
    } else {
      const newBudget = {
        _id: `bgt_${Date.now()}`,
        user: req.user._id,
        category: category.trim(),
        limitAmount: Number(limitAmount),
        month: bMonth,
        year: bYear,
        alertThreshold: alertThreshold ? Number(alertThreshold) : 80,
      };
      mockBudgets.push(newBudget);
      const computed = await computeBudgetProgress(newBudget, req.user._id, false);
      return res.status(201).json({
        success: true,
        message: 'Budget saved in demo mode.',
        data: computed,
      });
    }
  } catch (error) {
    console.error('Create budget error:', error.message);
    res.status(400).json({ success: false, message: 'Failed to create budget.', error: error.message });
  }
};

// @desc    Update budget limit
// @route   PATCH /api/v1/budgets/:id
const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { limitAmount, alertThreshold } = req.body;
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const budget = await Budget.findOne({ _id: id, user: req.user._id });
      if (!budget) return res.status(404).json({ success: false, message: 'Budget not found.' });

      if (limitAmount) budget.limitAmount = Number(limitAmount);
      if (alertThreshold) budget.alertThreshold = Number(alertThreshold);
      await budget.save();

      const computed = await computeBudgetProgress(budget, req.user._id, true);
      return res.json({ success: true, message: 'Budget updated in MongoDB!', data: computed });
    } else {
      const idx = mockBudgets.findIndex((b) => b._id === id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Budget not found.' });

      if (limitAmount) mockBudgets[idx].limitAmount = Number(limitAmount);
      if (alertThreshold) mockBudgets[idx].alertThreshold = Number(alertThreshold);
      const computed = await computeBudgetProgress(mockBudgets[idx], req.user._id, false);
      return res.json({ success: true, message: 'Budget updated.', data: computed });
    }
  } catch (error) {
    console.error('Update budget error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update budget.', error: error.message });
  }
};

// @desc    Delete budget
// @route   DELETE /api/v1/budgets/:id
const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const dbStatus = getDBStatus();

    if (dbStatus.isConnected) {
      const budget = await Budget.findOneAndDelete({ _id: id, user: req.user._id });
      if (!budget) return res.status(404).json({ success: false, message: 'Budget not found.' });
      return res.json({ success: true, message: 'Budget deleted from MongoDB.', data: { _id: id } });
    } else {
      mockBudgets = mockBudgets.filter((b) => b._id !== id);
      return res.json({ success: true, message: 'Budget deleted.', data: { _id: id } });
    }
  } catch (error) {
    console.error('Delete budget error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete budget.', error: error.message });
  }
};

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
};
