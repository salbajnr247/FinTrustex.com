/**
 * WebSocket Server for FinTrustEX
 * Handles real-time data streaming and client communication
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Map to store active clients
let clients = new Map();
// Map to store admin clients for broadcasting admin-specific events
let adminClients = new Map();
// Map to store client subscriptions (client ID => list of channels)
let clientSubscriptions = new Map();

/**
 * Set up WebSocket server
 * @param {http.Server} httpServer - HTTP Server to attach WebSocket server to
 * @returns {WebSocket.Server} WebSocket server instance
 */
function setupWebSocketServer(httpServer) {
  console.log('Setting up WebSocket server...');
  
  // Create WebSocket server
  const wss = new WebSocket.Server({
    server: httpServer,
    path: '/ws'
  });
  
  // Set up connection handler
  wss.on('connection', (ws, req) => {
    // Generate a unique client ID
    const clientId = uuidv4();
    console.log(`New WebSocket connection: ${clientId}`);
    
    // Store client reference
    clients.set(clientId, ws);
    
    // Set up client properties
    ws.clientId = clientId;
    ws.isAlive = true;
    ws.subscribedChannels = new Set();
    
    // Handle pong response
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`Received message from ${clientId}:`, data);
        
        // Handle authentication
        if (data.type === 'auth') {
          handleAuth(ws, data);
        }
        // Handle subscription
        else if (data.type === 'subscribe') {
          handleSubscribe(ws, data);
        }
        // Handle unsubscription
        else if (data.type === 'unsubscribe') {
          handleUnsubscribe(ws, data);
        }
        // Handle ping
        else if (data.type === 'ping') {
          send(ws, { type: 'pong', timestamp: Date.now() });
        }
        // Handle unknown message type
        else {
          send(ws, {
            type: 'error',
            message: 'Unknown message type',
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        send(ws, {
          type: 'error',
          message: 'Invalid message format',
          timestamp: Date.now()
        });
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      handleDisconnect(ws);
    });
    
    // Send welcome message
    send(ws, {
      type: 'welcome',
      message: 'Connected to FinTrustEX WebSocket Server',
      timestamp: Date.now()
    });
  });
  
  // Set up heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        handleDisconnect(ws);
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  console.log('WebSocket server is ready');
  return wss;
}

/**
 * Handle client authentication
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} data - Authentication data
 */
function handleAuth(ws, data) {
  // In a real implementation, this would verify the user's credentials
  // For now, just store user ID and admin status
  if (data.userId) {
    ws.userId = data.userId;
    ws.isAdmin = data.isAdmin || false;
    
    // Add to admin clients if admin
    if (ws.isAdmin) {
      adminClients.set(ws.clientId, ws);
    }
    
    send(ws, {
      type: 'auth_success',
      userId: ws.userId,
      isAdmin: ws.isAdmin,
      timestamp: Date.now()
    });
    
    console.log(`Client ${ws.clientId} authenticated as user ${ws.userId} (Admin: ${ws.isAdmin})`);
  } else {
    send(ws, {
      type: 'auth_error',
      message: 'Authentication failed',
      timestamp: Date.now()
    });
  }
}

/**
 * Handle subscription request
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} data - Subscription data
 */
function handleSubscribe(ws, data) {
  if (!data.channel) {
    return send(ws, {
      type: 'error',
      message: 'Channel is required for subscription',
      timestamp: Date.now()
    });
  }
  
  // Add channel to client's subscriptions
  ws.subscribedChannels.add(data.channel);
  
  // Add to channel subscriptions map
  if (!clientSubscriptions.has(data.channel)) {
    clientSubscriptions.set(data.channel, new Set());
  }
  clientSubscriptions.get(data.channel).add(ws.clientId);
  
  console.log(`Client ${ws.clientId} subscribed to channel: ${data.channel}`);
  
  send(ws, {
    type: 'subscribed',
    channel: data.channel,
    timestamp: Date.now()
  });
}

/**
 * Handle unsubscription request
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} data - Unsubscription data
 */
function handleUnsubscribe(ws, data) {
  if (data.all) {
    // Unsubscribe from all channels
    ws.subscribedChannels.forEach(channel => {
      if (clientSubscriptions.has(channel)) {
        clientSubscriptions.get(channel).delete(ws.clientId);
      }
    });
    
    ws.subscribedChannels.clear();
    
    console.log(`Client ${ws.clientId} unsubscribed from all channels`);
    
    send(ws, {
      type: 'unsubscribed',
      all: true,
      timestamp: Date.now()
    });
    
    return;
  }
  
  if (!data.channel) {
    return send(ws, {
      type: 'error',
      message: 'Channel is required for unsubscription',
      timestamp: Date.now()
    });
  }
  
  // Remove channel from client's subscriptions
  ws.subscribedChannels.delete(data.channel);
  
  // Remove from channel subscriptions map
  if (clientSubscriptions.has(data.channel)) {
    clientSubscriptions.get(data.channel).delete(ws.clientId);
  }
  
  console.log(`Client ${ws.clientId} unsubscribed from channel: ${data.channel}`);
  
  send(ws, {
    type: 'unsubscribed',
    channel: data.channel,
    timestamp: Date.now()
  });
}

/**
 * Handle client disconnection
 * @param {WebSocket} ws - WebSocket client
 */
function handleDisconnect(ws) {
  console.log(`WebSocket disconnected: ${ws.clientId}`);
  
  // Remove from clients map
  clients.delete(ws.clientId);
  
  // Remove from admin clients if admin
  if (ws.isAdmin) {
    adminClients.delete(ws.clientId);
  }
  
  // Remove from all subscriptions
  ws.subscribedChannels.forEach(channel => {
    if (clientSubscriptions.has(channel)) {
      clientSubscriptions.get(channel).delete(ws.clientId);
    }
  });
}

/**
 * Send a message to a specific client
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} message - Message to send
 */
function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Broadcast a message to all clients
 * @param {Object} message - Message to broadcast
 */
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

/**
 * Broadcast a message to all clients subscribed to a channel
 * @param {string} channel - Channel to broadcast to
 * @param {Object} message - Message to broadcast
 */
function broadcastToChannel(channel, message) {
  if (!clientSubscriptions.has(channel)) {
    return;
  }
  
  const messageStr = JSON.stringify(message);
  
  clientSubscriptions.get(channel).forEach(clientId => {
    const client = clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

/**
 * Broadcast a message to all admin clients
 * @param {Object} message - Message to broadcast
 */
function broadcastToAdmins(message) {
  const messageStr = JSON.stringify(message);
  
  adminClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

/**
 * Broadcast a message to a specific user
 * @param {string} userId - User ID to broadcast to
 * @param {Object} message - Message to broadcast
 */
function broadcastToUser(userId, message) {
  const messageStr = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client.userId === userId && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

module.exports = {
  setupWebSocketServer,
  broadcast,
  broadcastToChannel,
  broadcastToAdmins,
  broadcastToUser
};