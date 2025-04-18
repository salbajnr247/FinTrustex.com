import express from 'express';
import 'dotenv/config';
import * as userRoutes from './routes/users';
import * as walletRoutes from './routes/wallets';
import * as orderRoutes from './routes/orders';
import * as transactionRoutes from './routes/transactions';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.post('/api/users', userRoutes.createUser);
app.get('/api/users', userRoutes.getUsers);
app.get('/api/users/:id', userRoutes.getUserById);

// Wallet routes
app.post('/api/wallets', walletRoutes.createWallet);
app.get('/api/wallets', walletRoutes.getWallets);
app.get('/api/wallets/:id', walletRoutes.getWalletById);
app.put('/api/wallets/:id/balance', walletRoutes.updateWalletBalance);

// Order routes
app.post('/api/orders', orderRoutes.createOrder);
app.get('/api/orders', orderRoutes.getOrders);
app.get('/api/orders/:id', orderRoutes.getOrderById);
app.put('/api/orders/:id/status', orderRoutes.updateOrderStatus);

// Transaction routes
app.post('/api/transactions', transactionRoutes.createTransaction);
app.get('/api/transactions', transactionRoutes.getTransactions);
app.get('/api/transactions/:id', transactionRoutes.getTransactionById);
app.put('/api/transactions/:id/status', transactionRoutes.updateTransactionStatus);

// Serve static files from the FINTRUSTEX directory
app.use(express.static('FINTRUSTEX'));

// Parse PORT to number to avoid TypeScript errors
const serverPort = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

app.listen(serverPort, '0.0.0.0', () => {
  console.log(`Server running on port ${serverPort}`);
});