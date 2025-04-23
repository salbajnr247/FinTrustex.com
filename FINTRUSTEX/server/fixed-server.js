const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
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

// API Health Check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date().toISOString() });
});

// Determine the correct root directory by checking for the existence of FINTRUSTEX directory
let projectRoot = process.cwd();
let fintrustexRoot;

// First, check if we're already inside FINTRUSTEX
if (path.basename(projectRoot) === 'FINTRUSTEX') {
  fintrustexRoot = projectRoot;
  console.log('Already in FINTRUSTEX directory');
} 
// Check if FINTRUSTEX is a subdirectory of current directory
else if (fs.existsSync(path.join(projectRoot, 'FINTRUSTEX'))) {
  fintrustexRoot = path.join(projectRoot, 'FINTRUSTEX');
  console.log('Found FINTRUSTEX directory in current working directory');
} 
// Check if current directory is inside FINTRUSTEX
else if (projectRoot.includes('FINTRUSTEX')) {
  // Go up until we find the FINTRUSTEX parent
  let currentPath = projectRoot;
  while (path.basename(currentPath) !== 'FINTRUSTEX' && currentPath !== '/') {
    currentPath = path.dirname(currentPath);
  }
  if (path.basename(currentPath) === 'FINTRUSTEX') {
    fintrustexRoot = currentPath;
    console.log('Found parent FINTRUSTEX directory');
  }
}

// If we couldn't find it, default to the current directory
if (!fintrustexRoot) {
  console.error('Could not locate FINTRUSTEX directory, using current directory');
  fintrustexRoot = projectRoot;
}

console.log('Using FINTRUSTEX root at:', fintrustexRoot);

// Serve static files directly
app.use('/assets', express.static(path.join(fintrustexRoot, 'assets')));

// Route to serve the main HTML file
app.get('/', (req, res) => {
  const indexPath = path.join(fintrustexRoot, 'index.html');
  console.log('Serving index from:', indexPath);
  res.sendFile(indexPath);
});

// Handle dashboard routes
app.get('/dashboard', (req, res) => {
  const dashboardPath = path.join(fintrustexRoot, 'dashboard', 'dashboard.html');
  console.log('Serving dashboard from:', dashboardPath);
  res.sendFile(dashboardPath);
});

// Include trailing slash version
app.get('/dashboard/', (req, res) => {
  const dashboardPath = path.join(fintrustexRoot, 'dashboard', 'dashboard.html');
  console.log('Serving dashboard from:', dashboardPath);
  res.sendFile(dashboardPath);
});

// Other page routes
app.get('/auth', (req, res) => {
  res.sendFile(path.join(fintrustexRoot, 'auth.html'));
});

app.get('/legal', (req, res) => {
  res.sendFile(path.join(fintrustexRoot, 'legal.html'));
});

app.get('/support', (req, res) => {
  res.sendFile(path.join(fintrustexRoot, 'support.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(fintrustexRoot, 'settings.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Start HTTP server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});