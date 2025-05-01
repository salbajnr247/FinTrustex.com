#!/bin/bash

# Start the server with WebSocket support
echo "Starting FinTrustEX server with WebSocket support..."
cd FINTRUSTEX

# Set environment variables if not already set
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}

# Check database and start server
node server/index.js