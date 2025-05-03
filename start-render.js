/**
 * Render Deployment Start Script for FinTrustEX
 * This script launches the server optimized for Render's environment
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const SERVER_PATH = path.join(__dirname, 'FINTRUSTEX', 'server', 'server.js');
const MAX_RESTART_ATTEMPTS = 3;
const RESTART_DELAY = 5000; // 5 seconds

// Tracking variables
let attempts = 0;
let serverProcess = null;

function startServer() {
  console.log('\n[Render Deployment] Starting FinTrustEX server...');
  
  // Check if server file exists
  if (!fs.existsSync(SERVER_PATH)) {
    console.error(`[FATAL ERROR] Server file not found at: ${SERVER_PATH}`);
    process.exit(1);
  }
  
  // Environment validation for Render
  if (!process.env.DATABASE_URL) {
    console.warn('[WARNING] DATABASE_URL environment variable is not set');
  }
  
  // Set NODE_ENV to production for Render
  process.env.NODE_ENV = 'production';
  
  // Start the server process
  serverProcess = spawn('node', [SERVER_PATH], { 
    stdio: 'inherit',
    env: process.env
  });
  
  // Handle process events
  serverProcess.on('error', (err) => {
    console.error(`[ERROR] Failed to start server: ${err.message}`);
    attemptRestart();
  });
  
  serverProcess.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error(`[ERROR] Server exited with code ${code}, signal: ${signal}`);
      attemptRestart();
    } else {
      console.log('[INFO] Server shutdown gracefully');
      process.exit(0);
    }
  });
  
  console.log(`[INFO] Server process started with PID: ${serverProcess.pid}`);
}

function attemptRestart() {
  attempts++;
  
  if (attempts < MAX_RESTART_ATTEMPTS) {
    console.log(`[INFO] Attempting restart (${attempts}/${MAX_RESTART_ATTEMPTS}) in ${RESTART_DELAY/1000} seconds...`);
    
    setTimeout(() => {
      startServer();
    }, RESTART_DELAY);
  } else {
    console.error('[FATAL ERROR] Maximum restart attempts reached. Exiting.');
    process.exit(1);
  }
}

// Handle process termination signals
process.on('SIGINT', () => {
  console.log('[INFO] Received SIGINT signal. Shutting down gracefully...');
  if (serverProcess) {
    serverProcess.kill('SIGINT');
  }
});

process.on('SIGTERM', () => {
  console.log('[INFO] Received SIGTERM signal. Shutting down gracefully...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
});

// Start the server
startServer();