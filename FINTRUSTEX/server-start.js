// This script starts the server directly without using the shell script
// This is a more reliable way to start the server in a workflow

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Log startup information
console.log('Starting FinTrustEX server...');

// Run in the FINTRUSTEX directory
process.chdir(path.join(__dirname));

// Check database status
if (process.env.DATABASE_URL) {
  console.log('Database configured with provided connection string');
} else {
  console.log('DATABASE_URL environment variable not set!');
  console.log('Some features may not work properly without database connection.');
}

// Start the server
console.log('Starting server...');
require('./server/simplified-server.js');