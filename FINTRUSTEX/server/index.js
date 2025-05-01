"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const express = require("express");
const http = require("http");
require("dotenv/config");
const userRoutes = require("./routes/users");
const walletRoutes = require("./routes/wallets");
const orderRoutes = require("./routes/orders");
const transactionRoutes = require("./routes/transactions");
const routes_1 = require("./routes");
const path = require("path");
const aiRouter = require("./routes/ai").default;
const db_1 = require("./db");
const { authenticate } = require("./middleware/auth");

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection check
async function initDatabase() {
    try {
        const result = await db_1.pool.query('SELECT NOW()');
        console.log('Database connection successful!');
    }
    catch (error) {
        console.error('Failed to connect to database:', error);
        process.exit(1);
    }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Root route for health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'API is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
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

// Middleware for transaction routes
app.use('/api/transactions', authenticate);

// Transaction routes
app.post('/api/transactions', transactionRoutes.createTransaction);
app.get('/api/transactions', transactionRoutes.getTransactions);
app.get('/api/transactions/:id', transactionRoutes.getTransactionById);
app.put('/api/transactions/:id/status', transactionRoutes.updateTransactionStatus);
app.get('/api/transactions/:id/receipt', transactionRoutes.getTransactionReceipt);
app.post('/api/transactions/filter', transactionRoutes.filterTransactions);

// AI Chat routes
app.use('/api/ai', aiRouter);

// Serve static files from the current directory
app.use(express.static('.'));

// Route to serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Handle frontend routes (SPA fallback)
app.get('*', (req, res) => {
    // If the request is for an API route, let it pass through to 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // Otherwise, serve the main HTML file to support SPA routing
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Parse PORT to number to avoid TypeScript errors
const serverPort = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

async function startServer() {
    try {
        // Check database connection before starting the server
        await initDatabase();
        
        // Create HTTP server
        const server = http.createServer(app);
        
        // Setup WebSocket server
        const wss = require('./routes').setupWebSocketServer(server);
        console.log('WebSocket server initialized');
        
        // Start HTTP server
        server.listen(serverPort, '0.0.0.0', () => {
            console.log(`Server running on port ${serverPort}`);
            console.log(`API available at http://localhost:${serverPort}/api`);
            console.log(`WebSocket available at ws://localhost:${serverPort}/ws`);
            console.log(`Frontend available at http://localhost:${serverPort}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();