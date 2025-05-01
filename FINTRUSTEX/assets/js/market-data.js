/**
 * Market Data Module for FinTrustEX
 * Manages real-time market data using WebSocket API
 */

const MarketData = (function() {
  // Private variables
  let wsClient;
  let activeSymbol = 'BTCUSD';
  let activeTimeframe = '1h';
  let chartInstance = null;
  let lastTickerData = {};
  let lastTradesData = [];
  let lastOrderbookData = { bids: [], asks: [] };
  let lastCandleData = [];
  let callbacks = {
    onTickerUpdate: [],
    onTradesUpdate: [],
    onOrderbookUpdate: [],
    onCandleUpdate: [],
    onConnect: [],
    onDisconnect: []
  };

  // Initialize connections and listeners
  function init() {
    // Get websocket client
    wsClient = window.wsClient;
    
    if (!wsClient) {
      console.error('WebSocket client not available');
      return;
    }
    
    setupEventListeners();
    
    // Connect to WebSocket server
    wsClient.connect()
      .then(() => {
        console.log('Connected to market data service');
        subscribeToDefaultChannels();
        triggerCallbacks('onConnect');
      })
      .catch(error => {
        console.error('Failed to connect to market data service:', error);
      });
  }
  
  // Setup WebSocket event listeners
  function setupEventListeners() {
    // Add connection event handlers
    wsClient.onConnect(() => {
      console.log('WebSocket connection established');
      subscribeToDefaultChannels();
      triggerCallbacks('onConnect');
    });
    
    wsClient.onDisconnect(() => {
      console.log('WebSocket connection lost');
      triggerCallbacks('onDisconnect');
    });
  }
  
  // Subscribe to default data channels
  function subscribeToDefaultChannels() {
    // Subscribe to ticker updates for active symbol
    subscribeToTicker(activeSymbol, updateTickerData);
    
    // Subscribe to trades for active symbol
    subscribeToTrades(activeSymbol, updateTradesData);
    
    // Subscribe to orderbook for active symbol
    subscribeToOrderbook(activeSymbol, updateOrderbookData);
    
    // Subscribe to candles for active symbol and timeframe
    subscribeToCandles(activeSymbol, activeTimeframe, updateCandleData);
  }
  
  // Subscribe to ticker updates
  function subscribeToTicker(symbol, callback) {
    wsClient.subscribe('ticker', symbol, null, (data) => {
      lastTickerData[symbol] = data;
      if (callback) callback(data);
      triggerCallbacks('onTickerUpdate', data);
    });
  }
  
  // Subscribe to trade updates
  function subscribeToTrades(symbol, callback) {
    wsClient.subscribe('trades', symbol, null, (data) => {
      // If data is a single trade, add it to the array
      if (data.id) {
        lastTradesData.unshift(data);
        // Keep only the latest 100 trades
        if (lastTradesData.length > 100) {
          lastTradesData.pop();
        }
      } else if (Array.isArray(data)) {
        // If data is an array of trades, replace the trades array
        lastTradesData = data;
      }
      
      if (callback) callback(data);
      triggerCallbacks('onTradesUpdate', lastTradesData);
    });
  }
  
  // Subscribe to orderbook updates
  function subscribeToOrderbook(symbol, callback) {
    wsClient.subscribe('orderbook', symbol, null, (data) => {
      // If it's a full orderbook, replace the data
      if (data.bids && data.asks) {
        lastOrderbookData = data;
      } 
      // If it's an update, merge with existing data
      else if (data.bidUpdates || data.askUpdates) {
        if (data.bidUpdates) {
          updateOrderbookSide('bids', data.bidUpdates);
        }
        if (data.askUpdates) {
          updateOrderbookSide('asks', data.askUpdates);
        }
      }
      
      if (callback) callback(lastOrderbookData);
      triggerCallbacks('onOrderbookUpdate', lastOrderbookData);
    });
  }
  
  // Subscribe to candle updates
  function subscribeToCandles(symbol, interval, callback) {
    wsClient.subscribe('candles', symbol, interval, (data) => {
      // Replace candle data when received
      lastCandleData = data;
      
      if (callback) callback(data);
      triggerCallbacks('onCandleUpdate', data);
      
      // Update chart if it exists
      if (chartInstance) {
        updateChart(data);
      }
    });
  }
  
  // Update orderbook side (bids or asks) with new data
  function updateOrderbookSide(side, updates) {
    if (!lastOrderbookData[side]) {
      lastOrderbookData[side] = [];
    }
    
    // Process each update
    updates.forEach(update => {
      const [price, amount] = update;
      const priceStr = price.toString();
      
      // Find existing price level
      const existingIndex = lastOrderbookData[side].findIndex(item => item[0].toString() === priceStr);
      
      if (amount === 0) {
        // Remove price level if amount is 0
        if (existingIndex >= 0) {
          lastOrderbookData[side].splice(existingIndex, 1);
        }
      } else if (existingIndex >= 0) {
        // Update existing price level
        lastOrderbookData[side][existingIndex] = update;
      } else {
        // Add new price level
        lastOrderbookData[side].push(update);
        
        // Sort bids descending, asks ascending
        if (side === 'bids') {
          lastOrderbookData[side].sort((a, b) => b[0] - a[0]);
        } else {
          lastOrderbookData[side].sort((a, b) => a[0] - b[0]);
        }
      }
    });
  }
  
  // Create and initialize price chart
  function initChart(elementId, symbol, interval) {
    // Check if chart library is available
    if (!window.Chart) {
      console.error('Chart.js is not available');
      return null;
    }
    
    const canvas = document.getElementById(elementId);
    if (!canvas) {
      console.error(`Canvas element with ID "${elementId}" not found`);
      return null;
    }
    
    // Set active symbol and timeframe
    activeSymbol = symbol || activeSymbol;
    activeTimeframe = interval || activeTimeframe;
    
    // Create chart instance
    chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'candlestick',
      data: {
        datasets: [{
          label: `${activeSymbol} ${activeTimeframe}`,
          data: []
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day'
            }
          },
          y: {
            type: 'linear'
          }
        }
      }
    });
    
    // Subscribe to candle data
    subscribeToCandles(activeSymbol, activeTimeframe, (data) => {
      updateChart(data);
    });
    
    return chartInstance;
  }
  
  // Update chart with new candle data
  function updateChart(data) {
    if (!chartInstance || !data || !Array.isArray(data)) return;
    
    // Format data for candlestick chart
    const chartData = data.map(candle => ({
      x: new Date(candle.timestamp),
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close
    }));
    
    // Update chart data
    chartInstance.data.datasets[0].data = chartData;
    chartInstance.update();
  }
  
  // Update ticker UI elements
  function updateTickerData(data) {
    // Find all elements with data-ticker attribute
    const elements = document.querySelectorAll('[data-ticker]');
    
    elements.forEach(el => {
      const field = el.getAttribute('data-ticker');
      if (data[field] !== undefined) {
        // Format the value based on the field
        let formatted = data[field];
        
        if (field === 'price' || field === 'open24h' || field === 'high24h' || field === 'low24h') {
          formatted = formatCurrency(data[field]);
        } else if (field === 'change24hPercent') {
          formatted = formatPercentage(data[field]);
          
          // Add color classes
          if (data[field] > 0) {
            el.classList.add('text-success');
            el.classList.remove('text-danger');
          } else if (data[field] < 0) {
            el.classList.add('text-danger');
            el.classList.remove('text-success');
          } else {
            el.classList.remove('text-success', 'text-danger');
          }
        } else if (field === 'volume24h') {
          formatted = formatVolume(data[field]);
        }
        
        // Update element text
        el.textContent = formatted;
      }
    });
  }
  
  // Update trades table
  function updateTradesData(trades) {
    const tradesContainer = document.getElementById('recent-trades-container');
    if (!tradesContainer) return;
    
    // Get trade template
    const tradeTemplate = document.getElementById('trade-template');
    if (!tradeTemplate) return;
    
    // Clear container
    tradesContainer.innerHTML = '';
    
    // Use only the most recent 20 trades
    const recentTrades = Array.isArray(trades) ? trades.slice(0, 20) : [trades];
    
    // Add trades to container
    recentTrades.forEach(trade => {
      const tradeElement = tradeTemplate.content.cloneNode(true);
      
      // Fill in data
      tradeElement.querySelector('[data-trade="price"]').textContent = formatCurrency(trade.price);
      tradeElement.querySelector('[data-trade="amount"]').textContent = trade.amount;
      tradeElement.querySelector('[data-trade="time"]').textContent = formatTime(trade.timestamp);
      
      // Add side class
      const priceElement = tradeElement.querySelector('[data-trade="price"]');
      if (trade.side === 'buy') {
        priceElement.classList.add('text-success');
      } else {
        priceElement.classList.add('text-danger');
      }
      
      // Add to container
      tradesContainer.appendChild(tradeElement);
    });
  }
  
  // Update orderbook
  function updateOrderbookData(orderbook) {
    updateOrderbookSide('bids', document.getElementById('orderbook-bids-container'), orderbook.bids);
    updateOrderbookSide('asks', document.getElementById('orderbook-asks-container'), orderbook.asks);
  }
  
  // Update one side of the orderbook
  function updateOrderbookSide(sideName, container, data) {
    if (!container || !Array.isArray(data)) return;
    
    // Get orderbook row template
    const template = document.getElementById('orderbook-row-template');
    if (!template) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Determine sort order and slice data
    let displayData = data;
    if (sideName === 'asks') {
      // Sort asks ascending and take first 10
      displayData = [...data].sort((a, b) => a[0] - b[0]).slice(0, 10);
    } else {
      // Sort bids descending and take first 10
      displayData = [...data].sort((a, b) => b[0] - a[0]).slice(0, 10);
    }
    
    // Calculate total volume for depth visualization
    const totalVolume = displayData.reduce((sum, item) => sum + parseFloat(item[1]), 0);
    
    // Add rows to container
    displayData.forEach((item, index) => {
      const [price, amount] = item;
      const rowElement = template.content.cloneNode(true);
      
      // Fill in data
      rowElement.querySelector('[data-orderbook="price"]').textContent = formatCurrency(price);
      rowElement.querySelector('[data-orderbook="amount"]').textContent = formatAmount(amount);
      
      // Set side-specific classes
      const priceElement = rowElement.querySelector('[data-orderbook="price"]');
      if (sideName === 'bids') {
        priceElement.classList.add('text-success');
      } else {
        priceElement.classList.add('text-danger');
      }
      
      // Set depth visualization
      const depthElement = rowElement.querySelector('[data-orderbook="depth"]');
      if (depthElement) {
        const percentWidth = (parseFloat(amount) / totalVolume) * 100;
        depthElement.style.width = `${Math.min(percentWidth, 100)}%`;
        
        // Add side-specific classes
        if (sideName === 'bids') {
          depthElement.classList.add('bg-success-soft');
        } else {
          depthElement.classList.add('bg-danger-soft');
        }
      }
      
      // Add to container
      container.appendChild(rowElement);
    });
  }
  
  // Change active trading symbol
  function changeSymbol(symbol) {
    if (symbol === activeSymbol) return;
    
    // Unsubscribe from current symbol channels
    wsClient.unsubscribe('ticker', activeSymbol);
    wsClient.unsubscribe('trades', activeSymbol);
    wsClient.unsubscribe('orderbook', activeSymbol);
    wsClient.unsubscribe('candles', activeSymbol, activeTimeframe);
    
    // Update active symbol
    activeSymbol = symbol;
    
    // Subscribe to new symbol channels
    subscribeToTicker(activeSymbol, updateTickerData);
    subscribeToTrades(activeSymbol, updateTradesData);
    subscribeToOrderbook(activeSymbol, updateOrderbookData);
    subscribeToCandles(activeSymbol, activeTimeframe, updateCandleData);
    
    // Update chart title if exists
    if (chartInstance) {
      chartInstance.data.datasets[0].label = `${activeSymbol} ${activeTimeframe}`;
      chartInstance.update();
    }
    
    // Update symbol display in UI
    document.querySelectorAll('[data-symbol-display]').forEach(el => {
      el.textContent = activeSymbol;
    });
  }
  
  // Change candle timeframe
  function changeTimeframe(interval) {
    if (interval === activeTimeframe) return;
    
    // Unsubscribe from current timeframe
    wsClient.unsubscribe('candles', activeSymbol, activeTimeframe);
    
    // Update active timeframe
    activeTimeframe = interval;
    
    // Subscribe to new timeframe
    subscribeToCandles(activeSymbol, activeTimeframe, updateCandleData);
    
    // Update chart title if exists
    if (chartInstance) {
      chartInstance.data.datasets[0].label = `${activeSymbol} ${activeTimeframe}`;
      chartInstance.update();
    }
    
    // Update timeframe display in UI
    document.querySelectorAll('[data-timeframe-display]').forEach(el => {
      el.textContent = activeTimeframe;
    });
  }
  
  // Event callback registration
  function on(event, callback) {
    if (callbacks[event] && typeof callback === 'function') {
      callbacks[event].push(callback);
    }
    return this; // Allow chaining
  }
  
  // Trigger callbacks for an event
  function triggerCallbacks(event, data) {
    if (callbacks[event]) {
      callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }
  
  // Format helpers
  function formatCurrency(value) {
    return parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  function formatPercentage(value) {
    return `${parseFloat(value).toFixed(2)}%`;
  }
  
  function formatVolume(value) {
    return parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }
  
  function formatAmount(value) {
    return parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
  }
  
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }
  
  // Public API
  return {
    init,
    subscribeToTicker,
    subscribeToTrades,
    subscribeToOrderbook,
    subscribeToCandles,
    initChart,
    updateChart,
    changeSymbol,
    changeTimeframe,
    on,
    getActiveSymbol: () => activeSymbol,
    getActiveTimeframe: () => activeTimeframe,
    getLastTickerData: () => lastTickerData,
    getLastTradesData: () => lastTradesData,
    getLastOrderbookData: () => lastOrderbookData,
    getLastCandleData: () => lastCandleData
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  MarketData.init();
  
  // Register symbol change handlers
  document.querySelectorAll('[data-symbol]').forEach(el => {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      const symbol = this.getAttribute('data-symbol');
      MarketData.changeSymbol(symbol);
      
      // Update active classes
      document.querySelectorAll('[data-symbol]').forEach(item => {
        item.classList.remove('active');
      });
      this.classList.add('active');
    });
  });
  
  // Register timeframe change handlers
  document.querySelectorAll('[data-timeframe]').forEach(el => {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      const timeframe = this.getAttribute('data-timeframe');
      MarketData.changeTimeframe(timeframe);
      
      // Update active classes
      document.querySelectorAll('[data-timeframe]').forEach(item => {
        item.classList.remove('active');
      });
      this.classList.add('active');
    });
  });
  
  // Initialize chart if container exists
  const chartContainer = document.getElementById('price-chart');
  if (chartContainer) {
    MarketData.initChart('price-chart', 'BTCUSD', '1h');
  }
});

// Make MarketData globally available
window.MarketData = MarketData;