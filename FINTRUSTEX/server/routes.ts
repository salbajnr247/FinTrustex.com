import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

// Types
type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;
import * as http from 'http';
import { storage } from './storage';
import { getUserById } from './routes/users';
import { getWallets, getWalletById, createWallet, updateWalletBalance } from './routes/wallets';
import { getOrders, getOrderById, createOrder, updateOrderStatus } from './routes/orders';
import { getTransactions, getTransactionById, createTransaction, updateTransactionStatus } from './routes/transactions';

const router = express.Router();

// User routes
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Wallet routes
router.get('/wallets', getWallets);
router.get('/wallets/:id', getWalletById);
router.post('/wallets', createWallet);
router.put('/wallets/:id/balance', updateWalletBalance);

// Order routes
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.post('/orders', createOrder);
router.put('/orders/:id/status', updateOrderStatus);

// Transaction routes
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);
router.post('/transactions', createTransaction);
router.put('/transactions/:id/status', updateTransactionStatus);

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup WebSocket server for real-time updates
export function setupWebSocketServer(httpServer: http.Server) {
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    // Send initial welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to FinTrustEX WebSocket server',
      timestamp: new Date().toISOString()
    }));

    // Set up ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      }
    }, 30000);

    // Handle messages from client
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);

        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            handleSubscription(ws, data);
            break;
          case 'unsubscribe':
            handleUnsubscription(ws, data);
            break;
          case 'pong':
            // Client responded to ping
            break;
          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
              data: data
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
          error: (error as Error).message
        }));
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clearInterval(pingInterval);
    });
  });

  // Broadcast function for sending data to all connected clients
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // Add event listeners for real-time updates
  // These would be triggered by database operations

  // Example: Order status updates
  const orderUpdateListener = (order: any) => {
    broadcast({
      type: 'order_update',
      data: order
    });
  };

  // Example: Transaction updates
  const transactionUpdateListener = (transaction: any) => {
    broadcast({
      type: 'transaction_update',
      data: transaction
    });
  };

  // Example: Price updates (this would connect to external APIs)
  const startPriceUpdates = () => {
    // Simulated price updates every 5 seconds
    setInterval(() => {
      broadcast({
        type: 'price_update',
        data: {
          pairs: [
            { symbol: 'BTC/USDT', price: Math.random() * 60000 + 30000, change: (Math.random() * 10 - 5).toFixed(2) },
            { symbol: 'ETH/USDT', price: Math.random() * 3000 + 2000, change: (Math.random() * 10 - 5).toFixed(2) },
            { symbol: 'XRP/USDT', price: Math.random() * 1 + 0.3, change: (Math.random() * 10 - 5).toFixed(2) }
          ],
          timestamp: new Date().toISOString()
        }
      });
    }, 5000);
  };

  // Start price updates
  startPriceUpdates();

  return wss;
}

// Handle client subscription requests
function handleSubscription(ws: any, data: any) {
  const { channel } = data;
  
  // Add channel to client's subscriptions
  if (!ws.subscriptions) {
    ws.subscriptions = new Set();
  }
  
  ws.subscriptions.add(channel);
  
  ws.send(JSON.stringify({
    type: 'subscription_success',
    channel: channel,
    message: `Subscribed to ${channel}`
  }));
}

// Handle client unsubscription requests
function handleUnsubscription(ws: any, data: any) {
  const { channel } = data;
  
  // Remove channel from client's subscriptions
  if (ws.subscriptions && ws.subscriptions.has(channel)) {
    ws.subscriptions.delete(channel);
    
    ws.send(JSON.stringify({
      type: 'unsubscription_success',
      channel: channel,
      message: `Unsubscribed from ${channel}`
    }));
  } else {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Not subscribed to ${channel}`
    }));
  }
}

export default router;