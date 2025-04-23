#!/bin/bash
# Script to start the FinTrustEX server

echo "Starting FinTrustEX server..."

# Navigate to the FINTRUSTEX directory
cd FINTRUSTEX || { echo "Failed to navigate to FINTRUSTEX directory"; exit 1; }

# Run the server
node server-start.js