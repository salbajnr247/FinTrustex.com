/**
 * Improved server startup script for FinTrustEX
 * - Handles path resolution properly
 * - Manages database connection
 * - Provides better error handling
 */

const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { setupWebSocketServer } = require('./server/routes');
const { config } = require('dotenv');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const schema = require('./shared/schema');

// Load environment variables
config();

// Ensure we're in the correct directory
const currentDir = process.cwd();
const isInFintrustex = currentDir.endsWith('FINTRUSTEX');

if (!isInFintrustex) {
  console.log('Already in FINTRUSTEX directory');
} else {
  console.log(`Using FINTRUSTEX root at: ${currentDir}`);
}

// Database connection string check
if (process.env.DATABASE_URL) {
  console.log('Database configured with provided connection string');
} else {
  console.error('ERROR: DATABASE_URL environment variable not set. Database operations will fail.');
}

console.log('Starting server...');

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Define paths
const rootDir = path.resolve(process.cwd());
const staticPath = path.join(rootDir, 'assets');
console.log(`Serving static assets from: ${staticPath}`);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(staticPath));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Handle root route
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
  console.log(`Serving index from: ${path.join(rootDir, 'index.html')}`);
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(rootDir, 'dashboard', 'dashboard.html'));
});

// Trading route
app.get('/dashboard/trading', (req, res) => {
  res.sendFile(path.join(rootDir, 'dashboard', 'trading', 'trading.html'));
});

// Wallet route
app.get('/dashboard/wallet', (req, res) => {
  res.sendFile(path.join(rootDir, 'dashboard', 'wallet', 'wallet.html'));
});

// Orders route
app.get('/dashboard/orders', (req, res) => {
  res.sendFile(path.join(rootDir, 'dashboard', 'orders', 'orders.html'));
});

// Admin route
app.get('/dashboard/admin', (req, res) => {
  res.sendFile(path.join(rootDir, 'dashboard', 'admin', 'admin.html'));
});

// Auth route
app.get('/auth', (req, res) => {
  res.sendFile(path.join(rootDir, 'auth.html'));
});

// Support route
app.get('/support', (req, res) => {
  res.sendFile(path.join(rootDir, 'support.html'));
});

// Legal route
app.get('/legal', (req, res) => {
  res.sendFile(path.join(rootDir, 'legal.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket server for real-time updates
setupWebSocketServer(server);

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`Frontend available at http://localhost:${port}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT signal received. Shutting down...');
  server.close(() => {
    console.log('Server closed gracefully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Shutting down...');
  server.close(() => {
    console.log('Server closed gracefully');
    process.exit(0);
  });
});