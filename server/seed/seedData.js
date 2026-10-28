const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

const seedMongoDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<username>') || uri.includes('xxxxx')) {
    console.error('❌ MONGODB_URI is not set or contains placeholders in spendwise/server/.env.');
    console.error('👉 Please configure your MongoDB Atlas or local MongoDB connection string before running seed.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(uri);
    console.log('🌿 Connected to MongoDB!');

    // 1. Create or find default demo user
    let user = await User.findOne({ email: 'demo@spendwise.com' });
    if (!user) {
      user = await User.create({
        name: 'Ansh',
        email: 'demo@spendwise.com',
        password: 'password123',
        currency: 'USD',
      });
      console.log('👤 Created demo user: demo@spendwise.com (password: password123)');
    } else {
      console.log('👤 Found existing demo user: demo@spendwise.com');
    }

    // 2. Clear previous seed transactions for this user
    await Transaction.deleteMany({ user: user._id });
    await Budget.deleteMany({ user: user._id });

    // 3. Seed transactions
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const sampleTransactions = [
      {
        user: user._id,
        title: 'Monthly Tech Salary',
        amount: 4500,
        type: 'income',
        category: 'Salary',
        date: new Date(now.getFullYear(), now.getMonth(), 1),
        paymentMethod: 'Bank Transfer',
        notes: 'Monthly corporate direct deposit',
        tags: ['salary', 'income'],
      },
      {
        user: user._id,
        title: 'Apartment Rent & Community Fee',
        amount: 1400,
        type: 'expense',
        category: 'Housing',
        date: new Date(now.getFullYear(), now.getMonth(), 2),
        paymentMethod: 'Bank Transfer',
        notes: 'Apartment lease payment',
        tags: ['housing', 'fixed'],
      },
      {
        user: user._id,
        title: 'Whole Foods Market',
        amount: 185.5,
        type: 'expense',
        category: 'Food & Dining',
        date: new Date(now.getFullYear(), now.getMonth(), 5),
        paymentMethod: 'Credit Card',
        notes: 'Groceries, produce, and snacks',
        tags: ['groceries', 'food'],
      },
      {
        user: user._id,
        title: 'Campus Transit Pass & Uber',
        amount: 68.25,
        type: 'expense',
        category: 'Transportation',
        date: new Date(now.getFullYear(), now.getMonth(), 8),
        paymentMethod: 'Debit Card',
        notes: 'Metro pass recharge and campus rides',
        tags: ['commute'],
      },
      {
        user: user._id,
        title: 'Freelance Mobile Web App Milestone',
        amount: 950,
        type: 'income',
        category: 'Freelance',
        date: new Date(now.getFullYear(), now.getMonth(), 12),
        paymentMethod: 'UPI',
        notes: 'Frontend dashboard delivery',
        tags: ['freelance', 'client'],
      },
      {
        user: user._id,
        title: 'Dining Out - Italian Bistro',
        amount: 74.0,
        type: 'expense',
        category: 'Food & Dining',
        date: new Date(now.getFullYear(), now.getMonth(), 15),
        paymentMethod: 'Credit Card',
        notes: 'Dinner with study group',
        tags: ['restaurant'],
      },
      {
        user: user._id,
        title: 'High-Speed Fiber Internet',
        amount: 65.0,
        type: 'expense',
        category: 'Utilities',
        date: new Date(now.getFullYear(), now.getMonth(), 18),
        paymentMethod: 'Debit Card',
        notes: 'Monthly broadband utility',
        tags: ['bills'],
      },
      {
        user: user._id,
        title: 'Digital Subscriptions (Cloud & Music)',
        amount: 38.99,
        type: 'expense',
        category: 'Entertainment',
        date: new Date(now.getFullYear(), now.getMonth(), 20),
        paymentMethod: 'Credit Card',
        notes: 'Spotify, Cloud Storage, GitHub Copilot',
        tags: ['subscriptions'],
      },
    ];

    await Transaction.insertMany(sampleTransactions);
    console.log(`💳 Seeded ${sampleTransactions.length} transactions into MongoDB!`);

    // 4. Seed Budgets
    const sampleBudgets = [
      {
        user: user._id,
        category: 'Food & Dining',
        limitAmount: 600,
        month: currentMonth,
        year: currentYear,
        alertThreshold: 80,
      },
      {
        user: user._id,
        category: 'Housing',
        limitAmount: 1600,
        month: currentMonth,
        year: currentYear,
        alertThreshold: 80,
      },
      {
        user: user._id,
        category: 'Transportation',
        limitAmount: 200,
        month: currentMonth,
        year: currentYear,
        alertThreshold: 80,
      },
      {
        user: user._id,
        category: 'Entertainment',
        limitAmount: 150,
        month: currentMonth,
        year: currentYear,
        alertThreshold: 80,
      },
      {
        user: user._id,
        category: 'Utilities',
        limitAmount: 120,
        month: currentMonth,
        year: currentYear,
        alertThreshold: 80,
      },
    ];

    await Budget.insertMany(sampleBudgets);
    console.log(`🎯 Seeded ${sampleBudgets.length} monthly budgets into MongoDB!`);

    console.log('\n✅ Seeding complete! You can now log in with:');
    console.log('   Email: demo@spendwise.com');
    console.log('   Password: password123\n');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedMongoDB();
