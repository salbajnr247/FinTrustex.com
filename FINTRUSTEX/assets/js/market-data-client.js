/**
 * Market Data WebSocket Client for FinTrustEX
 * Handles real-time market data from the server via WebSockets
 */

class MarketDataClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second delay
    this.subscriptions = new Map(); // Map of subscription keys to callback functions
    this.activeChannels = new Set(); // Set of active channel keys
    this.handlers = {
      onConnect: () => {},
      onDisconnect: () => {},
      onError: () => {}
    };
  }

  /**
   * Connect to the WebSocket server for market data
   * @param {string} url - WebSocket server URL
   * @returns {Promise} - Resolves when connected
   */
  connect(url) {
    return new Promise((resolve, reject) => {
      if (this.socket && this.connected) {
        return resolve();
      }

      // If we already have a socket, close it
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }

      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('Connected to market data server');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.handlers.onConnect();
        
        // Resubscribe to active channels
        if (this.activeChannels.size > 0) {
          this.activeChannels.forEach(channel => {
            const [type, symbol, interval] = channel.split(':');
            this.subscribe(type, symbol, interval);
          });
        }
        
        resolve();
      };

      this.socket.onclose = (event) => {
        if (this.connected) {
          console.log('Disconnected from market data server');
          this.connected = false;
          this.handlers.onDisconnect();
        }
        
        // Attempt to reconnect
        this.reconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handlers.onError(error);
        reject(error);
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    });
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached. Please refresh the page.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    // Exponential backoff for reconnect attempts
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1));
    
    setTimeout(() => {
      if (!this.connected) {
        this.connect(this.url);
      }
    }, delay);
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Object} message - Message data
   */
  handleMessage(message) {
    switch (message.type) {
      case 'welcome':
        console.log('Received welcome message:', message.message);
        break;
        
      case 'subscribed':
        console.log(`Subscribed to ${message.channel} for ${message.symbol}`);
        break;
        
      case 'unsubscribed':
        console.log(`Unsubscribed from ${message.channel || 'all channels'}`);
        break;
        
      case 'error':
        console.error('WebSocket error:', message.message);
        break;
        
      case 'trade':
      case 'candle':
      case 'depth':
        // Handle market data updates
        const key = this.getSubscriptionKey(message.type, message.symbol, message.interval);
        const callback = this.subscriptions.get(key);
        
        if (callback) {
          callback(message.data);
        }
        break;
        
      case 'pong':
        // Heartbeat response, nothing to do
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Subscribe to a market data channel
   * @param {string} channel - Channel type ('trades', 'candles', 'depth')
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} interval - Optional interval for candles
   * @param {Function} callback - Function to call with market data updates
   */
  subscribe(channel, symbol, interval, callback) {
    if (!this.connected) {
      console.error('Not connected to market data server');
      return;
    }
    
    const subscriptionKey = this.getSubscriptionKey(channel, symbol, interval);
    
    // Save the callback
    if (callback) {
      this.subscriptions.set(subscriptionKey, callback);
    }
    
    // Add to active channels
    this.activeChannels.add(subscriptionKey);
    
    // Send subscription message
    this.socket.send(JSON.stringify({
      type: 'subscribe',
      channel,
      symbol,
      interval
    }));
  }

  /**
   * Unsubscribe from a market data channel
   * @param {string} channel - Channel type ('trades', 'candles', 'depth')
   * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
   * @param {string} interval - Optional interval for candles
   */
  unsubscribe(channel, symbol, interval) {
    if (!this.connected) {
      console.error('Not connected to market data server');
      return;
    }
    
    const subscriptionKey = this.getSubscriptionKey(channel, symbol, interval);
    
    // Remove from active channels
    this.activeChannels.delete(subscriptionKey);
    
    // Remove callback
    this.subscriptions.delete(subscriptionKey);
    
    // Send unsubscription message
    this.socket.send(JSON.stringify({
      type: 'unsubscribe',
      channel,
      symbol,
      interval
    }));
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    if (!this.connected) {
      console.error('Not connected to market data server');
      return;
    }
    
    // Clear all subscriptions
    this.subscriptions.clear();
    this.activeChannels.clear();
    
    // Send unsubscription message
    this.socket.send(JSON.stringify({
      type: 'unsubscribe',
      all: true
    }));
  }

  /**
   * Send a ping message to keep the connection alive
   */
  ping() {
    if (this.connected) {
      this.socket.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Close the WebSocket connection
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Set a handler for connect events
   * @param {Function} handler - Function to call on connect
   */
  onConnect(handler) {
    this.handlers.onConnect = handler;
  }

  /**
   * Set a handler for disconnect events
   * @param {Function} handler - Function to call on disconnect
   */
  onDisconnect(handler) {
    this.handlers.onDisconnect = handler;
  }

  /**
   * Set a handler for error events
   * @param {Function} handler - Function to call on error
   */
  onError(handler) {
    this.handlers.onError = handler;
  }

  /**
   * Create a subscription key
   * @param {string} channel - Channel name
   * @param {string} symbol - Trading pair
   * @param {string} interval - Optional interval for candles
   * @returns {string} Subscription key
   */
  getSubscriptionKey(channel, symbol, interval = '') {
    return `${channel}:${symbol}:${interval}`;
  }
}

// Create singleton instance
const marketDataClient = new MarketDataClient();

// Example usage:
// Initialize connection
// const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
// const host = window.location.host;
// const url = `${protocol}//${host}/ws`;
// marketDataClient.connect(url);
// 
// // Subscribe to BTC/USDT trades
// marketDataClient.subscribe('trades', 'BTCUSDT', null, (trade) => {
//   console.log('Trade update:', trade);
// });
// 
// // Subscribe to ETH/USDT 1-minute candles
// marketDataClient.subscribe('candles', 'ETHUSDT', '1m', (candle) => {
//   console.log('Candle update:', candle);
// });
// 
// // Keep connection alive with periodic pings
// setInterval(() => {
//   marketDataClient.ping();
// }, 30000);