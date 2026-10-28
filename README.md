# SpendWise - Personal Expense & Budget Manager

A full-stack MERN (MongoDB, Express.js, React, Node.js) personal finance management web application. SpendWise enables users to track income and expenses, establish category-specific monthly budgets with visual alert thresholds, and visualize macro-financial cashflow trends through interactive Recharts analytics.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ansh-d11/spendwise)

---

## 🌟 Features

- **Full MERN Stack**: React SPA client + Express REST API + MongoDB Mongoose ODM.
- **Dual Database Mode**:
  - **Live MongoDB Mode**: When `MONGODB_URI` is provided, all operations persist to MongoDB (Atlas or local).
  - **In-Memory Fallback Demo Mode**: Allows immediate testing, grading, and demonstration right out of the box without requiring an active MongoDB connection.
- **Authentication**: JWT-based authentication with bcrypt password hashing (`/auth/register`, `/auth/login`, `/auth/me`).
- **Dashboard & Quick Stats**: Real-time monthly inflow, outflow, net savings, category donut breakdown, and recent transactions.
- **Budget Tracking**: Set monthly limits per category with dynamic progress bars and visual indicators (Safe / Warning / Exceeded).
- **Interactive Analytics**: Multi-month cashflow trend lines, category rankings, and payment method distributions.
- **Seed Utility**: Pre-populated with realistic transactions and budgets for instant demonstration.

---

## 📁 Project Structure

```text
spendwise/
├── client/
│   └── dist/                     # Optimized React frontend build
│       ├── assets/               # JavaScript & CSS bundles (Tailwind, Lucide, Recharts)
│       └── index.html            # Main HTML document
├── server/
│   ├── config/
│   │   ├── db.js                 # MongoDB connection & reconnection manager
│   │   └── inMemoryStore.js      # In-memory store for fallback demo mode
│   ├── controllers/
│   │   ├── authController.js        # Login, registration, profile, password change
│   │   ├── transactionController.js # Transaction CRUD with date & category filters
│   │   ├── budgetController.js      # Budget CRUD with live spend calculation
│   │   ├── analyticsController.js   # Macro trend charts & category aggregations
│   │   └── dashboardController.js   # Unified dashboard summary statistics
│   ├── middleware/
│   │   └── auth.js               # JWT bearer verification middleware
│   ├── models/
│   │   ├── User.js               # Mongoose User schema with bcrypt methods
│   │   ├── Transaction.js        # Mongoose Transaction schema
│   │   └── Budget.js             # Mongoose Budget schema with unique constraints
│   ├── routes/
│   │   ├── authRoutes.js         # /api/v1/auth
│   │   ├── transactionRoutes.js  # /api/v1/transactions
│   │   ├── budgetRoutes.js       # /api/v1/budgets
│   │   ├── analyticsRoutes.js    # /api/v1/analytics
│   │   ├── dashboardRoutes.js    # /api/v1/dashboard
│   │   └── systemRoutes.js       # /api/v1/system/status
│   ├── seed/
│   │   └── seedData.js           # Database seeder script
│   └── server.js                 # Unified Express server & SPA static server
├── .env                          # Environment variables configuration
└── package.json                  # Dependencies and scripts
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (Node 20+ recommended)
- **MongoDB**: (Optional) MongoDB Atlas connection string or local MongoDB instance (`mongodb://127.0.0.1:27017/spendwise`).

### 2. Installation
Open a terminal in the project directory:
```bash
cd "C:\Users\Ansh's Laptop\.gemini\antigravity-ide\scratch\spendwise"
npm install
```

### 3. Connect MongoDB
Edit the `.env` file in the project root:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/spendwise?retryWrites=true&w=majority
JWT_SECRET=spendwise_super_secret_jwt_key_2026_secure
NODE_ENV=development
```
> **Note**: If `MONGODB_URI` is left unconfigured, SpendWise automatically runs in **Live Demo Mode** using an in-memory data store with pre-populated records.

### 4. (Optional) Seed the Database
To populate your MongoDB instance with default categories, sample transactions, and budgets:
```bash
npm run seed
```

### 5. Launch Application
```bash
npm start
```
The server will start at:
- **Web App**: [http://localhost:5000](http://localhost:5000)
- **API Base**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Health Check**: [http://localhost:5000/api/v1/system/status](http://localhost:5000/api/v1/system/status)

---

## 🔑 Demo Account Credentials

| Field | Value |
|---|---|
| **Email** | `demo@spendwise.com` |
| **Password** | `password123` |
| **Quick Access** | Click **"1-Click Demo Login"** on the login page |

---

## 📡 REST API Reference

All API routes are prefixed with `/api/v1`:

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user | No |
| `POST` | `/auth/login` | Login and receive JWT token | No |
| `GET` | `/auth/me` | Fetch authenticated user profile | Yes |
| `PUT` | `/auth/profile` | Update profile details | Yes |
| `PUT` | `/auth/change-password` | Change password | Yes |

### Dashboard (`/api/v1/dashboard`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/dashboard/stats?month=MM&year=YYYY` | Monthly stats, category charts, budget summaries | Yes |

### Transactions (`/api/v1/transactions`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/transactions?month=MM&year=YYYY&type=...` | List transactions with filters | Yes |
| `POST` | `/transactions` | Create new transaction | Yes |
| `PUT` | `/transactions/:id` | Update existing transaction | Yes |
| `DELETE` | `/transactions/:id` | Delete transaction | Yes |

### Budgets (`/api/v1/budgets`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/budgets?month=MM&year=YYYY` | List budgets with real-time spend calculations | Yes |
| `POST` | `/budgets` | Set or update monthly category budget | Yes |
| `DELETE` | `/budgets/:id` | Remove budget | Yes |

### Analytics (`/api/v1/analytics`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/analytics?months=6` | Multi-month cashflow trends and rankings | Yes |

### System Status (`/api/v1/system`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/system/status` | Server uptime and MongoDB connection state | No |
