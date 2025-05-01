/**
 * FinTrustEX Trading Interface
 * Handles trading charts, order book, and order placement
 * Maintains consistent yellow/black theme across the application
 */

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
  // Initialize trading components
  initTradingPairSelector();
  initTradingChart();
  initOrderForms();
  initOrderTabs();
  initSlider();
  initOrderBookDisplay();
  initTradeHistory();
  initChartIntervalButtons();
  initChartIndicatorButtons();
  
  // Connect to WebSocket for real-time updates
  initWebSocketConnection();
  
  // Load user wallet data
  loadUserWalletData();
});

/**
 * Initialize the trading pair selector dropdown
 */
function initTradingPairSelector() {
  const pairSelector = document.getElementById('pair');
  if (!pairSelector) return;
  
  pairSelector.addEventListener('change', function() {
    const selectedPair = this.value;
    updateTradingPair(selectedPair);
  });
}

/**
 * Update all UI elements when trading pair changes
 */
function updateTradingPair(pair) {
  // Update header
  const currentPriceEl = document.querySelector('#current-price');
  if (currentPriceEl) {
    currentPriceEl.innerHTML = `${pair}: <span class="price-value">Loading...</span>`;
  }
  
  // Update chart
  loadChartData(pair);
  
  // Update order book
  fetchOrderBook(pair);
  
  // Update form labels for selected pair
  const [base, quote] = pair.split('/');
  
  const amountLabel = document.querySelector('.input-label:nth-of-type(1)');
  if (amountLabel) amountLabel.textContent = base;
  
  const priceLabel = document.querySelector('.input-label:nth-of-type(2)');
  if (priceLabel) priceLabel.textContent = quote;
  
  // Update buttons
  const buyButton = document.getElementById('buy-button');
  if (buyButton) buyButton.textContent = `Buy ${base}`;
  
  const sellButton = document.getElementById('sell-button'); 
  if (sellButton) sellButton.textContent = `Sell ${base}`;
  
  // Update available balance
  updateAvailableBalance(pair);
}

/**
 * Initialize the trading chart
 */
function initTradingChart() {
  const chartContainer = document.getElementById('trading-chart');
  if (!chartContainer) return;
  
  // Create chart using lightweight-charts
  const chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: 450,
    layout: {
      background: { type: 'solid', color: '#1a1a1a' },
      textColor: '#d1d4dc',
    },
    grid: {
      vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
      horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    rightPriceScale: {
      borderColor: 'rgba(197, 203, 206, 0.4)',
    },
    timeScale: {
      borderColor: 'rgba(197, 203, 206, 0.4)',
      timeVisible: true,
    },
    watermark: {
      visible: true,
      fontSize: 36,
      horzAlign: 'center',
      vertAlign: 'center',
      color: 'rgba(247, 201, 72, 0.1)',
      text: 'FINTRUSTEX',
    },
  });
  
  // Create candlestick series with yellow/black theme
  const candleSeries = chart.addCandlestickSeries({
    upColor: '#f7c948',
    downColor: '#000000',
    borderUpColor: '#f7c948',
    borderDownColor: '#000000',
    wickUpColor: 'rgba(247, 201, 72, 0.5)',
    wickDownColor: 'rgba(255, 255, 255, 0.3)',
  });
  
  // Add example data
  const exampleData = generateExampleCandlestickData();
  candleSeries.setData(exampleData);
  
  // Resize handler
  window.addEventListener('resize', () => {
    chart.resize(chartContainer.clientWidth, 450);
  });
  
  // Store chart reference for later use
  window.tradingChart = chart;
  window.candleSeries = candleSeries;
}

/**
 * Initialize the order form tabs (buy/sell)
 */
function initOrderTabs() {
  const buyTab = document.querySelector('.trade-tab.buy');
  const sellTab = document.querySelector('.trade-tab.sell');
  const buyButtons = document.getElementById('buy-buttons');
  const sellButtons = document.getElementById('sell-buttons');
  
  if (!buyTab || !sellTab || !buyButtons || !sellButtons) return;
  
  buyTab.addEventListener('click', function() {
    // Update active state
    buyTab.classList.add('active');
    sellTab.classList.remove('active');
    
    // Show buy buttons, hide sell buttons
    buyButtons.style.display = 'grid';
    sellButtons.style.display = 'none';
  });
  
  sellTab.addEventListener('click', function() {
    // Update active state
    sellTab.classList.add('active');
    buyTab.classList.remove('active');
    
    // Show sell buttons, hide buy buttons
    sellButtons.style.display = 'grid';
    buyButtons.style.display = 'none';
  });
}

/**
 * Initialize the amount slider for percentage-based trading
 */
function initSlider() {
  const slider = document.getElementById('amount-slider');
  const amountInput = document.getElementById('amount');
  
  if (!slider || !amountInput) return;
  
  slider.addEventListener('input', function() {
    // Update amount based on slider value (percentage of available balance)
    const percentage = parseInt(this.value);
    
    // Get available balance
    const availableBalanceEl = document.getElementById('available-balance');
    if (!availableBalanceEl) return;
    
    const availableBalanceText = availableBalanceEl.textContent;
    const balanceParts = availableBalanceText.split(' ');
    if (balanceParts.length < 2) return;
    
    const availableBalance = parseFloat(balanceParts[0]);
    if (isNaN(availableBalance)) return;
    
    // Calculate amount based on percentage
    const amount = (availableBalance * percentage / 100).toFixed(6);
    amountInput.value = amount;
    
    // Trigger input event to update other dependent values
    amountInput.dispatchEvent(new Event('input'));
  });
}

/**
 * Initialize the order forms and calculations
 */
function initOrderForms() {
  const tradeForm = document.getElementById('trade-form');
  const amountInput = document.getElementById('amount');
  const priceInput = document.getElementById('price');
  const orderTypeSelect = document.getElementById('order-type');
  
  if (!tradeForm || !amountInput || !priceInput || !orderTypeSelect) return;
  
  // Handle order type change
  orderTypeSelect.addEventListener('change', function() {
    const orderType = this.value;
    
    // Disable price input for market orders
    if (orderType === 'market') {
      priceInput.disabled = true;
      priceInput.placeholder = 'Market Price';
    } else {
      priceInput.disabled = false;
      
      // Get current price for the selected pair
      const pair = document.getElementById('pair').value;
      const currentPrice = getCurrentPrice(pair);
      
      priceInput.placeholder = currentPrice ? `Current: ${currentPrice}` : 'Limit Price';
    }
    
    // Update order summary
    updateOrderSummary();
  });
  
  // Handle amount and price input changes
  amountInput.addEventListener('input', updateOrderSummary);
  priceInput.addEventListener('input', updateOrderSummary);
  
  // Handle form submission
  tradeForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get active tab
    const buyTab = document.querySelector('.trade-tab.buy');
    const orderType = orderTypeSelect.value;
    const pair = document.getElementById('pair').value;
    const amount = parseFloat(amountInput.value);
    const price = parseFloat(priceInput.value);
    
    // Validate inputs
    if (isNaN(amount) || amount <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }
    
    if (orderType !== 'market' && (isNaN(price) || price <= 0)) {
      showNotification('Please enter a valid price', 'error');
      return;
    }
    
    // Create order object
    const order = {
      pair,
      type: buyTab.classList.contains('active') ? 'buy' : 'sell',
      orderType,
      amount,
      price: orderType === 'market' ? null : price,
    };
    
    // Submit order
    submitOrder(order);
  });
}

/**
 * Update the order summary calculations
 */
function updateOrderSummary() {
  const amountInput = document.getElementById('amount');
  const priceInput = document.getElementById('price');
  const orderTypeSelect = document.getElementById('order-type');
  const orderValueEl = document.getElementById('order-value');
  const tradingFeeEl = document.getElementById('trading-fee');
  
  if (!amountInput || !priceInput || !orderTypeSelect || !orderValueEl || !tradingFeeEl) return;
  
  const amount = parseFloat(amountInput.value) || 0;
  const price = parseFloat(priceInput.value) || 0;
  const orderType = orderTypeSelect.value;
  const pair = document.getElementById('pair').value;
  
  // Get price based on order type
  let orderPrice = price;
  if (orderType === 'market') {
    // Use current market price for market orders
    orderPrice = getCurrentPrice(pair) || 0;
  }
  
  // Calculate order value
  const orderValue = amount * orderPrice;
  
  // Calculate trading fee (0.1% example fee)
  const tradingFee = orderValue * 0.001;
  
  // Update display
  const [base, quote] = pair.split('/');
  orderValueEl.textContent = `${orderValue.toFixed(2)} ${quote}`;
  tradingFeeEl.textContent = `${tradingFee.toFixed(2)} ${quote}`;
}

/**
 * Submit an order to the API
 */
function submitOrder(order) {
  // Show loading state
  showNotification('Processing your order...', 'info');
  
  // Example API call
  fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(order),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to place order');
      }
      return response.json();
    })
    .then(data => {
      // Show success notification
      showNotification(`${order.type === 'buy' ? 'Buy' : 'Sell'} order placed successfully!`, 'success');
      
      // Reset form
      document.getElementById('amount').value = '';
      document.getElementById('price').value = '';
      document.getElementById('amount-slider').value = 0;
      
      // Update order book and trade history
      fetchOrderBook(order.pair);
      fetchTradeHistory(order.pair);
      
      // Update user balance
      loadUserWalletData();
    })
    .catch(error => {
      console.error('Order submission error:', error);
      showNotification('Failed to place order. Please try again.', 'error');
    });
}

/**
 * Initialize chart interval buttons
 */
function initChartIntervalButtons() {
  const intervalButtons = document.querySelectorAll('.chart-interval-option');
  
  intervalButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Update active state
      intervalButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Get interval
      const interval = this.getAttribute('data-interval');
      
      // Get current pair
      const pair = document.getElementById('pair').value;
      
      // Load chart data for selected interval
      loadChartData(pair, interval);
    });
  });
}

/**
 * Initialize chart indicator buttons
 */
function initChartIndicatorButtons() {
  const indicatorButtons = document.querySelectorAll('.chart-indicator-option');
  
  indicatorButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Toggle active state
      this.classList.toggle('active');
      
      // Get indicator type
      const indicator = this.getAttribute('data-indicator');
      
      // Toggle indicator on chart
      toggleChartIndicator(indicator, this.classList.contains('active'));
    });
  });
}

/**
 * Toggle a technical indicator on the chart
 */
function toggleChartIndicator(indicator, isActive) {
  if (!window.tradingChart) return;
  
  // Example indicator implementation
  switch (indicator) {
    case 'bollinger':
      toggleBollingerBands(isActive);
      break;
    case 'ma':
      toggleMovingAverage(isActive);
      break;
    case 'rsi':
      toggleRSI(isActive);
      break;
    case 'volume':
      toggleVolumeIndicator(isActive);
      break;
  }
}

/**
 * Initialize order book display
 */
function initOrderBookDisplay() {
  // Initial fetch for current pair
  const pair = document.getElementById('pair').value;
  fetchOrderBook(pair);
}

/**
 * Fetch order book data from API
 */
function fetchOrderBook(pair) {
  // Clear existing order book
  const askOrdersEl = document.getElementById('ask-orders');
  const bidOrdersEl = document.getElementById('bid-orders');
  
  if (!askOrdersEl || !bidOrdersEl) return;
  
  // Replace with actual API calls
  fetch(`/api/orderbook?symbol=${pair.replace('/', '')}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch order book');
      }
      return response.json();
    })
    .then(data => {
      updateOrderBookDisplay(data);
    })
    .catch(error => {
      console.error('Order book fetch error:', error);
      // Use example data in case of error
      updateOrderBookDisplay(generateExampleOrderBook(pair));
    });
}

/**
 * Update the order book display with provided data
 */
function updateOrderBookDisplay(data) {
  const askOrdersEl = document.getElementById('ask-orders');
  const bidOrdersEl = document.getElementById('bid-orders');
  const spreadEl = document.getElementById('market-spread');
  const spreadValueEl = document.getElementById('market-spread-value');
  
  if (!askOrdersEl || !bidOrdersEl || !spreadEl || !spreadValueEl) return;
  
  // Empty containers
  askOrdersEl.innerHTML = '';
  bidOrdersEl.innerHTML = '';
  
  // Add ask orders (sells)
  if (data.asks && data.asks.length > 0) {
    // Sort asks from lowest to highest
    const sortedAsks = [...data.asks].sort((a, b) => a.price - b.price);
    
    sortedAsks.slice(0, 10).forEach(ask => {
      const row = document.createElement('div');
      row.className = 'order-book-row sell';
      
      row.innerHTML = `
        <div class="order-book-price">${formatPrice(ask.price)}</div>
        <div class="order-book-amount">${formatAmount(ask.amount)}</div>
        <div class="order-book-total">${formatPrice(ask.price * ask.amount)}</div>
      `;
      
      askOrdersEl.appendChild(row);
    });
  }
  
  // Add bid orders (buys)
  if (data.bids && data.bids.length > 0) {
    // Sort bids from highest to lowest
    const sortedBids = [...data.bids].sort((a, b) => b.price - a.price);
    
    sortedBids.slice(0, 10).forEach(bid => {
      const row = document.createElement('div');
      row.className = 'order-book-row buy';
      
      row.innerHTML = `
        <div class="order-book-price">${formatPrice(bid.price)}</div>
        <div class="order-book-amount">${formatAmount(bid.amount)}</div>
        <div class="order-book-total">${formatPrice(bid.price * bid.amount)}</div>
      `;
      
      bidOrdersEl.appendChild(row);
    });
  }
  
  // Calculate and display spread
  if (data.asks && data.asks.length > 0 && data.bids && data.bids.length > 0) {
    const lowestAsk = Math.min(...data.asks.map(ask => ask.price));
    const highestBid = Math.max(...data.bids.map(bid => bid.price));
    
    const spread = lowestAsk - highestBid;
    const spreadPercentage = (spread / lowestAsk) * 100;
    
    spreadEl.textContent = spreadPercentage.toFixed(2) + '%';
    spreadValueEl.textContent = spread.toFixed(2);
  }
}

/**
 * Initialize trade history display
 */
function initTradeHistory() {
  // Initial fetch for current pair
  const pair = document.getElementById('pair').value;
  fetchTradeHistory(pair);
}

/**
 * Fetch trade history from API
 */
function fetchTradeHistory(pair) {
  // Clear existing trade history
  const tradeHistoryEl = document.getElementById('trade-history');
  
  if (!tradeHistoryEl) return;
  
  // Replace with actual API calls
  fetch(`/api/trades?symbol=${pair.replace('/', '')}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch trade history');
      }
      return response.json();
    })
    .then(data => {
      updateTradeHistoryDisplay(data);
    })
    .catch(error => {
      console.error('Trade history fetch error:', error);
      // Use example data in case of error
      updateTradeHistoryDisplay(generateExampleTradeHistory(pair));
    });
}

/**
 * Update the trade history display with provided data
 */
function updateTradeHistoryDisplay(data) {
  const tradeHistoryEl = document.getElementById('trade-history');
  
  if (!tradeHistoryEl) return;
  
  // Empty container
  tradeHistoryEl.innerHTML = '';
  
  // Add trades
  if (data.trades && data.trades.length > 0) {
    data.trades.slice(0, 20).forEach(trade => {
      const row = document.createElement('div');
      row.className = 'trade-history-row';
      
      row.innerHTML = `
        <div class="trade-history-price ${trade.side}">${formatPrice(trade.price)}</div>
        <div class="trade-history-amount">${formatAmount(trade.amount)}</div>
        <div class="trade-history-time">${formatTime(trade.time)}</div>
      `;
      
      tradeHistoryEl.appendChild(row);
    });
  }
}

/**
 * Load user wallet data
 */
function loadUserWalletData() {
  // Get selected pair
  const pair = document.getElementById('pair').value;
  updateAvailableBalance(pair);
}

/**
 * Update the available balance display for the current trading pair
 */
function updateAvailableBalance(pair) {
  const availableBalanceEl = document.getElementById('available-balance');
  
  if (!availableBalanceEl) return;
  
  // Extract quote currency from pair (e.g., USDT from BTC/USDT)
  const [base, quote] = pair.split('/');
  
  // Fetch user balances
  fetch('/api/wallet/balances')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch balances');
      }
      return response.json();
    })
    .then(data => {
      // Find balance for quote currency
      const quoteBalance = data.balances.find(b => b.currency === quote);
      
      if (quoteBalance) {
        availableBalanceEl.textContent = `${parseFloat(quoteBalance.available).toFixed(2)} ${quote}`;
      } else {
        availableBalanceEl.textContent = `0.00 ${quote}`;
      }
    })
    .catch(error => {
      console.error('Balance fetch error:', error);
      availableBalanceEl.textContent = `0.00 ${quote}`;
    });
}

/**
 * Initialize WebSocket connection for real-time updates
 */
function initWebSocketConnection() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  const socket = new WebSocket(wsUrl);
  
  socket.onopen = function() {
    console.log('WebSocket connection established');
    
    // Subscribe to channels
    const pair = document.getElementById('pair').value;
    socket.send(JSON.stringify({
      type: 'subscribe',
      channels: ['ticker', 'orderbook', 'trades'],
      pairs: [pair.replace('/', '')]
    }));
  };
  
  socket.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'ticker':
          handleTickerUpdate(data);
          break;
        case 'orderbook':
          handleOrderBookUpdate(data);
          break;
        case 'trade':
          handleTradeUpdate(data);
          break;
        case 'candle':
          handleCandleUpdate(data);
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  };
  
  socket.onclose = function() {
    console.log('WebSocket connection closed');
    
    // Reconnect after delay
    setTimeout(initWebSocketConnection, 5000);
  };
  
  socket.onerror = function(error) {
    console.error('WebSocket error:', error);
  };
  
  // Store socket reference for later use
  window.tradingSocket = socket;
}

/**
 * Handle ticker updates from WebSocket
 */
function handleTickerUpdate(data) {
  // Update price display
  const currentPriceEl = document.querySelector('#current-price');
  const priceValueEl = document.querySelector('#current-price .price-value');
  const priceChangeEl = document.querySelector('#current-price .price-change');
  
  if (priceValueEl && data.price) {
    priceValueEl.textContent = formatPrice(data.price);
  }
  
  if (priceChangeEl && data.change !== undefined) {
    const changeClass = data.change >= 0 ? 'positive' : 'negative';
    priceChangeEl.textContent = (data.change >= 0 ? '+' : '') + data.change.toFixed(2) + '%';
    priceChangeEl.className = 'price-change ' + changeClass;
  }
  
  // Update high, low, volume
  if (data.high) {
    document.getElementById('high-price').textContent = formatPrice(data.high);
  }
  
  if (data.low) {
    document.getElementById('low-price').textContent = formatPrice(data.low);
  }
  
  if (data.volume) {
    document.getElementById('volume').textContent = formatAmount(data.volume);
  }
  
  if (data.change) {
    document.getElementById('price-change-24h').textContent = (data.change >= 0 ? '+' : '') + data.change.toFixed(2) + '%';
    document.getElementById('price-change-24h').className = data.change >= 0 ? 'stat-value positive' : 'stat-value negative';
  }
  
  // Update price input placeholder
  updateOrderSummary();
}

/**
 * Handle order book updates from WebSocket
 */
function handleOrderBookUpdate(data) {
  updateOrderBookDisplay(data);
}

/**
 * Handle trade updates from WebSocket
 */
function handleTradeUpdate(data) {
  const tradeHistoryEl = document.getElementById('trade-history');
  
  if (!tradeHistoryEl) return;
  
  // Add new trade to top of list
  const row = document.createElement('div');
  row.className = 'trade-history-row';
  
  row.innerHTML = `
    <div class="trade-history-price ${data.side}">${formatPrice(data.price)}</div>
    <div class="trade-history-amount">${formatAmount(data.amount)}</div>
    <div class="trade-history-time">${formatTime(data.time || new Date())}</div>
  `;
  
  // Add to top of list
  if (tradeHistoryEl.firstChild) {
    tradeHistoryEl.insertBefore(row, tradeHistoryEl.firstChild);
  } else {
    tradeHistoryEl.appendChild(row);
  }
  
  // Remove oldest if over 20
  const children = tradeHistoryEl.children;
  if (children.length > 20) {
    tradeHistoryEl.removeChild(children[children.length - 1]);
  }
}

/**
 * Handle candle updates from WebSocket
 */
function handleCandleUpdate(data) {
  if (!window.candleSeries) return;
  
  // Update last candle or add new one
  window.candleSeries.update(data);
}

/**
 * Load chart data for a specific pair and interval
 */
function loadChartData(pair, interval = '15m') {
  if (!window.candleSeries) return;
  
  // Replace with actual API calls
  fetch(`/api/klines?symbol=${pair.replace('/', '')}&interval=${interval}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }
      return response.json();
    })
    .then(data => {
      if (data.klines && data.klines.length > 0) {
        window.candleSeries.setData(data.klines);
      }
    })
    .catch(error => {
      console.error('Chart data fetch error:', error);
      // Use example data if API fails
      window.candleSeries.setData(generateExampleCandlestickData());
    });
}

// Utility functions

/**
 * Get current price for a trading pair
 */
function getCurrentPrice(pair) {
  // In a real app, this would come from a global state or market data service
  // For demo, return example price
  switch (pair) {
    case 'BTC/USDT':
      return 43950.25;
    case 'ETH/USDT':
      return 2380.50;
    case 'LTC/USDT':
      return 82.75;
    case 'ADA/USDT':
      return 0.45;
    case 'XRP/USDT':
      return 0.52;
    default:
      return null;
  }
}

/**
 * Format price for display
 */
function formatPrice(price) {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format amount for display
 */
function formatAmount(amount) {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 8
  });
}

/**
 * Format time for display
 */
function formatTime(time) {
  if (typeof time === 'string') {
    time = new Date(time);
  }
  
  return time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after delay
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

/**
 * Generate example candlestick data for demo
 */
function generateExampleCandlestickData() {
  const basePrice = 43950;
  const now = new Date();
  const data = [];
  
  // Generate 100 example candles
  for (let i = 0; i < 100; i++) {
    const time = new Date(now);
    time.setMinutes(now.getMinutes() - (100 - i) * 15);
    
    // Random price changes following a yellow/black theme
    const delta = (Math.random() - 0.4) * 100;
    const open = basePrice + delta;
    let close, high, low;
    
    if (Math.random() > 0.4) {
      // Upward candle
      close = open + Math.random() * 50;
      high = close + Math.random() * 20;
      low = open - Math.random() * 20;
    } else {
      // Downward candle
      close = open - Math.random() * 50;
      high = open + Math.random() * 20;
      low = close - Math.random() * 20;
    }
    
    data.push({
      time: Math.floor(time.getTime() / 1000),
      open: open,
      high: high,
      low: low,
      close: close
    });
  }
  
  return data;
}

/**
 * Generate example order book data for demo
 */
function generateExampleOrderBook(pair) {
  let basePrice;
  switch (pair) {
    case 'BTC/USDT':
      basePrice = 43950;
      break;
    case 'ETH/USDT':
      basePrice = 2380;
      break;
    case 'LTC/USDT':
      basePrice = 82;
      break;
    case 'ADA/USDT':
      basePrice = 0.45;
      break;
    case 'XRP/USDT':
      basePrice = 0.52;
      break;
    default:
      basePrice = 1000;
  }
  
  const asks = [];
  const bids = [];
  
  // Generate asks (sell orders)
  for (let i = 1; i <= 10; i++) {
    const price = basePrice + (i * basePrice * 0.0005);
    const amount = Math.random() * 2;
    
    asks.push({
      price,
      amount
    });
  }
  
  // Generate bids (buy orders)
  for (let i = 1; i <= 10; i++) {
    const price = basePrice - (i * basePrice * 0.0005);
    const amount = Math.random() * 2;
    
    bids.push({
      price,
      amount
    });
  }
  
  return {
    asks,
    bids
  };
}

/**
 * Generate example trade history data for demo
 */
function generateExampleTradeHistory(pair) {
  let basePrice;
  switch (pair) {
    case 'BTC/USDT':
      basePrice = 43950;
      break;
    case 'ETH/USDT':
      basePrice = 2380;
      break;
    case 'LTC/USDT':
      basePrice = 82;
      break;
    case 'ADA/USDT':
      basePrice = 0.45;
      break;
    case 'XRP/USDT':
      basePrice = 0.52;
      break;
    default:
      basePrice = 1000;
  }
  
  const trades = [];
  const now = new Date();
  
  // Generate trades
  for (let i = 0; i < 20; i++) {
    const time = new Date(now);
    time.setSeconds(now.getSeconds() - i * 15);
    
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const price = basePrice + (Math.random() - 0.5) * basePrice * 0.002;
    const amount = Math.random() * 0.5;
    
    trades.push({
      price,
      amount,
      side,
      time
    });
  }
  
  return {
    trades
  };
}

// Technical indicator implementations

/**
 * Toggle Bollinger Bands indicator
 */
let bollingerSeries = null;
function toggleBollingerBands(isActive) {
  if (!window.tradingChart || !window.candleSeries) return;
  
  if (isActive && !bollingerSeries) {
    // Create Bollinger Bands series
    bollingerSeries = window.tradingChart.addLineSeries({
      color: 'rgba(247, 201, 72, 0.5)',
      lineWidth: 1,
      priceLineVisible: false,
    });
    
    // Generate example Bollinger Bands data
    const data = window.candleSeries.data();
    if (!data || data.length === 0) return;
    
    const period = 20;
    const stdDevMultiplier = 2;
    const bands = [];
    
    // Very simplified BB calculation
    for (let i = period - 1; i < data.length; i++) {
      // Calculate SMA
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      const sma = sum / period;
      
      // Calculate standard deviation
      let sumSquaredDiff = 0;
      for (let j = 0; j < period; j++) {
        const diff = data[i - j].close - sma;
        sumSquaredDiff += diff * diff;
      }
      const stdDev = Math.sqrt(sumSquaredDiff / period);
      
      // Upper and lower bands
      const upper = sma + (stdDev * stdDevMultiplier);
      const lower = sma - (stdDev * stdDevMultiplier);
      
      bands.push({
        time: data[i].time,
        value: upper
      });
    }
    
    bollingerSeries.setData(bands);
  } else if (!isActive && bollingerSeries) {
    // Remove series
    window.tradingChart.removeSeries(bollingerSeries);
    bollingerSeries = null;
  }
}

/**
 * Toggle Moving Average indicator
 */
let maSeries = null;
function toggleMovingAverage(isActive) {
  if (!window.tradingChart || !window.candleSeries) return;
  
  if (isActive && !maSeries) {
    // Create MA series
    maSeries = window.tradingChart.addLineSeries({
      color: 'rgba(247, 201, 72, 0.9)',
      lineWidth: 2,
      priceLineVisible: false,
    });
    
    // Generate example MA data
    const data = window.candleSeries.data();
    if (!data || data.length === 0) return;
    
    const period = 20;
    const maData = [];
    
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      
      maData.push({
        time: data[i].time,
        value: sum / period
      });
    }
    
    maSeries.setData(maData);
  } else if (!isActive && maSeries) {
    // Remove series
    window.tradingChart.removeSeries(maSeries);
    maSeries = null;
  }
}

/**
 * Toggle RSI indicator
 */
let rsiSeries = null;
let rsiPane = null;
function toggleRSI(isActive) {
  if (!window.tradingChart || !window.candleSeries) return;
  
  if (isActive && !rsiPane) {
    // Create RSI pane
    rsiPane = window.tradingChart.addPane({
      height: 80,
    });
    
    // Create RSI series
    rsiSeries = rsiPane.addLineSeries({
      color: 'rgba(247, 201, 72, 0.9)',
      lineWidth: 2,
      priceLineVisible: false,
    });
    
    // Generate example RSI data
    const data = window.candleSeries.data();
    if (!data || data.length === 0) return;
    
    const period = 14;
    const rsiData = [];
    
    // Simplified RSI calculation
    for (let i = period; i < data.length; i++) {
      let gainSum = 0;
      let lossSum = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        const change = data[j].close - data[j - 1].close;
        if (change >= 0) {
          gainSum += change;
        } else {
          lossSum += Math.abs(change);
        }
      }
      
      const avgGain = gainSum / period;
      const avgLoss = lossSum / period;
      
      // Calculate RSI
      let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
      let rsi = 100 - (100 / (1 + rs));
      
      rsiData.push({
        time: data[i].time,
        value: rsi
      });
    }
    
    rsiSeries.setData(rsiData);
    
    // Add RSI levels
    rsiPane.addPriceLine({
      price: 70,
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      color: 'rgba(255, 255, 255, 0.4)',
      axisLabelVisible: true,
    });
    
    rsiPane.addPriceLine({
      price: 30,
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      color: 'rgba(255, 255, 255, 0.4)',
      axisLabelVisible: true,
    });
  } else if (!isActive && rsiPane) {
    // Remove pane
    window.tradingChart.removePanes();
    rsiPane = null;
    rsiSeries = null;
  }
}

/**
 * Toggle Volume indicator
 */
let volumeSeries = null;
function toggleVolumeIndicator(isActive) {
  if (!window.tradingChart || !window.candleSeries) return;
  
  if (isActive && !volumeSeries) {
    // Create volume series
    volumeSeries = window.tradingChart.addHistogramSeries({
      color: 'rgba(247, 201, 72, 0.5)',
      priceFormat: {
        type: 'volume',
      },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    
    // Generate example volume data
    const data = window.candleSeries.data();
    if (!data || data.length === 0) return;
    
    const volumeData = [];
    
    for (let i = 0; i < data.length; i++) {
      // Generate random volume
      const volume = (Math.random() * 100) + 50;
      
      // Color based on candle direction
      const color = data[i].close >= data[i].open 
        ? 'rgba(247, 201, 72, 0.5)'  // Yellow for up candles
        : 'rgba(50, 50, 50, 0.5)';    // Dark for down candles
      
      volumeData.push({
        time: data[i].time,
        value: volume,
        color: color
      });
    }
    
    volumeSeries.setData(volumeData);
  } else if (!isActive && volumeSeries) {
    // Remove series
    window.tradingChart.removeSeries(volumeSeries);
    volumeSeries = null;
  }
}