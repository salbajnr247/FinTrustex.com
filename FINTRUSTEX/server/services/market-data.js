/**
 * Market Data Service for FinTrustEX
 * Provides simulated market data for trading interface
 */

// Store for market data (simulated for demo purposes)
const marketData = {
  tickers: {},
  orderBooks: {},
  trades: {},
  candles: {}
};

// Supported symbols
const SYMBOLS = [
  'BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD', 'BNBUSD', 
  'ADAUSD', 'DOTUSD', 'SOLUSD', 'AVAXUSD', 'DOGEUSD'
];

// Supported time intervals for candles
const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

/**
 * Generate realistic price based on volatility and trend
 * @param {number} basePrice - Starting price point
 * @param {number} volatility - Price volatility percentage (0-1)
 * @param {number} trend - Price trend direction (-1 to 1)
 * @returns {number} - Generated price
 */
function generatePrice(basePrice, volatility = 0.02, trend = 0) {
  const randomFactor = 1 + ((Math.random() - 0.5) * volatility);
  const trendFactor = 1 + (trend * volatility / 2);
  return basePrice * randomFactor * trendFactor;
}

/**
 * Market Data Service
 */
const marketDataService = {
  /**
   * Initialize market data for all symbols
   */
  initialize() {
    // Generate initial market data for all symbols
    SYMBOLS.forEach(symbol => {
      // Initialize with realistic base prices for different assets
      let basePrice;
      switch (symbol) {
        case 'BTCUSD': basePrice = 45000 + Math.random() * 5000; break;
        case 'ETHUSD': basePrice = 3200 + Math.random() * 300; break;
        case 'LTCUSD': basePrice = 180 + Math.random() * 20; break;
        case 'XRPUSD': basePrice = 0.5 + Math.random() * 0.1; break;
        case 'BNBUSD': basePrice = 350 + Math.random() * 30; break;
        case 'ADAUSD': basePrice = 1.2 + Math.random() * 0.2; break;
        case 'DOTUSD': basePrice = 15 + Math.random() * 2; break;
        case 'SOLUSD': basePrice = 100 + Math.random() * 10; break;
        case 'AVAXUSD': basePrice = 85 + Math.random() * 8; break;
        case 'DOGEUSD': basePrice = 0.08 + Math.random() * 0.01; break;
        default: basePrice = 100 + Math.random() * 10;
      }

      // Generate ticker data
      this.updateTicker(symbol, basePrice);
      
      // Generate order book
      this.generateOrderBook(symbol, basePrice);
      
      // Generate recent trades
      this.generateInitialTrades(symbol, basePrice);
      
      // Generate candles for different timeframes
      INTERVALS.forEach(interval => {
        this.generateCandles(symbol, interval, basePrice);
      });
    });
    
    // Start periodic updates
    this.startPeriodicUpdates();
  },
  
  /**
   * Get current ticker for symbol
   * @param {string} symbol - Trading symbol
   * @returns {Object} - Ticker data
   */
  getTicker(symbol) {
    if (!marketData.tickers[symbol]) {
      throw new Error(`Ticker not found for symbol: ${symbol}`);
    }
    return marketData.tickers[symbol];
  },
  
  /**
   * Get order book for symbol
   * @param {string} symbol - Trading symbol
   * @returns {Object} - Order book data
   */
  getOrderBook(symbol) {
    if (!marketData.orderBooks[symbol]) {
      throw new Error(`Order book not found for symbol: ${symbol}`);
    }
    return marketData.orderBooks[symbol];
  },
  
  /**
   * Get recent trades for symbol
   * @param {string} symbol - Trading symbol
   * @returns {Array} - Recent trades
   */
  getRecentTrades(symbol) {
    if (!marketData.trades[symbol]) {
      throw new Error(`Trades not found for symbol: ${symbol}`);
    }
    return marketData.trades[symbol];
  },
  
  /**
   * Get a simulated new trade for symbol
   * @param {string} symbol - Trading symbol
   * @returns {Object} - Single new trade
   */
  getNewTrade(symbol) {
    const ticker = this.getTicker(symbol);
    const price = generatePrice(ticker.last, 0.005);
    const size = (Math.random() * 2).toFixed(4);
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    
    const trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      symbol,
      price: price.toFixed(symbol.includes('USD') ? 2 : 8),
      size,
      side,
      timestamp: Date.now()
    };
    
    // Add to recent trades list
    if (!marketData.trades[symbol]) {
      marketData.trades[symbol] = [];
    }
    
    marketData.trades[symbol].unshift(trade);
    
    // Limit to 100 recent trades
    if (marketData.trades[symbol].length > 100) {
      marketData.trades[symbol] = marketData.trades[symbol].slice(0, 100);
    }
    
    return trade;
  },
  
  /**
   * Get candles for symbol and interval
   * @param {string} symbol - Trading symbol
   * @param {string} interval - Time interval
   * @returns {Array} - Candle data
   */
  getCandles(symbol, interval) {
    if (!INTERVALS.includes(interval)) {
      throw new Error(`Invalid interval: ${interval}`);
    }
    
    if (!marketData.candles[symbol] || !marketData.candles[symbol][interval]) {
      throw new Error(`Candles not found for ${symbol}:${interval}`);
    }
    
    return marketData.candles[symbol][interval];
  },
  
  /**
   * Update ticker for symbol
   * @param {string} symbol - Trading symbol
   * @param {number} basePrice - Base price for calculations
   */
  updateTicker(symbol, basePrice) {
    const prevTicker = marketData.tickers[symbol] || { last: basePrice };
    const lastPrice = prevTicker.last;
    
    // Generate new price with slight volatility
    const newPrice = generatePrice(lastPrice, 0.01);
    
    // Calculate 24h change values
    const open24h = prevTicker.open24h || (newPrice * 0.99);
    const high24h = prevTicker.high24h ? Math.max(prevTicker.high24h, newPrice) : newPrice;
    const low24h = prevTicker.low24h ? Math.min(prevTicker.low24h, newPrice) : newPrice;
    const volume24h = (prevTicker.volume24h || 0) + (Math.random() * 10);
    
    // Calculate percentage change
    const change24h = newPrice - open24h;
    const change24hPercent = (change24h / open24h) * 100;
    
    // Create ticker object
    marketData.tickers[symbol] = {
      symbol,
      last: newPrice,
      bid: newPrice * 0.999,
      ask: newPrice * 1.001,
      open24h,
      high24h,
      low24h,
      volume24h,
      change24h,
      change24hPercent,
      timestamp: Date.now()
    };
    
    // Format decimal precision based on symbol
    const precision = symbol.includes('USD') ? 2 : 8;
    ['last', 'bid', 'ask', 'open24h', 'high24h', 'low24h', 'change24h'].forEach(key => {
      marketData.tickers[symbol][key] = parseFloat(marketData.tickers[symbol][key].toFixed(precision));
    });
    
    marketData.tickers[symbol].change24hPercent = parseFloat(change24hPercent.toFixed(2));
    marketData.tickers[symbol].volume24h = parseFloat(volume24h.toFixed(4));
    
    return marketData.tickers[symbol];
  },
  
  /**
   * Generate order book for symbol
   * @param {string} symbol - Trading symbol
   * @param {number} basePrice - Base price for calculations
   */
  generateOrderBook(symbol, basePrice) {
    const price = basePrice || (marketData.tickers[symbol]?.last || 100);
    const precision = symbol.includes('USD') ? 2 : 8;
    
    // Generate asks (sell orders)
    const asks = [];
    for (let i = 0; i < 15; i++) {
      const orderPrice = price * (1 + (0.001 * (i + 1)));
      const size = (Math.random() * 5 + 0.1).toFixed(4);
      asks.push([parseFloat(orderPrice.toFixed(precision)), parseFloat(size)]);
    }
    
    // Generate bids (buy orders)
    const bids = [];
    for (let i = 0; i < 15; i++) {
      const orderPrice = price * (1 - (0.001 * (i + 1)));
      const size = (Math.random() * 5 + 0.1).toFixed(4);
      bids.push([parseFloat(orderPrice.toFixed(precision)), parseFloat(size)]);
    }
    
    // Sort orders (asks ascending, bids descending)
    asks.sort((a, b) => a[0] - b[0]);
    bids.sort((a, b) => b[0] - a[0]);
    
    marketData.orderBooks[symbol] = {
      symbol,
      asks,
      bids,
      timestamp: Date.now()
    };
    
    return marketData.orderBooks[symbol];
  },
  
  /**
   * Generate initial trades for symbol
   * @param {string} symbol - Trading symbol
   * @param {number} basePrice - Base price for calculations
   */
  generateInitialTrades(symbol, basePrice) {
    const trades = [];
    const price = basePrice || (marketData.tickers[symbol]?.last || 100);
    const precision = symbol.includes('USD') ? 2 : 8;
    
    // Generate 20 random trades
    for (let i = 0; i < 20; i++) {
      const tradePrice = generatePrice(price, 0.01);
      const size = (Math.random() * 2).toFixed(4);
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      const timestamp = Date.now() - (i * 1000 * 60); // 1 minute apart
      
      trades.push({
        id: `trade_init_${i}_${Math.random().toString(36).substr(2, 5)}`,
        symbol,
        price: parseFloat(tradePrice.toFixed(precision)),
        size: parseFloat(size),
        side,
        timestamp
      });
    }
    
    marketData.trades[symbol] = trades;
    return trades;
  },
  
  /**
   * Generate candles for symbol and interval
   * @param {string} symbol - Trading symbol
   * @param {string} interval - Time interval
   * @param {number} basePrice - Base price for calculations
   */
  generateCandles(symbol, interval, basePrice) {
    const price = basePrice || (marketData.tickers[symbol]?.last || 100);
    const precision = symbol.includes('USD') ? 2 : 8;
    const candles = [];
    
    // Number of candles to generate
    let count = 100;
    
    // Interval in minutes
    let intervalMinutes;
    switch (interval) {
      case '1m': intervalMinutes = 1; break;
      case '5m': intervalMinutes = 5; break;
      case '15m': intervalMinutes = 15; break;
      case '1h': intervalMinutes = 60; break;
      case '4h': intervalMinutes = 240; break;
      case '1d': intervalMinutes = 1440; break;
      case '1w': intervalMinutes = 10080; break;
      default: intervalMinutes = 60;
    }
    
    // Calculate time step for candles
    const timeStep = intervalMinutes * 60 * 1000;
    
    // Generate trend (up, down, or sideways)
    const trend = (Math.random() - 0.5) * 2; // -1 to 1
    
    let currentPrice = price * 0.7; // Start from lower price for uptrend
    
    // Generate candles from oldest to newest
    for (let i = count - 1; i >= 0; i--) {
      const timestamp = Date.now() - (i * timeStep);
      
      // Generate OHLC with realistic price action
      const volatility = 0.02 * (intervalMinutes / 60); // Higher volatility for longer timeframes
      const open = currentPrice;
      const high = open * (1 + (Math.random() * volatility));
      const low = open * (1 - (Math.random() * volatility));
      const close = generatePrice(open, volatility, trend);
      
      // Volume increases with price volatility
      const baseVolume = Math.abs(close - open) / open * 100;
      const volume = baseVolume + (Math.random() * 10);
      
      candles.push({
        timestamp,
        open: parseFloat(open.toFixed(precision)),
        high: parseFloat(high.toFixed(precision)),
        low: parseFloat(low.toFixed(precision)),
        close: parseFloat(close.toFixed(precision)),
        volume: parseFloat(volume.toFixed(4))
      });
      
      // Use close as next candle's reference
      currentPrice = close;
    }
    
    // Initialize candles object structure if needed
    if (!marketData.candles[symbol]) {
      marketData.candles[symbol] = {};
    }
    
    marketData.candles[symbol][interval] = candles;
    return candles;
  },
  
  /**
   * Update candle with new price data
   * @param {string} symbol - Trading symbol
   * @param {string} interval - Time interval
   * @param {number} price - Current price
   */
  updateCandle(symbol, interval, price) {
    if (!marketData.candles[symbol] || !marketData.candles[symbol][interval]) {
      return;
    }
    
    const candles = marketData.candles[symbol][interval];
    const lastCandle = candles[candles.length - 1];
    const precision = symbol.includes('USD') ? 2 : 8;
    
    // Determine interval in milliseconds
    let intervalMs;
    switch (interval) {
      case '1m': intervalMs = 60 * 1000; break;
      case '5m': intervalMs = 5 * 60 * 1000; break;
      case '15m': intervalMs = 15 * 60 * 1000; break;
      case '1h': intervalMs = 60 * 60 * 1000; break;
      case '4h': intervalMs = 4 * 60 * 60 * 1000; break;
      case '1d': intervalMs = 24 * 60 * 60 * 1000; break;
      case '1w': intervalMs = 7 * 24 * 60 * 60 * 1000; break;
      default: intervalMs = 60 * 60 * 1000;
    }
    
    const currentTime = Date.now();
    const candleStartTime = Math.floor(currentTime / intervalMs) * intervalMs;
    
    // Check if we need to create a new candle
    if (lastCandle.timestamp < candleStartTime) {
      // Create new candle
      const newCandle = {
        timestamp: candleStartTime,
        open: parseFloat(price.toFixed(precision)),
        high: parseFloat(price.toFixed(precision)),
        low: parseFloat(price.toFixed(precision)),
        close: parseFloat(price.toFixed(precision)),
        volume: parseFloat((Math.random() * 0.5).toFixed(4))
      };
      
      candles.push(newCandle);
      
      // Remove oldest candle if we have more than 100
      if (candles.length > 100) {
        candles.shift();
      }
    } else {
      // Update existing candle
      lastCandle.close = parseFloat(price.toFixed(precision));
      lastCandle.high = Math.max(lastCandle.high, parseFloat(price.toFixed(precision)));
      lastCandle.low = Math.min(lastCandle.low, parseFloat(price.toFixed(precision)));
      lastCandle.volume = parseFloat((lastCandle.volume + Math.random() * 0.1).toFixed(4));
    }
  },
  
  /**
   * Start periodic updates of market data
   */
  startPeriodicUpdates() {
    // Update tickers every 3 seconds
    setInterval(() => {
      SYMBOLS.forEach(symbol => {
        try {
          const ticker = marketData.tickers[symbol];
          if (ticker) {
            this.updateTicker(symbol, ticker.last);
          }
        } catch (error) {
          console.error(`Error updating ticker for ${symbol}:`, error);
        }
      });
    }, 3000);
    
    // Update order books every 5 seconds
    setInterval(() => {
      SYMBOLS.forEach(symbol => {
        try {
          const ticker = marketData.tickers[symbol];
          if (ticker) {
            this.generateOrderBook(symbol, ticker.last);
          }
        } catch (error) {
          console.error(`Error updating order book for ${symbol}:`, error);
        }
      });
    }, 5000);
    
    // Update candles periodically
    setInterval(() => {
      SYMBOLS.forEach(symbol => {
        try {
          const ticker = marketData.tickers[symbol];
          if (ticker) {
            // Update all intervals
            INTERVALS.forEach(interval => {
              this.updateCandle(symbol, interval, ticker.last);
            });
          }
        } catch (error) {
          console.error(`Error updating candles for ${symbol}:`, error);
        }
      });
    }, 10000);
  }
};

// Initialize market data on module load
marketDataService.initialize();

module.exports = { marketDataService };