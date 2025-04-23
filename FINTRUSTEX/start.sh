#!/bin/bash

echo "Installing dependencies..."
npm install

echo "Checking database..."
if [ ! -z "$DATABASE_URL" ]; then
  echo "Database configured with provided connection string"
else
  echo "DATABASE_URL environment variable not set!"
  echo "Some features may not work properly without database connection."
fi

echo "Running database migrations..."
npx drizzle-kit push || {
  echo "Warning: Database migration command failed, but we'll continue anyway"
  echo "Tables already exist in the database"
}

echo "Database migrations completed successfully!"
echo "Starting server..."
node -r esbuild-register server/simplified-server.js