/**
 * FINTRUSTEX Market Data Service
 * Provides market data for the application from various sources
 */

import websocketClient from './websocket-client.js';
import { formatCurrency, formatPercentage } from './utils.js';

class MarketDataService {
  constructor() {
    this.isInitialized = false;
    this.marketData = {
      pairs: new Map(),
      tickers: new Map(),
      orderbooks: new Map(),
      tradingPairs: [],
      lastUpdate: null
    };
    
    this.listeners = {
      marketUpdate: [],
      tickerUpdate: [],
      orderbookUpdate: [],
      tradeUpdate: []
    };

    this.activeSubscriptions = new Set();

    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.handlePriceUpdate = this.handlePriceUpdate.bind(this);
    this.handleOrderbookUpdate = this.handleOrderbookUpdate.bind(this);
    this.handleTradeUpdate = this.handleTradeUpdate.bind(this);
    this.subscribeToPair = this.subscribeToPair.bind(this);
    this.unsubscribeFromPair = this.unsubscribeFromPair.bind(this);
    this.fetchTradingPairs = this.fetchTradingPairs.bind(this);
    this.fetchMarketOverview = this.fetchMarketOverview.bind(this);
    this.getTradingPair = this.getTradingPair.bind(this);
    this.getOrderbook = this.getOrderbook.bind(this);
    this.getTicker = this.getTicker.bind(this);
    this.getMarketData = this.getMarketData.bind(this);
    this.notifyListeners = this.notifyListeners.bind(this);
    this.addListener = this.addListener.bind(this);
    this.removeListener = this.removeListener.bind(this);
  }

  /**
   * Initialize Market Data Service
   * @returns {Promise} - Initialization promise
   */
  async initialize() {
    if (this.isInitialized) {
      return Promise.resolve();
    }
    
    try {
      console.log('Initializing Market Data Service...');
      
      // Connect to WebSocket server
      await websocketClient.connect();
      
      // Register event handlers
      websocketClient.on('price_update', this.handlePriceUpdate);
      websocketClient.on('orderbook_update', this.handleOrderbookUpdate);
      websocketClient.on('trade_update', this.handleTradeUpdate);
      
      // Subscribe to market data updates
      websocketClient.subscribe('market_data');
      
      // Load initial market data
      await this.fetchTradingPairs();
      await this.fetchMarketOverview();
      
      this.isInitialized = true;
      console.log('Market Data Service initialized');
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to initialize Market Data Service:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Handle price update from WebSocket
   * @param {Object} data - Price update data
   */
  handlePriceUpdate(data) {
    console.log('Received price update:', data);
    
    if (data && data.pairs) {
      data.pairs.forEach(pair => {
        this.marketData.pairs.set(pair.symbol, {
          ...this.marketData.pairs.get(pair.symbol) || {},
          ...pair,
          lastUpdate: new Date()
        });
        
        // Update ticker data
        this.marketData.tickers.set(pair.symbol, {
          ...this.marketData.tickers.get(pair.symbol) || {},
          price: pair.price,
          change: pair.change || 0,
          high24h: pair.high24h || null,
          low24h: pair.low24h || null,
          volume24h: pair.volume24h || null,
          lastUpdate: new Date()
        });
      });
      
      this.marketData.lastUpdate = new Date();
      
      // Notify listeners
      this.notifyListeners('marketUpdate', this.marketData);
      this.notifyListeners('tickerUpdate', this.marketData.tickers);
    }
  }

  /**
   * Handle orderbook update from WebSocket
   * @param {Object} data - Orderbook update data
   */
  handleOrderbookUpdate(data) {
    if (data && data.symbol) {
      const currentOrderbook = this.marketData.orderbooks.get(data.symbol) || {
        asks: [],
        bids: [],
        lastUpdate: null
      };
      
      // Process asks (sell orders)
      if (data.asks) {
        data.asks.forEach(ask => {
          const [price, amount] = ask;
          const index = currentOrderbook.asks.findIndex(item => item[0] === price);
          
          if (amount === 0 && index !== -1) {
            // Remove price level if amount is 0
            currentOrderbook.asks.splice(index, 1);
          } else if (amount > 0) {
            if (index !== -1) {
              // Update existing price level
              currentOrderbook.asks[index] = ask;
            } else {
              // Add new price level
              currentOrderbook.asks.push(ask);
              // Sort asks ascending by price
              currentOrderbook.asks.sort((a, b) => a[0] - b[0]);
            }
          }
        });
      }
      
      // Process bids (buy orders)
      if (data.bids) {
        data.bids.forEach(bid => {
          const [price, amount] = bid;
          const index = currentOrderbook.bids.findIndex(item => item[0] === price);
          
          if (amount === 0 && index !== -1) {
            // Remove price level if amount is 0
            currentOrderbook.bids.splice(index, 1);
          } else if (amount > 0) {
            if (index !== -1) {
              // Update existing price level
              currentOrderbook.bids[index] = bid;
            } else {
              // Add new price level
              currentOrderbook.bids.push(bid);
              // Sort bids descending by price
              currentOrderbook.bids.sort((a, b) => b[0] - a[0]);
            }
          }
        });
      }
      
      currentOrderbook.lastUpdate = new Date();
      this.marketData.orderbooks.set(data.symbol, currentOrderbook);
      
      // Notify listeners
      this.notifyListeners('orderbookUpdate', {
        symbol: data.symbol,
        orderbook: currentOrderbook
      });
    }
  }

  /**
   * Handle trade update from WebSocket
   * @param {Object} data - Trade update data
   */
  handleTradeUpdate(data) {
    if (data && data.trades && data.symbol) {
      // Notify listeners
      this.notifyListeners('tradeUpdate', {
        symbol: data.symbol,
        trades: data.trades
      });
    }
  }

  /**
   * Subscribe to market data for a specific trading pair
   * @param {string} symbol - Trading pair symbol (e.g. 'BTC/USDT')
   */
  subscribeToPair(symbol) {
    if (!symbol) return;
    
    const channel = `market:${symbol}`;
    if (!this.activeSubscriptions.has(channel)) {
      websocketClient.subscribe(channel);
      this.activeSubscriptions.add(channel);
      console.log(`Subscribed to market data for ${symbol}`);
    }
  }

  /**
   * Unsubscribe from market data for a specific trading pair
   * @param {string} symbol - Trading pair symbol (e.g. 'BTC/USDT')
   */
  unsubscribeFromPair(symbol) {
    if (!symbol) return;
    
    const channel = `market:${symbol}`;
    if (this.activeSubscriptions.has(channel)) {
      websocketClient.unsubscribe(channel);
      this.activeSubscriptions.delete(channel);
      console.log(`Unsubscribed from market data for ${symbol}`);
    }
  }

  /**
   * Fetch available trading pairs
   * @returns {Promise<Array>} - Trading pairs
   */
  async fetchTradingPairs() {
    try {
      // In a real implementation, fetch from API
      // For now, use common trading pairs
      const pairs = [
        { symbol: 'BTC/USDT', baseCurrency: 'BTC', quoteCurrency: 'USDT' },
        { symbol: 'ETH/USDT', baseCurrency: 'ETH', quoteCurrency: 'USDT' },
        { symbol: 'XRP/USDT', baseCurrency: 'XRP', quoteCurrency: 'USDT' },
        { symbol: 'ADA/USDT', baseCurrency: 'ADA', quoteCurrency: 'USDT' },
        { symbol: 'SOL/USDT', baseCurrency: 'SOL', quoteCurrency: 'USDT' },
        { symbol: 'DOT/USDT', baseCurrency: 'DOT', quoteCurrency: 'USDT' },
        { symbol: 'DOGE/USDT', baseCurrency: 'DOGE', quoteCurrency: 'USDT' },
        { symbol: 'AVAX/USDT', baseCurrency: 'AVAX', quoteCurrency: 'USDT' },
        { symbol: 'LINK/USDT', baseCurrency: 'LINK', quoteCurrency: 'USDT' },
        { symbol: 'MATIC/USDT', baseCurrency: 'MATIC', quoteCurrency: 'USDT' },
      ];
      
      this.marketData.tradingPairs = pairs;
      
      // Initialize pairs data
      pairs.forEach(pair => {
        if (!this.marketData.pairs.has(pair.symbol)) {
          this.marketData.pairs.set(pair.symbol, {
            ...pair,
            price: null,
            change: null,
            lastUpdate: null
          });
        }
      });
      
      return pairs;
    } catch (error) {
      console.error('Failed to fetch trading pairs:', error);
      return [];
    }
  }

  /**
   * Fetch market overview data
   * @returns {Promise<Map>} - Market data
   */
  async fetchMarketOverview() {
    try {
      // In a real implementation, make a REST API call
      // For now, use simulated data
      setTimeout(() => {
        const data = {
          pairs: [
            { symbol: 'BTC/USDT', price: 60000 + Math.random() * 5000, change: (Math.random() * 10 - 5).toFixed(2) },
            { symbol: 'ETH/USDT', price: 3000 + Math.random() * 300, change: (Math.random() * 10 - 5).toFixed(2) },
            { symbol: 'XRP/USDT', price: 0.5 + Math.random() * 0.1, change: (Math.random() * 10 - 5).toFixed(2) },
            { symbol: 'ADA/USDT', price: 0.8 + Math.random() * 0.1, change: (Math.random() * 10 - 5).toFixed(2) },
            { symbol: 'SOL/USDT', price: 100 + Math.random() * 20, change: (Math.random() * 10 - 5).toFixed(2) },
            { symbol: 'DOT/USDT', price: 20 + Math.random() * 5, change: (Math.random() * 10 - 5).toFixed(2) },
            { symbol: 'DOGE/USDT', price: 0.15 + Math.random() * 0.05, change: (Math.random() * 10 - 5).toFixed(2) },
            { symbol: 'AVAX/USDT', price: 35 + Math.random() * 10, change: (Math.random() * 10 - 5).toFixed(2) },
            { symbol: 'LINK/USDT', price: 15 + Math.random() * 5, change: (Math.random() * 10 - 5).toFixed(2) },
            { symbol: 'MATIC/USDT', price: 1.2 + Math.random() * 0.3, change: (Math.random() * 10 - 5).toFixed(2) }
          ]
        };
        
        this.handlePriceUpdate(data);
      }, 500);
      
      return this.marketData;
    } catch (error) {
      console.error('Failed to fetch market overview:', error);
      return this.marketData;
    }
  }

  /**
   * Get trading pair data
   * @param {string} symbol - Trading pair symbol
   * @returns {Object} - Pair data
   */
  getTradingPair(symbol) {
    return this.marketData.pairs.get(symbol) || null;
  }

  /**
   * Get orderbook data
   * @param {string} symbol - Trading pair symbol
   * @returns {Object} - Orderbook data
   */
  getOrderbook(symbol) {
    return this.marketData.orderbooks.get(symbol) || { asks: [], bids: [], lastUpdate: null };
  }

  /**
   * Get ticker data
   * @param {string} symbol - Trading pair symbol
   * @returns {Object} - Ticker data
   */
  getTicker(symbol) {
    return this.marketData.tickers.get(symbol) || null;
  }

  /**
   * Get all market data
   * @returns {Object} - Market data
   */
  getMarketData() {
    return this.marketData;
  }

  /**
   * Notify listeners of an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  notifyListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in market data ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  addListener(event, listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(listener);
    return () => this.removeListener(event, listener); // Return unsubscribe function
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function to remove
   */
  removeListener(event, listener) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
  }
}

// Create singleton instance
const marketDataService = new MarketDataService();
export default marketDataService;