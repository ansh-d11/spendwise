const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectDB, getDBStatus } = require('./config/db');

// Load environment variables from spendwise/.env
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env') }); // also check server/.env

const app = express();
const PORT = process.env.PORT || 5000;

// Security and middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  if (!req.url.startsWith('/assets/')) {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// API Routes
app.use('/api/v1/system', require('./routes/systemRoutes'));
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/v1/transactions', require('./routes/transactionRoutes'));
app.use('/api/v1/budgets', require('./routes/budgetRoutes'));
app.use('/api/v1/analytics', require('./routes/analyticsRoutes'));

// Serve Frontend Static Assets from client/dist
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// API 404 handler (only for /api routes)
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `Endpoint ${req.originalUrl} not found.` });
});

// Catch-all route to serve React Router SPA for any other URL
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Server Initialization
const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  app.listen(PORT, '0.0.0.0', () => {
    const dbStatus = getDBStatus();
    console.log(`\n======================================================`);
    console.log(`🚀 [SpendWise Server] Live at: http://localhost:${PORT}`);
    console.log(`🖥️  [Web Frontend]    Loaded from client/dist`);
    console.log(`🗄️  [Database]        Mode: ${dbStatus.mode.toUpperCase()} (Connected: ${dbStatus.isConnected})`);
    console.log(`📡 [API Base]        http://localhost:${PORT}/api/v1`);
    console.log(`🔍 [System Status]   http://localhost:${PORT}/api/v1/system/status`);
    console.log(`======================================================\n`);
  });
};

startServer();
