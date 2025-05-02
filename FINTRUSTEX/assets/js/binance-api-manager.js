/**
 * Binance API Manager for FinTrustEX
 * Handles client-side communication with Binance API through server endpoints
 */

/**
 * Binance API Manager Class
 * @class
 */
class BinanceApiManager {
  /**
   * Create a new Binance API Manager
   * @constructor
   */
  constructor() {
    this.isConfigured = false;
    this.isTestnet = true;
    this.balances = [];
    this.openOrders = [];
    this.lastUpdated = {
      balances: null,
      openOrders: null
    };
    this.eventListeners = new Map();
  }

  /**
   * Initialize the Binance API Manager
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      // Check if Binance API is configured for the user
      const response = await this.getApiStatus();
      
      if (response.configured) {
        this.isConfigured = true;
        this.isTestnet = response.isTestnet || true;
        this.triggerEvent('initialized', { success: true });
        
        // Load initial data
        await this.refreshBalances();
        await this.refreshOpenOrders();
        
        return true;
      } else {
        this.isConfigured = false;
        this.triggerEvent('initialized', { success: false, reason: 'API not configured' });
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize Binance API Manager:', error);
      this.triggerEvent('initialized', { success: false, reason: error.message });
      return false;
    }
  }

  /**
   * Check if Binance API is configured for the user
   * @returns {Promise<Object>} API status information
   */
  async getApiStatus() {
    try {
      const response = await fetch('/api/binance/status');
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get API status:', error);
      throw error;
    }
  }

  /**
   * Save Binance API credentials
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} [isTestnet=true] - Whether to use testnet
   * @returns {Promise<Object>} Result of the operation
   */
  async saveApiCredentials(apiKey, apiSecret, isTestnet = true) {
    try {
      const response = await fetch('/api/binance/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          isTestnet
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.isConfigured = true;
        this.isTestnet = isTestnet;
        this.triggerEvent('credentials_updated', { success: true });
      }
      
      return result;
    } catch (error) {
      console.error('Failed to save API credentials:', error);
      this.triggerEvent('credentials_updated', { success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Test Binance API connection with provided credentials
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} [isTestnet=true] - Whether to use testnet
   * @returns {Promise<Object>} Test result
   */
  async testConnection(apiKey, apiSecret, isTestnet = true) {
    try {
      const response = await fetch('/api/binance/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          isTestnet
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to test API connection:', error);
      throw error;
    }
  }

  /**
   * Enable or disable Binance API integration
   * @param {boolean} enabled - Whether to enable Binance API integration
   * @returns {Promise<Object>} Result of the operation
   */
  async toggleApiEnabled(enabled) {
    try {
      const response = await fetch('/api/binance/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.isConfigured = enabled;
        this.triggerEvent('api_toggled', { enabled });
      }
      
      return result;
    } catch (error) {
      console.error('Failed to toggle API:', error);
      throw error;
    }
  }

  /**
   * Toggle testnet mode
   * @param {boolean} isTestnet - Whether to use testnet
   * @returns {Promise<Object>} Result of the operation
   */
  async toggleTestnet(isTestnet) {
    try {
      const response = await fetch('/api/binance/toggle-testnet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isTestnet
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.isTestnet = isTestnet;
        this.triggerEvent('testnet_toggled', { isTestnet });
      }
      
      return result;
    } catch (error) {
      console.error('Failed to toggle testnet:', error);
      throw error;
    }
  }

  /**
   * Get account balances
   * @param {boolean} [refresh=false] - Whether to force refresh from server
   * @returns {Promise<Array>} Account balances
   */
  async getBalances(refresh = false) {
    if (refresh || !this.lastUpdated.balances) {
      await this.refreshBalances();
    }
    
    return this.balances;
  }

  /**
   * Refresh account balances from server
   * @returns {Promise<Array>} Updated account balances
   */
  async refreshBalances() {
    try {
      const response = await fetch('/api/binance/balances');
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update balances and last updated timestamp
      this.balances = data.balances;
      this.lastUpdated.balances = Date.now();
      
      this.triggerEvent('balances_updated', { balances: this.balances });
      
      return this.balances;
    } catch (error) {
      console.error('Failed to refresh balances:', error);
      throw error;
    }
  }

  /**
   * Get open orders
   * @param {boolean} [refresh=false] - Whether to force refresh from server
   * @param {string} [symbol] - Symbol to filter orders by (e.g., 'BTCUSDT')
   * @returns {Promise<Array>} Open orders
   */
  async getOpenOrders(refresh = false, symbol = null) {
    if (refresh || !this.lastUpdated.openOrders) {
      await this.refreshOpenOrders(symbol);
    }
    
    return symbol ? 
      this.openOrders.filter(order => order.symbol === symbol) : 
      this.openOrders;
  }

  /**
   * Refresh open orders from server
   * @param {string} [symbol] - Symbol to filter orders by (e.g., 'BTCUSDT')
   * @returns {Promise<Array>} Updated open orders
   */
  async refreshOpenOrders(symbol = null) {
    try {
      const url = symbol ? 
        `/api/binance/open-orders?symbol=${encodeURIComponent(symbol)}` : 
        '/api/binance/open-orders';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update open orders and last updated timestamp
      this.openOrders = data.orders;
      this.lastUpdated.openOrders = Date.now();
      
      this.triggerEvent('orders_updated', { orders: this.openOrders });
      
      return this.openOrders;
    } catch (error) {
      console.error('Failed to refresh open orders:', error);
      throw error;
    }
  }

  /**
   * Create a market buy order
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} quantity - Amount to buy
   * @returns {Promise<Object>} Order result
   */
  async createMarketBuyOrder(symbol, quantity) {
    try {
      const response = await fetch('/api/binance/market-buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          quantity
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Refresh balances and orders after successful order
      this.refreshBalances();
      this.refreshOpenOrders();
      
      this.triggerEvent('order_created', { 
        type: 'market_buy', 
        symbol, 
        quantity,
        order: result.order
      });
      
      return result;
    } catch (error) {
      console.error('Failed to create market buy order:', error);
      this.triggerEvent('order_error', { 
        type: 'market_buy', 
        symbol, 
        quantity,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create a market sell order
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} quantity - Amount to sell
   * @returns {Promise<Object>} Order result
   */
  async createMarketSellOrder(symbol, quantity) {
    try {
      const response = await fetch('/api/binance/market-sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          quantity
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Refresh balances and orders after successful order
      this.refreshBalances();
      this.refreshOpenOrders();
      
      this.triggerEvent('order_created', { 
        type: 'market_sell', 
        symbol, 
        quantity,
        order: result.order
      });
      
      return result;
    } catch (error) {
      console.error('Failed to create market sell order:', error);
      this.triggerEvent('order_error', { 
        type: 'market_sell', 
        symbol, 
        quantity,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create a limit buy order
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} quantity - Amount to buy
   * @param {string} price - Limit price
   * @returns {Promise<Object>} Order result
   */
  async createLimitBuyOrder(symbol, quantity, price) {
    try {
      const response = await fetch('/api/binance/limit-buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          quantity,
          price
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Refresh open orders after successful order
      this.refreshOpenOrders();
      
      this.triggerEvent('order_created', { 
        type: 'limit_buy', 
        symbol, 
        quantity,
        price,
        order: result.order
      });
      
      return result;
    } catch (error) {
      console.error('Failed to create limit buy order:', error);
      this.triggerEvent('order_error', { 
        type: 'limit_buy', 
        symbol, 
        quantity,
        price,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create a limit sell order
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} quantity - Amount to sell
   * @param {string} price - Limit price
   * @returns {Promise<Object>} Order result
   */
  async createLimitSellOrder(symbol, quantity, price) {
    try {
      const response = await fetch('/api/binance/limit-sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          quantity,
          price
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Refresh open orders after successful order
      this.refreshOpenOrders();
      
      this.triggerEvent('order_created', { 
        type: 'limit_sell', 
        symbol, 
        quantity,
        price,
        order: result.order
      });
      
      return result;
    } catch (error) {
      console.error('Failed to create limit sell order:', error);
      this.triggerEvent('order_error', { 
        type: 'limit_sell', 
        symbol, 
        quantity,
        price,
        error: error.message
      });
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
      const response = await fetch('/api/binance/cancel-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          orderId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Refresh open orders after successful cancellation
      this.refreshOpenOrders();
      
      this.triggerEvent('order_cancelled', { 
        symbol, 
        orderId,
        result
      });
      
      return result;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      this.triggerEvent('cancel_error', { 
        symbol, 
        orderId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get order status
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} orderId - Order ID to check
   * @returns {Promise<Object>} Order status
   */
  async getOrderStatus(symbol, orderId) {
    try {
      const response = await fetch(`/api/binance/order-status?symbol=${encodeURIComponent(symbol)}&orderId=${orderId}`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get order status:', error);
      throw error;
    }
  }

  /**
   * Get trade history for a symbol
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @returns {Promise<Array>} Trade history
   */
  async getTradeHistory(symbol) {
    try {
      const response = await fetch(`/api/binance/trade-history?symbol=${encodeURIComponent(symbol)}`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get trade history:', error);
      throw error;
    }
  }

  /**
   * Add an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (!this.eventListeners.has(event)) {
      return;
    }
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    
    if (listeners.length === 0) {
      this.eventListeners.delete(event);
    }
  }

  /**
   * Trigger event listeners for an event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @private
   */
  triggerEvent(event, data) {
    if (!this.eventListeners.has(event)) {
      return;
    }
    
    this.eventListeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

// Create singleton instance
const binanceApiManager = new BinanceApiManager();

// Export singleton
window.binanceApiManager = binanceApiManager;