/**
 * FINTRUSTEX Trading Interface
 * Handles trading charts, order book, and order placement
 */

import websocketClient from './websocket-client.js';
import marketDataService from './market-data-service.js';
import authService from './auth-service.js';
import * as utils from './utils.js';

// Initialize chart
let tradingChart = null;
let currentSymbol = 'BTC/USDT';
let currentInterval = '15m';
let candleSeries = null;

// Initialize components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (authService.isAuthenticated()) {
    initTrading();
  }
});

/**
 * Initialize trading interface
 */
function initTrading() {
  // Initialize chart
  initChart();
  
  // Initialize market data service
  initMarketDataListeners();
  
  // Initialize order book
  updateOrderBook();
  
  // Initialize trading pairs dropdown
  initTradingPairs();
  
  // Initialize trade form
  initTradeForm();
  
  // Fetch trade history
  updateTradeHistory();
  
  // Initialize chart interval buttons
  initChartIntervals();
  
  // Initialize chart indicators
  initChartIndicators();
}

/**
 * Initialize trading chart
 */
function initChart() {
  // Get chart container
  const chartContainer = document.getElementById('trading-chart');
  
  if (!chartContainer) {
    console.error('Chart container not found');
    return;
  }
  
  // Create trading chart using lightweight-charts library
  tradingChart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
    layout: {
      background: { color: 'transparent' },
      textColor: '#d1d4dc',
    },
    grid: {
      vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
      horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    priceScale: {
      borderColor: 'rgba(197, 203, 206, 0.8)',
    },
    timeScale: {
      borderColor: 'rgba(197, 203, 206, 0.8)',
      timeVisible: true,
    },
    watermark: {
      visible: true,
      text: 'FINTRUSTEX',
      color: 'rgba(256, 256, 256, 0.1)',
      fontSize: 36,
      horzAlign: 'center',
      vertAlign: 'center',
    }
  });
  
  // Create candlestick series
  candleSeries = tradingChart.addCandlestickSeries({
    upColor: '#4bffb5',
    downColor: '#ff4976',
    borderDownColor: '#ff4976',
    borderUpColor: '#4bffb5',
    wickDownColor: '#838ca1',
    wickUpColor: '#838ca1',
  });
  
  // Set initial data
  loadChartData(currentSymbol, currentInterval);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (tradingChart) {
      tradingChart.resize(
        chartContainer.clientWidth,
        chartContainer.clientHeight
      );
    }
  });
}

/**
 * Initialize chart interval buttons
 */
function initChartIntervals() {
  const intervalButtons = document.querySelectorAll('.chart-interval-option');
  
  intervalButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Get interval from button data attribute
      const interval = button.getAttribute('data-interval');
      
      // Set active class
      intervalButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update current interval
      currentInterval = interval;
      
      // Load chart data for new interval
      loadChartData(currentSymbol, interval);
    });
  });
}

/**
 * Initialize chart indicators
 */
function initChartIndicators() {
  const indicatorButtons = document.querySelectorAll('.chart-indicator-option');
  
  indicatorButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Toggle active class
      button.classList.toggle('active');
      
      // Get indicator from button data attribute
      const indicator = button.getAttribute('data-indicator');
      
      // Toggle indicator
      toggleIndicator(indicator, button.classList.contains('active'));
    });
  });
}

/**
 * Toggle chart indicator
 * @param {string} indicator - Indicator name
 * @param {boolean} active - Whether to activate or deactivate
 */
function toggleIndicator(indicator, active) {
  if (!tradingChart || !candleSeries) return;
  
  switch (indicator) {
    case 'bollinger':
      toggleBollingerBands(active);
      break;
    case 'ma':
      toggleMovingAverage(active);
      break;
    case 'rsi':
      toggleRSI(active);
      break;
    default:
      console.warn(`Unknown indicator: ${indicator}`);
  }
}

// Store references to indicator series for toggling
let bollingerBands = null;
let movingAverage = null;
let rsiSeries = null;
let rsiPane = null;

/**
 * Toggle Bollinger Bands indicator
 * @param {boolean} active - Whether to activate or deactivate
 */
function toggleBollingerBands(active) {
  if (active && !bollingerBands) {
    // Create Bollinger Bands
    bollingerBands = candleSeries.createPriceLine({
      price: 0,
      color: 'rgba(255, 255, 255, 0.5)',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Solid,
      axisLabelVisible: true,
      title: 'BB',
    });
    
    // Calculate and update Bollinger Bands
    calculateBollingerBands();
  } else if (!active && bollingerBands) {
    // Remove Bollinger Bands
    candleSeries.removePriceLine(bollingerBands);
    bollingerBands = null;
  }
}

/**
 * Toggle Moving Average indicator
 * @param {boolean} active - Whether to activate or deactivate
 */
function toggleMovingAverage(active) {
  if (active && !movingAverage) {
    // Add Moving Average series
    movingAverage = tradingChart.addLineSeries({
      color: 'rgba(255, 152, 0, 1)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });
    
    // Calculate and update Moving Average
    calculateMovingAverage();
  } else if (!active && movingAverage) {
    // Remove Moving Average series
    tradingChart.removeSeries(movingAverage);
    movingAverage = null;
  }
}

/**
 * Toggle RSI indicator
 * @param {boolean} active - Whether to activate or deactivate
 */
function toggleRSI(active) {
  if (active && !rsiPane) {
    // Create RSI pane
    rsiPane = tradingChart.addPane({
      height: 80,
    });
    
    // Add RSI series
    rsiSeries = rsiPane.addLineSeries({
      color: 'rgba(76, 175, 80, 1)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });
    
    // Calculate and update RSI
    calculateRSI();
  } else if (!active && rsiPane) {
    // Remove RSI pane
    tradingChart.removePanes();
    rsiPane = null;
    rsiSeries = null;
  }
}

/**
 * Calculate Bollinger Bands
 * Simplified calculation for demonstration purposes
 */
function calculateBollingerBands() {
  // This is a simplified implementation
  // In a production app, use a proper technical analysis library
  if (!bollingerBands || !candleSeries) return;
  
  // Get current price
  const currentPrice = marketDataService.getCurrentPrice(currentSymbol);
  if (!currentPrice) return;
  
  // Set middle band to current price
  bollingerBands.applyOptions({
    price: currentPrice.price,
    title: 'BB (20, 2)',
  });
}

/**
 * Calculate Moving Average
 * Simplified calculation for demonstration purposes
 */
function calculateMovingAverage() {
  // This is a simplified implementation
  // In a production app, use a proper technical analysis library
  if (!movingAverage) return;
  
  // Get chart data
  marketDataService.getKlines(currentSymbol.replace('/', ''), currentInterval, 50)
    .then(klines => {
      if (!klines || !klines.length) return;
      
      // Calculate simple moving average (20 periods)
      const period = 20;
      const maData = [];
      
      for (let i = period - 1; i < klines.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += klines[i - j].close;
        }
        maData.push({
          time: klines[i].time,
          value: sum / period,
        });
      }
      
      // Update Moving Average series
      movingAverage.setData(maData);
    })
    .catch(error => {
      console.error('Failed to calculate MA:', error);
    });
}

/**
 * Calculate RSI (Relative Strength Index)
 * Simplified calculation for demonstration purposes
 */
function calculateRSI() {
  // This is a simplified implementation
  // In a production app, use a proper technical analysis library
  if (!rsiSeries) return;
  
  // Get chart data
  marketDataService.getKlines(currentSymbol.replace('/', ''), currentInterval, 50)
    .then(klines => {
      if (!klines || !klines.length) return;
      
      // Calculate RSI (14 periods)
      const period = 14;
      const rsiData = [];
      
      // Calculate price changes
      const changes = [];
      for (let i = 1; i < klines.length; i++) {
        changes.push(klines[i].close - klines[i - 1].close);
      }
      
      // Calculate RSI for each period
      for (let i = period; i < changes.length; i++) {
        let gains = 0;
        let losses = 0;
        
        // Sum gains and losses over the period
        for (let j = i - period; j < i; j++) {
          if (changes[j] >= 0) {
            gains += changes[j];
          } else {
            losses += Math.abs(changes[j]);
          }
        }
        
        // Calculate average gain and loss
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        // Calculate RS and RSI
        const rs = avgGain / (avgLoss === 0 ? 0.00001 : avgLoss); // Avoid division by zero
        const rsi = 100 - (100 / (1 + rs));
        
        rsiData.push({
          time: klines[i].time,
          value: rsi,
        });
      }
      
      // Update RSI series
      rsiSeries.setData(rsiData);
    })
    .catch(error => {
      console.error('Failed to calculate RSI:', error);
    });
}

/**
 * Load chart data for a symbol and interval
 * @param {string} symbol - Trading pair symbol
 * @param {string} interval - Chart interval
 */
function loadChartData(symbol, interval) {
  if (!candleSeries) return;
  
  // Format symbol for API call (remove slash)
  const apiSymbol = symbol.replace('/', '');
  
  // Show loading state
  document.getElementById('current-price').textContent = `${symbol}: Loading...`;
  
  // Load candlestick data
  marketDataService.getKlines(apiSymbol, interval)
    .then(klines => {
      if (!klines || !klines.length) {
        console.error('No klines data received');
        return;
      }
      
      // Update candlestick series
      candleSeries.setData(klines);
      
      // Update indicators if active
      if (bollingerBands) calculateBollingerBands();
      if (movingAverage) calculateMovingAverage();
      if (rsiSeries) calculateRSI();
      
      // Update price display
      updatePriceDisplay();
      
      // Automatically scroll to the right (latest data)
      tradingChart.timeScale().fitContent();
    })
    .catch(error => {
      console.error('Failed to load chart data:', error);
      document.getElementById('current-price').textContent = `${symbol}: Error loading data`;
    });
}

/**
 * Initialize market data listeners
 */
function initMarketDataListeners() {
  // Listen for price updates
  marketDataService.on('price', (data) => {
    updatePriceDisplay();
    
    // Update indicators if active
    if (bollingerBands) calculateBollingerBands();
  });
  
  // Listen for klines updates
  marketDataService.on('klines', (data) => {
    if (data.symbol.replace('USDT', '/USDT') !== currentSymbol) return;
    if (data.interval !== currentInterval) return;
    
    // Add new candle to the chart
    if (candleSeries && data.klines.length > 0) {
      const lastCandle = data.klines[data.klines.length - 1];
      candleSeries.update(lastCandle);
      
      // Update indicators if active
      if (bollingerBands) calculateBollingerBands();
      if (movingAverage) calculateMovingAverage();
      if (rsiSeries) calculateRSI();
    }
  });
  
  // Listen for order book updates
  marketDataService.on('orderBook', (data) => {
    if (data.symbol.replace('USDT', '/USDT') !== currentSymbol) return;
    
    // Update order book display
    updateOrderBookDisplay(data.orderBook);
  });
}

/**
 * Update price display
 */
function updatePriceDisplay() {
  const priceData = marketDataService.getCurrentPrice(currentSymbol);
  
  if (!priceData) {
    const fallbackPrice = marketDataService.getCurrentPrice('BTC/USDT');
    if (fallbackPrice) {
      document.getElementById('current-price').innerHTML = `
        ${currentSymbol}: No data available
      `;
    }
    return;
  }
  
  // Update current price header
  document.getElementById('current-price').innerHTML = `
    ${priceData.symbol}: ${utils.formatCurrency(priceData.price)} 
    <span class="${priceData.change >= 0 ? 'positive' : 'negative'}">
      ${utils.formatPercentage(priceData.change)}
    </span>
  `;
  
  // Update price input placeholder
  const priceInput = document.getElementById('price');
  if (priceInput) {
    priceInput.placeholder = `Price (current: ${utils.formatCurrency(priceData.price)})`;
  }
  
  // Update price stats
  if (priceData.high) {
    document.getElementById('high-price').textContent = utils.formatCurrency(priceData.high);
  }
  
  if (priceData.low) {
    document.getElementById('low-price').textContent = utils.formatCurrency(priceData.low);
  }
  
  if (priceData.volume) {
    document.getElementById('volume').textContent = utils.formatNumber(priceData.volume);
  }
}

/**
 * Initialize trading pairs dropdown
 */
function initTradingPairs() {
  const pairSelect = document.getElementById('pair');
  
  if (pairSelect) {
    pairSelect.addEventListener('change', (e) => {
      currentSymbol = e.target.value;
      
      // Load chart data for new symbol
      loadChartData(currentSymbol, currentInterval);
      
      // Update order book
      updateOrderBook();
    });
    
    // Set initial value
    pairSelect.value = currentSymbol;
  }
}

/**
 * Initialize trade form
 */
function initTradeForm() {
  const tradeForm = document.getElementById('trade-form');
  
  if (tradeForm) {
    tradeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Get form values
      const pair = document.getElementById('pair').value;
      const orderType = document.getElementById('order-type').value;
      const amount = parseFloat(document.getElementById('amount').value);
      const price = parseFloat(document.getElementById('price').value);
      
      // Validate form
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }
      
      if (orderType === 'limit' && (isNaN(price) || price <= 0)) {
        alert('Please enter a valid price for limit orders');
        return;
      }
      
      // Create order
      const orderData = {
        pair,
        type: 'buy',
        orderType,
        amount,
        price: orderType === 'market' ? null : price,
      };
      
      // Submit order
      submitOrder(orderData);
    });
    
    // Handle sell button click
    const sellButton = tradeForm.querySelector('button.btn-outline');
    if (sellButton) {
      sellButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Get form values
        const pair = document.getElementById('pair').value;
        const orderType = document.getElementById('order-type').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const price = parseFloat(document.getElementById('price').value);
        
        // Validate form
        if (isNaN(amount) || amount <= 0) {
          alert('Please enter a valid amount');
          return;
        }
        
        if (orderType === 'limit' && (isNaN(price) || price <= 0)) {
          alert('Please enter a valid price for limit orders');
          return;
        }
        
        // Create order
        const orderData = {
          pair,
          type: 'sell',
          orderType,
          amount,
          price: orderType === 'market' ? null : price,
        };
        
        // Submit order
        submitOrder(orderData);
      });
    }
    
    // Handle order type change
    const orderTypeSelect = document.getElementById('order-type');
    const priceInput = document.getElementById('price');
    
    if (orderTypeSelect && priceInput) {
      orderTypeSelect.addEventListener('change', (e) => {
        const orderType = e.target.value;
        
        // Disable price input for market orders
        if (orderType === 'market') {
          priceInput.disabled = true;
          priceInput.placeholder = 'Market price';
        } else {
          priceInput.disabled = false;
          
          // Update placeholder with current price
          const currentPrice = marketDataService.getCurrentPrice(currentSymbol);
          if (currentPrice) {
            priceInput.placeholder = `Price (current: ${utils.formatCurrency(currentPrice.price)})`;
          } else {
            priceInput.placeholder = 'Price';
          }
        }
      });
    }
  }
  
  // Initialize price alert form
  const alertForm = document.getElementById('price-alert-form');
  
  if (alertForm) {
    alertForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Get alert price
      const alertPrice = parseFloat(document.getElementById('alert-price').value);
      
      // Validate price
      if (isNaN(alertPrice) || alertPrice <= 0) {
        alert('Please enter a valid alert price');
        return;
      }
      
      // Set price alert
      setPriceAlert(currentSymbol, alertPrice);
    });
  }
}

/**
 * Submit order to API
 * @param {Object} orderData - Order data
 */
async function submitOrder(orderData) {
  try {
    // Show loading state
    const submitButton = document.querySelector('#trade-form button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Submit order to API
    const response = await api.createOrder(orderData);
    
    // Reset form
    document.getElementById('trade-form').reset();
    
    // Show success message
    alert(`Order submitted successfully. Order ID: ${response.id}`);
    
    // Update order book and trade history
    updateOrderBook();
    updateTradeHistory();
    
    // Reset button
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  } catch (error) {
    console.error('Failed to submit order:', error);
    
    // Show error message
    alert(`Failed to submit order: ${error.message}`);
    
    // Reset button
    const submitButton = document.querySelector('#trade-form button[type="submit"]');
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-shopping-cart"></i> Buy';
  }
}

/**
 * Update order book
 */
function updateOrderBook() {
  try {
    // Format symbol for API call (remove slash)
    const apiSymbol = currentSymbol.replace('/', '');
    
    // Get order book data
    marketDataService.getOrderBook(apiSymbol)
      .then(orderBook => {
        if (!orderBook) {
          document.getElementById('order-book').innerHTML = 'Order book data not available';
          return;
        }
        
        // Update order book display
        updateOrderBookDisplay(orderBook);
      })
      .catch(error => {
        console.error('Failed to fetch order book:', error);
        document.getElementById('order-book').innerHTML = 'Error loading order book';
      });
  } catch (error) {
    console.error('Error updating order book:', error);
  }
}

/**
 * Update order book display
 * @param {Object} orderBook - Order book data
 */
function updateOrderBookDisplay(orderBook) {
  const orderBookContainer = document.getElementById('order-book');
  
  if (!orderBookContainer) return;
  
  // Format and display order book
  let html = '<div class="order-book-header">';
  html += '<div class="price">Price</div>';
  html += '<div class="amount">Amount</div>';
  html += '<div class="total">Total</div>';
  html += '</div>';
  
  // Asks (sell orders) - displayed in descending order
  html += '<div class="asks">';
  if (orderBook.asks && orderBook.asks.length) {
    // Sort asks in ascending order (lowest ask price first)
    const sortedAsks = [...orderBook.asks].sort((a, b) => a[0] - b[0]);
    
    // Take up to 10 ask orders
    const displayAsks = sortedAsks.slice(0, 10);
    
    // Display asks
    for (const ask of displayAsks) {
      const price = parseFloat(ask[0]);
      const amount = parseFloat(ask[1]);
      const total = price * amount;
      
      html += '<div class="order-row ask-row">';
      html += `<div class="price ask-price">${utils.formatCurrency(price)}</div>`;
      html += `<div class="amount">${utils.formatNumber(amount)}</div>`;
      html += `<div class="total">${utils.formatCurrency(total)}</div>`;
      html += '</div>';
    }
  } else {
    html += '<div class="no-orders">No ask orders</div>';
  }
  html += '</div>';
  
  // Spread
  const lowestAsk = orderBook.asks && orderBook.asks.length ? Math.min(...orderBook.asks.map(a => parseFloat(a[0]))) : 0;
  const highestBid = orderBook.bids && orderBook.bids.length ? Math.max(...orderBook.bids.map(b => parseFloat(b[0]))) : 0;
  const spread = lowestAsk - highestBid;
  const spreadPercent = (lowestAsk > 0) ? (spread / lowestAsk) * 100 : 0;
  
  html += '<div class="spread">';
  html += `<div>Spread: ${utils.formatCurrency(spread)} (${utils.formatPercentage(spreadPercent)})</div>`;
  html += '</div>';
  
  // Bids (buy orders) - displayed in descending order
  html += '<div class="bids">';
  if (orderBook.bids && orderBook.bids.length) {
    // Sort bids in descending order (highest bid price first)
    const sortedBids = [...orderBook.bids].sort((a, b) => b[0] - a[0]);
    
    // Take up to 10 bid orders
    const displayBids = sortedBids.slice(0, 10);
    
    // Display bids
    for (const bid of displayBids) {
      const price = parseFloat(bid[0]);
      const amount = parseFloat(bid[1]);
      const total = price * amount;
      
      html += '<div class="order-row bid-row">';
      html += `<div class="price bid-price">${utils.formatCurrency(price)}</div>`;
      html += `<div class="amount">${utils.formatNumber(amount)}</div>`;
      html += `<div class="total">${utils.formatCurrency(total)}</div>`;
      html += '</div>';
    }
  } else {
    html += '<div class="no-orders">No bid orders</div>';
  }
  html += '</div>';
  
  // Update container
  orderBookContainer.innerHTML = html;
}

/**
 * Update trade history
 */
async function updateTradeHistory() {
  try {
    // Get trade history from API
    const trades = await api.getTradeHistory();
    
    // Update trade history display
    const tradeHistoryContainer = document.getElementById('trade-history');
    
    if (!tradeHistoryContainer) return;
    
    if (!trades || !trades.length) {
      tradeHistoryContainer.innerHTML = 'No trades yet';
      return;
    }
    
    // Format and display trades
    let html = '';
    
    for (const trade of trades) {
      const date = new Date(trade.timestamp).toLocaleDateString();
      const type = trade.type === 'buy' ? 'Bought' : 'Sold';
      const amount = trade.amount;
      const price = trade.price;
      const total = amount * price;
      
      html += `<div class="trade-row ${trade.type}-row">`;
      html += `<div class="trade-date">${date}</div>`;
      html += `<div class="trade-type">${type}</div>`;
      html += `<div class="trade-amount">${amount} ${trade.pair.split('/')[0]}</div>`;
      html += `<div class="trade-price">@ ${utils.formatCurrency(price)}</div>`;
      html += `<div class="trade-total">${utils.formatCurrency(total)}</div>`;
      html += '</div>';
    }
    
    // Update container
    tradeHistoryContainer.innerHTML = html;
  } catch (error) {
    console.error('Failed to fetch trade history:', error);
    
    const tradeHistoryContainer = document.getElementById('trade-history');
    if (tradeHistoryContainer) {
      tradeHistoryContainer.innerHTML = 'Error loading trade history';
    }
  }
}

/**
 * Set price alert
 * @param {string} symbol - Trading pair symbol
 * @param {number} price - Alert price
 */
function setPriceAlert(symbol, price) {
  try {
    // Create alert
    const alert = {
      symbol,
      price,
      timestamp: new Date().toISOString(),
    };
    
    // Store alert in local storage
    const alerts = JSON.parse(localStorage.getItem('priceAlerts') || '[]');
    alerts.push(alert);
    localStorage.setItem('priceAlerts', JSON.stringify(alerts));
    
    // Show success message
    alert(`Price alert set for ${symbol} at ${utils.formatCurrency(price)}`);
    
    // Reset form
    document.getElementById('price-alert-form').reset();
    
    // Start checking for alerts if not already
    startAlertChecker();
  } catch (error) {
    console.error('Failed to set price alert:', error);
    alert(`Failed to set price alert: ${error.message}`);
  }
}

// Alert checker interval reference
let alertCheckerInterval = null;

/**
 * Start price alert checker
 */
function startAlertChecker() {
  if (alertCheckerInterval) return;
  
  // Check for alerts every 5 seconds
  alertCheckerInterval = setInterval(checkPriceAlerts, 5000);
}

/**
 * Check for triggered price alerts
 */
function checkPriceAlerts() {
  try {
    // Get alerts from local storage
    const alerts = JSON.parse(localStorage.getItem('priceAlerts') || '[]');
    
    if (!alerts.length) {
      clearInterval(alertCheckerInterval);
      alertCheckerInterval = null;
      return;
    }
    
    // Get current prices
    const prices = marketDataService.getAllPrices();
    
    // Check each alert
    const triggeredAlerts = [];
    const remainingAlerts = [];
    
    for (const alert of alerts) {
      // Check if price is available for this symbol
      if (prices[alert.symbol]) {
        const currentPrice = prices[alert.symbol].price;
        
        // Check if alert is triggered
        const alertPrice = parseFloat(alert.price);
        const isTriggered = alertPrice >= currentPrice;
        
        if (isTriggered) {
          triggeredAlerts.push(alert);
        } else {
          remainingAlerts.push(alert);
        }
      } else {
        // Keep alerts for symbols with no price data
        remainingAlerts.push(alert);
      }
    }
    
    // Update alerts in local storage
    localStorage.setItem('priceAlerts', JSON.stringify(remainingAlerts));
    
    // Notify for triggered alerts
    for (const alert of triggeredAlerts) {
      notifyPriceAlert(alert);
    }
    
    // Stop checker if no alerts remaining
    if (!remainingAlerts.length) {
      clearInterval(alertCheckerInterval);
      alertCheckerInterval = null;
    }
  } catch (error) {
    console.error('Error checking price alerts:', error);
  }
}

/**
 * Notify the user about a triggered price alert
 * @param {Object} alert - Price alert object
 */
function notifyPriceAlert(alert) {
  // Show alert
  const currentPrice = marketDataService.getCurrentPrice(alert.symbol)?.price || 'unknown';
  
  alert(`Price Alert: ${alert.symbol} has reached ${utils.formatCurrency(alert.price)}. Current price: ${utils.formatCurrency(currentPrice)}`);
  
  // Play sound if available
  const audio = new Audio('../../assets/sounds/alert.mp3');
  audio.play().catch(e => console.error('Failed to play alert sound:', e));
}

// Export functions for external use
window.tradingModule = {
  initTrading,
  loadChartData,
  updateOrderBook,
  updateTradeHistory,
};