/**
 * Main Routes for FinTrustEX
 * Sets up all API routes and WebSocket server
 */

const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const binanceRoutes = require('./routes/binance-routes');
const websocketServer = require('./websocket-server');
const marketDataService = require('./services/market-data-service');

/**
 * Register all routes and set up WebSocket server
 * @param {express.Application} app - Express application
 * @returns {http.Server} HTTP server
 */
function registerRoutes(app) {
  // Middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  
  // Static assets
  app.use(express.static(path.join(__dirname, '../assets')));
  
  // API Routes
  app.use('/api/binance', binanceRoutes);
  
  // Market data API routes
  app.get('/api/market/prices', async (req, res) => {
    try {
      const prices = await marketDataService.getAllPrices();
      res.json({ prices });
    } catch (error) {
      console.error('Error getting market prices:', error);
      res.status(500).json({ error: 'Failed to get market prices' });
    }
  });
  
  app.get('/api/market/ticker/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const ticker = await marketDataService.get24hrTicker(symbol);
      res.json(ticker);
    } catch (error) {
      console.error(`Error getting ticker for ${req.params.symbol}:`, error);
      res.status(500).json({ error: 'Failed to get ticker data' });
    }
  });
  
  app.get('/api/market/tickers', async (req, res) => {
    try {
      const tickers = await marketDataService.getAll24hrTickers();
      res.json({ tickers });
    } catch (error) {
      console.error('Error getting all tickers:', error);
      res.status(500).json({ error: 'Failed to get ticker data' });
    }
  });
  
  app.get('/api/market/candles/:symbol/:interval', async (req, res) => {
    try {
      const { symbol, interval } = req.params;
      const { limit } = req.query;
      
      const candles = await marketDataService.getCandles(
        symbol, 
        interval, 
        limit ? parseInt(limit, 10) : undefined
      );
      
      res.json({ candles });
    } catch (error) {
      console.error(`Error getting candles for ${req.params.symbol}:`, error);
      res.status(500).json({ error: 'Failed to get candle data' });
    }
  });
  
  app.get('/api/market/top-gainers', async (req, res) => {
    try {
      const { limit } = req.query;
      const gainers = await marketDataService.getTopGainers(
        limit ? parseInt(limit, 10) : undefined
      );
      res.json({ gainers });
    } catch (error) {
      console.error('Error getting top gainers:', error);
      res.status(500).json({ error: 'Failed to get top gainers' });
    }
  });
  
  app.get('/api/market/top-losers', async (req, res) => {
    try {
      const { limit } = req.query;
      const losers = await marketDataService.getTopLosers(
        limit ? parseInt(limit, 10) : undefined
      );
      res.json({ losers });
    } catch (error) {
      console.error('Error getting top losers:', error);
      res.status(500).json({ error: 'Failed to get top losers' });
    }
  });
  
  app.get('/api/market/top-volume', async (req, res) => {
    try {
      const { limit } = req.query;
      const topVolume = await marketDataService.getTopVolume(
        limit ? parseInt(limit, 10) : undefined
      );
      res.json({ topVolume });
    } catch (error) {
      console.error('Error getting top volume:', error);
      res.status(500).json({ error: 'Failed to get top volume' });
    }
  });
  
  // Catch-all route for SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../assets/index.html'));
  });
  
  // Create HTTP server from Express app
  const httpServer = http.createServer(app);
  
  // Set up WebSocket server
  const wss = websocketServer.setupWebSocketServer(httpServer);
  
  // Initialize market data service with WebSocket server
  marketDataService.initialize(websocketServer);
  
  // Subscribe to popular pairs
  const popularPairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 'XRPUSDT'];
  marketDataService.subscribeToMultipleTickers(popularPairs);
  
  // Register shutdown handlers
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    marketDataService.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    marketDataService.shutdown();
    process.exit(0);
  });
  
  return httpServer;
}

module.exports = {
  registerRoutes
};