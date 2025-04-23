/**
 * WebSocket Client for FinTrustEX
 * Manages WebSocket connections and message handling
 */

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // Start with 2 seconds
    this.messageListeners = {};
    this.messageQueue = [];
    this.connectionPromise = null;
    this.resolveConnection = null;
    this.rejectConnection = null;
    
    // Initialize client
    this.init();
  }
  
  /**
   * Initialize the WebSocket client
   */
  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.connect();
    });
    
    // Handle visibility change to reconnect when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.connected) {
        console.log('Tab visible, reconnecting WebSocket...');
        this.connect();
      }
    });
    
    // Handle window online event
    window.addEventListener('online', () => {
      if (!this.connected) {
        console.log('Network connection restored, reconnecting WebSocket...');
        this.connect();
      }
    });
  }
  
  /**
   * Connect to the WebSocket server
   * @returns {Promise} A promise that resolves when connected
   */
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return this.connectionPromise;
    }
    
    // Create a new connection promise
    this.connectionPromise = new Promise((resolve, reject) => {
      this.resolveConnection = resolve;
      this.rejectConnection = reject;
    });
    
    try {
      console.log('Connecting to WebSocket server...');
      
      // Determine WebSocket URL based on current protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      // Create new WebSocket connection
      this.socket = new WebSocket(wsUrl);
      
      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.rejectConnection(error);
      this.scheduleReconnect();
    }
    
    return this.connectionPromise;
  }
  
  /**
   * Handle WebSocket open event
   */
  handleOpen() {
    console.log('WebSocket connection established');
    this.connected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2000;
    
    // Resolve the connection promise
    if (this.resolveConnection) {
      this.resolveConnection();
    }
    
    // Send any queued messages
    this.sendQueuedMessages();
    
    // Send ping to keep connection alive
    this.startPingInterval();
  }
  
  /**
   * Handle WebSocket close event
   * @param {Event} event - The close event
   */
  handleClose(event) {
    this.connected = false;
    clearInterval(this.pingInterval);
    
    console.log(`WebSocket connection closed (${event.code}: ${event.reason})`);
    
    // Reject the connection promise if it hasn't been resolved
    if (this.rejectConnection) {
      this.rejectConnection(new Error(`Connection closed: ${event.code}`));
    }
    
    // Schedule reconnect if not a normal closure
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }
  
  /**
   * Handle WebSocket error event
   * @param {Event} error - The error event
   */
  handleError(error) {
    console.error('WebSocket error:', error);
    
    // Reject the connection promise if it hasn't been resolved
    if (this.rejectConnection) {
      this.rejectConnection(error);
    }
  }
  
  /**
   * Handle incoming WebSocket messages
   * @param {MessageEvent} event - The message event
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);
      
      // Handle ping messages
      if (data.type === 'ping') {
        this.send({ type: 'pong', timestamp: new Date().toISOString() });
        return;
      }
      
      // Notify all listeners for this message type
      this.notifyListeners(data.type, data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  /**
   * Start ping interval to keep connection alive
   */
  startPingInterval() {
    // Clear any existing interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.connected && this.socket.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: new Date().toISOString() });
      }
    }, 30000);
  }
  
  /**
   * Schedule a reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached');
      return;
    }
    
    // Calculate exponential backoff delay
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts));
    this.reconnectAttempts++;
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.connected) {
        console.log(`Reconnect attempt ${this.reconnectAttempts}...`);
        this.connect();
      }
    }, delay);
  }
  
  /**
   * Send a message to the WebSocket server
   * @param {Object} data - The data to send
   * @returns {Promise} A promise that resolves when the message is sent
   */
  send(data) {
    return new Promise((resolve, reject) => {
      // If not connected, add to queue
      if (!this.connected || this.socket.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected, queueing message:', data);
        this.messageQueue.push({ data, resolve, reject });
        
        // Try to connect if not already connecting
        if (!this.connected && (!this.socket || this.socket.readyState === WebSocket.CLOSED)) {
          this.connect();
        }
        return;
      }
      
      try {
        const message = JSON.stringify(data);
        this.socket.send(message);
        resolve();
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Send queued messages once connected
   */
  sendQueuedMessages() {
    if (this.messageQueue.length === 0) {
      return;
    }
    
    console.log(`Sending ${this.messageQueue.length} queued messages`);
    
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    
    queue.forEach(item => {
      try {
        const message = JSON.stringify(item.data);
        this.socket.send(message);
        item.resolve();
      } catch (error) {
        console.error('Error sending queued WebSocket message:', error);
        item.reject(error);
      }
    });
  }
  
  /**
   * Subscribe to a data channel
   * @param {string} channel - The channel to subscribe to
   * @returns {Promise} A promise that resolves when subscribed
   */
  subscribe(channel) {
    console.log(`Subscribing to channel: ${channel}`);
    return this.send({
      type: 'subscribe',
      channel: channel
    });
  }
  
  /**
   * Unsubscribe from a data channel
   * @param {string} channel - The channel to unsubscribe from
   * @returns {Promise} A promise that resolves when unsubscribed
   */
  unsubscribe(channel) {
    console.log(`Unsubscribing from channel: ${channel}`);
    return this.send({
      type: 'unsubscribe',
      channel: channel
    });
  }
  
  /**
   * Add a listener for a specific message type
   * @param {string} type - The message type to listen for
   * @param {Function} callback - The callback function
   */
  addMessageListener(type, callback) {
    if (!this.messageListeners[type]) {
      this.messageListeners[type] = [];
    }
    
    this.messageListeners[type].push(callback);
  }
  
  /**
   * Remove a listener for a specific message type
   * @param {string} type - The message type
   * @param {Function} callback - The callback function to remove
   */
  removeMessageListener(type, callback) {
    if (!this.messageListeners[type]) {
      return;
    }
    
    this.messageListeners[type] = this.messageListeners[type].filter(
      listener => listener !== callback
    );
  }
  
  /**
   * Notify all listeners for a specific message type
   * @param {string} type - The message type
   * @param {Object} data - The message data
   */
  notifyListeners(type, data) {
    const listeners = this.messageListeners[type];
    if (!listeners || listeners.length === 0) {
      return;
    }
    
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${type} listener:`, error);
      }
    });
  }
  
  /**
   * Close the WebSocket connection
   */
  close() {
    if (this.socket) {
      console.log('Closing WebSocket connection');
      this.socket.close(1000, 'Normal closure');
    }
    
    clearInterval(this.pingInterval);
    this.connected = false;
  }
}

// Create global WebSocket client instance
window.WebSocketClient = new WebSocketClient();