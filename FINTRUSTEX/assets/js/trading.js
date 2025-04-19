/**
 * Trading Page JavaScript
 * Handles trading view, order book, trade history, and order placement
 */

async function initTrading() {
  try {
    // Check authentication first
    if (window.authService && !authService.isAuthenticated()) {
      window.location.href = '../auth.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    // Initialize trading view components
    await initTradingPairs();
    await initTradingChart();
    await initOrderBook();
    await initTradeHistory();
    await initUserOrders();
    initOrderForms();

    // Set up event listeners
    setupEventListeners();

    // Initialize bootstrap tooltips
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
      const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }

    // Set theme based on user preference
    setTheme();

    // Re-initialize AOS
    if (typeof AOS !== 'undefined') {
      AOS.init({ duration: 800 });
    }
  } catch (error) {
    console.error('Error initializing trading view:', error);
    showToast('Failed to initialize trading view. Please try again.', 'error');
  }
}

// Current trading state
const tradingState = {
  currentPair: 'BTC/USDT',
  orderType: 'limit',
  tradeType: 'buy',
  interval: '1h',
  subscriptions: [],
};

/**
 * Initialize trading pairs dropdown
 */
async function initTradingPairs() {
  try {
    // Get trading pairs from API
    const pairs = await api.trading.getTradingPairs();
    const pairsDropdown = document.getElementById('trading-pair-dropdown');
    const currentPairElement = document.getElementById('current-pair');
    
    if (pairsDropdown) {
      // Clear existing options
      pairsDropdown.innerHTML = '';
      
      // Add options
      pairs.forEach(pair => {
        const option = document.createElement('a');
        option.className = 'dropdown-item';
        option.href = '#';
        option.dataset.pair = pair.symbol;
        option.textContent = pair.symbol;
        option.addEventListener('click', (e) => {
          e.preventDefault();
          changeTradingPair(pair.symbol);
        });
        pairsDropdown.appendChild(option);
      });
    }
    
    // Set current pair
    if (currentPairElement) {
      currentPairElement.textContent = tradingState.currentPair;
    }

    // Update current price
    const binancePair = tradingState.currentPair.replace('/', '');
    const tickerData = await api.market.getBinanceTicker(binancePair);
    updatePriceInfo(tickerData);
    
    // Subscribe to real-time price updates
    subscribeToMarketData();
  } catch (error) {
    console.error('Failed to load trading pairs:', error);
    showToast('Failed to load trading pairs', 'error');
  }
}

/**
 * Change trading pair
 * @param {string} pair - New trading pair
 */
function changeTradingPair(pair) {
  // Update trading state
  tradingState.currentPair = pair;
  
  // Update UI
  const currentPairElement = document.getElementById('current-pair');
  if (currentPairElement) {
    currentPairElement.textContent = pair;
  }
  
  // Unsubscribe from previous pair
  unsubscribeFromMarketData();
  
  // Reload data for new pair
  initOrderBook();
  initTradeHistory();
  updateTradingChart();
  
  // Subscribe to new pair
  subscribeToMarketData();
}

/**
 * Initialize trading chart
 */
async function initTradingChart() {
  // Check if TradingView widget is available
  if (typeof TradingView === 'undefined') {
    console.warn('TradingView library not loaded.');
    return;
  }
  
  const chartContainer = document.getElementById('trading-chart');
  if (!chartContainer) return;
  
  // Clear container
  chartContainer.innerHTML = '';
  
  // Create TradingView widget
  const symbol = tradingState.currentPair.replace('/', '');
  
  new TradingView.widget({
    container_id: 'trading-chart',
    symbol: `BINANCE:${symbol}`,
    interval: tradingState.interval,
    timezone: 'Etc/UTC',
    theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light',
    style: '1',
    locale: 'en',
    toolbar_bg: '#f1f3f6',
    enable_publishing: false,
    hide_side_toolbar: false,
    allow_symbol_change: true,
    save_image: false,
    height: 500,
    studies: [
      'MASimple@tv-basicstudies',
      'RSI@tv-basicstudies'
    ],
    show_popup_button: true,
    popup_width: '1000',
    popup_height: '650'
  });
}

/**
 * Update trading chart
 */
function updateTradingChart() {
  // Re-initialize with new pair
  initTradingChart();
}

/**
 * Initialize order book
 */
async function initOrderBook() {
  try {
    const orderBookContainer = document.getElementById('order-book');
    if (!orderBookContainer) return;
    
    // Get formatted symbol
    const symbol = tradingState.currentPair.replace('/', '');
    
    // Fetch order book data from Binance
    const orderBook = await api.market.getOrderBook(symbol, 20);
    
    // Format order book data
    const bids = orderBook.bids.map(bid => ({
      price: parseFloat(bid[0]),
      amount: parseFloat(bid[1])
    }));
    
    const asks = orderBook.asks.map(ask => ({
      price: parseFloat(ask[0]),
      amount: parseFloat(ask[1])
    }));
    
    // Calculate totals
    let bidTotal = 0;
    let askTotal = 0;
    
    const formattedBids = bids.map(bid => {
      bidTotal += bid.amount;
      return {
        ...bid,
        total: bidTotal,
        value: bid.price * bid.amount
      };
    });
    
    const formattedAsks = asks.map(ask => {
      askTotal += ask.amount;
      return {
        ...ask,
        total: askTotal,
        value: ask.price * ask.amount
      };
    }).reverse();
    
    // Find the max total for calculating percentage bars
    const maxTotal = Math.max(
      formattedBids.length > 0 ? formattedBids[formattedBids.length - 1].total : 0,
      formattedAsks.length > 0 ? formattedAsks[0].total : 0
    );
    
    // Render order book
    const bidsHtml = formattedBids.map(bid => {
      const percentage = (bid.total / maxTotal) * 100;
      return `
        <div class="order-book-row bid" data-price="${bid.price}">
          <div class="order-book-bar" style="width: ${percentage}%"></div>
          <div class="order-book-price">${utils.formatCurrency(bid.price, 'USD', 'en-US')}</div>
          <div class="order-book-amount">${bid.amount.toFixed(6)}</div>
          <div class="order-book-total">${bid.total.toFixed(6)}</div>
        </div>
      `;
    }).join('');
    
    const asksHtml = formattedAsks.map(ask => {
      const percentage = (ask.total / maxTotal) * 100;
      return `
        <div class="order-book-row ask" data-price="${ask.price}">
          <div class="order-book-bar" style="width: ${percentage}%"></div>
          <div class="order-book-price">${utils.formatCurrency(ask.price, 'USD', 'en-US')}</div>
          <div class="order-book-amount">${ask.amount.toFixed(6)}</div>
          <div class="order-book-total">${ask.total.toFixed(6)}</div>
        </div>
      `;
    }).join('');
    
    // Update order book HTML
    orderBookContainer.innerHTML = `
      <div class="order-book-header">
        <div>Price (USDT)</div>
        <div>Amount</div>
        <div>Total</div>
      </div>
      <div class="order-book-asks">${asksHtml}</div>
      <div class="order-book-spread">
        <span>Spread: ${calculateSpread(bids, asks)}</span>
      </div>
      <div class="order-book-bids">${bidsHtml}</div>
    `;
    
    // Add click handlers for price selection
    document.querySelectorAll('.order-book-row').forEach(row => {
      row.addEventListener('click', () => {
        const price = row.dataset.price;
        selectPrice(price);
      });
    });
  } catch (error) {
    console.error('Failed to load order book:', error);
    showToast('Failed to load order book', 'error');
  }
}

/**
 * Calculate and format price spread
 * @param {Array} bids - Bid orders
 * @param {Array} asks - Ask orders
 * @returns {string} - Formatted spread
 */
function calculateSpread(bids, asks) {
  if (!bids.length || !asks.length) return '0';
  
  const highestBid = bids[0].price;
  const lowestAsk = asks[asks.length - 1].price;
  const spread = lowestAsk - highestBid;
  const spreadPercentage = (spread / lowestAsk) * 100;
  
  return `${utils.formatCurrency(spread, 'USD', 'en-US')} (${spreadPercentage.toFixed(2)}%)`;
}

/**
 * Initialize trade history
 */
async function initTradeHistory() {
  try {
    const tradeHistoryContainer = document.getElementById('trade-history');
    if (!tradeHistoryContainer) return;
    
    // Get formatted symbol
    const symbol = tradingState.currentPair.replace('/', '');
    
    // Fetch recent trades from Binance
    const trades = await api.market.getRecentTrades(symbol, 20);
    
    // Format trades
    const formattedTrades = trades.map(trade => ({
      id: trade.id,
      price: parseFloat(trade.price),
      amount: parseFloat(trade.qty),
      value: parseFloat(trade.price) * parseFloat(trade.qty),
      time: new Date(trade.time),
      isBuyer: trade.isBuyerMaker
    }));
    
    // Render trade history
    const tradesHtml = formattedTrades.map(trade => `
      <div class="trade-row ${trade.isBuyer ? 'sell' : 'buy'}">
        <div class="trade-price">${utils.formatCurrency(trade.price, 'USD', 'en-US')}</div>
        <div class="trade-amount">${trade.amount.toFixed(6)}</div>
        <div class="trade-time">${utils.formatDateTime(trade.time, { timeStyle: 'short' })}</div>
      </div>
    `).join('');
    
    // Update trade history HTML
    tradeHistoryContainer.innerHTML = `
      <div class="trade-header">
        <div>Price (USDT)</div>
        <div>Amount</div>
        <div>Time</div>
      </div>
      <div class="trade-rows">${tradesHtml}</div>
    `;
  } catch (error) {
    console.error('Failed to load trade history:', error);
    showToast('Failed to load trade history', 'error');
  }
}

/**
 * Initialize user orders
 */
async function initUserOrders() {
  try {
    const openOrdersContainer = document.getElementById('open-orders');
    const orderHistoryContainer = document.getElementById('order-history');
    
    if (!openOrdersContainer && !orderHistoryContainer) return;
    
    // Get user orders
    const openOrders = await api.trading.getOpenOrders();
    const orderHistory = await api.trading.getOrderHistory();
    
    // Render open orders
    if (openOrdersContainer) {
      if (openOrders.length === 0) {
        openOrdersContainer.innerHTML = '<div class="empty-state">No open orders</div>';
      } else {
        const openOrdersHtml = openOrders.map(order => `
          <div class="order-row" data-order-id="${order.id}">
            <div class="order-pair">${order.pair}</div>
            <div class="order-type ${order.side.toLowerCase()}">${order.side}</div>
            <div class="order-price">${utils.formatCurrency(order.price, 'USD', 'en-US')}</div>
            <div class="order-amount">${parseFloat(order.amount).toFixed(6)}</div>
            <div class="order-filled">${((parseFloat(order.filled) / parseFloat(order.amount)) * 100).toFixed(2)}%</div>
            <div class="order-date">${utils.formatDateTime(order.created_at)}</div>
            <div class="order-actions">
              <button class="btn btn-sm btn-danger cancel-order" data-order-id="${order.id}">Cancel</button>
            </div>
          </div>
        `).join('');
        
        openOrdersContainer.innerHTML = `
          <div class="order-header">
            <div>Pair</div>
            <div>Type</div>
            <div>Price</div>
            <div>Amount</div>
            <div>Filled</div>
            <div>Date</div>
            <div>Actions</div>
          </div>
          <div class="order-rows">${openOrdersHtml}</div>
        `;
        
        // Add cancel order handlers
        document.querySelectorAll('.cancel-order').forEach(button => {
          button.addEventListener('click', async (e) => {
            e.preventDefault();
            const orderId = button.dataset.orderId;
            await cancelOrder(orderId);
          });
        });
      }
    }
    
    // Render order history
    if (orderHistoryContainer) {
      if (orderHistory.length === 0) {
        orderHistoryContainer.innerHTML = '<div class="empty-state">No order history</div>';
      } else {
        const orderHistoryHtml = orderHistory.map(order => `
          <div class="order-row">
            <div class="order-pair">${order.pair}</div>
            <div class="order-type ${order.side.toLowerCase()}">${order.side}</div>
            <div class="order-price">${utils.formatCurrency(order.price, 'USD', 'en-US')}</div>
            <div class="order-amount">${parseFloat(order.amount).toFixed(6)}</div>
            <div class="order-status ${order.status.toLowerCase()}">${order.status}</div>
            <div class="order-date">${utils.formatDateTime(order.created_at)}</div>
          </div>
        `).join('');
        
        orderHistoryContainer.innerHTML = `
          <div class="order-header">
            <div>Pair</div>
            <div>Type</div>
            <div>Price</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Date</div>
          </div>
          <div class="order-rows">${orderHistoryHtml}</div>
        `;
      }
    }
  } catch (error) {
    console.error('Failed to load user orders:', error);
    showToast('Failed to load user orders', 'error');
  }
}

/**
 * Cancel an order
 * @param {string} orderId - Order ID
 */
async function cancelOrder(orderId) {
  try {
    // Show confirmation
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }
    
    // Cancel order
    await api.trading.cancelOrder(orderId);
    
    // Show success
    showToast('Order canceled successfully', 'success');
    
    // Refresh orders
    await initUserOrders();
  } catch (error) {
    console.error('Failed to cancel order:', error);
    showToast('Failed to cancel order', 'error');
  }
}

/**
 * Initialize order forms
 */
function initOrderForms() {
  // Get form elements
  const buyForm = document.getElementById('buy-form');
  const sellForm = document.getElementById('sell-form');
  const orderTypeSelect = document.getElementById('order-type');
  
  // Get price and amount inputs
  const buyPriceInput = document.getElementById('buy-price');
  const buyAmountInput = document.getElementById('buy-amount');
  const buyTotalInput = document.getElementById('buy-total');
  const sellPriceInput = document.getElementById('sell-price');
  const sellAmountInput = document.getElementById('sell-amount');
  const sellTotalInput = document.getElementById('sell-total');
  
  // Set order type change handler
  if (orderTypeSelect) {
    orderTypeSelect.addEventListener('change', () => {
      tradingState.orderType = orderTypeSelect.value;
      updateOrderForms();
    });
  }
  
  // Set up buy form
  if (buyForm) {
    // Calculate total when price or amount changes
    if (buyPriceInput && buyAmountInput && buyTotalInput) {
      buyPriceInput.addEventListener('input', () => {
        if (buyAmountInput.value) {
          buyTotalInput.value = (parseFloat(buyPriceInput.value) * parseFloat(buyAmountInput.value)).toFixed(8);
        }
      });
      
      buyAmountInput.addEventListener('input', () => {
        if (buyPriceInput.value) {
          buyTotalInput.value = (parseFloat(buyPriceInput.value) * parseFloat(buyAmountInput.value)).toFixed(8);
        }
      });
      
      buyTotalInput.addEventListener('input', () => {
        if (buyPriceInput.value && parseFloat(buyPriceInput.value) > 0) {
          buyAmountInput.value = (parseFloat(buyTotalInput.value) / parseFloat(buyPriceInput.value)).toFixed(8);
        }
      });
    }
    
    // Handle form submission
    buyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      tradingState.tradeType = 'buy';
      await submitOrder();
    });
  }
  
  // Set up sell form
  if (sellForm) {
    // Calculate total when price or amount changes
    if (sellPriceInput && sellAmountInput && sellTotalInput) {
      sellPriceInput.addEventListener('input', () => {
        if (sellAmountInput.value) {
          sellTotalInput.value = (parseFloat(sellPriceInput.value) * parseFloat(sellAmountInput.value)).toFixed(8);
        }
      });
      
      sellAmountInput.addEventListener('input', () => {
        if (sellPriceInput.value) {
          sellTotalInput.value = (parseFloat(sellPriceInput.value) * parseFloat(sellAmountInput.value)).toFixed(8);
        }
      });
      
      sellTotalInput.addEventListener('input', () => {
        if (sellPriceInput.value && parseFloat(sellPriceInput.value) > 0) {
          sellAmountInput.value = (parseFloat(sellTotalInput.value) / parseFloat(sellPriceInput.value)).toFixed(8);
        }
      });
    }
    
    // Handle form submission
    sellForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      tradingState.tradeType = 'sell';
      await submitOrder();
    });
  }
  
  // Initialize order form UI
  updateOrderForms();
}

/**
 * Update order forms based on order type
 */
function updateOrderForms() {
  // Get price inputs
  const buyPriceInput = document.getElementById('buy-price');
  const sellPriceInput = document.getElementById('sell-price');
  
  // Update UI based on order type
  if (tradingState.orderType === 'market') {
    // Market orders don't use price
    if (buyPriceInput) {
      buyPriceInput.disabled = true;
      buyPriceInput.value = 'Market';
    }
    
    if (sellPriceInput) {
      sellPriceInput.disabled = true;
      sellPriceInput.value = 'Market';
    }
  } else {
    // Limit orders use price
    if (buyPriceInput) {
      buyPriceInput.disabled = false;
      if (buyPriceInput.value === 'Market') {
        buyPriceInput.value = '';
      }
    }
    
    if (sellPriceInput) {
      sellPriceInput.disabled = false;
      if (sellPriceInput.value === 'Market') {
        sellPriceInput.value = '';
      }
    }
  }
}

/**
 * Select price from order book
 * @param {string} price - Selected price
 */
function selectPrice(price) {
  const numericPrice = parseFloat(price);
  
  // Update price inputs
  const buyPriceInput = document.getElementById('buy-price');
  const sellPriceInput = document.getElementById('sell-price');
  
  if (buyPriceInput && !buyPriceInput.disabled) {
    buyPriceInput.value = numericPrice.toFixed(8);
    // Trigger input event
    buyPriceInput.dispatchEvent(new Event('input'));
  }
  
  if (sellPriceInput && !sellPriceInput.disabled) {
    sellPriceInput.value = numericPrice.toFixed(8);
    // Trigger input event
    sellPriceInput.dispatchEvent(new Event('input'));
  }
}

/**
 * Submit an order
 */
async function submitOrder() {
  try {
    // Get form data
    const form = tradingState.tradeType === 'buy' ? document.getElementById('buy-form') : document.getElementById('sell-form');
    if (!form) return;
    
    // Get price and amount
    const priceInput = form.querySelector(`#${tradingState.tradeType}-price`);
    const amountInput = form.querySelector(`#${tradingState.tradeType}-amount`);
    
    if (!priceInput || !amountInput) {
      showToast('Missing form inputs', 'error');
      return;
    }
    
    // Get values
    const price = tradingState.orderType === 'market' ? 'market' : priceInput.value;
    const amount = amountInput.value;
    
    // Validate inputs
    if (tradingState.orderType !== 'market' && (!price || parseFloat(price) <= 0)) {
      showToast('Please enter a valid price', 'error');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    
    // Create order data
    const orderData = {
      pair: tradingState.currentPair,
      type: tradingState.orderType,
      side: tradingState.tradeType,
      price: price,
      amount: amount,
    };
    
    // Show confirmation
    const confirmation = `Are you sure you want to ${tradingState.tradeType} ${amount} ${tradingState.currentPair.split('/')[0]} at ${tradingState.orderType === 'market' ? 'market price' : `${price} USDT`}?`;
    
    if (!confirm(confirmation)) {
      return;
    }
    
    // Submit order
    const response = await api.trading.createOrder(orderData);
    
    // Show success
    showToast(`Order placed successfully: ${response.id}`, 'success');
    
    // Reset form
    form.reset();
    
    // Refresh orders
    await initUserOrders();
  } catch (error) {
    console.error('Failed to place order:', error);
    showToast(`Failed to place order: ${error.message}`, 'error');
  }
}

/**
 * Subscribe to real-time market data
 */
function subscribeToMarketData() {
  // Clear existing subscriptions
  unsubscribeFromMarketData();
  
  if (!window.marketDataService) {
    console.warn('Market data service not available');
    return;
  }
  
  try {
    // Get formatted symbol
    const symbol = tradingState.currentPair.replace('/', '');
    
    // Subscribe to ticker updates
    const tickerSub = marketDataService.subscribe('ticker', symbol, null, data => {
      updatePriceInfo(data);
    });
    tradingState.subscriptions.push(tickerSub);
    
    // Subscribe to trade updates
    const tradeSub = marketDataService.subscribe('trade', symbol, null, data => {
      updateTradeData(data);
    });
    tradingState.subscriptions.push(tradeSub);
    
    // Subscribe to order book updates
    const orderBookSub = marketDataService.subscribe('orderbook', symbol, null, data => {
      updateOrderBookData(data);
    });
    tradingState.subscriptions.push(orderBookSub);
    
    // Subscribe to kline updates
    const klineSub = marketDataService.subscribe('kline', symbol, tradingState.interval, data => {
      updateKlineData(data);
    });
    tradingState.subscriptions.push(klineSub);
  } catch (error) {
    console.error('Failed to subscribe to market data:', error);
  }
}

/**
 * Unsubscribe from all market data
 */
function unsubscribeFromMarketData() {
  if (!window.marketDataService) return;
  
  tradingState.subscriptions.forEach(subId => {
    try {
      marketDataService.unsubscribe(subId);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  });
  
  tradingState.subscriptions = [];
}

/**
 * Update price information from ticker data
 * @param {Object} data - Ticker data
 */
function updatePriceInfo(data) {
  const currentPriceElement = document.getElementById('current-price');
  const priceChangeElement = document.getElementById('price-change');
  const highPriceElement = document.getElementById('high-price');
  const lowPriceElement = document.getElementById('low-price');
  const volumeElement = document.getElementById('volume');
  
  if (!currentPriceElement) return;
  
  // Format price
  const price = parseFloat(data.lastPrice || data.p || data.price || 0);
  currentPriceElement.textContent = utils.formatCurrency(price, 'USD', 'en-US');
  
  // Format price change
  if (priceChangeElement) {
    const priceChange = parseFloat(data.priceChangePercent || data.P || 0);
    priceChangeElement.textContent = utils.formatPercentage(priceChange);
    priceChangeElement.className = priceChange >= 0 ? 'price-up' : 'price-down';
  }
  
  // Format high price
  if (highPriceElement) {
    const highPrice = parseFloat(data.highPrice || data.h || 0);
    highPriceElement.textContent = utils.formatCurrency(highPrice, 'USD', 'en-US');
  }
  
  // Format low price
  if (lowPriceElement) {
    const lowPrice = parseFloat(data.lowPrice || data.l || 0);
    lowPriceElement.textContent = utils.formatCurrency(lowPrice, 'USD', 'en-US');
  }
  
  // Format volume
  if (volumeElement) {
    const volume = parseFloat(data.volume || data.v || data.q || 0);
    volumeElement.textContent = volume.toFixed(2);
  }
}

/**
 * Update trade data
 * @param {Object} data - Trade data
 */
function updateTradeData(data) {
  const tradeHistoryContainer = document.getElementById('trade-history');
  if (!tradeHistoryContainer) return;
  
  // Get trade rows
  const tradeRows = tradeHistoryContainer.querySelector('.trade-rows');
  if (!tradeRows) return;
  
  // Create new trade row
  const newRow = document.createElement('div');
  newRow.className = `trade-row ${data.m ? 'sell' : 'buy'}`;
  newRow.innerHTML = `
    <div class="trade-price">${utils.formatCurrency(parseFloat(data.p), 'USD', 'en-US')}</div>
    <div class="trade-amount">${parseFloat(data.q).toFixed(6)}</div>
    <div class="trade-time">${utils.formatDateTime(new Date(data.T), { timeStyle: 'short' })}</div>
  `;
  
  // Add row to top of list
  tradeRows.insertBefore(newRow, tradeRows.firstChild);
  
  // Limit to 20 rows
  while (tradeRows.children.length > 20) {
    tradeRows.removeChild(tradeRows.lastChild);
  }
}

/**
 * Update order book data
 * @param {Object} data - Order book data
 */
function updateOrderBookData(data) {
  // For now, we'll just reload the entire order book
  // Could optimize later to just update changed levels
  setTimeout(() => {
    initOrderBook();
  }, 1000);
}

/**
 * Update kline data
 * @param {Object} data - Kline data
 */
function updateKlineData(data) {
  // Currently not used as we're using TradingView widget
  // Could implement custom candlestick chart here
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Order type toggle
  const orderTypeOptions = document.querySelectorAll('.order-type-option');
  orderTypeOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update selected option
      orderTypeOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      
      // Update order type
      tradingState.orderType = option.dataset.type;
      updateOrderForms();
    });
  });
  
  // Chart interval toggle
  const intervalOptions = document.querySelectorAll('.chart-interval-option');
  intervalOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update selected option
      intervalOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      
      // Update interval
      tradingState.interval = option.dataset.interval;
      updateTradingChart();
    });
  });
  
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
      updateTradingChart();
    });
  }
}

/**
 * Set theme based on user preference
 */
function setTheme() {
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  } else if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
  } else {
    // Default to dark theme
    document.body.classList.add('dark-theme');
  }
}

// Run initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initTrading();
});