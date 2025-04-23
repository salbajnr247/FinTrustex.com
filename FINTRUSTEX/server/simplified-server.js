const express = require('express');
const http = require('http');
const path = require('path');
require('dotenv').config();

// Create Express application
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
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Serve static files from the current directory
app.use(express.static('.'));

// Root route for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date().toISOString() });
});

// Define project root to avoid duplication
const PROJECT_ROOT = path.join(process.cwd());

// Route to serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'FINTRUSTEX/index.html'));
});

// Serve assets correctly by ensuring proper path recognition
app.get('/assets/*', (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'FINTRUSTEX', req.path));
});

// Handle frontend routes with specific routes instead of wildcard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'FINTRUSTEX/dashboard/dashboard.html'));
});

// Also handle the trailing slash version to prevent redirects
app.get('/dashboard/', (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'FINTRUSTEX/dashboard/dashboard.html'));
});

app.get('/auth', (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'FINTRUSTEX/auth.html'));
});

app.get('/legal', (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'FINTRUSTEX/legal.html'));
});

app.get('/support', (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'FINTRUSTEX/support.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'FINTRUSTEX/settings.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Start HTTP server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});