#!/bin/bash

# Start script for FinTrustEX server with WebSocket support
# This script handles database availability and proper server initialization

echo "Starting FinTrustEX server with WebSocket support..."

# Check if database is accessible
if [ -n "$DATABASE_URL" ]; then
  echo "Checking database connection..."
  pg_isready -d "$DATABASE_URL" -t 5
  DB_STATUS=$?
  
  if [ $DB_STATUS -ne 0 ]; then
    echo "Database is not available. Please check your database configuration."
    exit 1
  fi
  
  echo "Database connection verified."
else
  echo "No DATABASE_URL environment variable found. Database operations may fail."
fi

# Set NODE_ENV if not already set
if [ -z "$NODE_ENV" ]; then
  export NODE_ENV=development
  echo "NODE_ENV set to development"
fi

# Check if Binance API node package is installed
if ! npm list binance-api-node &>/dev/null; then
  echo "Installing binance-api-node package..."
  npm install binance-api-node
fi

echo "Starting server..."
node server/index.js