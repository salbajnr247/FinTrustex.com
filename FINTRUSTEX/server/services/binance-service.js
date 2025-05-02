/**
 * Binance API Service for FinTrustEX
 * Provides interface to interact with Binance cryptocurrency exchange
 */

require('dotenv').config();
const Binance = require('binance-api-node').default;

class BinanceService {
  constructor() {
    this.clients = new Map(); // Map to store client instances by userId
    this.publicClient = null; // Public client for market data (no authentication)
    this.initPublicClient();
  }

  /**
   * Initialize public client for market data
   */
  initPublicClient() {
    this.publicClient = Binance();
    console.log('Binance public client initialized');
  }

  /**
   * Initialize authenticated client for a user
   * @param {string} userId - User ID
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @returns {Object} Binance client
   */
  initUserClient(userId, apiKey, apiSecret) {
    try {
      if (!apiKey || !apiSecret) {
        throw new Error('API key and secret are required');
      }

      const client = Binance({
        apiKey,
        apiSecret,
        // Use test server if in development mode
        httpBase: process.env.NODE_ENV !== 'production' ? 'https://testnet.binance.vision' : undefined
      });

      this.clients.set(userId, client);
      console.log(`Binance client initialized for user ${userId}`);
      return client;
    } catch (error) {
      console.error('Failed to initialize Binance client:', error);
      throw error;
    }
  }

  /**
   * Get client instance for a user
   * @param {string} userId - User ID
   * @returns {Object} Binance client
   */
  getUserClient(userId) {
    return this.clients.get(userId);
  }

  /**
   * Check if user has an active Binance client
   * @param {string} userId - User ID
   * @returns {boolean} - True if user has a client
   */
  hasUserClient(userId) {
    return this.clients.has(userId);
  }

  /**
   * Get market price for a symbol
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @returns {Promise<Object>} Price data
   */
  async getPrice(symbol) {
    try {
      return await this.publicClient.prices({ symbol });
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get current prices for all symbols
   * @returns {Promise<Object>} All prices
   */
  async getAllPrices() {
    try {
      return await this.publicClient.prices();
    } catch (error) {
      console.error('Error fetching all prices:', error);
      throw error;
    }
  }

  /**
   * Get detailed ticker information for a symbol
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @returns {Promise<Object>} Ticker data
   */
  async getTicker(symbol) {
    try {
      return await this.publicClient.dailyStats({ symbol });
    } catch (error) {
      console.error(`Error fetching ticker for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get market depth (order book) for a symbol
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {number} limit - Number of orders to retrieve
   * @returns {Promise<Object>} Order book data
   */
  async getOrderBook(symbol, limit = 20) {
    try {
      return await this.publicClient.book({ symbol, limit });
    } catch (error) {
      console.error(`Error fetching order book for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get recent trades for a symbol
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {number} limit - Number of trades to retrieve
   * @returns {Promise<Array>} Recent trades
   */
  async getRecentTrades(symbol, limit = 20) {
    try {
      return await this.publicClient.trades({ symbol, limit });
    } catch (error) {
      console.error(`Error fetching recent trades for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get exchange information (trading rules, symbol info)
   * @returns {Promise<Object>} Exchange information
   */
  async getExchangeInfo() {
    try {
      return await this.publicClient.exchangeInfo();
    } catch (error) {
      console.error('Error fetching exchange info:', error);
      throw error;
    }
  }

  /**
   * Create a market buy order
   * @param {string} userId - User ID
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} quantity - Order quantity
   * @returns {Promise<Object>} Order result
   */
  async createMarketBuyOrder(userId, symbol, quantity) {
    const client = this.getUserClient(userId);
    if (!client) {
      throw new Error('User has no Binance API client configured');
    }

    try {
      return await client.order({
        symbol,
        side: 'BUY',
        type: 'MARKET',
        quantity
      });
    } catch (error) {
      console.error(`Error creating market buy order for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Create a market sell order
   * @param {string} userId - User ID
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} quantity - Order quantity
   * @returns {Promise<Object>} Order result
   */
  async createMarketSellOrder(userId, symbol, quantity) {
    const client = this.getUserClient(userId);
    if (!client) {
      throw new Error('User has no Binance API client configured');
    }

    try {
      return await client.order({
        symbol,
        side: 'SELL',
        type: 'MARKET',
        quantity
      });
    } catch (error) {
      console.error(`Error creating market sell order for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Create a limit buy order
   * @param {string} userId - User ID
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} quantity - Order quantity
   * @param {string} price - Order price
   * @returns {Promise<Object>} Order result
   */
  async createLimitBuyOrder(userId, symbol, quantity, price) {
    const client = this.getUserClient(userId);
    if (!client) {
      throw new Error('User has no Binance API client configured');
    }

    try {
      return await client.order({
        symbol,
        side: 'BUY',
        type: 'LIMIT',
        timeInForce: 'GTC',
        quantity,
        price
      });
    } catch (error) {
      console.error(`Error creating limit buy order for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Create a limit sell order
   * @param {string} userId - User ID
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} quantity - Order quantity
   * @param {string} price - Order price
   * @returns {Promise<Object>} Order result
   */
  async createLimitSellOrder(userId, symbol, quantity, price) {
    const client = this.getUserClient(userId);
    if (!client) {
      throw new Error('User has no Binance API client configured');
    }

    try {
      return await client.order({
        symbol,
        side: 'SELL',
        type: 'LIMIT',
        timeInForce: 'GTC',
        quantity,
        price
      });
    } catch (error) {
      console.error(`Error creating limit sell order for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get user's account information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Account information
   */
  async getAccountInfo(userId) {
    const client = this.getUserClient(userId);
    if (!client) {
      throw new Error('User has no Binance API client configured');
    }

    try {
      return await client.accountInfo();
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw error;
    }
  }

  /**
   * Get user's open orders
   * @param {string} userId - User ID
   * @param {string} symbol - Trading pair (optional)
   * @returns {Promise<Array>} Open orders
   */
  async getOpenOrders(userId, symbol) {
    const client = this.getUserClient(userId);
    if (!client) {
      throw new Error('User has no Binance API client configured');
    }

    try {
      return await client.openOrders({
        symbol
      });
    } catch (error) {
      console.error('Error fetching open orders:', error);
      throw error;
    }
  }

  /**
   * Get user's order history
   * @param {string} userId - User ID
   * @param {string} symbol - Trading pair
   * @returns {Promise<Array>} Order history
   */
  async getOrderHistory(userId, symbol) {
    const client = this.getUserClient(userId);
    if (!client) {
      throw new Error('User has no Binance API client configured');
    }

    try {
      return await client.allOrders({
        symbol
      });
    } catch (error) {
      console.error('Error fetching order history:', error);
      throw error;
    }
  }

  /**
   * Cancel an open order
   * @param {string} userId - User ID
   * @param {string} symbol - Trading pair
   * @param {string} orderId - Order ID to cancel
   * @returns {Promise<Object>} Cancel result
   */
  async cancelOrder(userId, symbol, orderId) {
    const client = this.getUserClient(userId);
    if (!client) {
      throw new Error('User has no Binance API client configured');
    }

    try {
      return await client.cancelOrder({
        symbol,
        orderId
      });
    } catch (error) {
      console.error(`Error cancelling order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Setup WebSocket connection for real-time updates
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Cleanup function to close the connection
   */
  subscribeToTrades(symbol, callback) {
    try {
      const clean = this.publicClient.ws.trades(symbol, trade => {
        callback(trade);
      });
      return clean;
    } catch (error) {
      console.error(`Error subscribing to trades for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Setup WebSocket connection for real-time candlestick data
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} interval - Candlestick interval (e.g., '1m', '1h', '1d')
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Cleanup function to close the connection
   */
  subscribeToCandles(symbol, interval, callback) {
    try {
      const clean = this.publicClient.ws.candles(symbol, interval, candle => {
        callback(candle);
      });
      return clean;
    } catch (error) {
      console.error(`Error subscribing to candles for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Setup WebSocket connection for real-time order book updates
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Cleanup function to close the connection
   */
  subscribeToDepth(symbol, callback) {
    try {
      const clean = this.publicClient.ws.depth(symbol, depth => {
        callback(depth);
      });
      return clean;
    } catch (error) {
      console.error(`Error subscribing to depth for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to user-specific account updates
   * @param {string} userId - User ID
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Cleanup function to close the connection
   */
  subscribeToUserData(userId, callback) {
    const client = this.getUserClient(userId);
    if (!client) {
      throw new Error('User has no Binance API client configured');
    }

    try {
      return client.ws.user(data => {
        callback(data);
      });
    } catch (error) {
      console.error('Error subscribing to user data:', error);
      throw error;
    }
  }
}

// Create singleton instance
const binanceService = new BinanceService();

module.exports = binanceService;