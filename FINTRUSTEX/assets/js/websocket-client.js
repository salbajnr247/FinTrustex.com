/**
 * WebSocket Client for FinTrustEX
 * 
 * Handles real-time data communication including:
 * - Cryptocurrency price updates
 * - Transaction notifications
 * - Wallet balance changes
 * - System status updates
 */

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // Start with 2 seconds delay
    this.subscriptions = new Map(); // Map of channels to callback arrays
    this.messageHandlers = new Map(); // Map of message types to handlers
    this.lastPingTime = null;
    this.pingInterval = null;
  }

  /**
   * Initialize the WebSocket connection
   */
  init() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    try {
      // Determine the correct WebSocket URL based on the current protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      this.socket = new WebSocket(wsUrl);
      
      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      
      // Register built-in message handlers
      this.registerMessageHandler('price_update', this.handlePriceUpdate.bind(this));
      this.registerMessageHandler('notification', this.handleNotification.bind(this));
      this.registerMessageHandler('ping', this.handlePing.bind(this));
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  handleOpen() {
    console.log('WebSocket connection established');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2000; // Reset reconnect delay
    
    // Resubscribe to channels after reconnect
    if (this.subscriptions.size > 0) {
      this.subscriptions.forEach((callbacks, channel) => {
        this.sendSubscription(channel);
      });
    }
    
    // Start ping interval to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'pong', timestamp: new Date().toISOString() });
      }
    }, 30000);
    
    // Dispatch connected event
    this.dispatchEvent('connected');
  }

  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event - WebSocket message event
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // Update last ping time for connection health monitoring
      this.lastPingTime = new Date();
      
      // Log non-ping messages
      if (message.type !== 'ping') {
        console.log('WebSocket message received:', message);
      }
      
      // Handle message based on type
      if (message.type && this.messageHandlers.has(message.type)) {
        const handler = this.messageHandlers.get(message.type);
        handler(message);
      }
      
      // Dispatch generic message event
      this.dispatchEvent('message', message);
      
      // Dispatch type-specific event
      if (message.type) {
        this.dispatchEvent(message.type, message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close event
   * @param {CloseEvent} event - WebSocket close event
   */
  handleClose(event) {
    console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
    this.isConnected = false;
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Schedule reconnect
    this.scheduleReconnect();
    
    // Dispatch disconnected event
    this.dispatchEvent('disconnected');
  }

  /**
   * Handle WebSocket error event
   * @param {Event} error - WebSocket error event
   */
  handleError(error) {
    console.error('WebSocket error:', error);
    this.dispatchEvent('error', error);
  }

  /**
   * Schedule a reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`);
      this.dispatchEvent('max_reconnects');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.init();
    }, delay);
  }

  /**
   * Send data to the WebSocket server
   * @param {Object} data - Data to send
   */
  send(data) {
    if (!this.isConnected) {
      console.warn('Cannot send data: WebSocket not connected');
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket data:', error);
      return false;
    }
  }

  /**
   * Subscribe to a channel
   * @param {string} channel - Channel name
   * @param {Function} callback - Callback function
   */
  subscribe(channel, callback) {
    // Add to local subscriptions
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
      // Send subscription message if connected
      if (this.isConnected) {
        this.sendSubscription(channel);
      }
    }
    
    // Add callback if provided
    if (callback && typeof callback === 'function') {
      const callbacks = this.subscriptions.get(channel);
      callbacks.push(callback);
    }
  }

  /**
   * Send subscription message to the server
   * @param {string} channel - Channel to subscribe to
   */
  sendSubscription(channel) {
    this.send({
      type: 'subscribe',
      channel: channel
    });
  }

  /**
   * Unsubscribe from a channel
   * @param {string} channel - Channel name
   * @param {Function} callback - Specific callback to remove (optional)
   */
  unsubscribe(channel, callback) {
    if (!this.subscriptions.has(channel)) {
      return;
    }
    
    if (callback) {
      // Remove specific callback
      const callbacks = this.subscriptions.get(channel);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
      
      // If no callbacks left, unsubscribe from channel
      if (callbacks.length === 0) {
        this.subscriptions.delete(channel);
        this.send({
          type: 'unsubscribe',
          channel: channel
        });
      }
    } else {
      // Remove all callbacks
      this.subscriptions.delete(channel);
      this.send({
        type: 'unsubscribe',
        channel: channel
      });
    }
  }

  /**
   * Register a handler for a specific message type
   * @param {string} type - Message type
   * @param {Function} handler - Handler function
   */
  registerMessageHandler(type, handler) {
    if (typeof handler !== 'function') {
      console.error('Handler must be a function');
      return;
    }
    
    this.messageHandlers.set(type, handler);
  }

  /**
   * Handle price update messages
   * @param {Object} message - Price update message
   */
  handlePriceUpdate(message) {
    // Update price data in local storage for persistence
    try {
      localStorage.setItem('latest_prices', JSON.stringify({
        pairs: message.data.pairs,
        timestamp: message.data.timestamp
      }));
    } catch (error) {
      console.error('Error storing price data:', error);
    }
    
    // Trigger any price update callbacks
    this.dispatchEvent('price_update', message.data);
  }

  /**
   * Handle notification messages
   * @param {Object} message - Notification message
   */
  handleNotification(message) {
    // Store notification in session history
    try {
      const notifications = JSON.parse(sessionStorage.getItem('notifications') || '[]');
      notifications.unshift(message.data);
      
      // Limit to 50 notifications
      if (notifications.length > 50) {
        notifications.pop();
      }
      
      sessionStorage.setItem('notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error storing notification:', error);
    }
    
    // Show notification if browser supports it
    if ('Notification' in window) {
      this.showNotification(message.data);
    }
    
    // Trigger notification callbacks
    this.dispatchEvent('notification', message.data);
  }

  /**
   * Handle ping messages
   * @param {Object} message - Ping message
   */
  handlePing(message) {
    // Update last ping time
    this.lastPingTime = new Date();
    
    // Send pong response
    this.send({
      type: 'pong',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Show browser notification
   * @param {Object} notification - Notification data
   */
  showNotification(notification) {
    // Check if browser notifications are supported and permission is granted
    if (!('Notification' in window)) {
      return;
    }
    
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/images/generated-icon.png'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/assets/images/generated-icon.png'
          });
        }
      });
    }
  }

  /**
   * Disconnect the WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.isConnected = false;
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  addEventListener(event, callback) {
    if (!this.eventListeners) {
      this.eventListeners = new Map();
    }
    
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  removeEventListener(event, callback) {
    if (!this.eventListeners || !this.eventListeners.has(event)) {
      return;
    }
    
    const callbacks = this.eventListeners.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Dispatch event to registered listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  dispatchEvent(event, data) {
    if (!this.eventListeners || !this.eventListeners.has(event)) {
      return;
    }
    
    const callbacks = this.eventListeners.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Get the connection status
   * @returns {boolean} - Whether the connection is active
   */
  isActive() {
    return this.isConnected;
  }

  /**
   * Get the latest prices from local storage
   * @returns {Object|null} - Latest price data or null if not available
   */
  getLatestPrices() {
    try {
      const pricesJson = localStorage.getItem('latest_prices');
      return pricesJson ? JSON.parse(pricesJson) : null;
    } catch (error) {
      console.error('Error retrieving price data:', error);
      return null;
    }
  }

  /**
   * Get recent notifications from session storage
   * @returns {Array} - Array of recent notifications
   */
  getRecentNotifications() {
    try {
      const notificationsJson = sessionStorage.getItem('notifications');
      return notificationsJson ? JSON.parse(notificationsJson) : [];
    } catch (error) {
      console.error('Error retrieving notifications:', error);
      return [];
    }
  }
}

// Create and export a singleton instance
const websocketClient = new WebSocketClient();

// Auto-initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    websocketClient.init();
  }, 1000); // Slight delay to ensure page is fully loaded
});

// Make available globally
window.websocketClient = websocketClient;