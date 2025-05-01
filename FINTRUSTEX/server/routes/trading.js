/**
 * Trading Routes for FinTrustEX
 * Handles trading endpoints and related operations
 */

const express = require('express');
const { nanoid } = require('nanoid');
const router = express.Router();
const { storage } = require('../storage');

// Auth middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

/**
 * Get market data with ticker information
 */
router.get('/market/data', async (req, res) => {
  try {
    // In a real application, this would fetch data from a market data provider API
    // or from a database updated by a background process
    
    // For now, we'll return static market data
    const marketData = {
      pairs: [
        { 
          symbol: 'BTC/USDT', 
          price: 43950.25, 
          change: 1.2, 
          high: 44100.50, 
          low: 43200.75, 
          volume: 2105876543.21,
          volumeQuote: 9234567.89
        },
        { 
          symbol: 'ETH/USDT', 
          price: 2380.50, 
          change: 0.8, 
          high: 2422.25, 
          low: 2345.75, 
          volume: 1234567890.12,
          volumeQuote: 5123456.78
        },
        { 
          symbol: 'LTC/USDT', 
          price: 82.75, 
          change: -0.5, 
          high: 84.25, 
          low: 81.50, 
          volume: 456789012.34,
          volumeQuote: 1234567.89
        },
        { 
          symbol: 'ADA/USDT', 
          price: 0.45, 
          change: 1.5, 
          high: 0.46, 
          low: 0.44, 
          volume: 345678901.23,
          volumeQuote: 876543.21
        },
        { 
          symbol: 'XRP/USDT', 
          price: 0.52, 
          change: -1.2, 
          high: 0.54, 
          low: 0.51, 
          volume: 234567890.12,
          volumeQuote: 765432.10
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    res.json(marketData);
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

/**
 * Get order book for a specific trading pair
 */
router.get('/orderbook', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    // In a real application, this would fetch the current order book
    // from a database or trading engine
    
    // Generate sample order book data for demonstration
    const basePrice = 
      symbol.includes('BTC') ? 43950 :
      symbol.includes('ETH') ? 2380 :
      symbol.includes('LTC') ? 82 :
      symbol.includes('ADA') ? 0.45 :
      symbol.includes('XRP') ? 0.52 : 100;
    
    const asks = [];
    const bids = [];
    
    // Generate sample asks (sell orders) above base price
    for (let i = 1; i <= 15; i++) {
      const price = basePrice + (i * basePrice * 0.0005); // 0.05% intervals
      const amount = Math.random() * (0.5 / i) + 0.01;
      
      asks.push({
        price,
        amount,
        total: price * amount
      });
    }
    
    // Generate sample bids (buy orders) below base price
    for (let i = 1; i <= 15; i++) {
      const price = basePrice - (i * basePrice * 0.0005); // 0.05% intervals
      const amount = Math.random() * (0.8 / i) + 0.02;
      
      bids.push({
        price,
        amount,
        total: price * amount
      });
    }
    
    // Sort asks ascending by price
    asks.sort((a, b) => a.price - b.price);
    
    // Sort bids descending by price
    bids.sort((a, b) => b.price - a.price);
    
    res.json({
      symbol,
      timestamp: new Date().toISOString(),
      asks,
      bids
    });
  } catch (error) {
    console.error('Error fetching order book:', error);
    res.status(500).json({ error: 'Failed to fetch order book' });
  }
});

/**
 * Get recent trades for a specific trading pair
 */
router.get('/trades', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    // In a real application, this would fetch recent trades
    // from a database or trading engine
    
    // Generate sample trade data for demonstration
    const basePrice = 
      symbol.includes('BTC') ? 43950 :
      symbol.includes('ETH') ? 2380 :
      symbol.includes('LTC') ? 82 :
      symbol.includes('ADA') ? 0.45 :
      symbol.includes('XRP') ? 0.52 : 100;
    
    const trades = [];
    const now = new Date();
    
    // Generate 20 sample trades
    for (let i = 0; i < 20; i++) {
      const time = new Date(now);
      time.setSeconds(now.getSeconds() - i * 15);
      
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      const price = basePrice + (Math.random() - 0.5) * basePrice * 0.005; // ±0.5% variation
      const amount = Math.random() * 0.5 + 0.01;
      
      trades.push({
        id: nanoid(),
        price,
        amount,
        side,
        time: time.toISOString(),
        total: price * amount
      });
    }
    
    res.json({
      symbol,
      timestamp: new Date().toISOString(),
      trades
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

/**
 * Get candlestick data for a specific trading pair
 */
router.get('/klines', async (req, res) => {
  try {
    const { symbol, interval = '15m', limit = 100 } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    // In a real application, this would fetch candlestick data
    // from a database or market data provider
    
    // Generate sample candlestick data for demonstration
    const basePrice = 
      symbol.includes('BTC') ? 43950 :
      symbol.includes('ETH') ? 2380 :
      symbol.includes('LTC') ? 82 :
      symbol.includes('ADA') ? 0.45 :
      symbol.includes('XRP') ? 0.52 : 100;
    
    const klines = [];
    const now = Math.floor(Date.now() / 1000) * 1000; // Current time in ms, floor to seconds
    
    // Determine time step based on interval
    let timeStep;
    switch (interval) {
      case '1m': timeStep = 60 * 1000; break;
      case '5m': timeStep = 5 * 60 * 1000; break;
      case '15m': timeStep = 15 * 60 * 1000; break;
      case '1h': timeStep = 60 * 60 * 1000; break;
      case '4h': timeStep = 4 * 60 * 60 * 1000; break;
      case '1d': timeStep = 24 * 60 * 60 * 1000; break;
      case '1w': timeStep = 7 * 24 * 60 * 60 * 1000; break;
      default: timeStep = 15 * 60 * 1000; // Default to 15m
    }
    
    // Generate candlestick data for requested limit
    for (let i = limit - 1; i >= 0; i--) {
      const time = Math.floor((now - i * timeStep) / 1000); // Convert to seconds
      
      // Introduce some price movement with each candle
      const direction = Math.random() > 0.5 ? 1 : -1;
      const percentChange = (Math.random() * 0.2 + 0.05) * direction;
      const candle = {};
      
      if (i === limit - 1) {
        // First candle in the sequence
        candle.open = basePrice;
      } else {
        // Use close of previous candle as open
        candle.open = klines[0].close;
      }
      
      candle.close = candle.open * (1 + percentChange / 100);
      
      // Set high and low based on open and close
      if (candle.close > candle.open) {
        candle.high = candle.close + (Math.random() * (candle.close - candle.open));
        candle.low = candle.open - (Math.random() * (candle.close - candle.open) * 0.5);
      } else {
        candle.high = candle.open + (Math.random() * (candle.open - candle.close) * 0.5);
        candle.low = candle.close - (Math.random() * (candle.open - candle.close));
      }
      
      // Generate realistic volume
      candle.volume = basePrice * (Math.random() * 50 + 5);
      
      // Add candle to beginning of array (most recent first)
      klines.unshift({
        time,
        open: parseFloat(candle.open.toFixed(2)),
        high: parseFloat(candle.high.toFixed(2)),
        low: parseFloat(candle.low.toFixed(2)),
        close: parseFloat(candle.close.toFixed(2)),
        volume: parseFloat(candle.volume.toFixed(2))
      });
    }
    
    res.json({
      symbol,
      interval,
      klines
    });
  } catch (error) {
    console.error('Error fetching klines:', error);
    res.status(500).json({ error: 'Failed to fetch klines data' });
  }
});

/**
 * Place a new order (buy/sell)
 * Requires authentication
 */
router.post('/orders', ensureAuthenticated, async (req, res) => {
  try {
    const { pair, type, orderType, amount, price } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!pair) {
      return res.status(400).json({ error: 'Trading pair is required' });
    }
    
    if (!type || !['buy', 'sell'].includes(type)) {
      return res.status(400).json({ error: 'Valid order type (buy/sell) is required' });
    }
    
    if (!orderType || !['market', 'limit', 'stop-limit'].includes(orderType)) {
      return res.status(400).json({ error: 'Valid order type (market/limit/stop-limit) is required' });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    // Limit orders require a price
    if (orderType !== 'market' && (!price || price <= 0)) {
      return res.status(400).json({ error: 'Valid price is required for limit orders' });
    }
    
    // In a real application, we would:
    // 1. Check if user has sufficient balance
    // 2. Create the order in the database
    // 3. Submit the order to the trading engine
    // 4. Return the created order
    
    // Parse the pair to get base and quote currencies
    const [baseCurrency, quoteCurrency] = pair.split('/');
    
    // Get current market price for the pair
    const currentPrice = 
      pair.includes('BTC/USDT') ? 43950 :
      pair.includes('ETH/USDT') ? 2380 :
      pair.includes('LTC/USDT') ? 82 :
      pair.includes('ADA/USDT') ? 0.45 :
      pair.includes('XRP/USDT') ? 0.52 : 100;
    
    // Calculate order value
    const orderPrice = orderType === 'market' ? currentPrice : price;
    const orderValue = amount * orderPrice;
    const fee = orderValue * 0.001; // 0.1% fee
    
    // Check user's wallet balance (simplified example)
    const wallet = await storage.getWalletByUserIdAndCurrency(
      userId, 
      type === 'buy' ? quoteCurrency : baseCurrency
    );
    
    if (!wallet) {
      return res.status(400).json({ 
        error: `No wallet found for ${type === 'buy' ? quoteCurrency : baseCurrency}` 
      });
    }
    
    const walletBalance = parseFloat(wallet.balance);
    
    // For buy orders, check if user has enough of quote currency
    if (type === 'buy' && walletBalance < (orderValue + fee)) {
      return res.status(400).json({ 
        error: `Insufficient ${quoteCurrency} balance`,
        required: (orderValue + fee).toFixed(8),
        available: walletBalance.toFixed(8)
      });
    }
    
    // For sell orders, check if user has enough of base currency
    if (type === 'sell' && walletBalance < amount) {
      return res.status(400).json({ 
        error: `Insufficient ${baseCurrency} balance`,
        required: amount.toFixed(8),
        available: walletBalance.toFixed(8)
      });
    }
    
    // Create the order
    const order = {
      userId,
      pair,
      type,
      orderType,
      amount: parseFloat(amount),
      price: orderType === 'market' ? null : parseFloat(price),
      status: 'pending',
      fee,
      total: orderValue,
      remainingAmount: parseFloat(amount),
      filledAmount: 0,
      createdAt: new Date().toISOString()
    };
    
    // In a real application, insert order into database and add to order book
    // For now, we'll simulate order creation
    const createdOrder = {
      ...order,
      id: nanoid(),
      // In a real app, market orders might be immediately filled
      status: orderType === 'market' ? 'completed' : 'pending',
      filledPrice: orderType === 'market' ? currentPrice : null,
    };
    
    // Simulate order processing
    // In a real application, this would be handled by the trading engine
    if (orderType === 'market') {
      // For market orders, simulate immediate execution
      
      // Update wallet balances
      if (type === 'buy') {
        // Deduct quote currency (e.g., USDT)
        await storage.updateWalletBalance(
          wallet.id,
          (walletBalance - orderValue - fee).toFixed(8)
        );
        
        // Add base currency (e.g., BTC)
        let baseWallet = await storage.getWalletByUserIdAndCurrency(userId, baseCurrency);
        if (!baseWallet) {
          // Create wallet if it doesn't exist
          baseWallet = await storage.createWallet({
            userId,
            currency: baseCurrency,
            balance: '0',
            address: nanoid(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        
        const baseBalance = parseFloat(baseWallet.balance) + amount;
        await storage.updateWalletBalance(
          baseWallet.id,
          baseBalance.toFixed(8)
        );
      } else {
        // Sell order
        // Deduct base currency (e.g., BTC)
        await storage.updateWalletBalance(
          wallet.id,
          (walletBalance - amount).toFixed(8)
        );
        
        // Add quote currency (e.g., USDT)
        let quoteWallet = await storage.getWalletByUserIdAndCurrency(userId, quoteCurrency);
        if (!quoteWallet) {
          // Create wallet if it doesn't exist
          quoteWallet = await storage.createWallet({
            userId,
            currency: quoteCurrency,
            balance: '0',
            address: nanoid(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        
        const quoteBalance = parseFloat(quoteWallet.balance) + orderValue - fee;
        await storage.updateWalletBalance(
          quoteWallet.id,
          quoteBalance.toFixed(8)
        );
      }
      
      // Create transaction record
      await storage.createTransaction({
        userId,
        type: 'trade',
        status: 'completed',
        currency: type === 'buy' ? baseCurrency : quoteCurrency,
        amount: type === 'buy' ? amount.toString() : orderValue.toString(),
        fee: fee.toString(),
        txid: nanoid(),
        description: `${type === 'buy' ? 'Bought' : 'Sold'} ${amount} ${baseCurrency} at ${currentPrice} ${quoteCurrency}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    // Return the created order
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * Get active orders for the authenticated user
 * Requires authentication
 */
router.get('/orders/active', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // In a real application, fetch active orders from database
    // Here we'll return an empty array
    
    res.json({ orders: [] });
  } catch (error) {
    console.error('Error fetching active orders:', error);
    res.status(500).json({ error: 'Failed to fetch active orders' });
  }
});

/**
 * Get order history for the authenticated user
 * Requires authentication
 */
router.get('/orders/history', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // In a real application, fetch order history from database
    // Here we'll return some sample data
    
    res.json({
      orders: [
        {
          id: nanoid(),
          userId,
          pair: 'BTC/USDT',
          type: 'buy',
          orderType: 'market',
          amount: 0.1,
          price: null,
          filledPrice: 43950,
          status: 'completed',
          fee: 4.395,
          total: 4395,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          completedAt: new Date(Date.now() - 86400000 + 5000).toISOString()
        },
        {
          id: nanoid(),
          userId,
          pair: 'ETH/USDT',
          type: 'sell',
          orderType: 'limit',
          amount: 0.5,
          price: 2400,
          filledPrice: 2400,
          status: 'completed',
          fee: 1.2,
          total: 1200,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          completedAt: new Date(Date.now() - 172800000 + 3600000).toISOString()
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

/**
 * Cancel an active order
 * Requires authentication
 */
router.delete('/orders/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // In a real application, check if the order exists and belongs to the user
    // then cancel it in the database and trading engine
    
    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

/**
 * Create a price alert
 * Requires authentication
 */
router.post('/alerts', ensureAuthenticated, async (req, res) => {
  try {
    const { symbol, price, condition } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!symbol) {
      return res.status(400).json({ error: 'Trading pair symbol is required' });
    }
    
    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }
    
    if (!condition || !['above', 'below'].includes(condition)) {
      return res.status(400).json({ error: 'Valid condition (above/below) is required' });
    }
    
    // In a real application, save the alert to the database
    // Here we'll just return success
    
    res.status(201).json({
      id: nanoid(),
      userId,
      symbol,
      price,
      condition,
      createdAt: new Date().toISOString(),
      active: true
    });
  } catch (error) {
    console.error('Error creating price alert:', error);
    res.status(500).json({ error: 'Failed to create price alert' });
  }
});

module.exports = router;