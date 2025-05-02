/**
 * WebSocket Server for FinTrustEX
 * Manages real-time data transmission between the backend and clients
 */

const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

/**
 * Initialize WebSocket server
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {WebSocket.Server} WebSocket server instance
 */
function initializeWebSocketServer(httpServer) {
  // Create WebSocket server on a specific path to avoid conflicts with other WebSocket connections
  const wss = new WebSocket.Server({ 
    server: httpServer,
    path: '/ws'
  });

  // Client tracking
  const clients = new Map();
  
  // Subscription tracking: { channel: Set<clientId> }
  const subscriptions = new Map();
  
  // Set up heartbeat to detect disconnected clients
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = clients.get(ws);
      
      if (!client) {
        return;
      }
      
      if (client.isAlive === false) {
        // Clean up subscriptions for this client
        handleClientDisconnect(ws);
        return ws.terminate();
      }
      
      client.isAlive = false;
      sendMessage(ws, { type: 'heartbeat', timestamp: Date.now() });
    });
  }, 30000);
  
  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });
  
  // Handle new connections
  wss.on('connection', (ws, req) => {
    // Assign a unique client ID
    const clientId = uuidv4();
    
    // Store client info
    clients.set(ws, {
      id: clientId,
      isAlive: true,
      subscriptions: new Set()
    });
    
    // Send client ID to client
    sendMessage(ws, { 
      type: 'client_id',
      clientId,
      message: 'Connected to FinTrustEX WebSocket server'
    });
    
    console.log(`WebSocket client connected: ${clientId}`);
    
    // Handle heartbeat pings
    ws.on('pong', () => {
      const client = clients.get(ws);
      if (client) {
        client.isAlive = true;
      }
    });
    
    // Handle heartbeat acknowledgments
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'heartbeat_ack') {
          const client = clients.get(ws);
          if (client) {
            client.isAlive = true;
          }
          return;
        }
        
        // Handle client messages
        handleClientMessage(ws, message);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    // Handle disconnects
    ws.on('close', () => {
      handleClientDisconnect(ws);
    });
  });
  
  /**
   * Handle messages from clients
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} message - Parsed message from client
   */
  function handleClientMessage(ws, message) {
    const client = clients.get(ws);
    
    if (!client) {
      return;
    }
    
    switch (message.type) {
      case 'subscribe':
        handleSubscription(ws, client, message.channel);
        break;
        
      case 'unsubscribe':
        handleUnsubscription(ws, client, message.channel);
        break;
        
      default:
        console.log(`Received message from ${client.id}:`, message);
    }
  }
  
  /**
   * Handle client subscription request
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} client - Client information
   * @param {string} channel - Channel to subscribe to
   */
  function handleSubscription(ws, client, channel) {
    if (!channel) {
      return;
    }
    
    // Add channel to client's subscriptions
    client.subscriptions.add(channel);
    
    // Add client to channel subscribers
    if (!subscriptions.has(channel)) {
      subscriptions.set(channel, new Set());
    }
    
    subscriptions.get(channel).add(client.id);
    
    // Confirm subscription
    sendMessage(ws, {
      type: 'subscription_success',
      channel,
      message: `Subscribed to ${channel}`
    });
    
    console.log(`Client ${client.id} subscribed to ${channel}`);
  }
  
  /**
   * Handle client unsubscription request
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} client - Client information
   * @param {string} channel - Channel to unsubscribe from
   */
  function handleUnsubscription(ws, client, channel) {
    if (!channel) {
      return;
    }
    
    // Remove channel from client's subscriptions
    client.subscriptions.delete(channel);
    
    // Remove client from channel subscribers
    if (subscriptions.has(channel)) {
      subscriptions.get(channel).delete(client.id);
      
      // Clean up empty channels
      if (subscriptions.get(channel).size === 0) {
        subscriptions.delete(channel);
      }
    }
    
    // Confirm unsubscription
    sendMessage(ws, {
      type: 'unsubscription_success',
      channel,
      message: `Unsubscribed from ${channel}`
    });
    
    console.log(`Client ${client.id} unsubscribed from ${channel}`);
  }
  
  /**
   * Handle client disconnect
   * @param {WebSocket} ws - WebSocket connection
   */
  function handleClientDisconnect(ws) {
    const client = clients.get(ws);
    
    if (!client) {
      return;
    }
    
    console.log(`WebSocket client disconnected: ${client.id}`);
    
    // Clean up subscriptions
    for (const channel of client.subscriptions) {
      if (subscriptions.has(channel)) {
        subscriptions.get(channel).delete(client.id);
        
        // Clean up empty channels
        if (subscriptions.get(channel).size === 0) {
          subscriptions.delete(channel);
        }
      }
    }
    
    // Remove client
    clients.delete(ws);
  }
  
  /**
   * Send a message to a client
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} message - Message to send
   */
  function sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  /**
   * Broadcast a message to all subscribers of a channel
   * @param {string} channel - Channel to broadcast to
   * @param {Object} data - Data to broadcast
   * @param {string} event - Event type
   */
  function broadcast(channel, data, event) {
    if (!subscriptions.has(channel)) {
      return;
    }
    
    const message = {
      event: event || channel,
      channel,
      data,
      timestamp: Date.now()
    };
    
    // Broadcast to all subscribers
    const subscribers = subscriptions.get(channel);
    
    wss.clients.forEach((ws) => {
      const client = clients.get(ws);
      
      if (client && subscribers.has(client.id) && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
  
  // Export public API
  return {
    wss,
    broadcast,
    getSubscriptionCount: (channel) => {
      if (!subscriptions.has(channel)) {
        return 0;
      }
      return subscriptions.get(channel).size;
    },
    getClientCount: () => {
      return clients.size;
    },
    getChannels: () => {
      return Array.from(subscriptions.keys());
    }
  };
}

module.exports = { initializeWebSocketServer };