"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const users_1 = require("./routes/users");
const wallets_1 = require("./routes/wallets");
const orders_1 = require("./routes/orders");
const transactions_1 = require("./routes/transactions");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// CORS middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
// Root route for health check
app.get('/', (req, res) => {
    res.json({ status: 'API is running' });
});
// User routes
app.post('/api/users', users_1.createUser);
app.get('/api/users', users_1.getUsers);
app.get('/api/users/:id', users_1.getUserById);
// Wallet routes
app.post('/api/wallets', wallets_1.createWallet);
app.get('/api/wallets', wallets_1.getWallets);
app.get('/api/wallets/:id', wallets_1.getWalletById);
app.put('/api/wallets/:id/balance', wallets_1.updateWalletBalance);
// Order routes
app.post('/api/orders', orders_1.createOrder);
app.get('/api/orders', orders_1.getOrders);
app.get('/api/orders/:id', orders_1.getOrderById);
app.put('/api/orders/:id/status', orders_1.updateOrderStatus);
// Transaction routes
app.post('/api/transactions', transactions_1.createTransaction);
app.get('/api/transactions', transactions_1.getTransactions);
app.get('/api/transactions/:id', transactions_1.getTransactionById);
app.put('/api/transactions/:id/status', transactions_1.updateTransactionStatus);
// Serve static files from the FINTRUSTEX directory
app.use(express_1.default.static('FINTRUSTEX'));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
