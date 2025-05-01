/**
 * Server Start Script for FinTrustEX
 * This script launches the server with appropriate error handling and logging
 */

require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

// Start the server process
function startServer() {
  console.log('Starting FinTrustEX server...');
  
  const serverProcess = spawn('node', [path.join(__dirname, 'server/index.js')], {
    stdio: 'inherit'
  });
  
  // Handle process events
  serverProcess.on('error', (error) => {
    console.error('Failed to start server process:', error);
    process.exit(1);
  });
  
  serverProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Server process exited with code ${code}`);
      // Attempt to restart after a delay
      setTimeout(() => {
        console.log('Attempting to restart server...');
        startServer();
      }, 5000);
    } else {
      console.log('Server stopped gracefully');
    }
  });
  
  // Handle termination signals
  process.on('SIGINT', () => {
    console.log('Received SIGINT. Shutting down server...');
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Shutting down server...');
    serverProcess.kill('SIGTERM');
  });
}

// Start the server
startServer();