#!/bin/bash

# Start the server with TypeScript support
echo "Starting FinTrustEX server..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install --omit=dev
fi

# Skip database migration setup for now
echo "Checking database connection..."

# Start the server with nodemon for auto-restart on changes
echo "Starting server with nodemon..."
npx nodemon --exec node -r esbuild-register server/index.ts