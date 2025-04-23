// This script starts the server directly without using the shell script
// This is a more reliable way to start the server in a workflow
console.log('Starting FinTrustEX server...');

// Check database status
if (process.env.DATABASE_URL) {
  console.log('Database configured with provided connection string');
} else {
  console.log('DATABASE_URL environment variable not set!');
  console.log('Some features may not work properly without database connection.');
}

// Start the server
console.log('Starting server...');

// Use the fixed server for more reliable startup
try {
  require('./server/fixed-server.js');
} catch (err) {
  console.error('Failed to start server:', err);
  console.log('Trying fallback to simplified server...');
  try {
    require('./server/simplified-server.js');
  } catch (fallbackErr) {
    console.error('Failed to start fallback server:', fallbackErr);
    process.exit(1);
  }
}