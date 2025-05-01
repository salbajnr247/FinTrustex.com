#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  set -a
  source .env
  set +a
fi

# Check if all required secrets/env variables are set
check_environment() {
  local missing_vars=()
  
  # Critical environment variables
  if [ -z "$DATABASE_URL" ]; then missing_vars+=("DATABASE_URL"); fi
  if [ -z "$STRIPE_SECRET_KEY" ]; then missing_vars+=("STRIPE_SECRET_KEY"); fi
  if [ -z "$VITE_STRIPE_PUBLIC_KEY" ]; then missing_vars+=("VITE_STRIPE_PUBLIC_KEY"); fi
  
  if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "ERROR: The following required environment variables are missing:"
    for var in "${missing_vars[@]}"; do
      echo "  - $var"
    done
    echo "Please set these variables before running the application."
    return 1
  fi
  
  return 0
}

# Check if the database connection is available
check_database() {
  echo "Checking database connection..."
  node -e "
  const { Pool } = require('pg');
  require('dotenv').config();
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Database connection error:', err);
      process.exit(1);
    } else {
      console.log('Database connection successful!');
      process.exit(0);
    }
  });
  "
  return $?
}

# Initialize database if needed
initialize_database() {
  echo "Checking if database needs initialization..."
  # Run a query to check if the users table exists
  table_exists=$(node -e "
  const { Pool } = require('pg');
  require('dotenv').config();
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  pool.query(\"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')\", (err, res) => {
    if (err) {
      console.error('Error checking table existence:', err);
      process.exit(2);
    } else {
      console.log(res.rows[0].exists);
      process.exit(res.rows[0].exists ? 0 : 1);
    }
  });
  ")
  
  local exit_code=$?
  
  if [ $exit_code -eq 1 ]; then
    echo "Database tables do not exist. Running database setup..."
    cd FINTRUSTEX && npm run db:push
    if [ $? -ne 0 ]; then
      echo "Database setup failed!"
      return 1
    fi
    echo "Database setup completed successfully."
  elif [ $exit_code -eq 0 ]; then
    echo "Database tables already exist."
  else
    echo "Error checking database tables."
    return 1
  fi
  
  return 0
}

# Main function to run the application
run_app() {
  echo "Starting FinTrustEX server with WebSocket support..."
  
  # Set environment variables if not already set
  export NODE_ENV=${NODE_ENV:-production}
  export PORT=${PORT:-3000}
  
  # Check environment variables
  check_environment
  if [ $? -ne 0 ]; then
    echo "Environment check failed. Exiting."
    exit 1
  fi
  
  # Check database connection
  check_database
  if [ $? -ne 0 ]; then
    echo "Database connection failed. Please check your configuration."
    exit 1
  fi
  
  # Initialize database if needed
  initialize_database
  if [ $? -ne 0 ]; then
    echo "Database initialization failed. Exiting."
    exit 1
  fi
  
  # Navigate to the project directory
  cd FINTRUSTEX
  
  # Start the server
  echo "Starting server..."
  node server/index.js
}

# Handle termination signals
trap 'echo "Received termination signal. Shutting down..."; exit 0' SIGINT SIGTERM

# Run the application
run_app