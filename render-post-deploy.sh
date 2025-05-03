#!/bin/bash

# Render Post-Deployment Script for FinTrustEX
# Run this script once after your first deployment to set up the database

echo "Running FinTrustEX post-deployment setup..."

# Initialize the database
echo "Setting up database..."
node FINTRUSTEX/render-db-setup.js

# Check if successful
if [ $? -eq 0 ]; then
  echo "✅ Database initialization complete!"
  echo "✅ FinTrustEX is now ready to use!"
else
  echo "❌ Database initialization failed. Check the logs for details."
  exit 1
fi

echo ""
echo "============================================"
echo "  FinTrustEX Setup Complete"
echo "============================================"
echo ""
echo "You can now access your application at your Render URL"
echo "Default admin credentials:"
echo "  Username: admin"
echo "  Password: adminpass"
echo ""
echo "IMPORTANT: Be sure to change the admin password after first login!"
echo "============================================"