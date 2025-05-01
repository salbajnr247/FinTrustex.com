/**
 * WebSocket Client for FinTrustEX
 * Handles real-time data connections and message handling
 */

class WebSocketClient {
  /**
   * Initialize WebSocket client
   * @param {string} url - WebSocket server URL
   */
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 2000; // Start with 2 seconds
    this.messageCallbacks = new Map();
    this.subscriptions = new Map();
    this.connectCallbacks = [];
    this.disconnectCallbacks = [];
    this.lastPingTime = 0;
    this.pingInterval = 30000; // 30 seconds
    this.pingTimeoutId = null;
    this.reconnectTimeoutId = null;
  }

  /**
   * Connect to WebSocket server
   * @returns {Promise} - Resolves when connection is established
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startPingInterval();
          
          // Reconnect all active subscriptions
          this.resubscribeAll();
          
          // Execute connect callbacks
          this.connectCallbacks.forEach(callback => callback());
          
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
          this.isConnected = false;
          this.stopPingInterval();
          
          // Execute disconnect callbacks
          this.disconnectCallbacks.forEach(callback => callback(event));
          
          // Attempt to reconnect if not closed intentionally
          if (event.code !== 1000) {
            this.attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   * @param {Object} message - Parsed message from server
   */
  handleMessage(message) {
    // Handle pong responses
    if (message.type === 'pong') {
      const latency = Date.now() - this.lastPingTime;
      console.log(`WebSocket ping: ${latency}ms`);
      return;
    }
    
    // Handle subscription messages
    if (message.type === 'data' && message.channel && message.symbol) {
      const key = this.getSubscriptionKey(message.channel, message.symbol, message.interval);
      const callbacks = this.messageCallbacks.get(key) || [];
      
      callbacks.forEach(callback => {
        try {
          callback(message.data);
        } catch (error) {
          console.error('Error in subscription callback:', error);
        }
      });
    }
    
    // Handle system messages
    if (message.type === 'system') {
      console.log('System message:', message.message);
    }
  }

  /**
   * Send message to WebSocket server
   * @param {Object} message - Message to send
   * @returns {boolean} - Success status
   */
  send(message) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Subscribe to data channel
   * @param {string} channel - Data channel (e.g., 'ticker', 'trades', 'orderbook')
   * @param {string} symbol - Trading symbol (e.g., 'BTCUSD', 'ETHUSD')
   * @param {string|null} interval - Time interval for candle data (e.g., '1m', '1h', '1d')
   * @param {Function} callback - Callback for data updates
   * @returns {boolean} - Success status
   */
  subscribe(channel, symbol, interval, callback) {
    if (!channel || !symbol) {
      console.error('Channel and symbol are required for subscription');
      return false;
    }

    const key = this.getSubscriptionKey(channel, symbol, interval);
    
    // Add callback to message handlers
    if (!this.messageCallbacks.has(key)) {
      this.messageCallbacks.set(key, []);
    }
    this.messageCallbacks.get(key).push(callback);
    
    // Save subscription details for reconnection
    this.subscriptions.set(key, { channel, symbol, interval });
    
    // Send subscription request if connected
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendSubscription(channel, symbol, interval);
    }
    
    return true;
  }

  /**
   * Unsubscribe from data channel
   * @param {string} channel - Data channel
   * @param {string} symbol - Trading symbol
   * @param {string|null} interval - Time interval for candle data
   * @returns {boolean} - Success status
   */
  unsubscribe(channel, symbol, interval) {
    const key = this.getSubscriptionKey(channel, symbol, interval);
    
    // Remove from message callbacks
    this.messageCallbacks.delete(key);
    
    // Remove from subscriptions list
    this.subscriptions.delete(key);
    
    // Send unsubscribe request if connected
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.send({
        type: 'unsubscribe',
        channel,
        symbol,
        interval: interval || undefined
      });
    }
    
    return true;
  }

  /**
   * Send subscription request to server
   * @param {string} channel - Data channel
   * @param {string} symbol - Trading symbol
   * @param {string|null} interval - Time interval for candle data
   */
  sendSubscription(channel, symbol, interval) {
    this.send({
      type: 'subscribe',
      channel,
      symbol,
      interval: interval || undefined
    });
  }

  /**
   * Resubscribe to all active subscriptions
   * Used after reconnection
   */
  resubscribeAll() {
    this.subscriptions.forEach((details) => {
      this.sendSubscription(details.channel, details.symbol, details.interval);
    });
  }

  /**
   * Generate unique key for subscription
   * @param {string} channel - Data channel
   * @param {string} symbol - Trading symbol
   * @param {string|null} interval - Time interval
   * @returns {string} - Unique subscription key
   */
  getSubscriptionKey(channel, symbol, interval) {
    return `${channel}:${symbol}${interval ? ':' + interval : ''}`;
  }

  /**
   * Add connection event handler
   * @param {Function} callback - Function to call on connection
   */
  onConnect(callback) {
    if (typeof callback === 'function') {
      this.connectCallbacks.push(callback);
    }
  }

  /**
   * Add disconnection event handler
   * @param {Function} callback - Function to call on disconnection
   */
  onDisconnect(callback) {
    if (typeof callback === 'function') {
      this.disconnectCallbacks.push(callback);
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  startPingInterval() {
    this.stopPingInterval(); // Clear any existing interval
    
    this.pingTimeoutId = setInterval(() => {
      if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.send({ type: 'ping' });
      }
    }, this.pingInterval);
  }

  /**
   * Stop ping interval
   */
  stopPingInterval() {
    if (this.pingTimeoutId) {
      clearInterval(this.pingTimeoutId);
      this.pingTimeoutId = null;
    }
  }

  /**
   * Attempt to reconnect to WebSocket server
   */
  attemptReconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached. Giving up.');
      return;
    }

    const delay = Math.min(30000, this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts));
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect in ${delay / 1000} seconds. Attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}.`);
    
    this.reconnectTimeoutId = setTimeout(() => {
      console.log('Reconnecting...');
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.stopPingInterval();
      
      if (this.reconnectTimeoutId) {
        clearTimeout(this.reconnectTimeoutId);
        this.reconnectTimeoutId = null;
      }
      
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close(1000, 'Normal closure');
      }
      
      this.isConnected = false;
    }
  }
}

// Create singleton instance
const wsClient = (() => {
  let instance;
  
  function createInstance() {
    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    return new WebSocketClient(wsUrl);
  }
  
  return {
    getInstance: function() {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    }
  };
})();

// Export WebSocket client
window.wsClient = wsClient.getInstance();