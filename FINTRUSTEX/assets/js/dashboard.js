/**
 * Dashboard JavaScript
 * Handles portfolio overview, market data, and analytics
 * Updated for CoinZ-style design
 */

async function initDashboard() {
  try {
    // Check authentication first
    if (window.authService && !authService.isAuthenticated()) {
      window.location.href = '../auth.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    // Initialize dashboard components
    await initPortfolioSummary();
    await initMarketTickers();
    await loadOrderBook();
    await initNotificationsPanel();
    setupChartIntervals();
    setupMarketSelector();
    setupEventListeners();

    // Set theme based on user preference
    setTheme();

    // Initialize market data service if available
    if (window.marketDataService) {
      marketDataService.init();
      subscribeToMarketData();
    }

    // Re-initialize AOS
    if (typeof AOS !== 'undefined') {
      AOS.init({ duration: 800 });
    }
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showToast('Failed to initialize dashboard. Please try again.', 'error');
  }
}

/**
 * Initialize portfolio summary sidebar
 */
async function initPortfolioSummary() {
  try {
    // Get portfolio data
    const portfolio = await fetchPortfolioData();
    
    // Get portfolio elements
    const totalValueEl = document.getElementById('portfolio-total-value');
    const changeEl = document.getElementById('portfolio-change');
    const assetsEl = document.getElementById('portfolio-assets');
    
    if (totalValueEl) {
      totalValueEl.textContent = utils.formatCurrency(portfolio.totalBalance);
    }
    
    if (changeEl) {
      changeEl.textContent = utils.formatPercentage(portfolio.dailyChange);
      changeEl.className = `portfolio-change ${portfolio.dailyChange >= 0 ? 'positive' : 'negative'}`;
    }
    
    if (assetsEl) {
      // Clear existing content
      assetsEl.innerHTML = '';
      
      // Add assets (limit to top 3)
      const topAssets = portfolio.assets.slice(0, 3);
      
      topAssets.forEach(asset => {
        const assetElem = document.createElement('div');
        assetElem.className = 'asset';
        assetElem.innerHTML = `
          <span class="asset-name">${asset.symbol}</span>
          <span class="asset-amount">${asset.balance.toFixed(4)}</span>
          <span class="asset-value">${utils.formatCurrency(asset.value || 0)}</span>
        `;
        assetsEl.appendChild(assetElem);
      });
    }
  } catch (error) {
    console.error('Failed to initialize portfolio summary:', error);
  }
}

/**
 * Initialize portfolio overview
 */
async function initPortfolioOverview() {
  try {
    // Get portfolio data
    const portfolio = await fetchPortfolioData();
    
    // Get overview container
    const overviewContainer = document.querySelector('.dashboard-overview');
    if (!overviewContainer) return;
    
    // Update overview
    overviewContainer.innerHTML = `
      <h3>Portfolio Overview</h3>
      <p>Total Balance: ${utils.formatCurrency(portfolio.totalBalance)}</p>
      <p>24h Change: <span class="${portfolio.dailyChange >= 0 ? 'positive' : 'negative'}">${utils.formatPercentage(portfolio.dailyChange)}</span></p>
      <div class="portfolio-allocation">
        <h4>Asset Allocation</h4>
        <div class="allocation-chart">
          ${portfolio.assets.map(asset => `
            <div class="allocation-bar" style="width: ${asset.percentage}%;" title="${asset.symbol}: ${asset.percentage.toFixed(2)}%">
              <span class="allocation-label">${asset.symbol}</span>
            </div>
          `).join('')}
        </div>
        <div class="allocation-legend">
          ${portfolio.assets.map(asset => `
            <div class="legend-item">
              <span class="legend-color" style="background-color: ${getAssetColor(asset.symbol)};"></span>
              <span class="legend-label">${asset.symbol}</span>
              <span class="legend-value">${asset.percentage.toFixed(2)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Failed to load portfolio overview:', error);
    showToast('Failed to load portfolio data', 'error');
  }
}

/**
 * Initialize market tickers
 */
async function initMarketTickers() {
  try {
    // Get top market data
    const marketData = await api.market.getMarkets(8);
    
    // Get ticker container
    const tickerContainer = document.getElementById('crypto-tickers');
    if (!tickerContainer) return;
    
    // Clear the container
    tickerContainer.innerHTML = '';
    
    // Supported coins with image URLs (fallback if API doesn't provide images)
    const coinIcons = {
      'bitcoin': 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
      'ethereum': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
      'binancecoin': 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
      'solana': 'https://cryptologos.cc/logos/solana-sol-logo.png',
      'ripple': 'https://cryptologos.cc/logos/xrp-xrp-logo.png',
      'cardano': 'https://cryptologos.cc/logos/cardano-ada-logo.png',
      'dogecoin': 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
      'polkadot': 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png'
    };
    
    // Create and append ticker elements
    marketData.forEach((coin, index) => {
      const priceChange = coin.price_change_percentage_24h;
      const ticker = document.createElement('div');
      ticker.className = `ticker ${index === 0 ? 'active' : ''}`;
      ticker.dataset.symbol = `${coin.symbol.toUpperCase()}/USD`;
      ticker.dataset.coinId = coin.id;
      
      ticker.innerHTML = `
        <div class="ticker-header">
          <img src="${coin.image || coinIcons[coin.id] || coinIcons.bitcoin}" alt="${coin.symbol}" 
               onerror="this.src='https://cryptologos.cc/logos/bitcoin-btc-logo.png'">
          <span class="ticker-name">${coin.symbol.toUpperCase()}/USD</span>
        </div>
        <div class="ticker-price">${utils.formatCurrency(coin.current_price)}</div>
        <div class="ticker-change ${priceChange >= 0 ? 'positive' : 'negative'}">
          ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%
        </div>
      `;
      
      // Add click event
      ticker.addEventListener('click', function() {
        // Remove active class from all tickers
        document.querySelectorAll('.ticker').forEach(t => t.classList.remove('active'));
        // Add active class to clicked ticker
        this.classList.add('active');
        
        const symbol = this.dataset.symbol;
        const coinId = this.dataset.coinId;
        
        // Update chart
        updateChart(symbol);
        
        // Update order book
        loadOrderBook(symbol);
      });
      
      tickerContainer.appendChild(ticker);
    });
  } catch (error) {
    console.error('Failed to load market tickers:', error);
    showToast('Failed to load market data', 'error');
    
    // Add fallback tickers if API fails
    const tickerContainer = document.getElementById('crypto-tickers');
    if (tickerContainer) {
      tickerContainer.innerHTML = '<div class="error-message">Unable to load market data. Please try again later.</div>';
    }
  }
}

/**
 * Update chart with the selected symbol
 * @param {string} symbol - Market symbol
 */
function updateChart(symbol) {
  // Update chart pair display
  const chartPairEl = document.getElementById('chartPair');
  if (chartPairEl) {
    chartPairEl.textContent = symbol;
  }
  
  // Get TradingView widget and update symbol
  if (window.tvWidget) {
    const formattedSymbol = symbol.replace('/', '');
    tvWidget.chart().setSymbol(`BINANCE:${formattedSymbol}`);
  }
}

/**
 * Load order book data
 * @param {string} symbol - Market symbol (optional)
 */
async function loadOrderBook(symbol = 'BTC/USD') {
  try {
    // Get order book elements
    const askOrdersEl = document.getElementById('ask-orders');
    const bidOrdersEl = document.getElementById('bid-orders');
    const marketPriceEl = document.getElementById('market-price');
    const marketPriceChangeEl = document.getElementById('market-price-change');
    
    if (!askOrdersEl || !bidOrdersEl) return;
    
    // Try to get order book data from API
    let orderBookData;
    try {
      orderBookData = await api.market.getOrderBook(symbol);
    } catch (apiError) {
      console.warn('Failed to get order book from API, using generated data:', apiError);
      // Generate sample order book data
      const basePrice = symbol.includes('BTC') ? 42356.78 : 
                        symbol.includes('ETH') ? 2345.67 : 
                        symbol.includes('SOL') ? 102.34 : 
                        symbol.includes('BNB') ? 312.45 : 100.00;
      
      orderBookData = {
        asks: [],
        bids: [],
        lastPrice: basePrice,
        priceChangePercent: (Math.random() * 4 - 2).toFixed(2) // Random between -2% and +2%
      };
      
      // Generate asks (sell orders)
      for (let i = 0; i < 5; i++) {
        const price = basePrice * (1 + (i + 1) * 0.001);
        const amount = (Math.random() * 0.5 + 0.1).toFixed(4);
        orderBookData.asks.push([price, amount]);
      }
      
      // Generate bids (buy orders)
      for (let i = 0; i < 5; i++) {
        const price = basePrice * (1 - (i + 1) * 0.001);
        const amount = (Math.random() * 0.5 + 0.1).toFixed(4);
        orderBookData.bids.push([price, amount]);
      }
    }
    
    // Update asks
    askOrdersEl.innerHTML = '';
    if (orderBookData.asks && orderBookData.asks.length > 0) {
      orderBookData.asks.slice(0, 5).forEach(ask => {
        const price = parseFloat(ask[0]);
        const amount = parseFloat(ask[1]);
        const total = (price * amount).toFixed(2);
        
        const orderRow = document.createElement('div');
        orderRow.className = 'order-row';
        orderRow.innerHTML = `
          <span>${price.toFixed(2)}</span>
          <span>${amount.toFixed(4)}</span>
          <span>${total}</span>
        `;
        askOrdersEl.appendChild(orderRow);
      });
    }
    
    // Update bids
    bidOrdersEl.innerHTML = '';
    if (orderBookData.bids && orderBookData.bids.length > 0) {
      orderBookData.bids.slice(0, 5).forEach(bid => {
        const price = parseFloat(bid[0]);
        const amount = parseFloat(bid[1]);
        const total = (price * amount).toFixed(2);
        
        const orderRow = document.createElement('div');
        orderRow.className = 'order-row';
        orderRow.innerHTML = `
          <span>${price.toFixed(2)}</span>
          <span>${amount.toFixed(4)}</span>
          <span>${total}</span>
        `;
        bidOrdersEl.appendChild(orderRow);
      });
    }
    
    // Update market price
    if (marketPriceEl) {
      const lastPrice = orderBookData.lastPrice || (orderBookData.asks?.[0]?.[0] || 0);
      marketPriceEl.textContent = `$${parseFloat(lastPrice).toFixed(2)}`;
    }
    
    // Update price change
    if (marketPriceChangeEl) {
      const changePercent = orderBookData.priceChangePercent || 0;
      marketPriceChangeEl.textContent = `${changePercent >= 0 ? '+' : ''}${parseFloat(changePercent).toFixed(2)}%`;
      marketPriceChangeEl.className = `change ${changePercent >= 0 ? 'positive' : 'negative'}`;
    }
  } catch (error) {
    console.error('Failed to load order book:', error);
  }
}

/**
 * Set up chart interval buttons
 */
function setupChartIntervals() {
  const intervalButtons = document.querySelectorAll('.interval-btn');
  if (!intervalButtons.length) return;
  
  intervalButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      // Remove active class from all buttons
      intervalButtons.forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');
      
      // Get interval from data attribute
      const interval = this.dataset.interval;
      
      // Update TradingView chart interval
      if (window.tvWidget) {
        tvWidget.chart().setResolution(interval);
      }
    });
  });
}

/**
 * Set up market selector dropdown
 */
function setupMarketSelector() {
  const marketSelect = document.getElementById('marketSelect');
  if (!marketSelect) return;
  
  marketSelect.addEventListener('change', function() {
    const selectedMarket = this.value;
    filterMarkets(selectedMarket);
  });
}

/**
 * Filter markets based on selection
 * @param {string} marketType - Market type to filter
 */
function filterMarkets(marketType) {
  const tickers = document.querySelectorAll('.ticker');
  if (!tickers.length) return;
  
  tickers.forEach(ticker => {
    const symbol = ticker.dataset.symbol;
    
    if (marketType === 'all') {
      ticker.style.display = 'block';
    } else if (marketType === 'usd' && symbol.includes('/USD')) {
      ticker.style.display = 'block';
    } else if (marketType === 'btc' && symbol.includes('/BTC')) {
      ticker.style.display = 'block';
    } else {
      ticker.style.display = 'none';
    }
  });
}

/**
 * Set up event listeners for the dashboard
 */
function setupEventListeners() {
  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('change', function() {
      document.body.classList.toggle('dark-theme');
      document.body.classList.toggle('light-theme');
      localStorage.setItem('theme', this.checked ? 'dark' : 'light');
      
      // Update TradingView theme if it exists
      if (window.tvWidget) {
        tvWidget.changeTheme(this.checked ? 'dark' : 'light');
      }
    });
    
    // Set initial theme based on localStorage or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    themeToggle.checked = savedTheme === 'dark';
    document.body.classList.add(savedTheme + '-theme');
    document.body.classList.remove(savedTheme === 'dark' ? 'light-theme' : 'dark-theme');
  }
  
  // Notifications icon click
  const notificationsIcon = document.getElementById('notifications-icon');
  if (notificationsIcon) {
    notificationsIcon.addEventListener('click', function() {
      const notificationsPanel = document.querySelector('.notifications-panel');
      if (notificationsPanel) {
        notificationsPanel.classList.toggle('visible');
      }
    });
  }
  
  // Mark all notifications as read
  const markAllReadBtn = document.getElementById('mark-all-read');
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
  }
  
  // View all notifications link
  const viewAllNotificationsLink = document.getElementById('view-all-notifications');
  if (viewAllNotificationsLink) {
    viewAllNotificationsLink.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = 'notifications.html';
    });
  }
  
  // Setup interval buttons
  setupChartIntervals();
  
  // Setup market selector
  setupMarketSelector();
  
  // Handle sidebar navigation
  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', function(e) {
      if (this.getAttribute('href') === '#') {
        e.preventDefault(); // Prevent navigation for the active page
      }
    });
  });
  
  // Handle header action buttons
  document.querySelectorAll('.nav-actions button').forEach(button => {
    button.addEventListener('click', function() {
      const navTarget = this.dataset.nav;
      if (navTarget) {
        window.location.href = navTarget;
      } else if (this.classList.contains('ar-toggle')) {
        toggleARMode();
      }
    });
  });
  
  // Setup automatic data refresh (every 30 seconds)
  setInterval(async () => {
    try {
      await refreshMarketData();
    } catch (error) {
      console.error('Error refreshing market data:', error);
    }
  }, 30000);
}

/**
 * Refresh market data
 */
async function refreshMarketData() {
  try {
    // Get active ticker symbol
    const activeTicker = document.querySelector('.ticker.active');
    if (activeTicker) {
      const symbol = activeTicker.dataset.symbol;
      
      // Update order book for active symbol
      await loadOrderBook(symbol);
      
      // Update all tickers
      const tickers = document.querySelectorAll('.ticker');
      if (tickers.length > 0 && window.api && api.market) {
        const marketData = await api.market.getMarkets(tickers.length);
        
        if (marketData && marketData.length > 0) {
          tickers.forEach((ticker, index) => {
            if (index < marketData.length) {
              const coin = marketData[index];
              const priceElement = ticker.querySelector('.ticker-price');
              const changeElement = ticker.querySelector('.ticker-change');
              
              if (priceElement) {
                priceElement.textContent = utils.formatCurrency(coin.current_price);
              }
              
              if (changeElement) {
                const priceChange = coin.price_change_percentage_24h;
                changeElement.textContent = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
                changeElement.className = `ticker-change ${priceChange >= 0 ? 'positive' : 'negative'}`;
              }
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error refreshing market data:', error);
  }
}

/**
 * Show coin details
 * @param {string} coinId - Coin ID
 */
async function showCoinDetails(coinId) {
  try {
    // Get coin data
    const coinData = await api.market.getCoinData(coinId);
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${coinData.name} (${coinData.symbol.toUpperCase()})</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="coin-details">
            <div class="coin-image">
              <img src="${coinData.image.large}" alt="${coinData.name}">
            </div>
            <div class="coin-info">
              <p>Price: ${utils.formatCurrency(coinData.market_data.current_price.usd)}</p>
              <p>Market Cap: ${utils.formatCurrency(coinData.market_data.market_cap.usd)}</p>
              <p>24h Change: <span class="${coinData.market_data.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">${utils.formatPercentage(coinData.market_data.price_change_percentage_24h)}</span></p>
              <p>Volume (24h): ${utils.formatCurrency(coinData.market_data.total_volume.usd)}</p>
              <p>Circulating Supply: ${coinData.market_data.circulating_supply.toLocaleString()} ${coinData.symbol.toUpperCase()}</p>
            </div>
          </div>
          <div class="coin-description">
            <h4>About ${coinData.name}</h4>
            <div class="description-text">${coinData.description.en.substring(0, 300)}...</div>
            <a href="${coinData.links.homepage[0]}" target="_blank" class="btn btn-yellow">Official Website</a>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to body
    document.body.appendChild(modal);
    
    // Add close handler
    const closeButton = modal.querySelector('.modal-close');
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  } catch (error) {
    console.error('Failed to load coin details:', error);
    showToast('Failed to load coin details', 'error');
  }
}

/**
 * Subscribe to real-time market data
 */
function subscribeToMarketData() {
  if (!window.marketDataService) return;
  
  try {
    // Subscribe to BTC/USDT ticker
    marketDataService.subscribe('ticker', 'BTCUSDT', null, data => {
      updateTickerItem('bitcoin', data);
    });
    
    // Subscribe to ETH/USDT ticker
    marketDataService.subscribe('ticker', 'ETHUSDT', null, data => {
      updateTickerItem('ethereum', data);
    });
  } catch (error) {
    console.error('Failed to subscribe to market data:', error);
  }
}

/**
 * Update ticker item with real-time data
 * @param {string} coinId - Coin ID
 * @param {Object} data - Ticker data
 */
function updateTickerItem(coinId, data) {
  const tickerItem = document.querySelector(`.ticker-item[data-coin-id="${coinId}"]`);
  if (!tickerItem) return;
  
  // Get price and change elements
  const priceElement = tickerItem.querySelector(':nth-child(2)');
  const changeElement = tickerItem.querySelector(':nth-child(3)');
  
  if (!priceElement || !changeElement) return;
  
  // Update price
  const price = parseFloat(data.c || data.lastPrice || data.price || 0);
  priceElement.textContent = utils.formatCurrency(price);
  
  // Update change
  const change = parseFloat(data.P || data.priceChangePercent || data.p || 0);
  changeElement.textContent = utils.formatPercentage(change);
  changeElement.className = change >= 0 ? 'positive' : 'negative';
}

/**
 * Fetch portfolio data
 * @returns {Promise<Object>} - Portfolio data
 */
async function fetchPortfolioData() {
  // Try to get user wallets
  try {
    // Get user wallet data
    const wallets = await api.wallet.getWallets();
    
    // Get current prices
    const prices = await api.market.getPrices(['bitcoin', 'ethereum', 'ripple'], 'usd');
    
    // Calculate total balance
    const assets = [];
    let totalValue = 0;
    
    for (const wallet of wallets) {
      const price = prices[wallet.currency.toLowerCase()]?.usd || 0;
      const value = parseFloat(wallet.balance) * price;
      
      totalValue += value;
      
      assets.push({
        symbol: wallet.currency,
        balance: parseFloat(wallet.balance),
        value: value,
        price: price
      });
    }
    
    // Calculate percentages
    assets.forEach(asset => {
      asset.percentage = (asset.value / totalValue) * 100;
    });
    
    // Sort by value (descending)
    assets.sort((a, b) => b.value - a.value);
    
    // Calculate 24h change (mock for now, would need historical data)
    const dailyChange = calculatePortfolioDailyChange(assets, prices);
    
    return {
      totalBalance: totalValue,
      dailyChange: dailyChange,
      assets: assets
    };
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    
    // Return demo data if API fails
    return {
      totalBalance: 12500,
      dailyChange: 2.5,
      assets: [
        { symbol: 'BTC', percentage: 45, balance: 0.15 },
        { symbol: 'ETH', percentage: 35, balance: 2.5 },
        { symbol: 'XRP', percentage: 20, balance: 1000 }
      ]
    };
  }
}

/**
 * Calculate portfolio daily change
 * @param {Array} assets - Portfolio assets
 * @param {Object} prices - Current prices
 * @returns {number} - Daily change percentage
 */
function calculatePortfolioDailyChange(assets, prices) {
  // This would normally use historical price data
  // For now, we'll use a weighted average of price changes
  
  let weightedChangeSum = 0;
  let totalWeight = 0;
  
  for (const asset of assets) {
    const priceData = prices[asset.symbol.toLowerCase()];
    if (priceData && priceData.usd_24h_change) {
      weightedChangeSum += priceData.usd_24h_change * asset.percentage;
      totalWeight += asset.percentage;
    }
  }
  
  return totalWeight > 0 ? weightedChangeSum / totalWeight : 0;
}

/**
 * Get color for asset
 * @param {string} symbol - Asset symbol
 * @returns {string} - Color hex code
 */
function getAssetColor(symbol) {
  const colorMap = {
    'BTC': '#F7931A',
    'ETH': '#627EEA',
    'XRP': '#23292F',
    'USDT': '#26A17B',
    'BCH': '#8DC351',
    'LTC': '#BFBBBB',
    'ADA': '#3CC8C8',
    'DOT': '#E6007A',
    'LINK': '#2A5ADA',
    'BNB': '#F3BA2F'
  };
  
  return colorMap[symbol] || `#${Math.floor(Math.random()*16777215).toString(16)}`;
}

/**
 * Initialize notifications panel
 */
async function initNotificationsPanel() {
  try {
    // Check if notifications list exists
    const notificationsList = document.getElementById('notifications-list');
    if (!notificationsList) return;
    
    // Check if API is available
    if (!window.api || !window.api.notifications) {
      console.warn('Notifications API not available');
      return;
    }
    
    // Get the latest notifications
    const notifications = await api.notifications.getAll();
    
    // If no notifications
    if (!notifications || notifications.length === 0) {
      notificationsList.innerHTML = `
        <div class="empty-notification">
          <i class="fas fa-bell-slash"></i>
          <p>No notifications yet</p>
        </div>
      `;
      return;
    }
    
    // Sort notifications by date (newest first)
    const sortedNotifications = [...notifications].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Take only the first 3 notifications
    const recentNotifications = sortedNotifications.slice(0, 3);
    
    // Build HTML
    let html = '';
    
    recentNotifications.forEach(notification => {
      // Determine icon based on notification type
      let iconClass = 'fa-bell';
      let iconType = '';
      
      if (notification.type.includes('deposit')) {
        iconClass = 'fa-money-bill-wave';
        iconType = 'deposit';
      } else if (notification.type.includes('withdrawal')) {
        iconClass = 'fa-money-bill-transfer';
        iconType = 'withdrawal';
      } else if (notification.type.includes('login') || notification.type.includes('security')) {
        iconClass = 'fa-shield-alt';
        iconType = 'login';
      } else if (notification.type.includes('price')) {
        iconClass = 'fa-chart-line';
        iconType = 'price';
      } else if (notification.type.includes('system')) {
        iconClass = 'fa-server';
        iconType = 'system';
      }
      
      // Format time
      const timeAgo = utils.formatTimeAgo ? utils.formatTimeAgo(new Date(notification.createdAt)) : 
        new Date(notification.createdAt).toLocaleString();
      
      html += `
        <div class="notification-item ${notification.isRead ? '' : 'unread'}" data-id="${notification.id}">
          <div class="notification-icon ${iconType}">
            <i class="fas ${iconClass}"></i>
          </div>
          <div class="notification-content">
            <h4>${notification.title}</h4>
            <p>${notification.message}</p>
            <span class="notification-time">${timeAgo}</span>
          </div>
          <button class="notification-action" data-action="mark-read" title="${notification.isRead ? 'Mark as unread' : 'Mark as read'}">
            <i class="fas ${notification.isRead ? 'fa-envelope' : 'fa-envelope-open'}"></i>
          </button>
        </div>
      `;
    });
    
    // Update the notifications list
    notificationsList.innerHTML = html;
    
    // Add event listeners
    setupNotificationListeners();
    
    // Add "Mark All Read" button listener
    const markAllReadButton = document.getElementById('mark-all-read');
    if (markAllReadButton) {
      markAllReadButton.addEventListener('click', markAllNotificationsAsRead);
    }
    
    // Add "View All Notifications" link listener
    const viewAllNotificationsLink = document.getElementById('view-all-notifications');
    if (viewAllNotificationsLink) {
      viewAllNotificationsLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/dashboard/notifications.html';
      });
    }
  } catch (error) {
    console.error('Error initializing notifications panel:', error);
    
    // Show error message in the panel
    const notificationsList = document.getElementById('notifications-list');
    if (notificationsList) {
      notificationsList.innerHTML = `
        <div class="empty-notification">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Failed to load notifications</p>
        </div>
      `;
    }
  }
}

/**
 * Set up notification listeners
 */
function setupNotificationListeners() {
  // Add click listener to mark as read buttons
  document.querySelectorAll('.notification-action[data-action="mark-read"]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      const notificationItem = button.closest('.notification-item');
      const notificationId = parseInt(notificationItem.dataset.id);
      toggleNotificationReadStatus(notificationId, notificationItem);
    });
  });
  
  // Add click listener to notification items
  document.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', () => {
      const notificationId = parseInt(item.dataset.id);
      
      // Mark as read if unread
      if (item.classList.contains('unread')) {
        markNotificationAsRead(notificationId, item);
      }
      
      // If we have notification data with action URL, navigate to it
      const notification = window.notificationsData?.find(n => n.id === notificationId);
      if (notification?.data?.action?.url) {
        window.location.href = notification.data.action.url;
      }
    });
  });
}

/**
 * Toggle notification read status
 * @param {number} notificationId - Notification ID
 * @param {Element} element - Notification element
 */
async function toggleNotificationReadStatus(notificationId, element) {
  try {
    const isCurrentlyUnread = element.classList.contains('unread');
    
    if (isCurrentlyUnread) {
      await markNotificationAsRead(notificationId, element);
    } else {
      // Marking as unread is not supported by the API yet
      // Just update the UI for now
      element.classList.add('unread');
      
      // Update icon
      const iconElement = element.querySelector('.notification-action i');
      if (iconElement) {
        iconElement.className = 'fas fa-envelope-open';
      }
    }
  } catch (error) {
    console.error('Error toggling notification read status:', error);
    showToast('Failed to update notification', 'error');
  }
}

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @param {Element} element - Notification element
 */
async function markNotificationAsRead(notificationId, element) {
  try {
    // Call API
    await api.notifications.markAsRead(notificationId);
    
    // Update UI
    element.classList.remove('unread');
    
    // Update icon
    const iconElement = element.querySelector('.notification-action i');
    if (iconElement) {
      iconElement.className = 'fas fa-envelope';
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    showToast('Failed to mark notification as read', 'error');
  }
}

/**
 * Mark all notifications as read
 */
async function markAllNotificationsAsRead() {
  try {
    // Call API
    await api.notifications.markAllAsRead();
    
    // Update UI - remove unread class from all notification items
    document.querySelectorAll('.notification-item.unread').forEach(item => {
      item.classList.remove('unread');
      
      // Update icon
      const iconElement = item.querySelector('.notification-action i');
      if (iconElement) {
        iconElement.className = 'fas fa-envelope';
      }
    });
    
    // Also update the notifications count in the header
    const notificationsCount = document.getElementById('notifications-count');
    if (notificationsCount) {
      notificationsCount.textContent = '';
    }
    
    // Show success message
    showToast('All notifications marked as read', 'success');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    showToast('Failed to mark all notifications as read', 'error');
  }
}

/**
 * Toggle AR mode 
 * This function loads and activates the AR Module for enhanced visualizations
 */
function toggleARMode() {
  // If ARModule is already loaded, just toggle between active and inactive states
  if (window.ARModule) {
    if (window.ARModule.isActive()) {
      window.ARModule.deactivate();
      showToast('AR Mode deactivated', 'success');
    } else {
      window.ARModule.activate();
      showToast('AR Mode activated', 'success');
    }
    return;
  }
  
  // If ARModule is not loaded yet, load it first
  showToast('Loading AR Module...', 'info');
  
  // Create and append script element to load AR module
  const script = document.createElement('script');
  script.src = '../assets/js/ar-module.js';
  
  // Define onload and onerror callbacks
  script.onload = function() {
    if (window.ARModule) {
      showToast('AR Module loaded successfully', 'success');
      // Activate AR mode immediately after loading
      setTimeout(() => {
        window.ARModule.activate();
      }, 500);
    } else {
      showToast('Failed to initialize AR Module', 'error');
    }
  };
  
  script.onerror = function() {
    showToast('Failed to load AR Module: File not found', 'error');
    
    // Remove the AR toggle active class if it exists
    const arToggleBtn = document.getElementById('ar-toggle');
    if (arToggleBtn) {
      arToggleBtn.classList.remove('active');
    }
  };
  
  // Add script to head
  document.head.appendChild(script);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Refresh button
  const refreshButton = document.getElementById('refresh-data');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      initPortfolioOverview();
      initMarketTickers();
      initNotificationsPanel();
      showToast('Data refreshed', 'success');
    });
  }
  
  // Analytics button
  const analyticsButton = document.getElementById('view-analytics');
  if (analyticsButton) {
    analyticsButton.addEventListener('click', () => {
      showToast('Analytics feature coming soon', 'info');
    });
  }
  
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
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
  initDashboard();
});