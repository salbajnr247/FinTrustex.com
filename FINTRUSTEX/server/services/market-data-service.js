/**
 * Market Data Service for FinTrustEX
 * Manages real-time market data from Binance via WebSockets
 */

const binanceService = require('./binance-service');

class MarketDataService {
  constructor() {
    this.activeSubscriptions = new Map();
    this.clients = new Map(); // WebSocket clients subscribed to market data
    this.candleSubscriptions = new Map();
    this.tradeSubscriptions = new Map();
    this.depthSubscriptions = new Map();
  }

  /**
   * Initialize market data service
   * @param {Object} wss - WebSocket server instance
   */
  initialize(wss) {
    console.log('Initializing market data service...');
    this.wss = wss;
    
    // Setup message handling for WebSocket connections
    wss.on('connection', (ws) => {
      ws.isAlive = true;
      
      // Handle pong responses to keep connection alive
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });
      
      // Handle WebSocket disconnection
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });
      
      // Send welcome message
      this.send(ws, {
        type: 'welcome',
        message: 'Connected to FinTrustEX Market Data Service',
        timestamp: Date.now()
      });
    });
    
    // Setup heartbeat interval to check client connections
    this.heartbeatInterval = setInterval(() => {
      wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          this.handleDisconnect(ws);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }
  
  /**
   * Handle incoming WebSocket messages
   * @param {Object} ws - WebSocket client
   * @param {Object} data - Message data
   */
  handleMessage(ws, data) {
    if (!data || !data.type) {
      return this.sendError(ws, 'Invalid message format');
    }
    
    switch (data.type) {
      case 'subscribe':
        this.handleSubscribe(ws, data);
        break;
        
      case 'unsubscribe':
        this.handleUnsubscribe(ws, data);
        break;
        
      case 'ping':
        this.send(ws, { type: 'pong', timestamp: Date.now() });
        break;
        
      default:
        this.sendError(ws, 'Unknown message type');
    }
  }
  
  /**
   * Handle subscribe requests
   * @param {Object} ws - WebSocket client
   * @param {Object} data - Subscribe data
   */
  handleSubscribe(ws, data) {
    if (!data.channel || !data.symbol) {
      return this.sendError(ws, 'Channel and symbol are required for subscription');
    }
    
    const { channel, symbol, interval } = data;
    
    // Assign a client ID if none exists
    if (!ws.clientId) {
      ws.clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.clients.set(ws.clientId, ws);
    }
    
    // Create subscription key
    const subscriptionKey = this.getSubscriptionKey(channel, symbol, interval);
    
    // Add client to the subscription
    if (!this.activeSubscriptions.has(subscriptionKey)) {
      this.activeSubscriptions.set(subscriptionKey, new Set());
      
      // Start the appropriate subscription based on channel
      switch (channel) {
        case 'trades':
          this.subscribeToTrades(subscriptionKey, symbol);
          break;
          
        case 'candles':
          if (!interval) {
            return this.sendError(ws, 'Interval is required for candle subscriptions');
          }
          this.subscribeToCandles(subscriptionKey, symbol, interval);
          break;
          
        case 'depth':
          this.subscribeToDepth(subscriptionKey, symbol);
          break;
          
        default:
          return this.sendError(ws, `Unknown channel: ${channel}`);
      }
    }
    
    // Add client to subscription
    this.activeSubscriptions.get(subscriptionKey).add(ws.clientId);
    
    // Track which subscriptions this client has
    if (!ws.subscriptions) {
      ws.subscriptions = new Set();
    }
    ws.subscriptions.add(subscriptionKey);
    
    // Send confirmation
    this.send(ws, {
      type: 'subscribed',
      channel,
      symbol,
      interval,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle unsubscribe requests
   * @param {Object} ws - WebSocket client
   * @param {Object} data - Unsubscribe data
   */
  handleUnsubscribe(ws, data) {
    if (!ws.clientId || !ws.subscriptions) {
      return this.sendError(ws, 'No active subscriptions');
    }
    
    if (data.all) {
      // Unsubscribe from all channels
      ws.subscriptions.forEach((subscriptionKey) => {
        const subscription = this.activeSubscriptions.get(subscriptionKey);
        if (subscription) {
          subscription.delete(ws.clientId);
          
          // If no more clients, clean up the subscription
          if (subscription.size === 0) {
            this.cleanupSubscription(subscriptionKey);
          }
        }
      });
      
      ws.subscriptions.clear();
      this.send(ws, {
        type: 'unsubscribed',
        message: 'Unsubscribed from all channels',
        timestamp: Date.now()
      });
      return;
    }
    
    const { channel, symbol, interval } = data;
    if (!channel || !symbol) {
      return this.sendError(ws, 'Channel and symbol are required for unsubscription');
    }
    
    const subscriptionKey = this.getSubscriptionKey(channel, symbol, interval);
    
    // Check if user is subscribed to this channel
    if (!ws.subscriptions.has(subscriptionKey)) {
      return this.sendError(ws, 'Not subscribed to this channel');
    }
    
    // Remove user from subscription
    const subscription = this.activeSubscriptions.get(subscriptionKey);
    if (subscription) {
      subscription.delete(ws.clientId);
      
      // If no more clients, clean up the subscription
      if (subscription.size === 0) {
        this.cleanupSubscription(subscriptionKey);
      }
    }
    
    // Remove from client's subscriptions
    ws.subscriptions.delete(subscriptionKey);
    
    // Send confirmation
    this.send(ws, {
      type: 'unsubscribed',
      channel,
      symbol,
      interval,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle client disconnection
   * @param {Object} ws - WebSocket client
   */
  handleDisconnect(ws) {
    if (!ws.clientId) return;
    
    console.log(`Client disconnected: ${ws.clientId}`);
    
    // Remove client from all subscriptions
    if (ws.subscriptions) {
      ws.subscriptions.forEach((subscriptionKey) => {
        const subscription = this.activeSubscriptions.get(subscriptionKey);
        if (subscription) {
          subscription.delete(ws.clientId);
          
          // If no more clients, clean up the subscription
          if (subscription.size === 0) {
            this.cleanupSubscription(subscriptionKey);
          }
        }
      });
    }
    
    // Remove client from clients map
    this.clients.delete(ws.clientId);
  }
  
  /**
   * Clean up subscription resources
   * @param {string} subscriptionKey - Subscription key
   */
  cleanupSubscription(subscriptionKey) {
    const [channel, symbol, interval] = subscriptionKey.split(':');
    
    // Close the WebSocket subscription based on channel type
    switch (channel) {
      case 'trades':
        if (this.tradeSubscriptions.has(subscriptionKey)) {
          const cleanupFunc = this.tradeSubscriptions.get(subscriptionKey);
          if (typeof cleanupFunc === 'function') {
            cleanupFunc();
          }
          this.tradeSubscriptions.delete(subscriptionKey);
        }
        break;
        
      case 'candles':
        if (this.candleSubscriptions.has(subscriptionKey)) {
          const cleanupFunc = this.candleSubscriptions.get(subscriptionKey);
          if (typeof cleanupFunc === 'function') {
            cleanupFunc();
          }
          this.candleSubscriptions.delete(subscriptionKey);
        }
        break;
        
      case 'depth':
        if (this.depthSubscriptions.has(subscriptionKey)) {
          const cleanupFunc = this.depthSubscriptions.get(subscriptionKey);
          if (typeof cleanupFunc === 'function') {
            cleanupFunc();
          }
          this.depthSubscriptions.delete(subscriptionKey);
        }
        break;
    }
    
    // Remove from active subscriptions
    this.activeSubscriptions.delete(subscriptionKey);
  }
  
  /**
   * Subscribe to trade updates
   * @param {string} subscriptionKey - Subscription key
   * @param {string} symbol - Trading pair
   */
  subscribeToTrades(subscriptionKey, symbol) {
    const cleanup = binanceService.subscribeToTrades(symbol, (trade) => {
      this.broadcast(subscriptionKey, {
        type: 'trade',
        symbol,
        data: trade,
        timestamp: Date.now()
      });
    });
    
    this.tradeSubscriptions.set(subscriptionKey, cleanup);
  }
  
  /**
   * Subscribe to candlestick updates
   * @param {string} subscriptionKey - Subscription key
   * @param {string} symbol - Trading pair
   * @param {string} interval - Candlestick interval
   */
  subscribeToCandles(subscriptionKey, symbol, interval) {
    const cleanup = binanceService.subscribeToCandles(symbol, interval, (candle) => {
      this.broadcast(subscriptionKey, {
        type: 'candle',
        symbol,
        interval,
        data: candle,
        timestamp: Date.now()
      });
    });
    
    this.candleSubscriptions.set(subscriptionKey, cleanup);
  }
  
  /**
   * Subscribe to order book updates
   * @param {string} subscriptionKey - Subscription key
   * @param {string} symbol - Trading pair
   */
  subscribeToDepth(subscriptionKey, symbol) {
    const cleanup = binanceService.subscribeToDepth(symbol, (depth) => {
      this.broadcast(subscriptionKey, {
        type: 'depth',
        symbol,
        data: depth,
        timestamp: Date.now()
      });
    });
    
    this.depthSubscriptions.set(subscriptionKey, cleanup);
  }
  
  /**
   * Broadcast message to all clients subscribed to a channel
   * @param {string} subscriptionKey - Subscription key
   * @param {Object} message - Message to broadcast
   */
  broadcast(subscriptionKey, message) {
    const subscribers = this.activeSubscriptions.get(subscriptionKey);
    if (!subscribers || subscribers.size === 0) return;
    
    const messageStr = JSON.stringify(message);
    
    subscribers.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && client.readyState === 1) { // WebSocket.OPEN
        client.send(messageStr);
      }
    });
  }
  
  /**
   * Send a message to a specific client
   * @param {Object} ws - WebSocket client
   * @param {Object} message - Message to send
   */
  send(ws, message) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(message));
    }
  }
  
  /**
   * Send an error message to a client
   * @param {Object} ws - WebSocket client
   * @param {string} errorMessage - Error message
   */
  sendError(ws, errorMessage) {
    this.send(ws, {
      type: 'error',
      message: errorMessage,
      timestamp: Date.now()
    });
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
  
  /**
   * Clean up resources
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all active subscriptions
    this.tradeSubscriptions.forEach(cleanup => typeof cleanup === 'function' && cleanup());
    this.candleSubscriptions.forEach(cleanup => typeof cleanup === 'function' && cleanup());
    this.depthSubscriptions.forEach(cleanup => typeof cleanup === 'function' && cleanup());
    
    this.tradeSubscriptions.clear();
    this.candleSubscriptions.clear();
    this.depthSubscriptions.clear();
    this.activeSubscriptions.clear();
    this.clients.clear();
  }
}

// Create singleton instance
const marketDataService = new MarketDataService();

module.exports = marketDataService;