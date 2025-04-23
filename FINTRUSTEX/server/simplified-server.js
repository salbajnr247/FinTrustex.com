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

// Route to serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'FINTRUSTEX', 'index.html'));
});

// Handle frontend routes with specific routes instead of wildcard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'FINTRUSTEX', 'dashboard', 'dashboard.html'));
});

app.get('/auth', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'FINTRUSTEX', 'auth.html'));
});

app.get('/legal', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'FINTRUSTEX', 'legal.html'));
});

app.get('/support', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'FINTRUSTEX', 'support.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'FINTRUSTEX', 'settings.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Start HTTP server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});