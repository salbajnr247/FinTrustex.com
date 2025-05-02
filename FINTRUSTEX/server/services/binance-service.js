/**
 * Binance API Service for FinTrustEX
 * Handles communication with Binance API for trading operations
 */

const Binance = require('binance-api-node').default;
const { storage } = require('../storage');

/**
 * Create a Binance client for a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Binance client instance
 * @throws {Error} If user not found or API keys not configured
 */
async function createClientForUser(userId) {
  const user = await storage.getUser(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (!user.binanceApiKey || !user.binanceApiSecret) {
    throw new Error('Binance API credentials not configured');
  }
  
  if (!user.binanceEnabled) {
    throw new Error('Binance API integration is disabled for this user');
  }
  
  // Create Binance client with user's API key
  const client = Binance({
    apiKey: user.binanceApiKey,
    apiSecret: user.binanceApiSecret,
    // Use testnet if configured for user (default for safety)
    useServerTime: true,
    testnet: user.binanceTestnet !== false
  });
  
  return client;
}

/**
 * Get account information for a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Account information
 */
async function getAccountInfo(userId) {
  try {
    const client = await createClientForUser(userId);
    return await client.accountInfo();
  } catch (error) {
    console.error(`Error fetching account info for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get account balances for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of balances for different assets
 */
async function getBalances(userId) {
  try {
    const accountInfo = await getAccountInfo(userId);
    return accountInfo.balances;
  } catch (error) {
    console.error(`Error fetching balances for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Create a market buy order
 * @param {number} userId - User ID
 * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
 * @param {string} quantity - Amount to buy
 * @returns {Promise<Object>} Order result
 */
async function createMarketBuyOrder(userId, symbol, quantity) {
  try {
    const client = await createClientForUser(userId);
    
    // Execute market buy order
    const order = await client.order({
      symbol: symbol,
      side: 'BUY',
      type: 'MARKET',
      quantity: quantity
    });
    
    // Store order in database
    const storedOrder = await storage.createOrder({
      userId: userId,
      type: 'buy',
      status: 'completed',
      baseCurrency: symbol.slice(0, -4), // e.g., BTC from BTCUSDT
      quoteCurrency: symbol.slice(-4),   // e.g., USDT from BTCUSDT
      amount: quantity,
      symbol: symbol,
      side: 'BUY',
      externalOrderId: order.orderId.toString(),
      externalData: order
    });
    
    return {
      order: order,
      storedOrder: storedOrder
    };
  } catch (error) {
    console.error(`Error creating market buy order for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Create a market sell order
 * @param {number} userId - User ID
 * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
 * @param {string} quantity - Amount to sell
 * @returns {Promise<Object>} Order result
 */
async function createMarketSellOrder(userId, symbol, quantity) {
  try {
    const client = await createClientForUser(userId);
    
    // Execute market sell order
    const order = await client.order({
      symbol: symbol,
      side: 'SELL',
      type: 'MARKET',
      quantity: quantity
    });
    
    // Store order in database
    const storedOrder = await storage.createOrder({
      userId: userId,
      type: 'sell',
      status: 'completed',
      baseCurrency: symbol.slice(0, -4), // e.g., BTC from BTCUSDT
      quoteCurrency: symbol.slice(-4),   // e.g., USDT from BTCUSDT
      amount: quantity,
      symbol: symbol,
      side: 'SELL',
      externalOrderId: order.orderId.toString(),
      externalData: order
    });
    
    return {
      order: order,
      storedOrder: storedOrder
    };
  } catch (error) {
    console.error(`Error creating market sell order for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Create a limit buy order
 * @param {number} userId - User ID
 * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
 * @param {string} quantity - Amount to buy
 * @param {string} price - Limit price
 * @returns {Promise<Object>} Order result
 */
async function createLimitBuyOrder(userId, symbol, quantity, price) {
  try {
    const client = await createClientForUser(userId);
    
    // Execute limit buy order
    const order = await client.order({
      symbol: symbol,
      side: 'BUY',
      type: 'LIMIT',
      timeInForce: 'GTC', // Good Till Cancelled
      quantity: quantity,
      price: price
    });
    
    // Store order in database
    const storedOrder = await storage.createOrder({
      userId: userId,
      type: 'buy',
      status: 'pending',
      baseCurrency: symbol.slice(0, -4), // e.g., BTC from BTCUSDT
      quoteCurrency: symbol.slice(-4),   // e.g., USDT from BTCUSDT
      amount: quantity,
      price: price,
      totalValue: (parseFloat(quantity) * parseFloat(price)).toString(),
      symbol: symbol,
      side: 'BUY',
      externalOrderId: order.orderId.toString(),
      externalData: order
    });
    
    return {
      order: order,
      storedOrder: storedOrder
    };
  } catch (error) {
    console.error(`Error creating limit buy order for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Create a limit sell order
 * @param {number} userId - User ID
 * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
 * @param {string} quantity - Amount to sell
 * @param {string} price - Limit price
 * @returns {Promise<Object>} Order result
 */
async function createLimitSellOrder(userId, symbol, quantity, price) {
  try {
    const client = await createClientForUser(userId);
    
    // Execute limit sell order
    const order = await client.order({
      symbol: symbol,
      side: 'SELL',
      type: 'LIMIT',
      timeInForce: 'GTC', // Good Till Cancelled
      quantity: quantity,
      price: price
    });
    
    // Store order in database
    const storedOrder = await storage.createOrder({
      userId: userId,
      type: 'sell',
      status: 'pending',
      baseCurrency: symbol.slice(0, -4), // e.g., BTC from BTCUSDT
      quoteCurrency: symbol.slice(-4),   // e.g., USDT from BTCUSDT
      amount: quantity,
      price: price,
      totalValue: (parseFloat(quantity) * parseFloat(price)).toString(),
      symbol: symbol,
      side: 'SELL',
      externalOrderId: order.orderId.toString(),
      externalData: order
    });
    
    return {
      order: order,
      storedOrder: storedOrder
    };
  } catch (error) {
    console.error(`Error creating limit sell order for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Cancel an order
 * @param {number} userId - User ID
 * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
 * @param {string} orderId - Binance order ID
 * @returns {Promise<Object>} Cancel result
 */
async function cancelOrder(userId, symbol, orderId) {
  try {
    const client = await createClientForUser(userId);
    
    // Cancel order on Binance
    const result = await client.cancelOrder({
      symbol: symbol,
      orderId: orderId
    });
    
    // Get our internal order by external ID
    const internalOrder = await storage.getOrderByExternalId(orderId.toString());
    
    if (internalOrder) {
      // Update order status in database
      await storage.updateOrderStatus(internalOrder.id, 'cancelled');
    }
    
    return result;
  } catch (error) {
    console.error(`Error cancelling order for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get all open orders for a user
 * @param {number} userId - User ID
 * @param {string} [symbol] - Optional trading pair to filter by
 * @returns {Promise<Array>} Open orders
 */
async function getOpenOrders(userId, symbol = null) {
  try {
    const client = await createClientForUser(userId);
    
    // Get open orders from Binance
    const openOrders = symbol ? 
      await client.openOrders({ symbol }) : 
      await client.openOrders();
    
    return openOrders;
  } catch (error) {
    console.error(`Error fetching open orders for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get order status
 * @param {number} userId - User ID
 * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
 * @param {string} orderId - Binance order ID
 * @returns {Promise<Object>} Order status
 */
async function getOrderStatus(userId, symbol, orderId) {
  try {
    const client = await createClientForUser(userId);
    
    // Get order status from Binance
    const order = await client.getOrder({
      symbol: symbol,
      orderId: orderId
    });
    
    // Get our internal order by external ID
    const internalOrder = await storage.getOrderByExternalId(orderId.toString());
    
    if (internalOrder) {
      // Check if order status needs updating
      let newStatus;
      if (order.status === 'FILLED') {
        newStatus = 'completed';
      } else if (order.status === 'CANCELED' || order.status === 'REJECTED' || order.status === 'EXPIRED') {
        newStatus = 'cancelled';
      } else if (order.status === 'NEW' || order.status === 'PARTIALLY_FILLED') {
        newStatus = 'pending';
      }
      
      // Update order status if needed
      if (newStatus && internalOrder.status !== newStatus) {
        await storage.updateOrderStatus(internalOrder.id, newStatus);
      }
    }
    
    return order;
  } catch (error) {
    console.error(`Error fetching order status for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get trade history for a symbol
 * @param {number} userId - User ID
 * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
 * @returns {Promise<Array>} Trade history
 */
async function getTradeHistory(userId, symbol) {
  try {
    const client = await createClientForUser(userId);
    
    // Get trades from Binance
    const trades = await client.myTrades({
      symbol: symbol
    });
    
    return trades;
  } catch (error) {
    console.error(`Error fetching trade history for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get deposit history
 * @param {number} userId - User ID
 * @param {string} [asset] - Optional asset to filter by
 * @returns {Promise<Array>} Deposit history
 */
async function getDepositHistory(userId, asset = null) {
  try {
    const client = await createClientForUser(userId);
    
    // Get deposit history from Binance
    const history = asset ? 
      await client.depositHistory({ asset }) : 
      await client.depositHistory();
    
    return history;
  } catch (error) {
    console.error(`Error fetching deposit history for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get withdrawal history
 * @param {number} userId - User ID
 * @param {string} [asset] - Optional asset to filter by
 * @returns {Promise<Array>} Withdrawal history
 */
async function getWithdrawalHistory(userId, asset = null) {
  try {
    const client = await createClientForUser(userId);
    
    // Get withdrawal history from Binance
    const history = asset ? 
      await client.withdrawHistory({ asset }) : 
      await client.withdrawHistory();
    
    return history;
  } catch (error) {
    console.error(`Error fetching withdrawal history for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Test Binance API connection for a user
 * @param {string} apiKey - API key
 * @param {string} apiSecret - API secret
 * @param {boolean} [useTestnet=true] - Whether to use testnet
 * @returns {Promise<Object>} Test result
 */
async function testConnection(apiKey, apiSecret, useTestnet = true) {
  try {
    // Create Binance client with provided credentials
    const client = Binance({
      apiKey: apiKey,
      apiSecret: apiSecret,
      useServerTime: true,
      testnet: useTestnet
    });
    
    // Attempt to get account info to verify credentials
    const accountInfo = await client.accountInfo();
    
    return {
      success: true,
      message: 'Connection successful',
      data: {
        canTrade: accountInfo.canTrade,
        balances: accountInfo.balances
      }
    };
  } catch (error) {
    console.error('Error testing Binance connection:', error);
    
    return {
      success: false,
      message: error.message || 'Connection failed',
      error: error
    };
  }
}

module.exports = {
  createClientForUser,
  getAccountInfo,
  getBalances,
  createMarketBuyOrder,
  createMarketSellOrder,
  createLimitBuyOrder,
  createLimitSellOrder,
  cancelOrder,
  getOpenOrders,
  getOrderStatus,
  getTradeHistory,
  getDepositHistory,
  getWithdrawalHistory,
  testConnection
};