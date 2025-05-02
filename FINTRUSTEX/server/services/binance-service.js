/**
 * Binance Service
 * Provides functionality for interacting with the Binance API
 */

const Binance = require('binance-api-node').default;
const crypto = require('crypto');

class BinanceService {
  /**
   * Create a Binance API client
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @returns {Object} Binance client instance
   */
  createClient(apiKey, apiSecret, isTestnet = false) {
    return Binance({
      apiKey,
      apiSecret,
      getTime: () => Date.now(),
      httpBase: isTestnet ? 'https://testnet.binance.vision' : undefined
    });
  }

  /**
   * Test connection to the Binance API
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection(apiKey, apiSecret, isTestnet = false) {
    try {
      if (!apiKey || !apiSecret) {
        return { success: false, error: 'API key and secret are required' };
      }
      
      const client = this.createClient(apiKey, apiSecret, isTestnet);
      
      // Test account connection
      await client.accountInfo();
      
      return { success: true };
    } catch (error) {
      console.error('Binance connection test error:', error);
      
      return { 
        success: false, 
        error: error.message || 'Connection test failed' 
      };
    }
  }

  /**
   * Get account information
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @returns {Promise<Object>} Account information
   */
  async getAccountInfo(apiKey, apiSecret, isTestnet = false) {
    try {
      const client = this.createClient(apiKey, apiSecret, isTestnet);
      
      const accountInfo = await client.accountInfo();
      
      return {
        makerCommission: accountInfo.makerCommission,
        takerCommission: accountInfo.takerCommission,
        buyerCommission: accountInfo.buyerCommission,
        sellerCommission: accountInfo.sellerCommission,
        canTrade: accountInfo.canTrade,
        canWithdraw: accountInfo.canWithdraw,
        canDeposit: accountInfo.canDeposit,
        updateTime: accountInfo.updateTime,
        accountType: accountInfo.accountType,
        permissions: accountInfo.permissions,
        balances: accountInfo.balances
      };
    } catch (error) {
      console.error('Error getting account info:', error);
      
      return { 
        error: error.message || 'Failed to get account information' 
      };
    }
  }

  /**
   * Get account balances
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @returns {Promise<Array>} Account balances
   */
  async getBalances(apiKey, apiSecret, isTestnet = false) {
    try {
      const client = this.createClient(apiKey, apiSecret, isTestnet);
      
      const accountInfo = await client.accountInfo();
      
      return accountInfo.balances;
    } catch (error) {
      console.error('Error getting balances:', error);
      
      return { 
        error: error.message || 'Failed to get balances' 
      };
    }
  }

  /**
   * Get open orders
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @param {string} [symbol] - Symbol to get orders for
   * @returns {Promise<Array>} Open orders
   */
  async getOpenOrders(apiKey, apiSecret, isTestnet = false, symbol = null) {
    try {
      const client = this.createClient(apiKey, apiSecret, isTestnet);
      
      const params = symbol ? { symbol } : {};
      
      const orders = await client.openOrders(params);
      
      return orders;
    } catch (error) {
      console.error('Error getting open orders:', error);
      
      return { 
        error: error.message || 'Failed to get open orders' 
      };
    }
  }

  /**
   * Get order history
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @param {string} [symbol] - Symbol to get orders for
   * @returns {Promise<Array>} Order history
   */
  async getOrderHistory(apiKey, apiSecret, isTestnet = false, symbol = null) {
    try {
      const client = this.createClient(apiKey, apiSecret, isTestnet);
      
      if (!symbol) {
        // Get all symbols and fetch orders for each
        const exchangeInfo = await client.exchangeInfo();
        const allSymbols = exchangeInfo.symbols
          .filter(s => s.status === 'TRADING')
          .map(s => s.symbol);
        
        let allOrders = [];
        
        // Use a limit to prevent hitting rate limits
        const symbolsToCheck = allSymbols.slice(0, 10);
        
        for (const sym of symbolsToCheck) {
          try {
            const symOrders = await client.allOrders({ symbol: sym });
            allOrders = allOrders.concat(symOrders);
          } catch (err) {
            console.warn(`Could not fetch orders for ${sym}:`, err.message);
          }
        }
        
        return allOrders.sort((a, b) => b.time - a.time);
      }
      
      const orders = await client.allOrders({ symbol });
      
      return orders;
    } catch (error) {
      console.error('Error getting order history:', error);
      
      return { 
        error: error.message || 'Failed to get order history' 
      };
    }
  }

  /**
   * Create a new order
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @param {Object} params - Order parameters
   * @returns {Promise<Object>} Created order
   */
  async createOrder(apiKey, apiSecret, isTestnet = false, params) {
    try {
      const client = this.createClient(apiKey, apiSecret, isTestnet);
      
      // Check required parameters
      if (!params.symbol) {
        throw new Error('Symbol is required');
      }
      
      if (!params.side) {
        throw new Error('Side is required');
      }
      
      if (!params.type) {
        throw new Error('Type is required');
      }
      
      if (!params.quantity) {
        throw new Error('Quantity is required');
      }
      
      // For limit orders, ensure price and timeInForce are provided
      if (params.type === 'LIMIT') {
        if (!params.price) {
          throw new Error('Price is required for limit orders');
        }
        
        if (!params.timeInForce) {
          params.timeInForce = 'GTC';
        }
      }
      
      const order = await client.order(params);
      
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      
      return { 
        error: error.message || 'Failed to create order' 
      };
    }
  }

  /**
   * Cancel an order
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @param {string} symbol - Symbol of the order
   * @param {string} orderId - ID of the order to cancel
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelOrder(apiKey, apiSecret, isTestnet = false, symbol, orderId) {
    try {
      const client = this.createClient(apiKey, apiSecret, isTestnet);
      
      const result = await client.cancelOrder({
        symbol,
        orderId
      });
      
      return result;
    } catch (error) {
      console.error('Error cancelling order:', error);
      
      return { 
        error: error.message || 'Failed to cancel order' 
      };
    }
  }

  /**
   * Get latest price for a symbol
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @param {string} symbol - Symbol to get price for
   * @returns {Promise<Object>} Latest price
   */
  async getPrice(apiKey, apiSecret, isTestnet = false, symbol) {
    try {
      const client = this.createClient(apiKey, apiSecret, isTestnet);
      
      const price = await client.prices({ symbol });
      
      return price;
    } catch (error) {
      console.error('Error getting price:', error);
      
      return { 
        error: error.message || 'Failed to get price' 
      };
    }
  }

  /**
   * Get ticker information for a symbol
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @param {string} symbol - Symbol to get ticker for
   * @returns {Promise<Object>} Ticker information
   */
  async getTicker(apiKey, apiSecret, isTestnet = false, symbol) {
    try {
      const client = this.createClient(apiKey, apiSecret, isTestnet);
      
      const ticker = await client.ticker({ symbol });
      
      return ticker;
    } catch (error) {
      console.error('Error getting ticker:', error);
      
      return { 
        error: error.message || 'Failed to get ticker' 
      };
    }
  }

  /**
   * Get candlestick data for a symbol
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @param {string} symbol - Symbol to get candlesticks for
   * @param {string} interval - Candlestick interval
   * @param {Object} [options] - Additional options
   * @returns {Promise<Array>} Candlestick data
   */
  async getCandles(apiKey, apiSecret, isTestnet = false, symbol, interval, options = {}) {
    try {
      const client = this.createClient(apiKey, apiSecret, isTestnet);
      
      const candles = await client.candles({
        symbol,
        interval,
        ...options
      });
      
      return candles;
    } catch (error) {
      console.error('Error getting candles:', error);
      
      return { 
        error: error.message || 'Failed to get candles' 
      };
    }
  }

  /**
   * Get order book for a symbol
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @param {string} symbol - Symbol to get order book for
   * @param {number} [limit=100] - Limit of results
   * @returns {Promise<Object>} Order book
   */
  async getOrderBook(apiKey, apiSecret, isTestnet = false, symbol, limit = 100) {
    try {
      const client = this.createClient(apiKey, apiSecret, isTestnet);
      
      const orderBook = await client.book({
        symbol,
        limit
      });
      
      return orderBook;
    } catch (error) {
      console.error('Error getting order book:', error);
      
      return { 
        error: error.message || 'Failed to get order book' 
      };
    }
  }

  /**
   * Get recent trades for a symbol
   * @param {string} apiKey - Binance API key
   * @param {string} apiSecret - Binance API secret
   * @param {boolean} isTestnet - Whether to use testnet
   * @param {string} symbol - Symbol to get trades for
   * @param {number} [limit=50] - Limit of results
   * @returns {Promise<Array>} Recent trades
   */
  async getRecentTrades(apiKey, apiSecret, isTestnet = false, symbol, limit = 50) {
    try {
      const client = this.createClient(apiKey, apiSecret, isTestnet);
      
      const trades = await client.trades({
        symbol,
        limit
      });
      
      return trades;
    } catch (error) {
      console.error('Error getting recent trades:', error);
      
      return { 
        error: error.message || 'Failed to get recent trades' 
      };
    }
  }
}

module.exports = { BinanceService };