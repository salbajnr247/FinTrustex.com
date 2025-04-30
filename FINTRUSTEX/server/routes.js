"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocketServer = void 0;

const express_1 = require("express");
const ws_1 = require("ws");
const WebSocket = require("ws");
const authRoutes = require('./routes/auth');
const securityRoutes = require('./routes/security');
const router = (0, express_1.Router)();

// Use authentication routes
router.use('/auth', authRoutes);

// Use security routes
router.use('/security', securityRoutes);

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// We'll handle AI routes at the top level in index.js

// Setup WebSocket server for real-time updates
function setupWebSocketServer(httpServer) {
    const wss = new ws_1.WebSocketServer({
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
            if (ws.readyState === WebSocket.OPEN) { // Use WebSocket.OPEN instead of 1
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
            }
            catch (error) {
                console.error('WebSocket message error:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Failed to process message',
                    error: error.message
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
    const broadcast = (data) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) { // Use WebSocket.OPEN instead of 1
                client.send(JSON.stringify(data));
            }
        });
    };
    
    // Example: Price updates (simulated for now, will connect to external APIs in production)
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
exports.setupWebSocketServer = setupWebSocketServer;

// Handle client subscription requests
function handleSubscription(ws, data) {
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
function handleUnsubscription(ws, data) {
    const { channel } = data;
    
    // Remove channel from client's subscriptions
    if (ws.subscriptions && ws.subscriptions.has(channel)) {
        ws.subscriptions.delete(channel);
        
        ws.send(JSON.stringify({
            type: 'unsubscription_success',
            channel: channel,
            message: `Unsubscribed from ${channel}`
        }));
    }
    else {
        ws.send(JSON.stringify({
            type: 'error',
            message: `Not subscribed to ${channel}`
        }));
    }
}

exports.default = router;