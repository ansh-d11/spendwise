const Transaction = require('../models/Transaction');
const { getDBStatus } = require('../config/db');
const { mockTransactions } = require('../config/inMemoryStore');

// @desc    Get aggregated financial analytics and charts data
// @route   GET /api/v1/analytics
const getAnalytics = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const dbStatus = getDBStatus();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    let transactions = [];

    if (dbStatus.isConnected) {
      transactions = await Transaction.find({
        user: req.user._id,
        date: { $gte: startDate, $lte: endDate },
      });
    } else {
      transactions = mockTransactions.filter((t) => {
        const d = new Date(t.date);
        return d >= startDate && d <= endDate;
      });
    }

    // 1. Overall Summary
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((t) => {
      if (t.type === 'income') totalIncome += t.amount;
      else if (t.type === 'expense') totalExpenses += t.amount;
    });

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    const avgMonthlyExpense = Number((totalExpenses / months).toFixed(2));

    const summary = {
      totalIncome: Number(totalIncome.toFixed(2)),
      totalInflow: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpenses.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalOutflow: Number(totalExpenses.toFixed(2)),
      netSavings: Number(netSavings.toFixed(2)),
      savingsRate,
      avgMonthlyExpense,
    };

    // 2. Monthly Trends
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = new Map();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = monthNames[d.getMonth()];
      const y = d.getFullYear();
      const key = `${mName} ${y}`;
      monthlyMap.set(key, { month: mName, year: y, income: 0, expenses: 0, savings: 0 });
    }

    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (monthlyMap.has(key)) {
        const entry = monthlyMap.get(key);
        if (t.type === 'income') entry.income += t.amount;
        else if (t.type === 'expense') entry.expenses += t.amount;
        entry.savings = Number((entry.income - entry.expenses).toFixed(2));
      }
    });

    const monthlyTrends = Array.from(monthlyMap.values()).map((m) => ({
      ...m,
      income: Number(m.income.toFixed(2)),
      expenses: Number(m.expenses.toFixed(2)),
    }));

    // 3. Category Breakdown (Expenses only)
    const categoryMap = new Map();
    let totalCategorizedExpenses = 0;

    transactions.forEach((t) => {
      if (t.type === 'expense') {
        const cat = t.category || 'Other';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);
        totalCategorizedExpenses += t.amount;
      }
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Number(amount.toFixed(2)),
        percentage: totalCategorizedExpenses > 0 ? Math.round((amount / totalCategorizedExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topSpendingCategories = categoryBreakdown.slice(0, 5);

    // 4. Payment Method Breakdown
    const paymentMap = new Map();
    transactions.forEach((t) => {
      if (t.type === 'expense') {
        const method = t.paymentMethod || 'Debit Card';
        const current = paymentMap.get(method) || { amount: 0, count: 0 };
        current.amount += t.amount;
        current.count += 1;
        paymentMap.set(method, current);
      }
    });

    const paymentMethodBreakdown = Array.from(paymentMap.entries())
      .map(([method, data]) => ({
        method,
        amount: Number(data.amount.toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    return res.json({
      success: true,
      data: {
        summary,
        monthlyTrends,
        categoryBreakdown,
        topSpendingCategories,
        paymentMethodBreakdown,
      },
    });
  } catch (error) {
    console.error('Analytics aggregation error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to compute analytics.', error: error.message });
  }
};

module.exports = {
  getAnalytics,
};
