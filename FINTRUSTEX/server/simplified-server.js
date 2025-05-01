/**
 * Simplified server script for FinTrustEX
 * This script configures and starts the Express server with all required middleware and routes
 */

const express = require('express');
const bodyParser = require('body-parser');
const { createServer } = require('http');
const cors = require('cors');
const path = require('path');
const { setupWebSocketServer } = require('./routes');
const router = require('./routes').default;
const { db } = require('./db');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../')));

// API Routes
app.use('/api', router);

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'An unexpected error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Set up WebSocket server
setupWebSocketServer(httpServer);

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`FinTrustEX server running on port ${PORT}`);
  console.log(`Server time: ${new Date().toISOString()}`);
  
  // Check database connection
  try {
    db.execute('SELECT 1').then(() => {
      console.log('Database connection successful');
    }).catch(err => {
      console.error('Database connection error:', err);
    });
  } catch (error) {
    console.error('Database initialization error:', error);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
});