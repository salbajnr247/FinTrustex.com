/**
 * WebSocket Client for FinTrustEX
 * Handles real-time market data and trading updates
 */

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2 seconds initial delay
    this.subscriptions = new Map();
    this.messageHandlers = new Map();
    this.connected = false;
  }

  /**
   * Connect to the WebSocket server
   */
  connect() {
    // Use proper protocol based on page protocol (secure/insecure)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}...`);
    
    // Create WebSocket connection
    this.socket = new WebSocket(wsUrl);
    
    // Setup event handlers
    this.socket.onopen = this.handleOpen.bind(this);
    this.socket.onclose = this.handleClose.bind(this);
    this.socket.onerror = this.handleError.bind(this);
    this.socket.onmessage = this.handleMessage.bind(this);
  }
  
  /**
   * Handle WebSocket connection open
   */
  handleOpen() {
    console.log('WebSocket connection established');
    this.connected = true;
    this.reconnectAttempts = 0;
    
    // Resubscribe to previous subscriptions after reconnect
    this.resubscribe();
    
    // Dispatch connection event
    this.dispatchEvent('connection', { status: 'connected' });
  }
  
  /**
   * Handle WebSocket connection close
   */
  handleClose(event) {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.connected = false;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      // Attempt to reconnect with exponential backoff
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);
      console.log(`Attempting to reconnect in ${delay}ms...`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnect attempts reached, giving up');
      this.dispatchEvent('connection', { 
        status: 'disconnected', 
        error: 'Failed to reconnect after multiple attempts'
      });
    }
  }
  
  /**
   * Handle WebSocket errors
   */
  handleError(error) {
    console.error('WebSocket error:', error);
    this.dispatchEvent('error', { error });
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // Route message to the appropriate handler
      if (message.type && this.messageHandlers.has(message.type)) {
        this.messageHandlers.get(message.type).forEach(handler => {
          handler(message);
        });
      }
      
      // Also dispatch as a custom event
      this.dispatchEvent('message', message);
      
      // Handle specific message types
      if (message.type === 'marketUpdate') {
        this.dispatchEvent('marketUpdate', message.data);
      } else if (message.type === 'orderUpdate') {
        this.dispatchEvent('orderUpdate', message.data);
      } else if (message.type === 'notification') {
        this.dispatchEvent('notification', message.data);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }
  
  /**
   * Send a message to the WebSocket server
   */
  send(type, data = {}) {
    if (!this.connected || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected, cannot send message');
      return false;
    }
    
    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    });
    
    try {
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  
  /**
   * Subscribe to a specific market data feed
   */
  subscribe(channel, symbol, interval = '1m') {
    const subscriptionKey = `${channel}:${symbol}:${interval}`;
    
    if (!this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.set(subscriptionKey, { channel, symbol, interval });
      
      // Send subscription request if already connected
      if (this.connected && this.socket.readyState === WebSocket.OPEN) {
        this.send('subscribe', { channel, symbol, interval });
      }
    }
    
    return subscriptionKey;
  }
  
  /**
   * Unsubscribe from a specific market data feed
   */
  unsubscribe(channel, symbol, interval = '1m') {
    const subscriptionKey = `${channel}:${symbol}:${interval}`;
    
    if (this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.delete(subscriptionKey);
      
      // Send unsubscription request if connected
      if (this.connected && this.socket.readyState === WebSocket.OPEN) {
        this.send('unsubscribe', { channel, symbol, interval });
      }
    }
  }
  
  /**
   * Resubscribe to all active subscriptions (after reconnect)
   */
  resubscribe() {
    if (!this.connected || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    this.subscriptions.forEach(({ channel, symbol, interval }) => {
      this.send('subscribe', { channel, symbol, interval });
    });
  }
  
  /**
   * Register a message handler for a specific message type
   */
  on(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    
    this.messageHandlers.get(messageType).push(handler);
  }
  
  /**
   * Remove a message handler
   */
  off(messageType, handler) {
    if (this.messageHandlers.has(messageType)) {
      const handlers = this.messageHandlers.get(messageType);
      const index = handlers.indexOf(handler);
      
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  /**
   * Dispatch a custom event
   */
  dispatchEvent(name, detail) {
    const event = new CustomEvent(`ws:${name}`, { detail });
    document.dispatchEvent(event);
  }
  
  /**
   * Close the WebSocket connection
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

// Create a singleton instance
const wsClient = new WebSocketClient();

// Connect when the page loads (if not already connected)
document.addEventListener('DOMContentLoaded', () => {
  wsClient.connect();
});

// Reconnect when the page becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (!wsClient.connected || wsClient.socket.readyState !== WebSocket.OPEN)) {
    wsClient.connect();
  }
});

// Export the singleton instance
window.wsClient = wsClient;