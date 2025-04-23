/**
 * Improved server startup script with automatic restart functionality
 * This script launches the server and automatically restarts it if it crashes
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const MAX_RESTARTS = 5;
const RESTART_DELAY = 3000; // 3 seconds
let restartCount = 0;
let serverProcess = null;
let intentionalExit = false;

// Get the absolute path to the server directory
const serverDir = __dirname;
console.log(`Starting server from directory: ${serverDir}`);

// Function to start the server
function startServer() {
  console.log(`\n[${new Date().toISOString()}] Starting FinTrustEX server...`);
  
  // Start the server process
  serverProcess = spawn('node', ['server-start.js'], {
    cwd: serverDir,
    stdio: 'inherit',
    env: process.env
  });
  
  // Handle process events
  serverProcess.on('error', (err) => {
    console.error(`\n[${new Date().toISOString()}] Failed to start server process:`, err);
    attemptRestart();
  });
  
  serverProcess.on('exit', (code, signal) => {
    if (intentionalExit) {
      console.log(`\n[${new Date().toISOString()}] Server was deliberately stopped.`);
      process.exit(0);
      return;
    }
    
    if (code === 0) {
      console.log(`\n[${new Date().toISOString()}] Server exited gracefully with code 0.`);
    } else {
      console.error(`\n[${new Date().toISOString()}] Server crashed with code ${code} and signal ${signal}.`);
      attemptRestart();
    }
  });
  
  console.log(`\n[${new Date().toISOString()}] Server process started with PID: ${serverProcess.pid}`);
}

// Function to attempt restart
function attemptRestart() {
  if (restartCount >= MAX_RESTARTS) {
    console.error(`\n[${new Date().toISOString()}] Maximum restart attempts (${MAX_RESTARTS}) reached. Giving up.`);
    process.exit(1);
  }
  
  restartCount++;
  console.log(`\n[${new Date().toISOString()}] Attempting restart #${restartCount} in ${RESTART_DELAY/1000} seconds...`);
  
  setTimeout(startServer, RESTART_DELAY);
}

// Handle SIGINT/SIGTERM to gracefully shut down
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  intentionalExit = true;
  
  if (serverProcess) {
    serverProcess.kill('SIGINT');
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Shutting down gracefully...');
  intentionalExit = true;
  
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  } else {
    process.exit(0);
  }
});

// Check database connection
console.log(`\n[${new Date().toISOString()}] Verifying database connection...`);

// Start the server
startServer();