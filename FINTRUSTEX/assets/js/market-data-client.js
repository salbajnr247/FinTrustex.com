/**
 * Market Data Client for FinTrustEX
 * Handles WebSocket connection for real-time market data updates
 */

/**
 * Market Data Client Class
 * @class
 */
class MarketDataClient {
  /**
   * Create a new Market Data Client
   * @constructor
   */
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.subscriptions = new Set();
    this.eventListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // Start with 2 seconds
    this.userId = null;
    this.cachedData = new Map();
  }

  /**
   * Connect to the WebSocket server
   * @param {string} userId - User ID for authentication
   * @returns {Promise<boolean>} Success state
   */
  async connect(userId = null) {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId;
        
        // Close existing connection if any
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
          this.socket.close();
        }
        
        // Determine the WebSocket URL
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        // Create new WebSocket connection
        this.socket = new WebSocket(wsUrl);
        
        // Set up event handlers
        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Authenticate if userId is provided
          if (this.userId) {
            this.authenticate(this.userId);
          }
          
          // Resubscribe to previous subscriptions
          this.resubscribe();
          
          resolve(true);
        };
        
        this.socket.onclose = (event) => {
          console.log('WebSocket connection closed', event);
          this.isConnected = false;
          
          // Attempt reconnection
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          } else {
            console.error('Maximum reconnection attempts reached');
            this.triggerEvent('connection_failed', { reason: 'Maximum reconnection attempts reached' });
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Cache data if appropriate
            if (data.type === 'ticker_update' && data.symbol) {
              this.cachedData.set(`ticker_${data.symbol.toLowerCase()}`, data);
            }
            
            // Trigger event listeners
            this.triggerEvent(data.type, data);
            
            // Trigger symbol-specific event listeners
            if (data.symbol) {
              this.triggerEvent(`${data.type}_${data.symbol.toLowerCase()}`, data);
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error, event.data);
          }
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Authenticate with the WebSocket server
   * @param {string} userId - User ID for authentication
   */
  authenticate(userId) {
    if (!this.isConnected) {
      console.warn('Cannot authenticate: not connected to WebSocket server');
      return;
    }
    
    this.userId = userId;
    
    this.send({
      type: 'auth',
      userId: userId
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
    
    this.isConnected = false;
    this.subscriptions.clear();
  }

  /**
   * Send data to the WebSocket server
   * @param {Object} data - Data to send
   */
  send(data) {
    if (!this.isConnected) {
      console.warn('Cannot send data: not connected to WebSocket server');
      return;
    }
    
    this.socket.send(JSON.stringify(data));
  }

  /**
   * Subscribe to a specific market data channel
   * @param {string} channel - Channel name (e.g., 'ticker_btcusdt')
   */
  subscribe(channel) {
    if (!this.isConnected) {
      console.warn(`Cannot subscribe to ${channel}: not connected to WebSocket server`);
      this.subscriptions.add(channel); // Store for later when connection is established
      return;
    }
    
    this.send({
      type: 'subscribe',
      channel: channel
    });
    
    this.subscriptions.add(channel);
  }

  /**
   * Unsubscribe from a specific market data channel
   * @param {string} channel - Channel name (e.g., 'ticker_btcusdt')
   */
  unsubscribe(channel) {
    if (!this.isConnected) {
      console.warn(`Cannot unsubscribe from ${channel}: not connected to WebSocket server`);
      this.subscriptions.delete(channel);
      return;
    }
    
    this.send({
      type: 'unsubscribe',
      channel: channel
    });
    
    this.subscriptions.delete(channel);
  }

  /**
   * Resubscribe to previous subscriptions
   * @private
   */
  resubscribe() {
    if (!this.isConnected) {
      return;
    }
    
    // Resubscribe to all previously subscribed channels
    this.subscriptions.forEach(channel => {
      this.send({
        type: 'subscribe',
        channel: channel
      });
      
      console.log(`Resubscribed to channel: ${channel}`);
    });
  }

  /**
   * Attempt to reconnect to the WebSocket server
   * @private
   */
  attemptReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(this.userId).catch(error => {
        console.error('Reconnection attempt failed:', error);
      });
    }, delay);
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

  /**
   * Get cached data for a symbol
   * @param {string} symbol - Symbol to get data for (e.g., 'btcusdt')
   * @returns {Object|null} Cached data or null if not available
   */
  getCachedData(symbol) {
    const key = `ticker_${symbol.toLowerCase()}`;
    return this.cachedData.has(key) ? this.cachedData.get(key) : null;
  }

  /**
   * Subscribe to ticker updates for a symbol
   * @param {string} symbol - Symbol to subscribe to (e.g., 'BTCUSDT')
   */
  subscribeTicker(symbol) {
    this.subscribe(`ticker_${symbol.toLowerCase()}`);
  }

  /**
   * Unsubscribe from ticker updates for a symbol
   * @param {string} symbol - Symbol to unsubscribe from (e.g., 'BTCUSDT')
   */
  unsubscribeTicker(symbol) {
    this.unsubscribe(`ticker_${symbol.toLowerCase()}`);
  }
}

// Create singleton instance
const marketDataClient = new MarketDataClient();

// Export singleton
window.marketDataClient = marketDataClient;