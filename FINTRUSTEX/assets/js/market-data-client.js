/**
 * Market Data Client
 * Handles real-time market data communication via WebSocket
 */

class MarketDataClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.eventListeners = {};
    this.subscriptions = new Set();
    this.clientId = null;
  }

  /**
   * Connect to the WebSocket server
   * @returns {Promise} Resolves when connected
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected && this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.socket = new WebSocket(wsUrl);

      // Connection opened
      this.socket.addEventListener('open', () => {
        console.log('Connected to market data server');
        this.connected = true;
        this.reconnectAttempts = 0;

        // Resubscribe to previous subscriptions
        if (this.subscriptions.size > 0) {
          this.subscriptions.forEach(subscription => {
            this.sendMessage({
              type: 'subscribe',
              channel: subscription
            });
          });
        }

        resolve();
      });

      // Connection closed
      this.socket.addEventListener('close', () => {
        console.log('Disconnected from market data server');
        this.connected = false;
        this.attemptReconnect();
      });

      // Connection error
      this.socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        if (!this.connected) {
          reject(error);
        }
      });

      // Listen for messages
      this.socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle client ID assignment
          if (message.type === 'client_id') {
            this.clientId = message.clientId;
            console.log('Assigned client ID:', this.clientId);
            return;
          }
          
          // Handle heartbeat
          if (message.type === 'heartbeat') {
            this.sendMessage({
              type: 'heartbeat_ack'
            });
            return;
          }
          
          // Emit event if we have listeners
          if (message.event && this.eventListeners[message.event]) {
            this.eventListeners[message.event].forEach(callback => {
              callback(message);
            });
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
      this.subscriptions.clear();
    }
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximum reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch(() => {
        console.log('Reconnect failed');
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Send a message to the WebSocket server
   * @param {Object} message - Message to send
   */
  sendMessage(message) {
    if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: not connected');
      return false;
    }

    this.socket.send(JSON.stringify(message));
    return true;
  }

  /**
   * Subscribe to ticker updates for a symbol
   * @param {string} symbol - Symbol to subscribe to
   */
  subscribeTicker(symbol) {
    const channel = `ticker_${symbol.toLowerCase()}`;
    
    if (this.subscriptions.has(channel)) {
      return;
    }
    
    this.subscriptions.add(channel);
    
    this.sendMessage({
      type: 'subscribe',
      channel: channel
    });
  }

  /**
   * Unsubscribe from ticker updates for a symbol
   * @param {string} symbol - Symbol to unsubscribe from
   */
  unsubscribeTicker(symbol) {
    const channel = `ticker_${symbol.toLowerCase()}`;
    
    if (!this.subscriptions.has(channel)) {
      return;
    }
    
    this.subscriptions.delete(channel);
    
    this.sendMessage({
      type: 'unsubscribe',
      channel: channel
    });
  }

  /**
   * Subscribe to kline/candlestick updates for a symbol
   * @param {string} symbol - Symbol to subscribe to
   * @param {string} interval - Interval to subscribe to (e.g., '1m', '5m', '1h')
   */
  subscribeKline(symbol, interval) {
    const channel = `kline_${symbol.toLowerCase()}_${interval}`;
    
    if (this.subscriptions.has(channel)) {
      return;
    }
    
    this.subscriptions.add(channel);
    
    this.sendMessage({
      type: 'subscribe',
      channel: channel
    });
  }

  /**
   * Unsubscribe from kline/candlestick updates for a symbol
   * @param {string} symbol - Symbol to unsubscribe from
   * @param {string} interval - Interval to unsubscribe from
   */
  unsubscribeKline(symbol, interval) {
    const channel = `kline_${symbol.toLowerCase()}_${interval}`;
    
    if (!this.subscriptions.has(channel)) {
      return;
    }
    
    this.subscriptions.delete(channel);
    
    this.sendMessage({
      type: 'unsubscribe',
      channel: channel
    });
  }

  /**
   * Subscribe to depth/orderbook updates for a symbol
   * @param {string} symbol - Symbol to subscribe to
   */
  subscribeDepth(symbol) {
    const channel = `depth_${symbol.toLowerCase()}`;
    
    if (this.subscriptions.has(channel)) {
      return;
    }
    
    this.subscriptions.add(channel);
    
    this.sendMessage({
      type: 'subscribe',
      channel: channel
    });
  }

  /**
   * Unsubscribe from depth/orderbook updates for a symbol
   * @param {string} symbol - Symbol to unsubscribe from
   */
  unsubscribeDepth(symbol) {
    const channel = `depth_${symbol.toLowerCase()}`;
    
    if (!this.subscriptions.has(channel)) {
      return;
    }
    
    this.subscriptions.delete(channel);
    
    this.sendMessage({
      type: 'unsubscribe',
      channel: channel
    });
  }

  /**
   * Subscribe to trade updates for a symbol
   * @param {string} symbol - Symbol to subscribe to
   */
  subscribeTrades(symbol) {
    const channel = `trades_${symbol.toLowerCase()}`;
    
    if (this.subscriptions.has(channel)) {
      return;
    }
    
    this.subscriptions.add(channel);
    
    this.sendMessage({
      type: 'subscribe',
      channel: channel
    });
  }

  /**
   * Unsubscribe from trade updates for a symbol
   * @param {string} symbol - Symbol to unsubscribe from
   */
  unsubscribeTrades(symbol) {
    const channel = `trades_${symbol.toLowerCase()}`;
    
    if (!this.subscriptions.has(channel)) {
      return;
    }
    
    this.subscriptions.delete(channel);
    
    this.sendMessage({
      type: 'unsubscribe',
      channel: channel
    });
  }

  /**
   * Register an event listener
   * @param {string} event - Event to listen for
   * @param {Function} callback - Callback to call when event is emitted
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove an event listener
   * @param {string} event - Event to stop listening for
   * @param {Function} callback - Callback to remove
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
   * Remove all event listeners for an event
   * @param {string} event - Event to stop listening for
   */
  removeAllListeners(event) {
    if (event) {
      delete this.eventListeners[event];
    } else {
      this.eventListeners = {};
    }
  }
}

// Create and export a singleton instance
window.marketDataClient = new MarketDataClient();