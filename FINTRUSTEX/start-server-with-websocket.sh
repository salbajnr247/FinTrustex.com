#!/bin/bash

# Start the FinTrustEX server with WebSocket support
echo "Starting FinTrustEX server with WebSocket support..."

# Ensure environment variables are loaded
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' .env | xargs)
fi

# Set default port if not set
if [ -z "$PORT" ]; then
  export PORT=3000
  echo "PORT not set, using default: 3000"
fi

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  exit 1
fi

# Run server
echo "Running server on port $PORT..."
echo "WebSocket server running on ws://0.0.0.0:$PORT/ws"
node FINTRUSTEX/server/server.js