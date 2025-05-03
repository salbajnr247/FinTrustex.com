# FinTrustEX Crypto Trading Platform

A cutting-edge cryptocurrency trading platform that combines advanced financial technology with intuitive user experience, designed to empower investors through innovative digital solutions.

## Features

- **Binance API Integration** - Trade real cryptocurrencies through the Binance exchange API
- **Real-time Market Data** - Live price updates and order book information via WebSockets
- **Portfolio Management** - Track your crypto holdings and performance
- **Advanced Trading Interface** - Professional trading tools and charts
- **Secure Authentication** - Two-factor authentication and secure credential storage
- **Responsive Design** - Optimized for desktop and mobile devices

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time Communication**: WebSockets (ws)
- **External APIs**: Binance API
- **Authentication**: JWT, bcrypt
- **Payment Processing**: Stripe

## Getting Started

### Prerequisites

- Node.js (v14+)
- PostgreSQL database
- Binance account (for API keys)

### Environment Variables

Create a `.env` file with the following variables:

```
DATABASE_URL=postgresql://username:password@host:port/database
PORT=3000
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/fintrustex.git
   cd fintrustex
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up the database:
   ```
   npm run db:push
   ```

4. Start the server:
   ```
   npm start
   ```

5. Access the application:
   Open your browser and navigate to `http://localhost:3000`

## Binance API Setup

To use the trading features, you'll need to set up a Binance API key:

1. Create an account on [Binance](https://www.binance.com)
2. Go to API Management in your Binance account
3. Create a new API key (enable trading permissions, but disable withdrawals)
4. Enter your API key and secret in the Binance API settings page of FinTrustEX

## WebSocket Data Streams

The platform utilizes WebSocket connections for real-time data:

- Ticker updates: `ws://hostname:port/ws` (subscribe to `ticker_[symbol]`)
- Order book: `ws://hostname:port/ws` (subscribe to `depth_[symbol]`)
- Trades: `ws://hostname:port/ws` (subscribe to `trades_[symbol]`)
- Klines/Candlesticks: `ws://hostname:port/ws` (subscribe to `kline_[symbol]_[interval]`)

## Security Considerations

- API keys are stored encrypted in the database
- Never enable withdrawal permissions for your Binance API keys
- Use strong passwords and enable 2FA on your Binance account
- The platform requires HTTPS in production environments

## License

This project is licensed under the MIT License - see the LICENSE file for details.