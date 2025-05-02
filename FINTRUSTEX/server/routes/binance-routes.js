/**
 * Binance API Routes for FinTrustEX
 * Handles HTTP routes for Binance API operations
 */

const express = require('express');
const router = express.Router();
const binanceService = require('../services/binance-service');
const { storage } = require('../storage');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Get Binance API status
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      configured: Boolean(user.binanceApiKey && user.binanceApiSecret),
      enabled: Boolean(user.binanceEnabled),
      isTestnet: Boolean(user.binanceTestnet)
    });
  } catch (error) {
    console.error('Error getting Binance API status:', error);
    res.status(500).json({ error: 'Failed to get Binance API status' });
  }
});

// Update Binance API credentials
router.post('/credentials', isAuthenticated, async (req, res) => {
  try {
    const { apiKey, apiSecret, isTestnet = true } = req.body;
    
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'API key and secret are required' });
    }
    
    // Test connection with provided credentials
    const testResult = await binanceService.testConnection(apiKey, apiSecret, isTestnet);
    
    if (!testResult.success) {
      return res.status(400).json({ 
        error: 'Invalid API credentials', 
        details: testResult.message
      });
    }
    
    // Update user with API credentials
    const updatedUser = await storage.updateBinanceApiKey(req.user.id, apiKey, apiSecret, true);
    
    // Update testnet setting
    await storage.toggleBinanceTestnet(req.user.id, isTestnet);
    
    res.json({ 
      success: true, 
      message: 'Binance API credentials updated successfully',
      isTestnet
    });
  } catch (error) {
    console.error('Error updating Binance API credentials:', error);
    res.status(500).json({ error: 'Failed to update Binance API credentials' });
  }
});

// Test Binance API connection
router.post('/test-connection', isAuthenticated, async (req, res) => {
  try {
    const { apiKey, apiSecret, isTestnet = true } = req.body;
    
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'API key and secret are required' });
    }
    
    const result = await binanceService.testConnection(apiKey, apiSecret, isTestnet);
    res.json(result);
  } catch (error) {
    console.error('Error testing Binance API connection:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test Binance API connection',
      message: error.message
    });
  }
});

// Toggle Binance API enabled/disabled
router.post('/toggle', isAuthenticated, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (enabled === undefined) {
      return res.status(400).json({ error: 'Enabled parameter is required' });
    }
    
    const user = await storage.getUser(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (enabled && (!user.binanceApiKey || !user.binanceApiSecret)) {
      return res.status(400).json({ error: 'API credentials must be configured before enabling' });
    }
    
    // Update user with API enabled/disabled
    const updatedUser = await storage.updateBinanceApiKey(
      req.user.id, 
      user.binanceApiKey, 
      user.binanceApiSecret, 
      enabled
    );
    
    res.json({ 
      success: true, 
      enabled
    });
  } catch (error) {
    console.error('Error toggling Binance API:', error);
    res.status(500).json({ error: 'Failed to toggle Binance API' });
  }
});

// Toggle testnet mode
router.post('/toggle-testnet', isAuthenticated, async (req, res) => {
  try {
    const { isTestnet } = req.body;
    
    if (isTestnet === undefined) {
      return res.status(400).json({ error: 'isTestnet parameter is required' });
    }
    
    // Update user with testnet setting
    const updatedUser = await storage.toggleBinanceTestnet(req.user.id, isTestnet);
    
    res.json({ 
      success: true, 
      isTestnet
    });
  } catch (error) {
    console.error('Error toggling testnet mode:', error);
    res.status(500).json({ error: 'Failed to toggle testnet mode' });
  }
});

// Get account balances
router.get('/balances', isAuthenticated, async (req, res) => {
  try {
    const balances = await binanceService.getBalances(req.user.id);
    
    // Filter out zero balances for cleaner response
    const nonZeroBalances = balances.filter(balance => 
      parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0
    );
    
    res.json({ balances: nonZeroBalances });
  } catch (error) {
    console.error('Error getting account balances:', error);
    
    if (error.message.includes('API credentials not configured')) {
      return res.status(400).json({ error: 'Binance API credentials not configured' });
    }
    
    if (error.message.includes('disabled')) {
      return res.status(400).json({ error: 'Binance API integration is disabled' });
    }
    
    res.status(500).json({ error: 'Failed to get account balances', message: error.message });
  }
});

// Get open orders
router.get('/open-orders', isAuthenticated, async (req, res) => {
  try {
    const { symbol } = req.query;
    const openOrders = await binanceService.getOpenOrders(req.user.id, symbol || null);
    
    res.json({ orders: openOrders });
  } catch (error) {
    console.error('Error getting open orders:', error);
    
    if (error.message.includes('API credentials not configured')) {
      return res.status(400).json({ error: 'Binance API credentials not configured' });
    }
    
    if (error.message.includes('disabled')) {
      return res.status(400).json({ error: 'Binance API integration is disabled' });
    }
    
    res.status(500).json({ error: 'Failed to get open orders', message: error.message });
  }
});

// Create market buy order
router.post('/market-buy', isAuthenticated, async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    
    if (!symbol || !quantity) {
      return res.status(400).json({ error: 'Symbol and quantity are required' });
    }
    
    const result = await binanceService.createMarketBuyOrder(req.user.id, symbol, quantity);
    
    res.json({
      success: true,
      order: result.order,
      storedOrder: result.storedOrder
    });
  } catch (error) {
    console.error('Error creating market buy order:', error);
    
    if (error.message.includes('API credentials not configured')) {
      return res.status(400).json({ error: 'Binance API credentials not configured' });
    }
    
    if (error.message.includes('disabled')) {
      return res.status(400).json({ error: 'Binance API integration is disabled' });
    }
    
    // Handle specific Binance API errors
    if (error.code) {
      return res.status(400).json({ 
        error: 'Binance API error', 
        code: error.code,
        message: error.message
      });
    }
    
    res.status(500).json({ error: 'Failed to create market buy order', message: error.message });
  }
});

// Create market sell order
router.post('/market-sell', isAuthenticated, async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    
    if (!symbol || !quantity) {
      return res.status(400).json({ error: 'Symbol and quantity are required' });
    }
    
    const result = await binanceService.createMarketSellOrder(req.user.id, symbol, quantity);
    
    res.json({
      success: true,
      order: result.order,
      storedOrder: result.storedOrder
    });
  } catch (error) {
    console.error('Error creating market sell order:', error);
    
    if (error.message.includes('API credentials not configured')) {
      return res.status(400).json({ error: 'Binance API credentials not configured' });
    }
    
    if (error.message.includes('disabled')) {
      return res.status(400).json({ error: 'Binance API integration is disabled' });
    }
    
    // Handle specific Binance API errors
    if (error.code) {
      return res.status(400).json({ 
        error: 'Binance API error', 
        code: error.code,
        message: error.message
      });
    }
    
    res.status(500).json({ error: 'Failed to create market sell order', message: error.message });
  }
});

// Create limit buy order
router.post('/limit-buy', isAuthenticated, async (req, res) => {
  try {
    const { symbol, quantity, price } = req.body;
    
    if (!symbol || !quantity || !price) {
      return res.status(400).json({ error: 'Symbol, quantity, and price are required' });
    }
    
    const result = await binanceService.createLimitBuyOrder(req.user.id, symbol, quantity, price);
    
    res.json({
      success: true,
      order: result.order,
      storedOrder: result.storedOrder
    });
  } catch (error) {
    console.error('Error creating limit buy order:', error);
    
    if (error.message.includes('API credentials not configured')) {
      return res.status(400).json({ error: 'Binance API credentials not configured' });
    }
    
    if (error.message.includes('disabled')) {
      return res.status(400).json({ error: 'Binance API integration is disabled' });
    }
    
    // Handle specific Binance API errors
    if (error.code) {
      return res.status(400).json({ 
        error: 'Binance API error', 
        code: error.code,
        message: error.message
      });
    }
    
    res.status(500).json({ error: 'Failed to create limit buy order', message: error.message });
  }
});

// Create limit sell order
router.post('/limit-sell', isAuthenticated, async (req, res) => {
  try {
    const { symbol, quantity, price } = req.body;
    
    if (!symbol || !quantity || !price) {
      return res.status(400).json({ error: 'Symbol, quantity, and price are required' });
    }
    
    const result = await binanceService.createLimitSellOrder(req.user.id, symbol, quantity, price);
    
    res.json({
      success: true,
      order: result.order,
      storedOrder: result.storedOrder
    });
  } catch (error) {
    console.error('Error creating limit sell order:', error);
    
    if (error.message.includes('API credentials not configured')) {
      return res.status(400).json({ error: 'Binance API credentials not configured' });
    }
    
    if (error.message.includes('disabled')) {
      return res.status(400).json({ error: 'Binance API integration is disabled' });
    }
    
    // Handle specific Binance API errors
    if (error.code) {
      return res.status(400).json({ 
        error: 'Binance API error', 
        code: error.code,
        message: error.message
      });
    }
    
    res.status(500).json({ error: 'Failed to create limit sell order', message: error.message });
  }
});

// Cancel order
router.post('/cancel-order', isAuthenticated, async (req, res) => {
  try {
    const { symbol, orderId } = req.body;
    
    if (!symbol || !orderId) {
      return res.status(400).json({ error: 'Symbol and orderId are required' });
    }
    
    const result = await binanceService.cancelOrder(req.user.id, symbol, orderId);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    
    if (error.message.includes('API credentials not configured')) {
      return res.status(400).json({ error: 'Binance API credentials not configured' });
    }
    
    if (error.message.includes('disabled')) {
      return res.status(400).json({ error: 'Binance API integration is disabled' });
    }
    
    // Handle specific Binance API errors
    if (error.code) {
      return res.status(400).json({ 
        error: 'Binance API error', 
        code: error.code,
        message: error.message
      });
    }
    
    res.status(500).json({ error: 'Failed to cancel order', message: error.message });
  }
});

// Get order status
router.get('/order-status', isAuthenticated, async (req, res) => {
  try {
    const { symbol, orderId } = req.query;
    
    if (!symbol || !orderId) {
      return res.status(400).json({ error: 'Symbol and orderId are required' });
    }
    
    const result = await binanceService.getOrderStatus(req.user.id, symbol, orderId);
    
    res.json(result);
  } catch (error) {
    console.error('Error getting order status:', error);
    
    if (error.message.includes('API credentials not configured')) {
      return res.status(400).json({ error: 'Binance API credentials not configured' });
    }
    
    if (error.message.includes('disabled')) {
      return res.status(400).json({ error: 'Binance API integration is disabled' });
    }
    
    res.status(500).json({ error: 'Failed to get order status', message: error.message });
  }
});

// Get trade history
router.get('/trade-history', isAuthenticated, async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    const trades = await binanceService.getTradeHistory(req.user.id, symbol);
    
    res.json({ trades });
  } catch (error) {
    console.error('Error getting trade history:', error);
    
    if (error.message.includes('API credentials not configured')) {
      return res.status(400).json({ error: 'Binance API credentials not configured' });
    }
    
    if (error.message.includes('disabled')) {
      return res.status(400).json({ error: 'Binance API integration is disabled' });
    }
    
    res.status(500).json({ error: 'Failed to get trade history', message: error.message });
  }
});

module.exports = router;