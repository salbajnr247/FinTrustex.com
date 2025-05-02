/**
 * FinTrustEX Server
 * Main server file with Express and WebSocket integration
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { initializeWebSocketServer } = require('./websocket-server');
const { setupRoutes } = require('./routes');
const { db } = require('./db');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../assets')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wsServer = initializeWebSocketServer(server);

// Pass WebSocket server to routes setup
setupRoutes(app, wsServer);

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard.html'));
});

// Catch-all route for SPA - redirects to index.html
app.get('*', (req, res) => {
  // Only redirect HTML requests, not API calls or asset requests
  if (req.accepts('html') && !req.path.startsWith('/api/') && !req.path.includes('.')) {
    res.redirect('/');
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await db.query`SELECT 1`;
    console.log('Database connection successful');

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`FinTrustEX server listening on port ${PORT}`);
      console.log(`WebSocket server running on ws://0.0.0.0:${PORT}/ws`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();