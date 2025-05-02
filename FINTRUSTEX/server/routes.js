/**
 * FinTrustEX Routes
 * Sets up all API routes and handles integration with WebSocket server
 */

const express = require('express');
const { storage } = require('./storage');
const { BinanceService } = require('./services/binance-service');
const { MarketDataService } = require('./services/market-data-service');

/**
 * Set up routes and WebSocket event handlers
 * @param {express.Application} app - Express application
 * @param {Object} wsServer - WebSocket server instance
 */
function setupRoutes(app, wsServer) {
  const router = express.Router();
  
  // Initialize services
  const binanceService = new BinanceService();
  const marketDataService = new MarketDataService(wsServer);
  
  // Start market data service
  marketDataService.start();
  
  // ==== Binance API Routes ====
  
  // Get Binance API status
  router.get('/binance/status', async (req, res) => {
    try {
      // For a real implementation, this would check the user's session
      // and get their specific API status
      const userId = 1; // Mock user ID for demo
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const enabled = Boolean(user.binanceApiKey && user.binanceApiEnabled);
      
      res.json({
        enabled,
        isTestnet: user.binanceTestnet || false
      });
    } catch (error) {
      console.error('Error getting Binance API status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get Binance API settings
  router.get('/binance/settings', async (req, res) => {
    try {
      // For a real implementation, this would check the user's session
      const userId = 1; // Mock user ID for demo
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        enabled: Boolean(user.binanceApiKey && user.binanceApiEnabled),
        hasApiKey: Boolean(user.binanceApiKey),
        hasApiSecret: Boolean(user.binanceApiSecret),
        isTestnet: user.binanceTestnet || false
      });
    } catch (error) {
      console.error('Error getting Binance API settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Save Binance API credentials
  router.post('/binance/credentials', async (req, res) => {
    try {
      const { apiKey, apiSecret, testnet } = req.body;
      
      // For a real implementation, this would check the user's session
      const userId = 1; // Mock user ID for demo
      
      // If apiKey and apiSecret are null, keep the existing values
      const update = {};
      if (apiKey !== null) {
        update.apiKey = apiKey;
      }
      
      if (apiSecret !== null) {
        update.apiSecret = apiSecret;
      }
      
      // Update testnet setting
      const isTestnet = Boolean(testnet);
      
      const updatedUser = await storage.updateBinanceApiKey(
        userId,
        update.apiKey,
        update.apiSecret,
        true
      );
      
      await storage.toggleBinanceTestnet(userId, isTestnet);
      
      res.json({
        success: true,
        enabled: Boolean(updatedUser.binanceApiKey && updatedUser.binanceApiEnabled),
        isTestnet
      });
    } catch (error) {
      console.error('Error saving Binance API credentials:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Delete Binance API credentials
  router.delete('/binance/credentials', async (req, res) => {
    try {
      // For a real implementation, this would check the user's session
      const userId = 1; // Mock user ID for demo
      
      // Set empty credentials and disable API
      await storage.updateBinanceApiKey(userId, '', '', false);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting Binance API credentials:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Toggle testnet mode
  router.put('/binance/testnet', async (req, res) => {
    try {
      const { enabled } = req.body;
      
      // For a real implementation, this would check the user's session
      const userId = 1; // Mock user ID for demo
      
      const updatedUser = await storage.toggleBinanceTestnet(userId, Boolean(enabled));
      
      res.json({
        success: true,
        isTestnet: updatedUser.binanceTestnet
      });
    } catch (error) {
      console.error('Error toggling testnet mode:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Test Binance API connection
  router.get('/binance/test', async (req, res) => {
    try {
      // For a real implementation, this would check the user's session
      const userId = 1; // Mock user ID for demo
      
      const user = await storage.getUser(userId);
      
      if (!user || !user.binanceApiKey || !user.binanceApiSecret) {
        return res.status(400).json({ success: false, error: 'Binance API not configured' });
      }
      
      const testResult = await binanceService.testConnection(
        user.binanceApiKey,
        user.binanceApiSecret,
        user.binanceTestnet
      );
      
      res.json({
        success: testResult.success,
        error: testResult.error
      });
    } catch (error) {
      console.error('Error testing Binance API connection:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });
  
  // Get account information
  router.get('/binance/account/info', async (req, res) => {
    try {
      // For a real implementation, this would check the user's session
      const userId = 1; // Mock user ID for demo
      
      const user = await storage.getUser(userId);
      
      if (!user || !user.binanceApiKey || !user.binanceApiSecret) {
        return res.status(400).json({ error: 'Binance API not configured' });
      }
      
      const accountInfo = await binanceService.getAccountInfo(
        user.binanceApiKey,
        user.binanceApiSecret,
        user.binanceTestnet
      );
      
      if (accountInfo.error) {
        return res.status(400).json({ error: accountInfo.error });
      }
      
      res.json(accountInfo);
    } catch (error) {
      console.error('Error getting account info:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get account balances
  router.get('/binance/account/balances', async (req, res) => {
    try {
      // For a real implementation, this would check the user's session
      const userId = 1; // Mock user ID for demo
      
      const user = await storage.getUser(userId);
      
      if (!user || !user.binanceApiKey || !user.binanceApiSecret) {
        return res.status(400).json({ error: 'Binance API not configured' });
      }
      
      const balances = await binanceService.getBalances(
        user.binanceApiKey,
        user.binanceApiSecret,
        user.binanceTestnet
      );
      
      if (balances.error) {
        return res.status(400).json({ error: balances.error });
      }
      
      res.json({ balances });
    } catch (error) {
      console.error('Error getting balances:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get open orders
  router.get('/binance/orders/open', async (req, res) => {
    try {
      // For a real implementation, this would check the user's session
      const userId = 1; // Mock user ID for demo
      
      const { symbol } = req.query;
      
      const user = await storage.getUser(userId);
      
      if (!user || !user.binanceApiKey || !user.binanceApiSecret) {
        return res.status(400).json({ error: 'Binance API not configured' });
      }
      
      const orders = await binanceService.getOpenOrders(
        user.binanceApiKey,
        user.binanceApiSecret,
        user.binanceTestnet,
        symbol
      );
      
      if (orders.error) {
        return res.status(400).json({ error: orders.error });
      }
      
      res.json({ orders });
    } catch (error) {
      console.error('Error getting open orders:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get order history
  router.get('/binance/orders/history', async (req, res) => {
    try {
      // For a real implementation, this would check the user's session
      const userId = 1; // Mock user ID for demo
      
      const { symbol } = req.query;
      
      const user = await storage.getUser(userId);
      
      if (!user || !user.binanceApiKey || !user.binanceApiSecret) {
        return res.status(400).json({ error: 'Binance API not configured' });
      }
      
      const orders = await binanceService.getOrderHistory(
        user.binanceApiKey,
        user.binanceApiSecret,
        user.binanceTestnet,
        symbol
      );
      
      if (orders.error) {
        return res.status(400).json({ error: orders.error });
      }
      
      res.json({ orders });
    } catch (error) {
      console.error('Error getting order history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Create order
  router.post('/binance/orders', async (req, res) => {
    try {
      // For a real implementation, this would check the user's session
      const userId = 1; // Mock user ID for demo
      
      const orderParams = req.body;
      
      const user = await storage.getUser(userId);
      
      if (!user || !user.binanceApiKey || !user.binanceApiSecret) {
        return res.status(400).json({ error: 'Binance API not configured' });
      }
      
      const order = await binanceService.createOrder(
        user.binanceApiKey,
        user.binanceApiSecret,
        user.binanceTestnet,
        orderParams
      );
      
      if (order.error) {
        return res.status(400).json({ error: order.error });
      }
      
      // Save order to database
      const savedOrder = await storage.createOrder({
        userId,
        symbol: orderParams.symbol,
        side: orderParams.side,
        type: orderParams.type,
        quantity: orderParams.quantity,
        price: orderParams.price || null,
        status: 'pending',
        externalOrderId: order.orderId
      });
      
      res.json({ 
        success: true,
        order
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Cancel order
  router.delete('/binance/orders/:orderId', async (req, res) => {
    try {
      // For a real implementation, this would check the user's session
      const userId = 1; // Mock user ID for demo
      
      const { orderId } = req.params;
      const { symbol } = req.body;
      
      if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required' });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user || !user.binanceApiKey || !user.binanceApiSecret) {
        return res.status(400).json({ error: 'Binance API not configured' });
      }
      
      const result = await binanceService.cancelOrder(
        user.binanceApiKey,
        user.binanceApiSecret,
        user.binanceTestnet,
        symbol,
        orderId
      );
      
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      
      // Update order in database
      const order = await storage.getOrderByExternalId(orderId);
      if (order) {
        await storage.updateOrderStatus(order.id, 'cancelled');
      }
      
      res.json({ 
        success: true,
        result
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // ==== Market Data Routes ====
  
  // Get all tickers
  router.get('/market/tickers', async (req, res) => {
    try {
      const tickers = await marketDataService.getAllTickers();
      res.json(tickers);
    } catch (error) {
      console.error('Error getting tickers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get ticker for a specific symbol
  router.get('/market/ticker/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const ticker = await marketDataService.getTicker(symbol);
      
      if (!ticker) {
        return res.status(404).json({ error: 'Ticker not found' });
      }
      
      res.json(ticker);
    } catch (error) {
      console.error('Error getting ticker:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get all prices
  router.get('/market/prices', async (req, res) => {
    try {
      const prices = await marketDataService.getAllPrices();
      res.json(prices);
    } catch (error) {
      console.error('Error getting prices:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get candlestick data
  router.get('/market/klines/:symbol/:interval', async (req, res) => {
    try {
      const { symbol, interval } = req.params;
      const { limit } = req.query;
      
      const klines = await marketDataService.getKlines(
        symbol, 
        interval, 
        parseInt(limit) || 500
      );
      
      res.json(klines);
    } catch (error) {
      console.error('Error getting klines:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get order book
  router.get('/market/depth/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const { limit } = req.query;
      
      const depth = await marketDataService.getOrderBook(
        symbol, 
        parseInt(limit) || 100
      );
      
      res.json(depth);
    } catch (error) {
      console.error('Error getting order book:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get recent trades
  router.get('/market/trades/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const { limit } = req.query;
      
      const trades = await marketDataService.getRecentTrades(
        symbol, 
        parseInt(limit) || 50
      );
      
      res.json(trades);
    } catch (error) {
      console.error('Error getting recent trades:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Mount the router
  app.use('/api', router);
  
  return router;
}

module.exports = { setupRoutes };