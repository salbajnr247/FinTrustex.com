/**
 * FINTRUSTEX UI Components
 * Reusable UI components and elements
 */

/**
 * Load HTML components
 * @param {string} containerId - Container element ID
 * @param {string} componentPath - Path to component HTML file
 */
async function loadComponent(containerId, componentPath) {
  try {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container element not found: ${containerId}`);
      return;
    }
    
    // Fetch component HTML
    const response = await fetch(componentPath);
    const html = await response.text();
    
    // Insert component HTML
    container.innerHTML = html;
    
    // Handle any initialization scripts in the component
    const scripts = container.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.textContent) {
        eval(script.textContent);
      }
    });
  } catch (error) {
    console.error(`Failed to load component ${componentPath}:`, error);
  }
}

/**
 * Create market ticker component
 * @param {string} containerId - Container element ID
 * @param {Array} coins - Array of coin symbols to display
 */
function createMarketTicker(containerId, coins = ['BTC', 'ETH', 'XRP', 'LTC', 'ADA']) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element not found: ${containerId}`);
    return;
  }
  
  // Create ticker HTML
  let html = '<div class="market-ticker">';
  
  coins.forEach(coin => {
    html += `
      <div class="ticker-item" data-symbol="${coin}/USDT">
        <div class="ticker-symbol">${utils.formatCryptoSymbol(coin)}</div>
        <div class="ticker-price">Loading...</div>
        <div class="ticker-change">—</div>
      </div>
    `;
  });
  
  html += '</div>';
  
  // Insert ticker HTML
  container.innerHTML = html;
  
  // Update ticker with market data
  updateMarketTicker();
  
  // Listen for price updates
  if (window.marketDataService) {
    marketDataService.on('price', () => {
      updateMarketTicker();
    });
  }
}

/**
 * Update market ticker with latest prices
 */
function updateMarketTicker() {
  if (!window.marketDataService) return;
  
  const tickerItems = document.querySelectorAll('.ticker-item');
  
  tickerItems.forEach(item => {
    const symbol = item.getAttribute('data-symbol');
    const priceData = marketDataService.getCurrentPrice(symbol);
    
    const priceElement = item.querySelector('.ticker-price');
    const changeElement = item.querySelector('.ticker-change');
    
    if (priceData) {
      // Update price
      priceElement.textContent = utils.formatCurrency(priceData.price);
      
      // Update change percentage
      changeElement.textContent = utils.formatPercentage(priceData.change);
      changeElement.classList.remove('positive', 'negative');
      changeElement.classList.add(priceData.change >= 0 ? 'positive' : 'negative');
    }
  });
}

/**
 * Create market overview table
 * @param {string} containerId - Container element ID
 * @param {number} count - Number of coins to display
 */
function createMarketOverview(containerId, count = 10) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element not found: ${containerId}`);
    return;
  }
  
  // Create overview HTML
  let html = `
    <div class="market-overview">
      <div class="market-overview-header">
        <h3>Market Overview</h3>
        <div class="market-overview-controls">
          <input type="text" id="market-search" placeholder="Search coins..." class="market-search">
          <select id="market-sort" class="market-sort">
            <option value="market_cap_desc">Market Cap ↓</option>
            <option value="market_cap_asc">Market Cap ↑</option>
            <option value="price_desc">Price ↓</option>
            <option value="price_asc">Price ↑</option>
            <option value="change_desc">Change ↓</option>
            <option value="change_asc">Change ↑</option>
            <option value="volume_desc">Volume ↓</option>
            <option value="volume_asc">Volume ↑</option>
          </select>
        </div>
      </div>
      <div class="market-overview-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Coin</th>
              <th>Price</th>
              <th>24h Change</th>
              <th>Market Cap</th>
              <th>Volume (24h)</th>
            </tr>
          </thead>
          <tbody id="market-overview-body">
            ${Array(count).fill('<tr><td colspan="6" class="loading-row">Loading market data...</td></tr>').join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  // Insert overview HTML
  container.innerHTML = html;
  
  // Update overview with market data
  updateMarketOverview();
  
  // Get search and sort controls
  const searchInput = document.getElementById('market-search');
  const sortSelect = document.getElementById('market-sort');
  
  // Set up event listeners for search and sort
  if (searchInput) {
    searchInput.addEventListener('input', utils.debounce(() => {
      updateMarketOverview();
    }, 300));
  }
  
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      updateMarketOverview();
    });
  }
  
  // Listen for market overview updates
  if (window.marketDataService) {
    marketDataService.on('marketOverview', () => {
      updateMarketOverview();
    });
  }
}

/**
 * Update market overview with latest data
 */
async function updateMarketOverview() {
  if (!window.marketDataService) return;
  
  const tableBody = document.getElementById('market-overview-body');
  const searchInput = document.getElementById('market-search');
  const sortSelect = document.getElementById('market-sort');
  
  if (!tableBody) return;
  
  try {
    // Get market data
    let markets = [];
    
    // If we already have this data in marketDataService, use it
    if (marketDataService.lastMarketOverview) {
      markets = marketDataService.lastMarketOverview;
    } else {
      // Otherwise fetch it
      markets = await marketDataService.fetchMarketOverview() || [];
    }
    
    // Apply search filter
    if (searchInput && searchInput.value) {
      const search = searchInput.value.toLowerCase();
      markets = markets.filter(coin => 
        coin.name.toLowerCase().includes(search) || 
        coin.symbol.toLowerCase().includes(search)
      );
    }
    
    // Apply sorting
    if (sortSelect) {
      const sortValue = sortSelect.value;
      
      switch (sortValue) {
        case 'market_cap_asc':
          markets.sort((a, b) => a.market_cap - b.market_cap);
          break;
        case 'market_cap_desc':
          markets.sort((a, b) => b.market_cap - a.market_cap);
          break;
        case 'price_asc':
          markets.sort((a, b) => a.current_price - b.current_price);
          break;
        case 'price_desc':
          markets.sort((a, b) => b.current_price - a.current_price);
          break;
        case 'change_asc':
          markets.sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h);
          break;
        case 'change_desc':
          markets.sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
          break;
        case 'volume_asc':
          markets.sort((a, b) => a.total_volume - b.total_volume);
          break;
        case 'volume_desc':
          markets.sort((a, b) => b.total_volume - a.total_volume);
          break;
      }
    }
    
    // Generate table HTML
    let html = '';
    
    if (markets.length === 0) {
      html = '<tr><td colspan="6" class="no-data">No matching coins found</td></tr>';
    } else {
      markets.forEach((coin, index) => {
        const change = coin.price_change_percentage_24h || 0;
        const changeClass = change >= 0 ? 'positive' : 'negative';
        
        html += `
          <tr>
            <td>${index + 1}</td>
            <td class="coin-cell">
              <img src="${coin.image}" alt="${coin.name}" class="coin-icon" width="24" height="24">
              <div class="coin-name">
                <span class="coin-name-text">${coin.name}</span>
                <span class="coin-symbol">${coin.symbol.toUpperCase()}</span>
              </div>
            </td>
            <td>${utils.formatCurrency(coin.current_price)}</td>
            <td class="${changeClass}">${utils.formatPercentage(change)}</td>
            <td>${utils.formatCurrency(coin.market_cap)}</td>
            <td>${utils.formatCurrency(coin.total_volume)}</td>
          </tr>
        `;
      });
    }
    
    // Update table
    tableBody.innerHTML = html;
  } catch (error) {
    console.error('Failed to update market overview:', error);
    tableBody.innerHTML = '<tr><td colspan="6" class="error-row">Failed to load market data</td></tr>';
  }
}

/**
 * Create portfolio summary component
 * @param {string} containerId - Container element ID
 * @param {Array} portfolio - Portfolio data
 */
function createPortfolioSummary(containerId, portfolio = []) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element not found: ${containerId}`);
    return;
  }
  
  // Create portfolio HTML
  let html = `
    <div class="portfolio-summary">
      <div class="portfolio-header">
        <h3>Portfolio Summary</h3>
        <div class="portfolio-controls">
          <button id="refresh-portfolio" class="btn btn-sm btn-outline">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
          <button id="add-asset" class="btn btn-sm btn-yellow">
            <i class="fas fa-plus"></i> Add Asset
          </button>
        </div>
      </div>
      <div class="portfolio-value">
        <div class="portfolio-total">
          <span class="total-label">Total Value:</span>
          <span class="total-value" id="portfolio-total-value">Loading...</span>
        </div>
        <div class="portfolio-change">
          <span class="change-label">24h Change:</span>
          <span class="change-value" id="portfolio-total-change">—</span>
        </div>
      </div>
      <div class="portfolio-assets" id="portfolio-assets-list">
        <div class="loading-portfolio">Loading portfolio...</div>
      </div>
    </div>
  `;
  
  // Insert portfolio HTML
  container.innerHTML = html;
  
  // Update portfolio with data
  updatePortfolioSummary(portfolio);
  
  // Set up event listeners
  const refreshButton = document.getElementById('refresh-portfolio');
  const addButton = document.getElementById('add-asset');
  
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      updatePortfolioSummary(portfolio);
    });
  }
  
  if (addButton) {
    addButton.addEventListener('click', () => {
      showAddAssetModal();
    });
  }
  
  // Listen for price updates
  if (window.marketDataService) {
    marketDataService.on('price', () => {
      updatePortfolioSummary(portfolio);
    });
  }
}

/**
 * Update portfolio summary with latest data
 * @param {Array} portfolio - Portfolio data
 */
function updatePortfolioSummary(portfolio = []) {
  if (!window.marketDataService) return;
  
  const assetsList = document.getElementById('portfolio-assets-list');
  const totalValueElement = document.getElementById('portfolio-total-value');
  const totalChangeElement = document.getElementById('portfolio-total-change');
  
  if (!assetsList || !totalValueElement || !totalChangeElement) return;
  
  // Calculate total value and change
  let totalValue = 0;
  let totalChange = 0;
  
  portfolio.forEach(asset => {
    const priceData = marketDataService.getCurrentPrice(`${asset.symbol}/USDT`);
    
    if (priceData) {
      // Calculate current value
      const currentValue = asset.amount * priceData.price;
      
      // Add to totals
      totalValue += currentValue;
      totalChange += currentValue * (priceData.change / 100);
    }
  });
  
  // Update total elements
  totalValueElement.textContent = utils.formatCurrency(totalValue);
  totalChangeElement.textContent = utils.formatCurrency(totalChange);
  totalChangeElement.classList.remove('positive', 'negative');
  totalChangeElement.classList.add(totalChange >= 0 ? 'positive' : 'negative');
  
  // Generate assets list HTML
  let html = '';
  
  if (portfolio.length === 0) {
    html = '<div class="no-assets">No assets in portfolio</div>';
  } else {
    html += '<div class="assets-table">';
    
    portfolio.forEach(asset => {
      const priceData = marketDataService.getCurrentPrice(`${asset.symbol}/USDT`);
      
      if (priceData) {
        const currentValue = asset.amount * priceData.price;
        const change = priceData.change || 0;
        const changeClass = change >= 0 ? 'positive' : 'negative';
        
        html += `
          <div class="asset-row">
            <div class="asset-icon">
              <img src="${asset.icon || `https://coinicons-api.vercel.app/api/icon/${asset.symbol.toLowerCase()}`}" 
                   alt="${asset.symbol}" width="32" height="32">
            </div>
            <div class="asset-info">
              <div class="asset-name">${asset.name}</div>
              <div class="asset-amount">${utils.formatNumber(asset.amount)} ${asset.symbol}</div>
            </div>
            <div class="asset-value">
              <div class="asset-price">${utils.formatCurrency(priceData.price)}</div>
              <div class="asset-price-change ${changeClass}">${utils.formatPercentage(change)}</div>
            </div>
            <div class="asset-total">${utils.formatCurrency(currentValue)}</div>
          </div>
        `;
      }
    });
    
    html += '</div>';
  }
  
  // Update assets list
  assetsList.innerHTML = html;
}

/**
 * Show add asset modal
 */
function showAddAssetModal() {
  // Create modal HTML
  const modalId = 'add-asset-modal';
  let modalHtml = `
    <div class="modal" id="${modalId}">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add Asset</h3>
          <button class="modal-close" data-modal-close="${modalId}">×</button>
        </div>
        <div class="modal-body">
          <form id="add-asset-form">
            <div class="form-group">
              <label for="asset-symbol">Coin</label>
              <select id="asset-symbol" class="glassmorph-input" required>
                <option value="">Select a coin</option>
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="XRP">Ripple (XRP)</option>
                <option value="LTC">Litecoin (LTC)</option>
                <option value="ADA">Cardano (ADA)</option>
                <option value="DOT">Polkadot (DOT)</option>
                <option value="BNB">Binance Coin (BNB)</option>
                <option value="LINK">Chainlink (LINK)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="asset-amount">Amount</label>
              <input type="number" id="asset-amount" class="glassmorph-input" step="any" min="0" required>
            </div>
            <div class="form-group">
              <label for="asset-purchase-price">Purchase Price (optional)</label>
              <input type="number" id="asset-purchase-price" class="glassmorph-input" step="any" min="0">
            </div>
            <div class="form-group">
              <label for="asset-purchase-date">Purchase Date (optional)</label>
              <input type="date" id="asset-purchase-date" class="glassmorph-input">
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-outline" data-modal-close="${modalId}">Cancel</button>
              <button type="submit" class="btn btn-yellow">Add Asset</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  
  // Create modal element
  const modalElement = document.createElement('div');
  modalElement.innerHTML = modalHtml;
  document.body.appendChild(modalElement.firstElementChild);
  
  // Show modal
  const modal = document.getElementById(modalId);
  modal.classList.add('show');
  
  // Handle close button
  const closeButtons = modal.querySelectorAll('[data-modal-close]');
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
      }, 300);
    });
  });
  
  // Handle form submission
  const form = document.getElementById('add-asset-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form values
    const symbol = document.getElementById('asset-symbol').value;
    const amount = parseFloat(document.getElementById('asset-amount').value);
    const purchasePrice = parseFloat(document.getElementById('asset-purchase-price').value) || null;
    const purchaseDate = document.getElementById('asset-purchase-date').value || null;
    
    // Create new asset
    const newAsset = {
      symbol,
      name: document.getElementById('asset-symbol').options[document.getElementById('asset-symbol').selectedIndex].text,
      amount,
      purchasePrice,
      purchaseDate
    };
    
    // Add asset to portfolio
    addAssetToPortfolio(newAsset);
    
    // Close modal
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  });
}

/**
 * Add asset to portfolio
 * @param {Object} asset - Asset data
 */
function addAssetToPortfolio(asset) {
  // In a real application, this would call an API to update the portfolio
  // For this demo, we'll use local storage
  
  try {
    // Get existing portfolio
    const portfolio = JSON.parse(localStorage.getItem('portfolio') || '[]');
    
    // Add new asset
    portfolio.push(asset);
    
    // Save updated portfolio
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
    
    // Update UI
    updatePortfolioSummary(portfolio);
  } catch (error) {
    console.error('Failed to add asset to portfolio:', error);
    alert('Failed to add asset to portfolio. Please try again.');
  }
}

/**
 * Create price chart component
 * @param {string} containerId - Container element ID
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - Chart timeframe
 */
function createPriceChart(containerId, symbol = 'BTC/USDT', timeframe = '1d') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element not found: ${containerId}`);
    return;
  }
  
  // Create chart HTML
  let html = `
    <div class="price-chart-component">
      <div class="chart-header">
        <div class="chart-title">
          <h3 id="chart-symbol">${symbol}</h3>
          <div class="price-info">
            <span class="current-price" id="chart-price">Loading...</span>
            <span class="price-change" id="chart-change">—</span>
          </div>
        </div>
        <div class="chart-timeframes">
          <button class="chart-timeframe" data-timeframe="1h">1H</button>
          <button class="chart-timeframe" data-timeframe="4h">4H</button>
          <button class="chart-timeframe" data-timeframe="1d">1D</button>
          <button class="chart-timeframe" data-timeframe="1w">1W</button>
          <button class="chart-timeframe" data-timeframe="1M">1M</button>
        </div>
      </div>
      <div class="chart-container" id="${containerId}-chart"></div>
    </div>
  `;
  
  // Insert chart HTML
  container.innerHTML = html;
  
  // Initialize chart
  const chartElement = document.getElementById(`${containerId}-chart`);
  let chart = null;
  let series = null;
  
  // If LightweightCharts is available, use it
  if (window.LightweightCharts) {
    chart = LightweightCharts.createChart(chartElement, {
      width: chartElement.clientWidth,
      height: 300,
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
      }
    });
    
    // Add price series
    series = chart.addAreaSeries({
      topColor: 'rgba(255, 192, 0, 0.4)',
      bottomColor: 'rgba(255, 192, 0, 0.0)',
      lineColor: 'rgba(255, 192, 0, 1)',
      lineWidth: 2,
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (chart) {
        chart.resize(chartElement.clientWidth, 300);
      }
    });
  } else {
    chartElement.innerHTML = '<div class="chart-error">Chart library not available</div>';
  }
  
  // Set active timeframe button
  const timeframeButtons = document.querySelectorAll('.chart-timeframe');
  timeframeButtons.forEach(button => {
    if (button.getAttribute('data-timeframe') === timeframe) {
      button.classList.add('active');
    }
    
    button.addEventListener('click', () => {
      // Update active button
      timeframeButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update timeframe
      const newTimeframe = button.getAttribute('data-timeframe');
      loadChartData(symbol, newTimeframe);
    });
  });
  
  // Load initial data
  loadChartData(symbol, timeframe);
  
  // Update price display
  updateChartPrice(symbol);
  
  // Listen for price updates
  if (window.marketDataService) {
    marketDataService.on('price', () => {
      updateChartPrice(symbol);
    });
  }
  
  /**
   * Load chart data
   * @param {string} symbol - Trading pair symbol
   * @param {string} timeframe - Chart timeframe
   */
  function loadChartData(symbol, timeframe) {
    if (!window.marketDataService || !chart || !series) return;
    
    // Format symbol for API
    const apiSymbol = symbol.replace('/', '');
    
    // Show loading
    chartElement.classList.add('loading');
    
    // Get chart data
    marketDataService.getKlines(apiSymbol, timeframe)
      .then(data => {
        if (!data || !data.length) {
          chartElement.innerHTML = '<div class="chart-error">No data available</div>';
          return;
        }
        
        // Format data for chart
        const chartData = data.map(candle => ({
          time: candle.time / 1000,
          value: candle.close
        }));
        
        // Update series
        series.setData(chartData);
        
        // Update chart title
        document.getElementById('chart-symbol').textContent = symbol;
        
        // Fit visible range
        chart.timeScale().fitContent();
        
        // Remove loading
        chartElement.classList.remove('loading');
      })
      .catch(error => {
        console.error('Failed to load chart data:', error);
        chartElement.innerHTML = '<div class="chart-error">Failed to load chart data</div>';
      });
  }
  
  /**
   * Update chart price display
   * @param {string} symbol - Trading pair symbol
   */
  function updateChartPrice(symbol) {
    if (!window.marketDataService) return;
    
    const priceData = marketDataService.getCurrentPrice(symbol);
    const priceElement = document.getElementById('chart-price');
    const changeElement = document.getElementById('chart-change');
    
    if (priceData && priceElement && changeElement) {
      // Update price
      priceElement.textContent = utils.formatCurrency(priceData.price);
      
      // Update change
      const change = priceData.change || 0;
      changeElement.textContent = utils.formatPercentage(change);
      changeElement.classList.remove('positive', 'negative');
      changeElement.classList.add(change >= 0 ? 'positive' : 'negative');
    }
  }
}

// Export components
window.components = {
  loadComponent,
  createMarketTicker,
  updateMarketTicker,
  createMarketOverview,
  updateMarketOverview,
  createPortfolioSummary,
  updatePortfolioSummary,
  createPriceChart
};