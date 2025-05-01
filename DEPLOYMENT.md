# FINTRUSTEX Deployment Guide

This guide provides instructions for deploying the FINTRUSTEX application on Replit.

## Prerequisites

- PostgreSQL database (connection string should be set in the DATABASE_URL environment variable)
- Stripe API keys (if using payment functionality)
- Node.js and npm

## Environment Variables

The following environment variables need to be set:

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode ('development' or 'production')
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `VITE_STRIPE_PUBLIC_KEY`: Stripe API public key (for client-side)

## Deployment Steps

1. **Check Database Connection**

   Ensure your PostgreSQL database is properly configured and accessible. The application will check the database connection during startup.

2. **Start the Server**

   Run the application using the provided run script:

   ```bash
   ./run.sh
   ```

   This script will:
   - Check the database connection
   - Set required environment variables
   - Start the server with WebSocket support

3. **Verify Deployment**

   Once deployed, you can access:
   - The frontend at: `https://your-replit-url.replit.app/`
   - The API at: `https://your-replit-url.replit.app/api`
   - WebSocket at: `wss://your-replit-url.replit.app/ws`

## Troubleshooting

- **Database Connection Issues**: Verify your DATABASE_URL is correct and the database is accessible from Replit.
- **Missing Index.html**: Ensure the index.html file exists in the root directory of the FINTRUSTEX folder.
- **WebSocket Connection Failed**: Check browser console for connection errors and ensure your client is using the correct WebSocket URL.
- **API Endpoints Not Found**: Verify the API routes are properly registered in the server/routes.js file.

## Maintenance

- **Logs**: Check the Replit console for server logs and error messages.
- **Updates**: Pull the latest changes and restart the server to apply updates.
- **Database Migrations**: Run the database migration script if there are schema changes:

  ```bash
  cd FINTRUSTEX && npm run db:migrate
  ```

## Security Notes

- Ensure sensitive API keys are properly stored as Replit Secrets
- Regularly update dependencies to address security vulnerabilities
- Implement proper input validation for all API endpoints