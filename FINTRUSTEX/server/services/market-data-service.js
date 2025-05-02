/**
 * Market Data Service
 * Manages real-time market data and broadcasts to WebSocket clients
 */

const Binance = require('binance-api-node').default;

class MarketDataService {
  /**
   * Create a new Market Data Service
   * @param {Object} wsServer - WebSocket server instance
   */
  constructor(wsServer) {
    this.wsServer = wsServer;
    this.client = Binance(); // Public API client (no authentication needed)
    this.tickerCache = new Map();
    this.priceCache = new Map();
    this.klineCache = new Map();
    this.depthCache = new Map();
    this.tradesCache = new Map();
    this.binanceWs = null;
    this.publicWsConnections = new Set();
    this.updateInterval = null;
    this.isRunning = false;
  }

  /**
   * Start the market data service
   */
  async start() {
    if (this.isRunning) {
      return;
    }

    try {
      // Load initial market data
      await this.loadInitialData();

      // Set up scheduled updates
      this.setupScheduledUpdates();

      // Set up WebSocket connections
      this.setupWebSocketConnections();

      this.isRunning = true;
      console.log('Market data service started');
    } catch (error) {
      console.error('Error starting market data service:', error);
    }
  }

  /**
   * Stop the market data service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    // Clear interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Close WebSocket connections
    this.closeWebSocketConnections();

    this.isRunning = false;
    console.log('Market data service stopped');
  }

  /**
   * Load initial market data
   */
  async loadInitialData() {
    try {
      // Load all tickers
      const tickers = await this.client.allTickers();
      tickers.forEach(ticker => {
        this.tickerCache.set(ticker.symbol, ticker);
      });

      // Load all prices
      const prices = await this.client.prices();
      Object.entries(prices).forEach(([symbol, price]) => {
        this.priceCache.set(symbol, { symbol, price });
      });

      console.log(`Loaded ${this.tickerCache.size} tickers and ${this.priceCache.size} prices`);
    } catch (error) {
      console.error('Error loading initial market data:', error);
    }
  }

  /**
   * Set up scheduled updates
   */
  setupScheduledUpdates() {
    // Update all tickers and prices every minute
    this.updateInterval = setInterval(async () => {
      try {
        // Update tickers
        const tickers = await this.client.allTickers();
        tickers.forEach(ticker => {
          this.tickerCache.set(ticker.symbol, ticker);
        });

        // Update prices
        const prices = await this.client.prices();
        Object.entries(prices).forEach(([symbol, price]) => {
          this.priceCache.set(symbol, { symbol, price });
        });

        console.log(`Updated ${tickers.length} tickers and ${Object.keys(prices).length} prices`);
      } catch (error) {
        console.error('Error updating market data:', error);
      }
    }, 60000); // 1 minute
  }

  /**
   * Set up WebSocket connections to Binance
   */
  setupWebSocketConnections() {
    try {
      // Connect to Binance WebSocket streams
      this.binanceWs = Binance.ws;

      // Set up ticker stream for all symbols
      const tickerCb = ticker => {
        // Update cache
        this.tickerCache.set(ticker.symbol, ticker);

        // Broadcast to subscribed clients
        const channel = `ticker_${ticker.symbol.toLowerCase()}`;
        this.broadcastUpdate(channel, ticker);
      };

      // Clean up any existing connection
      this.binanceWs.allTickers(tickerCb, { reconnect: true });

      console.log('WebSocket connections established');
    } catch (error) {
      console.error('Error setting up WebSocket connections:', error);
    }
  }

  /**
   * Set up WebSocket connection for a specific ticker
   * @param {string} symbol - Symbol to subscribe to
   */
  setupTickerWebSocket(symbol) {
    try {
      // Only set up if we don't already have a connection
      const connectionKey = `ticker_${symbol.toLowerCase()}`;
      
      if (this.publicWsConnections.has(connectionKey)) {
        return;
      }
      
      this.publicWsConnections.add(connectionKey);
      
      // Set up ticker stream for specific symbol
      const clean = this.binanceWs.ticker(symbol, ticker => {
        // Update cache
        this.tickerCache.set(symbol, ticker);
        
        // Broadcast to subscribed clients
        const channel = `ticker_${symbol.toLowerCase()}`;
        this.broadcastUpdate(channel, ticker);
      });
      
      console.log(`WebSocket connection established for ticker ${symbol}`);
    } catch (error) {
      console.error(`Error setting up WebSocket connection for ticker ${symbol}:`, error);
    }
  }

  /**
   * Set up WebSocket connection for candlesticks
   * @param {string} symbol - Symbol to subscribe to
   * @param {string} interval - Candlestick interval
   */
  setupKlineWebSocket(symbol, interval) {
    try {
      // Only set up if we don't already have a connection
      const connectionKey = `kline_${symbol.toLowerCase()}_${interval}`;
      
      if (this.publicWsConnections.has(connectionKey)) {
        return;
      }
      
      this.publicWsConnections.add(connectionKey);
      
      // Set up kline stream
      const clean = this.binanceWs.candles(symbol, interval, candle => {
        // Update cache
        const cacheKey = `${symbol}_${interval}`;
        
        if (!this.klineCache.has(cacheKey)) {
          this.klineCache.set(cacheKey, []);
        }
        
        const candles = this.klineCache.get(cacheKey);
        
        // Find and update the candle if it exists
        const existingIndex = candles.findIndex(c => c.startTime === candle.startTime);
        
        if (existingIndex !== -1) {
          candles[existingIndex] = candle;
        } else {
          // Add new candle and keep the list sorted
          candles.push(candle);
          candles.sort((a, b) => a.startTime - b.startTime);
          
          // Keep the list at a reasonable size
          if (candles.length > 500) {
            candles.shift();
          }
        }
        
        this.klineCache.set(cacheKey, candles);
        
        // Broadcast to subscribed clients
        const channel = `kline_${symbol.toLowerCase()}_${interval}`;
        this.broadcastUpdate(channel, candle);
      });
      
      console.log(`WebSocket connection established for kline ${symbol} ${interval}`);
    } catch (error) {
      console.error(`Error setting up WebSocket connection for kline ${symbol} ${interval}:`, error);
    }
  }

  /**
   * Set up WebSocket connection for depth (order book)
   * @param {string} symbol - Symbol to subscribe to
   */
  setupDepthWebSocket(symbol) {
    try {
      // Only set up if we don't already have a connection
      const connectionKey = `depth_${symbol.toLowerCase()}`;
      
      if (this.publicWsConnections.has(connectionKey)) {
        return;
      }
      
      this.publicWsConnections.add(connectionKey);
      
      // Set up depth stream
      const clean = this.binanceWs.partialDepth({ symbol, level: 10 }, depth => {
        // Update cache
        this.depthCache.set(symbol, depth);
        
        // Broadcast to subscribed clients
        const channel = `depth_${symbol.toLowerCase()}`;
        this.broadcastUpdate(channel, depth);
      });
      
      console.log(`WebSocket connection established for depth ${symbol}`);
    } catch (error) {
      console.error(`Error setting up WebSocket connection for depth ${symbol}:`, error);
    }
  }

  /**
   * Set up WebSocket connection for trades
   * @param {string} symbol - Symbol to subscribe to
   */
  setupTradesWebSocket(symbol) {
    try {
      // Only set up if we don't already have a connection
      const connectionKey = `trades_${symbol.toLowerCase()}`;
      
      if (this.publicWsConnections.has(connectionKey)) {
        return;
      }
      
      this.publicWsConnections.add(connectionKey);
      
      // Set up trades stream
      const clean = this.binanceWs.trades([symbol], trade => {
        // Update cache
        if (!this.tradesCache.has(symbol)) {
          this.tradesCache.set(symbol, []);
        }
        
        const trades = this.tradesCache.get(symbol);
        
        // Add new trade and keep the list at a reasonable size
        trades.unshift(trade);
        
        if (trades.length > 50) {
          trades.pop();
        }
        
        this.tradesCache.set(symbol, trades);
        
        // Broadcast to subscribed clients
        const channel = `trades_${symbol.toLowerCase()}`;
        this.broadcastUpdate(channel, trade);
      });
      
      console.log(`WebSocket connection established for trades ${symbol}`);
    } catch (error) {
      console.error(`Error setting up WebSocket connection for trades ${symbol}:`, error);
    }
  }

  /**
   * Close all WebSocket connections
   */
  closeWebSocketConnections() {
    // Binance-api-node handles closing connections internally
    this.publicWsConnections.clear();
    console.log('WebSocket connections closed');
  }

  /**
   * Broadcast an update to subscribed clients
   * @param {string} channel - Channel to broadcast to
   * @param {Object} data - Data to broadcast
   */
  broadcastUpdate(channel, data) {
    if (this.wsServer) {
      const subscribers = this.wsServer.getSubscriptionCount(channel);
      
      if (subscribers > 0) {
        this.wsServer.broadcast(channel, data);
      }
    }
  }

  /**
   * Get all tickers
   * @returns {Array} All tickers
   */
  async getAllTickers() {
    if (this.tickerCache.size === 0) {
      await this.loadInitialData();
    }
    
    return Array.from(this.tickerCache.values());
  }

  /**
   * Get ticker for a specific symbol
   * @param {string} symbol - Symbol to get ticker for
   * @returns {Object} Ticker information
   */
  async getTicker(symbol) {
    // Setup WebSocket subscription for real-time updates
    this.setupTickerWebSocket(symbol);
    
    if (this.tickerCache.has(symbol)) {
      return this.tickerCache.get(symbol);
    }
    
    try {
      const ticker = await this.client.ticker({ symbol });
      this.tickerCache.set(symbol, ticker);
      return ticker;
    } catch (error) {
      console.error(`Error getting ticker for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get all prices
   * @returns {Array} All prices
   */
  async getAllPrices() {
    if (this.priceCache.size === 0) {
      await this.loadInitialData();
    }
    
    return Array.from(this.priceCache.values());
  }

  /**
   * Get price for a specific symbol
   * @param {string} symbol - Symbol to get price for
   * @returns {Object} Price information
   */
  async getPrice(symbol) {
    if (this.priceCache.has(symbol)) {
      return this.priceCache.get(symbol);
    }
    
    try {
      const price = await this.client.prices({ symbol });
      const result = { symbol, price: price[symbol] };
      this.priceCache.set(symbol, result);
      return result;
    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get candlestick data for a symbol
   * @param {string} symbol - Symbol to get candlesticks for
   * @param {string} interval - Candlestick interval
   * @param {number} [limit=500] - Limit of results
   * @returns {Array} Candlestick data
   */
  async getKlines(symbol, interval, limit = 500) {
    // Setup WebSocket subscription for real-time updates
    this.setupKlineWebSocket(symbol, interval);
    
    const cacheKey = `${symbol}_${interval}`;
    
    if (this.klineCache.has(cacheKey) && this.klineCache.get(cacheKey).length >= limit) {
      return this.klineCache.get(cacheKey).slice(-limit);
    }
    
    try {
      const candles = await this.client.candles({
        symbol,
        interval,
        limit
      });
      
      this.klineCache.set(cacheKey, candles);
      return candles;
    } catch (error) {
      console.error(`Error getting klines for ${symbol} ${interval}:`, error);
      return [];
    }
  }

  /**
   * Get order book for a symbol
   * @param {string} symbol - Symbol to get order book for
   * @param {number} [limit=100] - Limit of results
   * @returns {Object} Order book
   */
  async getOrderBook(symbol, limit = 100) {
    // Setup WebSocket subscription for real-time updates
    this.setupDepthWebSocket(symbol);
    
    if (this.depthCache.has(symbol)) {
      return this.depthCache.get(symbol);
    }
    
    try {
      const depth = await this.client.book({
        symbol,
        limit
      });
      
      this.depthCache.set(symbol, depth);
      return depth;
    } catch (error) {
      console.error(`Error getting order book for ${symbol}:`, error);
      return { bids: [], asks: [] };
    }
  }

  /**
   * Get recent trades for a symbol
   * @param {string} symbol - Symbol to get trades for
   * @param {number} [limit=50] - Limit of results
   * @returns {Array} Recent trades
   */
  async getRecentTrades(symbol, limit = 50) {
    // Setup WebSocket subscription for real-time updates
    this.setupTradesWebSocket(symbol);
    
    if (this.tradesCache.has(symbol) && this.tradesCache.get(symbol).length >= limit) {
      return this.tradesCache.get(symbol).slice(0, limit);
    }
    
    try {
      const trades = await this.client.trades({
        symbol,
        limit
      });
      
      this.tradesCache.set(symbol, trades);
      return trades;
    } catch (error) {
      console.error(`Error getting recent trades for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get exchange information
   * @returns {Object} Exchange information
   */
  async getExchangeInfo() {
    try {
      return await this.client.exchangeInfo();
    } catch (error) {
      console.error('Error getting exchange info:', error);
      return null;
    }
  }
}

module.exports = { MarketDataService };