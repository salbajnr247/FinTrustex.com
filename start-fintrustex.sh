#!/bin/bash
# Script to start the FinTrustEX server with improved stability
# This script uses the run-server.js file which includes automatic restart functionality

echo "Starting FinTrustEX server with auto-restart capability..."

# Navigate to the FINTRUSTEX directory
cd FINTRUSTEX || { echo "Failed to navigate to FINTRUSTEX directory"; exit 1; }

# Run the more stable server script that includes auto-restart
node run-server.js