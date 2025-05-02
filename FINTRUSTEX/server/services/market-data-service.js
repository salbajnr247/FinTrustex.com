/**
 * Market Data Service for FinTrustEX
 * Handles cryptocurrency market data streams and cache
 */

const Binance = require('binance-api-node').default;
const WebSocket = require('ws');

// Create a public (unauthenticated) Binance client for market data
const publicClient = Binance();

// Market data cache
const marketData = {
  tickers: new Map(), // symbol => ticker data
  lastUpdated: new Map(), // symbol => timestamp
  subscriptions: new Set(), // Set of active WebSocket subscriptions
  wsConnections: new Map(), // Stream name => WebSocket connection
};

// Create WebSocket server reference to broadcast updates
let wsServer = null;

/**
 * Initialize the market data service
 * @param {Object} webSocketServer - WebSocket server instance for broadcasting
 */
function initialize(webSocketServer) {
  wsServer = webSocketServer;
  console.log('Market data service initialized');
}

/**
 * Get current price for a symbol
 * @param {string} symbol - Symbol (e.g., 'BTCUSDT')
 * @returns {Promise<Object>} Current price data
 */
async function getCurrentPrice(symbol) {
  try {
    const price = await publicClient.prices({ symbol });
    return price;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get current prices for all symbols
 * @returns {Promise<Object>} Current prices
 */
async function getAllPrices() {
  try {
    const prices = await publicClient.prices();
    return prices;
  } catch (error) {
    console.error('Error fetching all prices:', error);
    throw error;
  }
}

/**
 * Get 24hr ticker for a symbol
 * @param {string} symbol - Symbol (e.g., 'BTCUSDT')
 * @returns {Promise<Object>} 24hr ticker data
 */
async function get24hrTicker(symbol) {
  try {
    const ticker = await publicClient.dailyStats({ symbol });
    
    // Update cache
    marketData.tickers.set(symbol, ticker);
    marketData.lastUpdated.set(symbol, Date.now());
    
    return ticker;
  } catch (error) {
    console.error(`Error fetching 24hr ticker for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get 24hr tickers for all symbols
 * @returns {Promise<Array>} Array of 24hr ticker data
 */
async function getAll24hrTickers() {
  try {
    const tickers = await publicClient.dailyStats();
    
    // Update cache
    tickers.forEach(ticker => {
      marketData.tickers.set(ticker.symbol, ticker);
      marketData.lastUpdated.set(ticker.symbol, Date.now());
    });
    
    return tickers;
  } catch (error) {
    console.error('Error fetching all 24hr tickers:', error);
    throw error;
  }
}

/**
 * Get order book for a symbol
 * @param {string} symbol - Symbol (e.g., 'BTCUSDT')
 * @param {number} [limit=100] - Number of bids and asks to return
 * @returns {Promise<Object>} Order book
 */
async function getOrderBook(symbol, limit = 100) {
  try {
    const orderBook = await publicClient.book({ symbol, limit });
    return orderBook;
  } catch (error) {
    console.error(`Error fetching order book for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get recent trades for a symbol
 * @param {string} symbol - Symbol (e.g., 'BTCUSDT')
 * @param {number} [limit=50] - Number of trades to return
 * @returns {Promise<Array>} Recent trades
 */
async function getRecentTrades(symbol, limit = 50) {
  try {
    const trades = await publicClient.trades({ symbol, limit });
    return trades;
  } catch (error) {
    console.error(`Error fetching recent trades for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get candlestick/kline data for a symbol
 * @param {string} symbol - Symbol (e.g., 'BTCUSDT')
 * @param {string} interval - Interval (1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M)
 * @param {number} [limit=500] - Number of candles to return
 * @returns {Promise<Array>} Candlestick data
 */
async function getCandles(symbol, interval, limit = 500) {
  try {
    const candles = await publicClient.candles({ 
      symbol, 
      interval, 
      limit 
    });
    return candles;
  } catch (error) {
    console.error(`Error fetching candles for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Subscribe to ticker updates for a symbol
 * @param {string} symbol - Symbol (e.g., 'BTCUSDT')
 */
function subscribeToTicker(symbol) {
  if (marketData.subscriptions.has(`${symbol.toLowerCase()}@ticker`)) {
    console.log(`Already subscribed to ticker for ${symbol}`);
    return;
  }
  
  try {
    const streamName = `${symbol.toLowerCase()}@ticker`;
    
    // Create WebSocket connection
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streamName}`);
    
    ws.on('open', () => {
      console.log(`Opened WebSocket connection for ${streamName}`);
      marketData.subscriptions.add(streamName);
      marketData.wsConnections.set(streamName, ws);
    });
    
    ws.on('message', (data) => {
      try {
        const tickerData = JSON.parse(data);
        
        // Update cache
        marketData.tickers.set(symbol, tickerData);
        marketData.lastUpdated.set(symbol, Date.now());
        
        // Broadcast to WebSocket clients if server is available
        if (wsServer) {
          wsServer.broadcastToChannel('market_data', {
            type: 'ticker_update',
            symbol: symbol,
            data: tickerData,
            timestamp: Date.now()
          });
          
          wsServer.broadcastToChannel(`ticker_${symbol.toLowerCase()}`, {
            type: 'ticker_update',
            symbol: symbol,
            data: tickerData,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error(`Error processing ticker data for ${symbol}:`, error);
      }
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket error for ${streamName}:`, error);
    });
    
    ws.on('close', () => {
      console.log(`WebSocket connection closed for ${streamName}`);
      marketData.subscriptions.delete(streamName);
      marketData.wsConnections.delete(streamName);
    });
  } catch (error) {
    console.error(`Error subscribing to ticker for ${symbol}:`, error);
  }
}

/**
 * Unsubscribe from ticker updates for a symbol
 * @param {string} symbol - Symbol (e.g., 'BTCUSDT')
 */
function unsubscribeFromTicker(symbol) {
  const streamName = `${symbol.toLowerCase()}@ticker`;
  
  if (!marketData.subscriptions.has(streamName)) {
    console.log(`Not subscribed to ticker for ${symbol}`);
    return;
  }
  
  try {
    const ws = marketData.wsConnections.get(streamName);
    
    if (ws) {
      ws.close();
      console.log(`Closed WebSocket connection for ${streamName}`);
    }
    
    marketData.subscriptions.delete(streamName);
    marketData.wsConnections.delete(streamName);
  } catch (error) {
    console.error(`Error unsubscribing from ticker for ${symbol}:`, error);
  }
}

/**
 * Subscribe to ticker updates for multiple symbols
 * @param {Array<string>} symbols - Array of symbols (e.g., ['BTCUSDT', 'ETHUSDT'])
 */
function subscribeToMultipleTickers(symbols) {
  symbols.forEach(symbol => {
    subscribeToTicker(symbol);
  });
}

/**
 * Get cached ticker data for a symbol
 * @param {string} symbol - Symbol (e.g., 'BTCUSDT')
 * @param {number} [maxAgeMs=60000] - Maximum age of cached data in milliseconds
 * @returns {Promise<Object>} Ticker data
 */
async function getCachedTicker(symbol, maxAgeMs = 60000) {
  const lastUpdated = marketData.lastUpdated.get(symbol);
  const now = Date.now();
  
  // If data is stale or not available, fetch fresh data
  if (!lastUpdated || (now - lastUpdated > maxAgeMs)) {
    return await get24hrTicker(symbol);
  }
  
  return marketData.tickers.get(symbol);
}

/**
 * Get top gainers in the last 24 hours
 * @param {number} [limit=10] - Number of gainers to return
 * @returns {Promise<Array>} Top gainers
 */
async function getTopGainers(limit = 10) {
  try {
    const tickers = await getAll24hrTickers();
    
    // Filter USDT pairs only
    const usdtPairs = tickers.filter(ticker => ticker.symbol.endsWith('USDT'));
    
    // Sort by percent change
    const sorted = usdtPairs.sort((a, b) => {
      return parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent);
    });
    
    return sorted.slice(0, limit);
  } catch (error) {
    console.error('Error fetching top gainers:', error);
    throw error;
  }
}

/**
 * Get top losers in the last 24 hours
 * @param {number} [limit=10] - Number of losers to return
 * @returns {Promise<Array>} Top losers
 */
async function getTopLosers(limit = 10) {
  try {
    const tickers = await getAll24hrTickers();
    
    // Filter USDT pairs only
    const usdtPairs = tickers.filter(ticker => ticker.symbol.endsWith('USDT'));
    
    // Sort by percent change (ascending)
    const sorted = usdtPairs.sort((a, b) => {
      return parseFloat(a.priceChangePercent) - parseFloat(b.priceChangePercent);
    });
    
    return sorted.slice(0, limit);
  } catch (error) {
    console.error('Error fetching top losers:', error);
    throw error;
  }
}

/**
 * Get top volume in the last 24 hours
 * @param {number} [limit=10] - Number of results to return
 * @returns {Promise<Array>} Top volume
 */
async function getTopVolume(limit = 10) {
  try {
    const tickers = await getAll24hrTickers();
    
    // Filter USDT pairs only
    const usdtPairs = tickers.filter(ticker => ticker.symbol.endsWith('USDT'));
    
    // Sort by volume
    const sorted = usdtPairs.sort((a, b) => {
      return parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume);
    });
    
    return sorted.slice(0, limit);
  } catch (error) {
    console.error('Error fetching top volume:', error);
    throw error;
  }
}

/**
 * Get exchange information for symbols or all
 * @param {string} [symbol] - Optional symbol to filter information
 * @returns {Promise<Object>} Exchange information
 */
async function getExchangeInfo(symbol = null) {
  try {
    const info = symbol 
      ? await publicClient.exchangeInfo({ symbol }) 
      : await publicClient.exchangeInfo();
    return info;
  } catch (error) {
    console.error('Error fetching exchange info:', error);
    throw error;
  }
}

/**
 * Shutdown all active WebSocket connections
 */
function shutdown() {
  console.log('Shutting down market data service...');
  
  // Close all WebSocket connections
  marketData.wsConnections.forEach((ws, streamName) => {
    try {
      ws.close();
      console.log(`Closed WebSocket connection for ${streamName}`);
    } catch (error) {
      console.error(`Error closing WebSocket for ${streamName}:`, error);
    }
  });
  
  // Clear data structures
  marketData.subscriptions.clear();
  marketData.wsConnections.clear();
  
  console.log('Market data service shut down');
}

// Export functions
module.exports = {
  initialize,
  getCurrentPrice,
  getAllPrices,
  get24hrTicker,
  getAll24hrTickers,
  getOrderBook,
  getRecentTrades,
  getCandles,
  subscribeToTicker,
  unsubscribeFromTicker,
  subscribeToMultipleTickers,
  getCachedTicker,
  getTopGainers,
  getTopLosers,
  getTopVolume,
  getExchangeInfo,
  shutdown
};