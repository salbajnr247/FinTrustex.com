/**
 * Binance API Routes for FinTrustEX
 * Provides endpoints to interact with Binance cryptocurrency exchange
 */

const express = require('express');
const router = express.Router();
const binanceService = require('../services/binance-service');
const { storage } = require('../storage');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * Save Binance API keys for a user
 * POST /api/binance/keys
 */
router.post('/keys', requireAuth, async (req, res) => {
  try {
    const { apiKey, apiSecret } = req.body;
    const userId = req.user.id;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'API key and secret are required' });
    }

    // Initialize the client with the provided keys
    await binanceService.initUserClient(userId, apiKey, apiSecret);

    // Test the connection by fetching account info
    const accountInfo = await binanceService.getAccountInfo(userId);
    
    // Update user record with API key information (encrypted/hashed in production)
    await storage.updateUser(userId, { 
      // In a production environment, these should be encrypted
      binanceApiKey: apiKey,
      binanceApiSecret: apiSecret,
      binanceEnabled: true
    });

    res.json({ 
      success: true, 
      message: 'Binance API keys saved and verified successfully' 
    });
  } catch (error) {
    console.error('Error saving Binance API keys:', error);
    
    // Handle specific Binance API errors
    if (error.code) {
      if (error.code === -2015) {
        return res.status(401).json({ error: 'Invalid API key or secret' });
      }
      return res.status(400).json({ error: `Binance error: ${error.message}` });
    }
    
    res.status(500).json({ error: 'Failed to save API keys' });
  }
});

/**
 * Get Binance account information
 * GET /api/binance/account
 */
router.get('/account', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!binanceService.hasUserClient(userId)) {
      // Try to initialize from stored credentials
      const user = await storage.getUser(userId);
      if (user.binanceApiKey && user.binanceApiSecret) {
        binanceService.initUserClient(userId, user.binanceApiKey, user.binanceApiSecret);
      } else {
        return res.status(400).json({ error: 'Binance API not configured for this user' });
      }
    }
    
    const accountInfo = await binanceService.getAccountInfo(userId);
    res.json(accountInfo);
  } catch (error) {
    console.error('Error fetching Binance account info:', error);
    res.status(500).json({ error: 'Failed to fetch account information' });
  }
});

/**
 * Get all current prices
 * GET /api/binance/prices
 */
router.get('/prices', async (req, res) => {
  try {
    const prices = await binanceService.getAllPrices();
    res.json(prices);
  } catch (error) {
    console.error('Error fetching all prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

/**
 * Get price for a specific symbol
 * GET /api/binance/price/:symbol
 */
router.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await binanceService.getPrice(symbol);
    res.json(price);
  } catch (error) {
    console.error(`Error fetching price for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

/**
 * Get ticker for a specific symbol
 * GET /api/binance/ticker/:symbol
 */
router.get('/ticker/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const ticker = await binanceService.getTicker(symbol);
    res.json(ticker);
  } catch (error) {
    console.error(`Error fetching ticker for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch ticker' });
  }
});

/**
 * Get order book for a specific symbol
 * GET /api/binance/orderbook/:symbol
 */
router.get('/orderbook/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const orderBook = await binanceService.getOrderBook(symbol, limit);
    res.json(orderBook);
  } catch (error) {
    console.error(`Error fetching order book for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch order book' });
  }
});

/**
 * Get recent trades for a specific symbol
 * GET /api/binance/trades/:symbol
 */
router.get('/trades/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const trades = await binanceService.getRecentTrades(symbol, limit);
    res.json(trades);
  } catch (error) {
    console.error(`Error fetching trades for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

/**
 * Get exchange information
 * GET /api/binance/exchange-info
 */
router.get('/exchange-info', async (req, res) => {
  try {
    const exchangeInfo = await binanceService.getExchangeInfo();
    res.json(exchangeInfo);
  } catch (error) {
    console.error('Error fetching exchange info:', error);
    res.status(500).json({ error: 'Failed to fetch exchange information' });
  }
});

/**
 * Place a market buy order
 * POST /api/binance/order/market/buy
 */
router.post('/order/market/buy', requireAuth, async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const userId = req.user.id;
    
    if (!symbol || !quantity) {
      return res.status(400).json({ error: 'Symbol and quantity are required' });
    }
    
    if (!binanceService.hasUserClient(userId)) {
      // Try to initialize from stored credentials
      const user = await storage.getUser(userId);
      if (user.binanceApiKey && user.binanceApiSecret) {
        binanceService.initUserClient(userId, user.binanceApiKey, user.binanceApiSecret);
      } else {
        return res.status(400).json({ error: 'Binance API not configured for this user' });
      }
    }
    
    const result = await binanceService.createMarketBuyOrder(userId, symbol, quantity);
    
    // Record the order in our database
    const order = await storage.createOrder({
      userId: userId,
      symbol: symbol,
      type: 'market',
      side: 'buy',
      quantity: quantity,
      status: 'completed',
      price: null, // Market order has no predefined price
      externalOrderId: result.orderId,
      externalData: JSON.stringify(result),
      createdAt: new Date()
    });
    
    res.json({ success: true, order: result, internalOrderId: order.id });
  } catch (error) {
    console.error('Error creating market buy order:', error);
    res.status(500).json({ error: 'Failed to create market buy order' });
  }
});

/**
 * Place a market sell order
 * POST /api/binance/order/market/sell
 */
router.post('/order/market/sell', requireAuth, async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const userId = req.user.id;
    
    if (!symbol || !quantity) {
      return res.status(400).json({ error: 'Symbol and quantity are required' });
    }
    
    if (!binanceService.hasUserClient(userId)) {
      // Try to initialize from stored credentials
      const user = await storage.getUser(userId);
      if (user.binanceApiKey && user.binanceApiSecret) {
        binanceService.initUserClient(userId, user.binanceApiKey, user.binanceApiSecret);
      } else {
        return res.status(400).json({ error: 'Binance API not configured for this user' });
      }
    }
    
    const result = await binanceService.createMarketSellOrder(userId, symbol, quantity);
    
    // Record the order in our database
    const order = await storage.createOrder({
      userId: userId,
      symbol: symbol,
      type: 'market',
      side: 'sell',
      quantity: quantity,
      status: 'completed',
      price: null, // Market order has no predefined price
      externalOrderId: result.orderId,
      externalData: JSON.stringify(result),
      createdAt: new Date()
    });
    
    res.json({ success: true, order: result, internalOrderId: order.id });
  } catch (error) {
    console.error('Error creating market sell order:', error);
    res.status(500).json({ error: 'Failed to create market sell order' });
  }
});

/**
 * Place a limit buy order
 * POST /api/binance/order/limit/buy
 */
router.post('/order/limit/buy', requireAuth, async (req, res) => {
  try {
    const { symbol, quantity, price } = req.body;
    const userId = req.user.id;
    
    if (!symbol || !quantity || !price) {
      return res.status(400).json({ error: 'Symbol, quantity, and price are required' });
    }
    
    if (!binanceService.hasUserClient(userId)) {
      // Try to initialize from stored credentials
      const user = await storage.getUser(userId);
      if (user.binanceApiKey && user.binanceApiSecret) {
        binanceService.initUserClient(userId, user.binanceApiKey, user.binanceApiSecret);
      } else {
        return res.status(400).json({ error: 'Binance API not configured for this user' });
      }
    }
    
    const result = await binanceService.createLimitBuyOrder(userId, symbol, quantity, price);
    
    // Record the order in our database
    const order = await storage.createOrder({
      userId: userId,
      symbol: symbol,
      type: 'limit',
      side: 'buy',
      quantity: quantity,
      price: price,
      status: 'pending',
      externalOrderId: result.orderId,
      externalData: JSON.stringify(result),
      createdAt: new Date()
    });
    
    res.json({ success: true, order: result, internalOrderId: order.id });
  } catch (error) {
    console.error('Error creating limit buy order:', error);
    res.status(500).json({ error: 'Failed to create limit buy order' });
  }
});

/**
 * Place a limit sell order
 * POST /api/binance/order/limit/sell
 */
router.post('/order/limit/sell', requireAuth, async (req, res) => {
  try {
    const { symbol, quantity, price } = req.body;
    const userId = req.user.id;
    
    if (!symbol || !quantity || !price) {
      return res.status(400).json({ error: 'Symbol, quantity, and price are required' });
    }
    
    if (!binanceService.hasUserClient(userId)) {
      // Try to initialize from stored credentials
      const user = await storage.getUser(userId);
      if (user.binanceApiKey && user.binanceApiSecret) {
        binanceService.initUserClient(userId, user.binanceApiKey, user.binanceApiSecret);
      } else {
        return res.status(400).json({ error: 'Binance API not configured for this user' });
      }
    }
    
    const result = await binanceService.createLimitSellOrder(userId, symbol, quantity, price);
    
    // Record the order in our database
    const order = await storage.createOrder({
      userId: userId,
      symbol: symbol,
      type: 'limit',
      side: 'sell',
      quantity: quantity,
      price: price,
      status: 'pending',
      externalOrderId: result.orderId,
      externalData: JSON.stringify(result),
      createdAt: new Date()
    });
    
    res.json({ success: true, order: result, internalOrderId: order.id });
  } catch (error) {
    console.error('Error creating limit sell order:', error);
    res.status(500).json({ error: 'Failed to create limit sell order' });
  }
});

/**
 * Get open orders for the user
 * GET /api/binance/orders/open
 */
router.get('/orders/open', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol } = req.query;
    
    if (!binanceService.hasUserClient(userId)) {
      // Try to initialize from stored credentials
      const user = await storage.getUser(userId);
      if (user.binanceApiKey && user.binanceApiSecret) {
        binanceService.initUserClient(userId, user.binanceApiKey, user.binanceApiSecret);
      } else {
        return res.status(400).json({ error: 'Binance API not configured for this user' });
      }
    }
    
    const openOrders = await binanceService.getOpenOrders(userId, symbol);
    res.json(openOrders);
  } catch (error) {
    console.error('Error fetching open orders:', error);
    res.status(500).json({ error: 'Failed to fetch open orders' });
  }
});

/**
 * Get order history for the user
 * GET /api/binance/orders/history/:symbol
 */
router.get('/orders/history/:symbol', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    if (!binanceService.hasUserClient(userId)) {
      // Try to initialize from stored credentials
      const user = await storage.getUser(userId);
      if (user.binanceApiKey && user.binanceApiSecret) {
        binanceService.initUserClient(userId, user.binanceApiKey, user.binanceApiSecret);
      } else {
        return res.status(400).json({ error: 'Binance API not configured for this user' });
      }
    }
    
    const orderHistory = await binanceService.getOrderHistory(userId, symbol);
    res.json(orderHistory);
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

/**
 * Cancel an order
 * DELETE /api/binance/order/:symbol/:orderId
 */
router.delete('/order/:symbol/:orderId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, orderId } = req.params;
    
    if (!symbol || !orderId) {
      return res.status(400).json({ error: 'Symbol and orderId are required' });
    }
    
    if (!binanceService.hasUserClient(userId)) {
      // Try to initialize from stored credentials
      const user = await storage.getUser(userId);
      if (user.binanceApiKey && user.binanceApiSecret) {
        binanceService.initUserClient(userId, user.binanceApiKey, user.binanceApiSecret);
      } else {
        return res.status(400).json({ error: 'Binance API not configured for this user' });
      }
    }
    
    const result = await binanceService.cancelOrder(userId, symbol, orderId);
    
    // Update our database record
    const localOrder = await storage.getOrderByExternalId(orderId);
    if (localOrder) {
      await storage.updateOrderStatus(localOrder.id, 'cancelled');
    }
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;