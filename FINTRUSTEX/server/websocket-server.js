/**
 * WebSocket Server for FinTrustEX
 * Handles real-time market data distribution and client connections
 */

const WebSocket = require('ws');
const { marketDataService } = require('./services/market-data');

/**
 * Configure and initialize WebSocket server
 * @param {Object} httpServer - HTTP server instance to attach WebSocket server
 * @returns {WebSocket.Server} - WebSocket server instance
 */
function setupWebSocketServer(httpServer) {
  if (!httpServer) {
    throw new Error('HTTP server instance is required');
  }

  // Create WebSocket server
  const wss = new WebSocket.Server({ 
    server: httpServer,
    path: '/ws' // Distinct path to avoid conflicts with Vite's HMR
  });

  // Connected clients with their subscriptions
  const clients = new Map();
  
  // Subscription map for efficient broadcasting
  const subscriptions = new Map();

  wss.on('connection', (ws, req) => {
    console.log(`WebSocket connection established: ${req.socket.remoteAddress}`);
    
    // Generate unique client ID
    const clientId = generateClientId();
    
    // Initialize client tracking
    clients.set(clientId, {
      ws,
      subscriptions: new Set(),
      isAlive: true,
      userId: null // Will be set after authentication
    });
    
    // Setup connection handling
    setupConnection(ws, clientId);
    
    // Handle client messages
    ws.on('message', (message) => handleMessage(ws, message, clientId));
    
    // Handle client disconnection
    ws.on('close', () => handleDisconnection(clientId));
    
    // Send welcome message
    sendToClient(ws, {
      type: 'system',
      message: 'Welcome to FinTrustEX WebSocket Server'
    });
  });
  
  // Start periodic tasks
  startPeriodicUpdates();
  startConnectionHeartbeat(wss);
  
  return wss;
  
  /**
   * Set up new client connection
   * @param {WebSocket} ws - WebSocket client instance
   * @param {string} clientId - Unique client identifier
   */
  function setupConnection(ws, clientId) {
    // Handle pings from client
    ws.on('ping', () => {
      try {
        ws.pong();
      } catch (error) {
        console.error('Error sending pong:', error);
      }
    });
    
    // Handle client pings
    ws.on('pong', () => {
      const client = clients.get(clientId);
      if (client) {
        client.isAlive = true;
      }
    });
  }
  
  /**
   * Process incoming client message
   * @param {WebSocket} ws - WebSocket client instance
   * @param {Buffer|string} message - Raw message data
   * @param {string} clientId - Client identifier
   */
  function handleMessage(ws, message, clientId) {
    try {
      const data = JSON.parse(message.toString());
      console.log(`Received message from client ${clientId}:`, data.type);
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          sendToClient(ws, { type: 'pong' });
          break;
          
        case 'subscribe':
          handleSubscription(ws, data, clientId);
          break;
          
        case 'unsubscribe':
          handleUnsubscription(ws, data, clientId);
          break;
          
        case 'auth':
          handleAuthentication(ws, data, clientId);
          break;
          
        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      sendError(ws, 'Invalid message format');
    }
  }
  
  /**
   * Handle client subscription request
   * @param {WebSocket} ws - WebSocket client instance
   * @param {Object} data - Subscription data
   * @param {string} clientId - Client identifier
   */
  function handleSubscription(ws, data, clientId) {
    const { channel, symbol, interval } = data;
    
    if (!channel || !symbol) {
      return sendError(ws, 'Channel and symbol are required for subscription');
    }
    
    const subscriptionKey = getSubscriptionKey(channel, symbol, interval);
    const client = clients.get(clientId);
    
    if (!client) {
      return sendError(ws, 'Client not registered');
    }
    
    // Add to client subscriptions
    client.subscriptions.add(subscriptionKey);
    
    // Add to global subscription map
    if (!subscriptions.has(subscriptionKey)) {
      subscriptions.set(subscriptionKey, new Set());
    }
    subscriptions.get(subscriptionKey).add(clientId);
    
    console.log(`Client ${clientId} subscribed to ${subscriptionKey}`);
    
    // Send acknowledgment
    sendToClient(ws, {
      type: 'subscribed',
      channel,
      symbol,
      interval: interval || undefined
    });
    
    // Send initial data
    sendInitialData(ws, channel, symbol, interval);
  }
  
  /**
   * Handle client unsubscription request
   * @param {WebSocket} ws - WebSocket client instance
   * @param {Object} data - Unsubscription data
   * @param {string} clientId - Client identifier
   */
  function handleUnsubscription(ws, data, clientId) {
    const { channel, symbol, interval } = data;
    
    if (!channel || !symbol) {
      return sendError(ws, 'Channel and symbol are required for unsubscription');
    }
    
    const subscriptionKey = getSubscriptionKey(channel, symbol, interval);
    const client = clients.get(clientId);
    
    if (!client) {
      return sendError(ws, 'Client not registered');
    }
    
    // Remove from client subscriptions
    client.subscriptions.delete(subscriptionKey);
    
    // Remove from global subscription map
    if (subscriptions.has(subscriptionKey)) {
      subscriptions.get(subscriptionKey).delete(clientId);
      
      // Clean up empty subscription sets
      if (subscriptions.get(subscriptionKey).size === 0) {
        subscriptions.delete(subscriptionKey);
      }
    }
    
    console.log(`Client ${clientId} unsubscribed from ${subscriptionKey}`);
    
    // Send acknowledgment
    sendToClient(ws, {
      type: 'unsubscribed',
      channel,
      symbol,
      interval: interval || undefined
    });
  }
  
  /**
   * Handle client authentication
   * @param {WebSocket} ws - WebSocket client instance
   * @param {Object} data - Authentication data
   * @param {string} clientId - Client identifier
   */
  function handleAuthentication(ws, data, clientId) {
    const { token } = data;
    const client = clients.get(clientId);
    
    if (!client) {
      return sendError(ws, 'Client not registered');
    }
    
    // TODO: Implement proper token validation
    // For now, just accept any token and assign a mock user ID
    const userId = token || 'anonymous';
    client.userId = userId;
    
    console.log(`Client ${clientId} authenticated as user ${userId}`);
    
    sendToClient(ws, {
      type: 'auth',
      success: true,
      userId
    });
  }
  
  /**
   * Handle client disconnection
   * @param {string} clientId - Client identifier
   */
  function handleDisconnection(clientId) {
    const client = clients.get(clientId);
    
    if (!client) {
      return;
    }
    
    console.log(`Client ${clientId} disconnected`);
    
    // Remove client from all subscriptions
    client.subscriptions.forEach(subscriptionKey => {
      if (subscriptions.has(subscriptionKey)) {
        subscriptions.get(subscriptionKey).delete(clientId);
        
        // Clean up empty subscription sets
        if (subscriptions.get(subscriptionKey).size === 0) {
          subscriptions.delete(subscriptionKey);
        }
      }
    });
    
    // Remove client from tracking
    clients.delete(clientId);
  }
  
  /**
   * Send initial data for a subscription
   * @param {WebSocket} ws - WebSocket client instance
   * @param {string} channel - Data channel
   * @param {string} symbol - Trading symbol
   * @param {string|null} interval - Time interval for candle data
   */
  function sendInitialData(ws, channel, symbol, interval) {
    let data;
    
    try {
      // Get data from market data service based on channel
      switch (channel) {
        case 'ticker':
          data = marketDataService.getTicker(symbol);
          break;
          
        case 'orderbook':
          data = marketDataService.getOrderBook(symbol);
          break;
          
        case 'trades':
          data = marketDataService.getRecentTrades(symbol);
          break;
          
        case 'candles':
          if (!interval) {
            return sendError(ws, 'Interval is required for candle data');
          }
          data = marketDataService.getCandles(symbol, interval);
          break;
          
        default:
          return sendError(ws, `Unknown channel: ${channel}`);
      }
      
      // Send data to client
      sendToClient(ws, {
        type: 'data',
        channel,
        symbol,
        interval: interval || undefined,
        data
      });
    } catch (error) {
      console.error(`Error retrieving initial data for ${channel}:${symbol}:`, error);
      sendError(ws, `Failed to retrieve ${channel} data for ${symbol}`);
    }
  }
  
  /**
   * Send error message to client
   * @param {WebSocket} ws - WebSocket client instance
   * @param {string} message - Error message
   */
  function sendError(ws, message) {
    sendToClient(ws, {
      type: 'error',
      message
    });
  }
  
  /**
   * Send message to specific client
   * @param {WebSocket} ws - WebSocket client instance
   * @param {Object} message - Message to send
   */
  function sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    }
  }
  
  /**
   * Broadcast message to all subscribed clients
   * @param {string} subscriptionKey - Subscription identifier
   * @param {Object} message - Message to broadcast
   */
  function broadcast(subscriptionKey, message) {
    if (!subscriptions.has(subscriptionKey)) {
      return; // No subscribers
    }
    
    const clientIds = subscriptions.get(subscriptionKey);
    
    clientIds.forEach(clientId => {
      const client = clients.get(clientId);
      
      if (client && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Error broadcasting to client ${clientId}:`, error);
        }
      }
    });
  }
  
  /**
   * Start periodic market data updates
   */
  function startPeriodicUpdates() {
    // Update tickers every 3 seconds
    setInterval(() => {
      // Get all ticker subscription keys
      for (const [key, clientIds] of subscriptions.entries()) {
        if (key.startsWith('ticker:')) {
          const [, symbol] = key.split(':');
          
          try {
            const tickerData = marketDataService.getTicker(symbol);
            
            broadcast(key, {
              type: 'data',
              channel: 'ticker',
              symbol,
              data: tickerData
            });
          } catch (error) {
            console.error(`Error updating ticker for ${symbol}:`, error);
          }
        }
      }
    }, 3000);
    
    // Update order books every 5 seconds
    setInterval(() => {
      for (const [key, clientIds] of subscriptions.entries()) {
        if (key.startsWith('orderbook:')) {
          const [, symbol] = key.split(':');
          
          try {
            const orderbookData = marketDataService.getOrderBook(symbol);
            
            broadcast(key, {
              type: 'data',
              channel: 'orderbook',
              symbol,
              data: orderbookData
            });
          } catch (error) {
            console.error(`Error updating orderbook for ${symbol}:`, error);
          }
        }
      }
    }, 5000);
    
    // Simulate occasional trades (random intervals)
    setInterval(() => {
      for (const [key, clientIds] of subscriptions.entries()) {
        if (key.startsWith('trades:')) {
          const [, symbol] = key.split(':');
          
          // Only send trade updates occasionally (simulation)
          if (Math.random() > 0.3) {
            continue;
          }
          
          try {
            const tradeData = marketDataService.getNewTrade(symbol);
            
            broadcast(key, {
              type: 'data',
              channel: 'trades',
              symbol,
              data: tradeData
            });
          } catch (error) {
            console.error(`Error sending trade update for ${symbol}:`, error);
          }
        }
      }
    }, 2000);
    
    // Update candles based on their interval
    setInterval(() => {
      for (const [key, clientIds] of subscriptions.entries()) {
        if (key.startsWith('candles:')) {
          const [, symbol, interval] = key.split(':');
          
          if (!interval) continue;
          
          try {
            const candleData = marketDataService.getCandles(symbol, interval);
            
            broadcast(key, {
              type: 'data',
              channel: 'candles',
              symbol,
              interval,
              data: candleData
            });
          } catch (error) {
            console.error(`Error updating candles for ${symbol}:${interval}:`, error);
          }
        }
      }
    }, 10000);
  }
  
  /**
   * Start WebSocket connection heartbeat
   * @param {WebSocket.Server} wss - WebSocket server instance
   */
  function startConnectionHeartbeat(wss) {
    const HEARTBEAT_INTERVAL = 30000; // 30 seconds
    
    setInterval(() => {
      clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          console.log(`Client ${clientId} failed heartbeat check, terminating connection`);
          client.ws.terminate();
          return;
        }
        
        client.isAlive = false;
        
        try {
          client.ws.ping();
        } catch (error) {
          console.error(`Error sending ping to client ${clientId}:`, error);
          client.ws.terminate();
        }
      });
    }, HEARTBEAT_INTERVAL);
  }
  
  /**
   * Generate a unique client identifier
   * @returns {string} - Unique client ID
   */
  function generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate subscription key from parts
   * @param {string} channel - Data channel
   * @param {string} symbol - Trading symbol
   * @param {string|null} interval - Time interval
   * @returns {string} - Unique subscription key
   */
  function getSubscriptionKey(channel, symbol, interval) {
    return `${channel}:${symbol}${interval ? ':' + interval : ''}`;
  }
}

module.exports = { setupWebSocketServer };