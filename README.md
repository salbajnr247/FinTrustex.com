# FinTrustEX - Financial Trading Platform

A cutting-edge crypto trading platform that combines advanced financial technology with intuitive user experience, designed to empower investors through innovative digital solutions.

## Core Technologies

- Vite.js Frontend
- Node.js Backend
- WebSocket Real-time Communication
- Stripe Payment Integration
- Multi-factor Authentication
- Responsive Design with Advanced Analytics
- Modular Wallet Management System
- Binance API Integration

## Deployment on Render

This project is optimized for deployment on Render. Follow these steps to deploy:

1. **Fork/Clone the Repository**:
   ```
   git clone https://github.com/yourusername/fintrustex.git
   cd fintrustex
   ```

2. **Create a Render Account**:
   - Go to [render.com](https://render.com/) and sign up
   - Verify your email and log in

3. **Deploy via Blueprint**:
   - From your Render dashboard, click "New" → "Blueprint"
   - Connect your repository
   - Render will automatically detect the `render.yaml` file
   - Review the configuration and click "Apply"

4. **Set Environment Variables**:
   - After deployment, go to your web service
   - In the "Environment" section, add your secret values:
     - `STRIPE_SECRET_KEY`: Your Stripe secret key
     - `VITE_STRIPE_PUBLIC_KEY`: Your Stripe public key
     - Any other secrets your application needs

5. **Database Setup**:
   - The PostgreSQL database will be created automatically
   - The connection string will be available as `DATABASE_URL`

6. **First-Time Database Initialization**:
   - After deploying, run the database setup via the Render shell:
   ```
   node FINTRUSTEX/setup-database.js
   ```

## Local Development

1. **Install Dependencies**:
   ```
   npm install
   ```

2. **Set Up Environment Variables**:
   - Copy `.env.example` to `.env`
   - Fill in your local configuration values

3. **Set Up the Database**:
   - Create a PostgreSQL database
   - Run the setup script:
   ```
   node FINTRUSTEX/setup-database.js
   ```

4. **Start the Server**:
   ```
   node FINTRUSTEX/server/server.js
   ```

## Features

- **User Authentication**: Secure login with 2FA
- **Wallet Management**: Create and manage cryptocurrency wallets
- **Real-time Trading**: Execute trades with real-time price updates
- **Market Data**: Live cryptocurrency price tracking
- **Transaction History**: Comprehensive record of all transactions
- **Binance API Integration**: Connect to your Binance account
- **Admin Dashboard**: For platform management

## Binance API Integration

The platform integrates with Binance API allowing users to:

1. Connect their Binance account via API keys
2. View real-time balances across all cryptocurrencies
3. Execute trades directly from the platform
4. Track order status and history
5. Receive real-time market data

## License

[MIT License](LICENSE)

## Contact

For questions or support, contact us at support@fintrustex.com