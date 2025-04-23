/**
 * Market Data Service for FinTrustEX
 * Manages market data and price updates through WebSocket and API
 */

class MarketDataService {
  constructor() {
    this.initialized = false;
    this.marketData = {
      prices: {},
      tickers: {},
      pairs: [],
      lastUpdate: null
    };
    this.priceCallbacks = [];
    this.priceAlerts = [];
    
    // Initialize service
    this.init();
  }
  
  /**
   * Initialize the market data service
   */
  init() {
    document.addEventListener('DOMContentLoaded', () => {
      // Set up WebSocket listeners for real-time price updates
      this.setupWebSocketListeners();
      
      // Fetch initial market data
      this.fetchMarketData();
      
      // Load price alerts from localStorage
      this.loadPriceAlerts();
    });
    
    this.initialized = true;
  }
  
  /**
   * Set up WebSocket listeners for real-time updates
   */
  setupWebSocketListeners() {
    if (window.WebSocketClient && window.WebSocketClient.addMessageListener) {
      // Listen for price updates
      window.WebSocketClient.addMessageListener('price_update', (data) => {
        if (data.pairs && Array.isArray(data.pairs)) {
          // Update local market data
          data.pairs.forEach(pair => {
            this.updatePrice(pair.symbol, pair.price, pair.change);
          });
          
          // Update last update timestamp
          this.marketData.lastUpdate = data.timestamp || new Date().toISOString();
          
          // Check price alerts
          this.checkPriceAlerts();
        }
      });
      
      // Subscribe to price updates channel
      window.WebSocketClient.subscribe('prices');
    }
  }
  
  /**
   * Fetch initial market data from API
   */
  async fetchMarketData() {
    try {
      const response = await fetch('/api/market/data');
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }
      
      const data = await response.json();
      
      // Process and store market data
      if (data.pairs && Array.isArray(data.pairs)) {
        data.pairs.forEach(pair => {
          this.marketData.prices[pair.symbol] = pair.price;
          this.marketData.tickers[pair.symbol] = {
            price: pair.price,
            change: pair.change,
            volume: pair.volume,
            high: pair.high,
            low: pair.low
          };
        });
        
        this.marketData.pairs = data.pairs.map(pair => pair.symbol);
        this.marketData.lastUpdate = data.timestamp || new Date().toISOString();
      }
      
      // Notify callbacks about initial data
      this.notifyPriceCallbacks();
    } catch (error) {
      console.error('Error fetching market data:', error);
      
      // Use static data if API fails
      this.useStaticMarketData();
    }
  }
  
  /**
   * Use static market data as fallback
   */
  useStaticMarketData() {
    // Default market data for major cryptocurrency pairs
    const staticPairs = [
      { symbol: 'BTC/USDT', price: 42500, change: 1.2, volume: 1250000000, high: 43200, low: 42100 },
      { symbol: 'ETH/USDT', price: 2850, change: 0.8, volume: 950000000, high: 2900, low: 2820 },
      { symbol: 'XRP/USDT', price: 0.53, change: -0.5, volume: 85000000, high: 0.54, low: 0.52 },
      { symbol: 'ADA/USDT', price: 0.42, change: 1.5, volume: 125000000, high: 0.43, low: 0.41 },
      { symbol: 'SOL/USDT', price: 98, change: 2.3, volume: 450000000, high: 99.5, low: 96.2 },
      { symbol: 'DOT/USDT', price: 6.8, change: -0.7, volume: 110000000, high: 6.9, low: 6.7 },
      { symbol: 'DOGE/USDT', price: 0.079, change: 0.3, volume: 95000000, high: 0.081, low: 0.077 },
      { symbol: 'LINK/USDT', price: 14.2, change: 1.7, volume: 180000000, high: 14.5, low: 14.0 },
      { symbol: 'AVAX/USDT', price: 32.5, change: 3.2, volume: 220000000, high: 33.1, low: 31.8 },
      { symbol: 'MATIC/USDT', price: 0.65, change: -1.2, volume: 135000000, high: 0.67, low: 0.64 }
    ];
    
    // Store in marketData
    staticPairs.forEach(pair => {
      this.marketData.prices[pair.symbol] = pair.price;
      this.marketData.tickers[pair.symbol] = {
        price: pair.price,
        change: pair.change,
        volume: pair.volume,
        high: pair.high,
        low: pair.low
      };
    });
    
    this.marketData.pairs = staticPairs.map(pair => pair.symbol);
    this.marketData.lastUpdate = new Date().toISOString();
    
    // Notify callbacks about static data
    this.notifyPriceCallbacks();
  }
  
  /**
   * Update a price in the market data
   * @param {string} symbol - The trading pair symbol
   * @param {number} price - The new price
   * @param {number} change - The price change percentage
   */
  updatePrice(symbol, price, change) {
    // Update price in prices object
    this.marketData.prices[symbol] = price;
    
    // Update ticker data
    if (!this.marketData.tickers[symbol]) {
      this.marketData.tickers[symbol] = {
        price: price,
        change: change || 0,
        volume: 0,
        high: price,
        low: price
      };
    } else {
      const ticker = this.marketData.tickers[symbol];
      ticker.price = price;
      
      if (change !== undefined) {
        ticker.change = change;
      }
      
      // Update high and low if necessary
      if (price > ticker.high) {
        ticker.high = price;
      }
      if (price < ticker.low || ticker.low === 0) {
        ticker.low = price;
      }
    }
    
    // Add to pairs array if not already there
    if (!this.marketData.pairs.includes(symbol)) {
      this.marketData.pairs.push(symbol);
    }
    
    // Notify price callbacks
    this.notifyPriceCallbacks(symbol);
  }
  
  /**
   * Register a callback for price updates
   * @param {Function} callback - The callback function
   * @param {string} symbol - Optional symbol to listen for (all if not specified)
   * @returns {Function} A function to unregister the callback
   */
  onPriceUpdate(callback, symbol = null) {
    const callbackObj = { callback, symbol };
    this.priceCallbacks.push(callbackObj);
    
    // Return unsubscribe function
    return () => {
      this.priceCallbacks = this.priceCallbacks.filter(cb => cb !== callbackObj);
    };
  }
  
  /**
   * Notify all callbacks about price updates
   * @param {string} symbol - Optional symbol that was updated (notify all if not specified)
   */
  notifyPriceCallbacks(symbol = null) {
    this.priceCallbacks.forEach(({ callback, symbol: callbackSymbol }) => {
      try {
        // Call callback if it's for all symbols or the specific updated symbol
        if (!callbackSymbol || !symbol || callbackSymbol === symbol) {
          if (symbol) {
            // Provide data for specific symbol
            const ticker = this.marketData.tickers[symbol];
            if (ticker) {
              callback({
                symbol,
                price: ticker.price,
                change: ticker.change,
                timestamp: this.marketData.lastUpdate
              });
            }
          } else {
            // Provide all market data
            callback(this.marketData);
          }
        }
      } catch (error) {
        console.error('Error in price update callback:', error);
      }
    });
  }
  
  /**
   * Get the current price for a symbol
   * @param {string} symbol - The trading pair symbol
   * @returns {number|null} The current price or null if not available
   */
  getPrice(symbol) {
    return this.marketData.prices[symbol] || null;
  }
  
  /**
   * Get ticker data for a symbol
   * @param {string} symbol - The trading pair symbol
   * @returns {Object|null} The ticker data or null if not available
   */
  getTicker(symbol) {
    return this.marketData.tickers[symbol] || null;
  }
  
  /**
   * Get all available trading pairs
   * @returns {string[]} Array of trading pair symbols
   */
  getAllPairs() {
    return [...this.marketData.pairs];
  }
  
  /**
   * Create a price alert
   * @param {string} symbol - The trading pair symbol
   * @param {number} price - The target price
   * @param {string} direction - The direction ('above' or 'below')
   * @param {boolean} persistent - Whether the alert persists after triggering
   * @returns {string} The alert ID
   */
  createPriceAlert(symbol, price, direction = 'above', persistent = false) {
    const alertId = Date.now().toString();
    const alert = {
      id: alertId,
      symbol,
      price,
      direction,
      persistent,
      createdAt: new Date().toISOString(),
      triggered: false
    };
    
    this.priceAlerts.push(alert);
    this.savePriceAlerts();
    
    return alertId;
  }
  
  /**
   * Remove a price alert
   * @param {string} alertId - The alert ID to remove
   * @returns {boolean} Whether the alert was found and removed
   */
  removePriceAlert(alertId) {
    const initialLength = this.priceAlerts.length;
    this.priceAlerts = this.priceAlerts.filter(alert => alert.id !== alertId);
    
    if (this.priceAlerts.length !== initialLength) {
      this.savePriceAlerts();
      return true;
    }
    
    return false;
  }
  
  /**
   * Get all price alerts
   * @returns {Object[]} Array of price alerts
   */
  getPriceAlerts() {
    return [...this.priceAlerts];
  }
  
  /**
   * Save price alerts to localStorage
   */
  savePriceAlerts() {
    try {
      localStorage.setItem('fintrustex_price_alerts', JSON.stringify(this.priceAlerts));
    } catch (error) {
      console.error('Error saving price alerts:', error);
    }
  }
  
  /**
   * Load price alerts from localStorage
   */
  loadPriceAlerts() {
    try {
      const savedAlerts = localStorage.getItem('fintrustex_price_alerts');
      if (savedAlerts) {
        this.priceAlerts = JSON.parse(savedAlerts);
      }
    } catch (error) {
      console.error('Error loading price alerts:', error);
      this.priceAlerts = [];
    }
  }
  
  /**
   * Check if any price alerts have been triggered
   */
  checkPriceAlerts() {
    let triggeredAlerts = [];
    let alertsChanged = false;
    
    this.priceAlerts.forEach(alert => {
      if (alert.triggered && !alert.persistent) {
        return; // Skip already triggered non-persistent alerts
      }
      
      const currentPrice = this.getPrice(alert.symbol);
      if (currentPrice === null) {
        return; // Price not available
      }
      
      const wasTriggered = alert.triggered;
      let isTriggered = false;
      
      if (alert.direction === 'above' && currentPrice >= alert.price) {
        isTriggered = true;
      } else if (alert.direction === 'below' && currentPrice <= alert.price) {
        isTriggered = true;
      }
      
      // Check if alert status changed
      if (isTriggered && !wasTriggered) {
        alert.triggered = true;
        alert.triggeredAt = new Date().toISOString();
        triggeredAlerts.push(alert);
        alertsChanged = true;
      }
    });
    
    // Save alerts if any were triggered
    if (alertsChanged) {
      this.savePriceAlerts();
    }
    
    // Notify about triggered alerts
    this.notifyTriggeredAlerts(triggeredAlerts);
  }
  
  /**
   * Notify about triggered price alerts
   * @param {Object[]} triggeredAlerts - The alerts that were triggered
   */
  notifyTriggeredAlerts(triggeredAlerts) {
    if (triggeredAlerts.length === 0) {
      return;
    }
    
    // Send alerts through WebSocket for notification service
    triggeredAlerts.forEach(alert => {
      if (window.WebSocketClient) {
        window.WebSocketClient.send({
          type: 'price_alert',
          pair: alert.symbol,
          price: alert.price,
          direction: alert.direction,
          timestamp: alert.triggeredAt
        });
      }
      
      // If notification service is available, add notification directly
      if (window.notificationService) {
        window.notificationService.addNotification({
          type: 'price_alert',
          title: 'Price Alert',
          message: `${alert.symbol} has ${alert.direction === 'above' ? 'reached above' : 'dropped below'} ${alert.price}.`,
          timestamp: new Date().toISOString()
        });
      }
    });
  }
  
  /**
   * Get historical price data for a symbol
   * @param {string} symbol - The trading pair symbol
   * @param {string} interval - The interval ('1h', '1d', '1w', etc.)
   * @param {number} limit - The maximum number of data points
   * @returns {Promise<Object[]>} Historical price data
   */
  async getHistoricalPrices(symbol, interval = '1d', limit = 30) {
    try {
      const response = await fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch historical price data');
      }
      
      const data = await response.json();
      return data.candles || [];
    } catch (error) {
      console.error('Error fetching historical prices:', error);
      return this.getStaticHistoricalPrices(symbol, interval, limit);
    }
  }
  
  /**
   * Get static historical price data as fallback
   * @param {string} symbol - The trading pair symbol
   * @param {string} interval - The interval
   * @param {number} limit - The maximum number of data points
   * @returns {Object[]} Static historical price data
   */
  getStaticHistoricalPrices(symbol, interval, limit) {
    const now = new Date();
    const result = [];
    
    // Generate some realistic-looking price data based on current price
    const currentPrice = this.getPrice(symbol) || 1000;
    const volatility = currentPrice * 0.05; // 5% volatility
    
    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = new Date(now);
      
      // Adjust timestamp based on interval
      if (interval === '1h') {
        timestamp.setHours(timestamp.getHours() - i);
      } else if (interval === '1d') {
        timestamp.setDate(timestamp.getDate() - i);
      } else if (interval === '1w') {
        timestamp.setDate(timestamp.getDate() - (i * 7));
      }
      
      // Generate price with some randomness but a general trend
      const trend = Math.sin(i / 5) * volatility;
      const random = (Math.random() - 0.5) * volatility;
      const open = currentPrice + trend + random;
      const close = open + (Math.random() - 0.5) * volatility * 0.5;
      const high = Math.max(open, close) + Math.random() * volatility * 0.3;
      const low = Math.min(open, close) - Math.random() * volatility * 0.3;
      const volume = currentPrice * 1000 * (0.8 + Math.random() * 0.4);
      
      result.push({
        timestamp: timestamp.toISOString(),
        open,
        high,
        low,
        close,
        volume
      });
    }
    
    return result;
  }
}

// Create global market data service instance
window.marketDataService = new MarketDataService();