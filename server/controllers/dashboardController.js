const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { getDBStatus } = require('../config/db');
let { mockTransactions, mockBudgets } = require('../config/inMemoryStore');

// @desc    Get dashboard statistics, charts, budgets and recent transactions
// @route   GET /api/v1/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();
    const dbStatus = getDBStatus();

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    let transactions = [];
    let budgets = [];

    if (dbStatus.isConnected) {
      // 1. Fetch transactions for month
      transactions = await Transaction.find({
        user: req.user._id,
        date: { $gte: start, $lte: end },
      }).sort({ date: -1, createdAt: -1 });

      // 2. Fetch budgets for month
      budgets = await Budget.find({
        user: req.user._id,
        month,
        year,
      });
    } else {
      transactions = mockTransactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
      budgets = mockBudgets.filter((b) => b.month === month && b.year === year);
    }

    // Calculations
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryMap = new Map();

    transactions.forEach((t) => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpenses += t.amount;
        const cat = t.category || 'Other';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);
      }
    });

    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((Math.max(0, balance) / totalIncome) * 100) : 0;

    // Category breakdown for charts
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Number(amount.toFixed(2)),
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Compute budgets progress
    let totalLimit = 0;
    let totalSpentInBudgets = 0;

    const computedBudgets = budgets.map((b) => {
      const limit = Number(b.limitAmount || 0);
      totalLimit += limit;
      const spent = categoryMap.get(b.category) || 0;
      totalSpentInBudgets += spent;
      const remaining = Math.max(0, limit - spent);
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const threshold = b.alertThreshold || 80;

      return {
        _id: b._id,
        category: b.category,
        limitAmount: limit,
        spentAmount: Number(spent.toFixed(2)),
        remainingAmount: Number(remaining.toFixed(2)),
        percentage,
        isWarning: percentage >= threshold && percentage <= 100,
        isOverBudget: spent > limit,
        alertThreshold: threshold,
        month,
        year,
      };
    });

    const budgetUsage = {
      totalLimit: Number(totalLimit.toFixed(2)),
      totalSpent: Number(totalSpentInBudgets.toFixed(2)),
      percentage: totalLimit > 0 ? Math.round((totalSpentInBudgets / totalLimit) * 100) : 0,
      isOverspent: totalSpentInBudgets > totalLimit,
    };

    const stats = {
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      balance: Number(balance.toFixed(2)),
      savingsRate,
      totalTransactions: transactions.length,
      budgetUsage,
    };

    const recentTransactions = transactions.slice(0, 5);

    return res.json({
      success: true,
      data: {
        stats,
        charts: {
          categoryBreakdown,
        },
        budgets: computedBudgets,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to compute dashboard stats.', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
};
