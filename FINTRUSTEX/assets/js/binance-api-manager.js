/**
 * Binance API Manager for FinTrustEX
 * Manages Binance API credentials and interactions with the Binance API endpoints
 */

class BinanceApiManager {
  constructor() {
    this.initialized = false;
    this.apiKeyConfigured = false;
    this.accountInfo = null;
  }

  /**
   * Initialize the Binance API manager
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Check if API key is already configured
      const response = await fetch('/api/binance/account', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
      });

      if (response.ok) {
        this.apiKeyConfigured = true;
        this.accountInfo = await response.json();
        console.log('Binance API already configured. Account info:', this.accountInfo);
      } else {
        console.log('Binance API not configured yet.');
        this.apiKeyConfigured = false;
      }

      this.initialized = true;
      return this.apiKeyConfigured;

    } catch (error) {
      console.error('Error initializing Binance API manager:', error);
      throw error;
    }
  }

  /**
   * Save Binance API credentials
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @returns {Promise<Object>} Result of the API key saving operation
   */
  async saveApiCredentials(apiKey, apiSecret) {
    try {
      if (!apiKey || !apiSecret) {
        throw new Error('API key and secret are required');
      }

      const response = await fetch('/api/binance/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ apiKey, apiSecret })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save API credentials');
      }

      const result = await response.json();
      this.apiKeyConfigured = true;
      
      // Try to fetch account info with the new credentials
      await this.getAccountInfo();

      return result;

    } catch (error) {
      console.error('Error saving Binance API credentials:', error);
      throw error;
    }
  }

  /**
   * Get account information
   * @returns {Promise<Object>} Account information
   */
  async getAccountInfo() {
    try {
      const response = await fetch('/api/binance/account', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get account information');
      }

      this.accountInfo = await response.json();
      return this.accountInfo;

    } catch (error) {
      console.error('Error getting Binance account information:', error);
      throw error;
    }
  }

  /**
   * Get all current prices
   * @returns {Promise<Object>} Object with symbol-price pairs
   */
  async getAllPrices() {
    try {
      const response = await fetch('/api/binance/prices', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get prices');
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting all prices:', error);
      throw error;
    }
  }

  /**
   * Get price for a specific symbol
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @returns {Promise<Object>} Price data
   */
  async getPrice(symbol) {
    try {
      const response = await fetch(`/api/binance/price/${symbol}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to get price for ${symbol}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get order book for a symbol
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {number} limit - Number of orders to retrieve
   * @returns {Promise<Object>} Order book data
   */
  async getOrderBook(symbol, limit = 20) {
    try {
      const response = await fetch(`/api/binance/orderbook/${symbol}?limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to get order book for ${symbol}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`Error getting order book for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get recent trades for a symbol
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {number} limit - Number of trades to retrieve
   * @returns {Promise<Object>} Recent trades data
   */
  async getRecentTrades(symbol, limit = 20) {
    try {
      const response = await fetch(`/api/binance/trades/${symbol}?limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to get trades for ${symbol}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`Error getting recent trades for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Place a market buy order
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} quantity - Order quantity
   * @returns {Promise<Object>} Order result
   */
  async placeMarketBuyOrder(symbol, quantity) {
    try {
      if (!this.apiKeyConfigured) {
        throw new Error('Binance API not configured');
      }

      const response = await fetch('/api/binance/order/market/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ symbol, quantity })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place market buy order');
      }

      return await response.json();

    } catch (error) {
      console.error('Error placing market buy order:', error);
      throw error;
    }
  }

  /**
   * Place a market sell order
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} quantity - Order quantity
   * @returns {Promise<Object>} Order result
   */
  async placeMarketSellOrder(symbol, quantity) {
    try {
      if (!this.apiKeyConfigured) {
        throw new Error('Binance API not configured');
      }

      const response = await fetch('/api/binance/order/market/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ symbol, quantity })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place market sell order');
      }

      return await response.json();

    } catch (error) {
      console.error('Error placing market sell order:', error);
      throw error;
    }
  }

  /**
   * Place a limit buy order
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} quantity - Order quantity
   * @param {string} price - Order price
   * @returns {Promise<Object>} Order result
   */
  async placeLimitBuyOrder(symbol, quantity, price) {
    try {
      if (!this.apiKeyConfigured) {
        throw new Error('Binance API not configured');
      }

      const response = await fetch('/api/binance/order/limit/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ symbol, quantity, price })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place limit buy order');
      }

      return await response.json();

    } catch (error) {
      console.error('Error placing limit buy order:', error);
      throw error;
    }
  }

  /**
   * Place a limit sell order
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} quantity - Order quantity
   * @param {string} price - Order price
   * @returns {Promise<Object>} Order result
   */
  async placeLimitSellOrder(symbol, quantity, price) {
    try {
      if (!this.apiKeyConfigured) {
        throw new Error('Binance API not configured');
      }

      const response = await fetch('/api/binance/order/limit/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ symbol, quantity, price })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place limit sell order');
      }

      return await response.json();

    } catch (error) {
      console.error('Error placing limit sell order:', error);
      throw error;
    }
  }

  /**
   * Get open orders
   * @param {string} symbol - Optional trading pair (e.g., 'BTCUSDT')
   * @returns {Promise<Array>} Open orders
   */
  async getOpenOrders(symbol) {
    try {
      if (!this.apiKeyConfigured) {
        throw new Error('Binance API not configured');
      }

      const url = symbol 
        ? `/api/binance/orders/open?symbol=${symbol}`
        : '/api/binance/orders/open';

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get open orders');
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting open orders:', error);
      throw error;
    }
  }

  /**
   * Get order history for a symbol
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @returns {Promise<Array>} Order history
   */
  async getOrderHistory(symbol) {
    try {
      if (!this.apiKeyConfigured) {
        throw new Error('Binance API not configured');
      }

      const response = await fetch(`/api/binance/orders/history/${symbol}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get order history');
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting order history:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} orderId - Order ID to cancel
   * @returns {Promise<Object>} Cancel result
   */
  async cancelOrder(symbol, orderId) {
    try {
      if (!this.apiKeyConfigured) {
        throw new Error('Binance API not configured');
      }

      const response = await fetch(`/api/binance/order/${symbol}/${orderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel order');
      }

      return await response.json();

    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Check if API key is configured
   * @returns {boolean} True if API key is configured
   */
  isApiKeyConfigured() {
    return this.apiKeyConfigured;
  }

  /**
   * Format asset balances in a user-friendly way
   * @param {Array} balances - Array of asset balances
   * @param {boolean} hideZero - Whether to hide zero balances
   * @returns {Array} Formatted balances
   */
  formatBalances(balances, hideZero = true) {
    if (!balances) return [];
    
    return balances
      .filter(b => !hideZero || parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map(b => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked)
      }))
      .sort((a, b) => b.total - a.total);
  }
}

// Create singleton instance
const binanceApiManager = new BinanceApiManager();