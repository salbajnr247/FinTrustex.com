// This file is used to start the server via the Replit workflow
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting FinTrustEX server...');

// Run simplified server
const server = spawn('node', [
  '-r',
  'esbuild-register',
  path.join(__dirname, 'simplified-server.js')
], {
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.kill('SIGTERM');
  process.exit(0);
});