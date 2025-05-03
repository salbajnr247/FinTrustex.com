#!/bin/bash

# FinTrustEX Startup Script
# This script starts the FinTrustEX platform with WebSocket support

# Display startup banner
echo "=================================================="
echo "  FinTrustEX Crypto Trading Platform"
echo "  Starting up services..."
echo "=================================================="

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  echo "Please set the DATABASE_URL environment variable before starting."
  exit 1
fi

# Check for optional environment variables
if [ -z "$PORT" ]; then
  export PORT=3000
  echo "PORT not set, using default: 3000"
fi

# Check if Binance API package is installed
if ! npm list binance-api-node > /dev/null 2>&1; then
  echo "Installing required packages..."
  npm install binance-api-node ws uuid
fi

# Run database migrations if necessary
echo "Checking database schema..."
cd FINTRUSTEX
if [ -f "drizzle.config.js" ]; then
  echo "Running database migrations..."
  npm run db:push
else
  echo "No database migration configuration found, skipping migrations."
fi
cd ..

# Start the server with WebSocket support
echo "Starting FinTrustEX server..."
echo "WebSocket server will be available at: ws://0.0.0.0:$PORT/ws"
echo "Web interface will be available at: http://0.0.0.0:$PORT"
echo "--------------------------------------------------"

# Run the server
node FINTRUSTEX/server/server.js