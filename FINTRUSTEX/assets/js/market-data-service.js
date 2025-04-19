/**
 * Market Data Service
 * Provides real-time market data using WebSockets
 */

class MarketDataService {
  constructor() {
    this.connections = {};
    this.subscriptions = {};
    this.callbacks = {};
    this.reconnectAttempts = {};
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.initialized = false;
  }

  /**
   * Initialize the market data service
   */
  init() {
    if (this.initialized) return;
    
    // Initialize Binance connection
    this.connectBinance();
    
    this.initialized = true;
    console.log('Market Data Service initialized');
  }

  /**
   * Connect to Binance WebSocket
   */
  connectBinance() {
    try {
      // Create connection to Binance WebSocket
      const binanceSocket = new WebSocket('wss://stream.binance.com:9443/ws');
      
      // Store connection
      this.connections.binance = binanceSocket;
      this.reconnectAttempts.binance = 0;
      
      // Set up event handlers
      binanceSocket.onopen = () => {
        console.log('Connected to Binance WebSocket');
        this.resubscribeToBinance();
      };
      
      binanceSocket.onclose = (event) => {
        console.log('Binance WebSocket connection closed', event);
        this.handleReconnect('binance');
      };
      
      binanceSocket.onerror = (error) => {
        console.error('Binance WebSocket error:', error);
      };
      
      binanceSocket.onmessage = (event) => {
        this.handleBinanceMessage(event);
      };
    } catch (error) {
      console.error('Failed to connect to Binance WebSocket:', error);
      this.handleReconnect('binance');
    }
  }

  /**
   * Handle reconnection logic
   * @param {string} provider - Provider name
   */
  handleReconnect(provider) {
    const attempts = this.reconnectAttempts[provider] || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      this.reconnectAttempts[provider] = attempts + 1;
      const delay = this.reconnectDelay * Math.pow(2, attempts);
      
      console.log(`Attempting to reconnect to ${provider} in ${delay}ms (Attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (provider === 'binance') {
          this.connectBinance();
        }
      }, delay);
    } else {
      console.error(`Maximum reconnection attempts reached for ${provider}`);
    }
  }

  /**
   * Parse and handle Binance WebSocket messages
   * @param {MessageEvent} event - WebSocket message event
   */
  handleBinanceMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Handle different message types
      if (data.e === '24hrTicker') {
        this.notifySubscribers('ticker', data.s, data);
      } else if (data.e === 'trade') {
        this.notifySubscribers('trade', data.s, data);
      } else if (data.e === 'kline') {
        this.notifySubscribers('kline', `${data.s}_${data.k.i}`, data);
      } else if (data.e === 'depthUpdate') {
        this.notifySubscribers('orderbook', data.s, data);
      }
    } catch (error) {
      console.error('Failed to parse Binance message:', error);
    }
  }

  /**
   * Re-subscribe to Binance streams after reconnection
   */
  resubscribeToBinance() {
    if (!this.connections.binance || this.connections.binance.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Get active Binance subscriptions
    const binanceSubscriptions = Object.keys(this.subscriptions)
      .filter(key => key.startsWith('binance:'))
      .map(key => this.subscriptions[key]);
    
    if (binanceSubscriptions.length === 0) {
      return;
    }
    
    // Create subscription message
    const subscribeMsg = {
      method: 'SUBSCRIBE',
      params: binanceSubscriptions,
      id: Date.now()
    };
    
    // Send subscription
    this.connections.binance.send(JSON.stringify(subscribeMsg));
    console.log('Resubscribed to Binance streams:', binanceSubscriptions);
  }

  /**
   * Subscribe to market data
   * @param {string} type - Data type (ticker, trade, kline, orderbook)
   * @param {string} symbol - Trading pair symbol
   * @param {string} interval - Interval for kline data
   * @param {Function} callback - Callback function for data updates
   * @returns {string} - Subscription ID
   */
  subscribe(type, symbol, interval = null, callback) {
    if (!this.initialized) {
      this.init();
    }
    
    // Generate subscription ID
    const subId = `${type}_${symbol}${interval ? `_${interval}` : ''}_${Date.now()}`;
    
    // Format symbol for Binance
    const formattedSymbol = symbol.replace('/', '').toLowerCase();
    
    // Define stream based on type
    let stream;
    switch (type) {
      case 'ticker':
        stream = `${formattedSymbol}@ticker`;
        break;
      case 'trade':
        stream = `${formattedSymbol}@trade`;
        break;
      case 'kline':
        if (!interval) throw new Error('Interval is required for kline data');
        stream = `${formattedSymbol}@kline_${interval}`;
        break;
      case 'orderbook':
        stream = `${formattedSymbol}@depth20@100ms`;
        break;
      default:
        throw new Error(`Unsupported data type: ${type}`);
    }
    
    // Store subscription
    this.subscriptions[`binance:${subId}`] = stream;
    
    // Store callback
    const callbackKey = `${type}_${symbol}${interval ? `_${interval}` : ''}`;
    if (!this.callbacks[callbackKey]) {
      this.callbacks[callbackKey] = [];
    }
    this.callbacks[callbackKey].push({ id: subId, callback });
    
    // Subscribe to stream
    if (this.connections.binance && this.connections.binance.readyState === WebSocket.OPEN) {
      const subscribeMsg = {
        method: 'SUBSCRIBE',
        params: [stream],
        id: Date.now()
      };
      this.connections.binance.send(JSON.stringify(subscribeMsg));
    }
    
    return subId;
  }

  /**
   * Unsubscribe from market data
   * @param {string} subscriptionId - Subscription ID
   */
  unsubscribe(subscriptionId) {
    // Find subscription
    const binanceKey = `binance:${subscriptionId}`;
    const stream = this.subscriptions[binanceKey];
    
    if (!stream) {
      console.warn(`Subscription not found: ${subscriptionId}`);
      return;
    }
    
    // Remove subscription
    delete this.subscriptions[binanceKey];
    
    // Find and remove callback
    for (const [key, callbacks] of Object.entries(this.callbacks)) {
      const index = callbacks.findIndex(cb => cb.id === subscriptionId);
      if (index !== -1) {
        callbacks.splice(index, 1);
        if (callbacks.length === 0) {
          delete this.callbacks[key];
        }
        break;
      }
    }
    
    // Unsubscribe from stream
    if (this.connections.binance && this.connections.binance.readyState === WebSocket.OPEN) {
      const unsubscribeMsg = {
        method: 'UNSUBSCRIBE',
        params: [stream],
        id: Date.now()
      };
      this.connections.binance.send(JSON.stringify(unsubscribeMsg));
    }
  }

  /**
   * Notify subscribers of data updates
   * @param {string} type - Data type
   * @param {string} symbol - Trading pair symbol
   * @param {Object} data - Market data
   */
  notifySubscribers(type, symbol, data) {
    const key = `${type}_${symbol}`;
    const callbacks = this.callbacks[key] || [];
    
    // Notify all subscribers
    callbacks.forEach(({ callback }) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in market data callback:', error);
      }
    });
  }

  /**
   * Get the current connection status
   * @returns {Object} - Connection status
   */
  getStatus() {
    const status = {};
    
    for (const [provider, connection] of Object.entries(this.connections)) {
      let state;
      switch (connection.readyState) {
        case WebSocket.CONNECTING:
          state = 'connecting';
          break;
        case WebSocket.OPEN:
          state = 'connected';
          break;
        case WebSocket.CLOSING:
          state = 'closing';
          break;
        case WebSocket.CLOSED:
          state = 'disconnected';
          break;
        default:
          state = 'unknown';
      }
      
      status[provider] = state;
    }
    
    return status;
  }

  /**
   * Close all connections
   */
  close() {
    for (const [provider, connection] of Object.entries(this.connections)) {
      try {
        connection.close();
        console.log(`Closed ${provider} connection`);
      } catch (error) {
        console.error(`Error closing ${provider} connection:`, error);
      }
    }
    
    this.connections = {};
    this.initialized = false;
  }
}

// Create a singleton instance
const marketDataService = new MarketDataService();

// Make the service globally accessible
window.marketDataService = marketDataService;