/**
 * FINTRUSTEX WebSocket Client
 * Handles real-time data streaming from the server
 */

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.subscriptions = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // Start with 2 seconds
    this.isConnecting = false;
    this.eventHandlers = {
      open: [],
      close: [],
      error: [],
      message: [],
      price_update: [],
      market_data: [],
      order_update: [],
      transaction_update: []
    };

    // Bind methods to maintain 'this' context
    this.connect = this.connect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.send = this.send.bind(this);
    this.disconnect = this.disconnect.bind(this);
  }

  /**
   * Connect to WebSocket server
   * @returns {Promise<WebSocket>} - WebSocket connection
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve(this.socket);
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        // Determine the correct protocol based on the page's protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log(`Connecting to WebSocket server at ${wsUrl}...`);
        this.socket = new WebSocket(wsUrl);

        this.socket.addEventListener('open', (event) => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 2000;
          console.log('WebSocket connection established');
          
          // Resubscribe to previous channels
          if (this.subscriptions.size > 0) {
            this.subscriptions.forEach(channel => {
              this.subscribe(channel);
            });
          }
          
          this.handleOpen(event);
          resolve(this.socket);
        });

        this.socket.addEventListener('close', (event) => {
          this.isConnecting = false;
          this.handleClose(event);
          
          // Attempt to reconnect if connection was previously established
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log(`WebSocket connection closed. Attempting to reconnect in ${this.reconnectDelay / 1000}s...`);
            setTimeout(this.reconnect, this.reconnectDelay);
            this.reconnectDelay *= 1.5; // Exponential backoff
            this.reconnectAttempts++;
          } else {
            console.error('WebSocket reconnection failed after maximum attempts');
            reject(new Error('WebSocket reconnection failed after maximum attempts'));
          }
        });

        this.socket.addEventListener('error', (event) => {
          this.isConnecting = false;
          console.error('WebSocket connection error:', event);
          this.handleError(event);
          reject(new Error('WebSocket connection error'));
        });

        this.socket.addEventListener('message', this.handleMessage);
      } catch (error) {
        this.isConnecting = false;
        console.error('WebSocket connection error:', error);
        reject(error);
      }
    });
  }

  /**
   * Reconnect to WebSocket server
   */
  reconnect() {
    this.connect().catch(error => {
      console.error('WebSocket reconnection error:', error);
    });
  }

  /**
   * Handle WebSocket open event
   * @param {Event} event - WebSocket event
   */
  handleOpen(event) {
    console.log('WebSocket connection opened');
    this.eventHandlers.open.forEach(handler => handler(event));
  }

  /**
   * Handle WebSocket close event
   * @param {CloseEvent} event - WebSocket close event
   */
  handleClose(event) {
    console.log('WebSocket connection closed:', event.code, event.reason);
    this.eventHandlers.close.forEach(handler => handler(event));
  }

  /**
   * Handle WebSocket error event
   * @param {Event} event - WebSocket error event
   */
  handleError(event) {
    console.error('WebSocket error:', event);
    this.eventHandlers.error.forEach(handler => handler(event));
  }

  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event - WebSocket message event
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);

      // General message event handlers
      this.eventHandlers.message.forEach(handler => handler(data));

      // Specific event type handlers
      if (data.type && this.eventHandlers[data.type]) {
        this.eventHandlers[data.type].forEach(handler => handler(data.data || data));
      }

      // Handle ping messages automatically with pong response
      if (data.type === 'ping') {
        this.send({ type: 'pong', timestamp: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, event.data);
    }
  }

  /**
   * Subscribe to a data channel
   * @param {string} channel - Channel name to subscribe to
   */
  subscribe(channel) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.subscriptions.add(channel);
      console.log(`Queued subscription to channel: ${channel}`);
      this.connect().catch(console.error);
      return;
    }

    this.subscriptions.add(channel);
    this.send({
      type: 'subscribe',
      channel: channel
    });
    console.log(`Subscribed to channel: ${channel}`);
  }

  /**
   * Unsubscribe from a data channel
   * @param {string} channel - Channel name to unsubscribe from
   */
  unsubscribe(channel) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.subscriptions.delete(channel);
      console.log(`Removed subscription to channel: ${channel}`);
      return;
    }

    this.subscriptions.delete(channel);
    this.send({
      type: 'unsubscribe',
      channel: channel
    });
    console.log(`Unsubscribed from channel: ${channel}`);
  }

  /**
   * Register event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
    return this; // Allow chaining
  }

  /**
   * Remove event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function to remove
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
    return this; // Allow chaining
  }

  /**
   * Send data to WebSocket server
   * @param {Object} data - Data to send
   */
  send(data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket is not connected');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    console.log('WebSocket disconnected by client');
  }

  /**
   * Check if WebSocket is connected
   * @returns {boolean} - Is connected
   */
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status
   * @returns {string} - Connection status
   */
  getStatus() {
    if (!this.socket) return 'CLOSED';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }
}

// Create singleton instance
const websocketClient = new WebSocketClient();
export default websocketClient;