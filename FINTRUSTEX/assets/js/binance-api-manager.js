/**
 * Binance API Manager
 * Handles communication with the Binance API through the backend
 */

class BinanceApiManager {
  constructor() {
    this.initialized = false;
    this.apiEnabled = false;
    this.eventListeners = {};
    this.cachedBalances = [];
    this.cachedOpenOrders = [];
    this.cachedOrderHistory = [];
  }

  /**
   * Initialize the Binance API manager
   * @returns {Promise<boolean>} True if the API is configured and enabled
   */
  async initialize() {
    try {
      const response = await fetch('/api/binance/status');
      const data = await response.json();

      this.apiEnabled = data.enabled;
      this.initialized = true;

      return this.apiEnabled;
    } catch (error) {
      console.error('Error initializing Binance API manager:', error);
      this.apiEnabled = false;
      this.initialized = false;
      return false;
    }
  }

  /**
   * Get account balances
   * @param {boolean} [forceRefresh=false] Force a refresh from the server
   * @returns {Promise<Array>} Balances
   */
  async getBalances(forceRefresh = false) {
    if (!this.apiEnabled) {
      throw new Error('Binance API is not enabled');
    }

    if (this.cachedBalances.length > 0 && !forceRefresh) {
      return this.cachedBalances;
    }

    try {
      const response = await fetch('/api/binance/account/balances');
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Filter out zero balances
      this.cachedBalances = data.balances.filter(balance => 
        parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0
      );

      // Emit event
      this.emit('balances_updated', { balances: this.cachedBalances });

      return this.cachedBalances;
    } catch (error) {
      console.error('Error fetching balances:', error);
      throw error;
    }
  }

  /**
   * Get open orders
   * @param {boolean} [forceRefresh=false] Force a refresh from the server
   * @param {string} [symbol] Symbol to filter by
   * @returns {Promise<Array>} Open orders
   */
  async getOpenOrders(forceRefresh = false, symbol = null) {
    if (!this.apiEnabled) {
      throw new Error('Binance API is not enabled');
    }

    if (this.cachedOpenOrders.length > 0 && !forceRefresh) {
      return symbol 
        ? this.cachedOpenOrders.filter(order => order.symbol === symbol)
        : this.cachedOpenOrders;
    }

    try {
      const url = symbol
        ? `/api/binance/orders/open?symbol=${symbol}`
        : '/api/binance/orders/open';
        
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      this.cachedOpenOrders = data.orders;

      // Emit event
      this.emit('orders_updated', { orders: this.cachedOpenOrders });

      return this.cachedOpenOrders;
    } catch (error) {
      console.error('Error fetching open orders:', error);
      throw error;
    }
  }

  /**
   * Get order history
   * @param {boolean} [forceRefresh=false] Force a refresh from the server
   * @param {string} [symbol] Symbol to filter by
   * @returns {Promise<Array>} Order history
   */
  async getOrderHistory(forceRefresh = false, symbol = null) {
    if (!this.apiEnabled) {
      throw new Error('Binance API is not enabled');
    }

    if (this.cachedOrderHistory.length > 0 && !forceRefresh) {
      return symbol 
        ? this.cachedOrderHistory.filter(order => order.symbol === symbol)
        : this.cachedOrderHistory;
    }

    try {
      const url = symbol
        ? `/api/binance/orders/history?symbol=${symbol}`
        : '/api/binance/orders/history';
        
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      this.cachedOrderHistory = data.orders;

      return this.cachedOrderHistory;
    } catch (error) {
      console.error('Error fetching order history:', error);
      throw error;
    }
  }

  /**
   * Create a limit buy order
   * @param {string} symbol Symbol to buy
   * @param {string} quantity Quantity to buy
   * @param {string} price Price to buy at
   * @returns {Promise<Object>} Order details
   */
  async createLimitBuyOrder(symbol, quantity, price) {
    if (!this.apiEnabled) {
      throw new Error('Binance API is not enabled');
    }

    try {
      const response = await fetch('/api/binance/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          side: 'BUY',
          type: 'LIMIT',
          timeInForce: 'GTC',
          quantity,
          price
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh open orders
      await this.getOpenOrders(true);

      return data.order;
    } catch (error) {
      console.error('Error creating buy order:', error);
      throw error;
    }
  }

  /**
   * Create a limit sell order
   * @param {string} symbol Symbol to sell
   * @param {string} quantity Quantity to sell
   * @param {string} price Price to sell at
   * @returns {Promise<Object>} Order details
   */
  async createLimitSellOrder(symbol, quantity, price) {
    if (!this.apiEnabled) {
      throw new Error('Binance API is not enabled');
    }

    try {
      const response = await fetch('/api/binance/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          side: 'SELL',
          type: 'LIMIT',
          timeInForce: 'GTC',
          quantity,
          price
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh open orders
      await this.getOpenOrders(true);

      return data.order;
    } catch (error) {
      console.error('Error creating sell order:', error);
      throw error;
    }
  }

  /**
   * Create a market buy order
   * @param {string} symbol Symbol to buy
   * @param {string} quantity Quantity to buy
   * @returns {Promise<Object>} Order details
   */
  async createMarketBuyOrder(symbol, quantity) {
    if (!this.apiEnabled) {
      throw new Error('Binance API is not enabled');
    }

    try {
      const response = await fetch('/api/binance/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          side: 'BUY',
          type: 'MARKET',
          quantity
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh balances and order history
      await this.getBalances(true);
      await this.getOrderHistory(true);

      return data.order;
    } catch (error) {
      console.error('Error creating market buy order:', error);
      throw error;
    }
  }

  /**
   * Create a market sell order
   * @param {string} symbol Symbol to sell
   * @param {string} quantity Quantity to sell
   * @returns {Promise<Object>} Order details
   */
  async createMarketSellOrder(symbol, quantity) {
    if (!this.apiEnabled) {
      throw new Error('Binance API is not enabled');
    }

    try {
      const response = await fetch('/api/binance/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          side: 'SELL',
          type: 'MARKET',
          quantity
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh balances and order history
      await this.getBalances(true);
      await this.getOrderHistory(true);

      return data.order;
    } catch (error) {
      console.error('Error creating market sell order:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   * @param {string} symbol Symbol of the order
   * @param {string} orderId ID of the order to cancel
   * @returns {Promise<Object>} Cancellation details
   */
  async cancelOrder(symbol, orderId) {
    if (!this.apiEnabled) {
      throw new Error('Binance API is not enabled');
    }

    try {
      const response = await fetch(`/api/binance/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh open orders
      await this.getOpenOrders(true);

      return data.result;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Save API credentials
   * @param {string} apiKey Binance API key
   * @param {string} apiSecret Binance API secret
   * @param {boolean} [testnet=false] Use testnet
   * @returns {Promise<Object>} Result
   */
  async saveApiCredentials(apiKey, apiSecret, testnet = false) {
    try {
      const response = await fetch('/api/binance/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          testnet
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Update status
      this.apiEnabled = data.enabled;

      return data;
    } catch (error) {
      console.error('Error saving API credentials:', error);
      throw error;
    }
  }

  /**
   * Toggle testnet mode
   * @param {boolean} enabled Whether to enable testnet
   * @returns {Promise<Object>} Result
   */
  async toggleTestnet(enabled) {
    try {
      const response = await fetch('/api/binance/testnet', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('Error toggling testnet:', error);
      throw error;
    }
  }

  /**
   * Get API settings
   * @returns {Promise<Object>} API settings
   */
  async getApiSettings() {
    try {
      const response = await fetch('/api/binance/settings');
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('Error fetching API settings:', error);
      throw error;
    }
  }

  /**
   * Register an event listener
   * @param {string} event Event name
   * @param {Function} callback Callback function
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove an event listener
   * @param {string} event Event name
   * @param {Function} callback Callback function
   */
  off(event, callback) {
    if (!this.eventListeners[event]) {
      return;
    }
    
    this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    
    if (this.eventListeners[event].length === 0) {
      delete this.eventListeners[event];
    }
  }

  /**
   * Emit an event
   * @param {string} event Event name
   * @param {*} data Event data
   */
  emit(event, data) {
    if (!this.eventListeners[event]) {
      return;
    }
    
    this.eventListeners[event].forEach(callback => {
      callback(data);
    });
  }
}

// Create and export a singleton instance
window.binanceApiManager = new BinanceApiManager();