/**
 * FinTrustEX AR Module
 * Provides augmented reality visualization for trading data
 */

// Define global AR module
window.ARModule = (function() {
  // Private variables
  let isActive = false;
  let container = null;
  let currentChart = null;
  let currentSymbol = null;
  let tickerData = [];
  
  // Initialize the module
  function init() {
    console.log("Initializing AR Module...");
    
    // Create container for AR elements
    container = document.createElement('div');
    container.className = 'ar-container';
    container.style.display = 'none';
    document.body.appendChild(container);
    
    // Add event listeners for AR interactions
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('resize', updateARLayout);
    
    console.log("AR Module initialized successfully");
  }
  
  // Activate AR mode
  function activate() {
    if (isActive) return;
    
    console.log("Activating AR Mode...");
    
    // Check for DeviceOrientationEvent permissions
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            startARMode();
          } else {
            console.error("Permission denied for DeviceOrientationEvent");
            showARError("Permission denied for AR mode. Please allow motion sensors.");
          }
        })
        .catch(err => {
          console.error("Error requesting DeviceOrientationEvent permission:", err);
          // Fall back to desktop AR mode
          startARMode(true);
        });
    } else {
      // Browser doesn't require permission or doesn't support DeviceOrientationEvent
      startARMode(true);
    }
  }
  
  // Start AR mode
  function startARMode(isDesktopMode = false) {
    isActive = true;
    
    // Modify container display
    container.style.display = 'block';
    document.body.classList.add('ar-active');
    
    // Update UI to show we're in AR mode
    const arToggleBtn = document.getElementById('ar-toggle');
    if (arToggleBtn) {
      arToggleBtn.textContent = 'Exit AR';
      arToggleBtn.classList.add('active');
    }
    
    // Get current trading pair from chart
    currentSymbol = document.getElementById('chartPair')?.textContent || 'BTC/USD';
    
    // Create AR content
    createARContent(isDesktopMode);
    
    // Start ticker data updates
    startTickerUpdates();
    
    console.log("AR Mode activated with " + (isDesktopMode ? "desktop" : "mobile") + " mode");
  }
  
  // Create AR content
  function createARContent(isDesktopMode) {
    // Clear any existing content
    container.innerHTML = '';
    
    // Create AR header
    const header = document.createElement('div');
    header.className = 'ar-header';
    header.innerHTML = `
      <h2>${currentSymbol} AR View</h2>
      <p>Move your device to explore the data</p>
      <button id="ar-close-btn" class="ar-close-btn">Exit AR</button>
    `;
    container.appendChild(header);
    
    // Create 3D price visualization
    const priceVisualization = document.createElement('div');
    priceVisualization.className = 'ar-price-viz';
    priceVisualization.innerHTML = `
      <div class="ar-price-container">
        <div class="ar-price-value">$0</div>
        <div class="ar-price-bar"></div>
      </div>
    `;
    container.appendChild(priceVisualization);
    
    // Create ticker data nodes
    const tickerNodes = document.createElement('div');
    tickerNodes.className = 'ar-ticker-nodes';
    container.appendChild(tickerNodes);
    
    // Add click event to the close button
    document.getElementById('ar-close-btn').addEventListener('click', deactivate);
    
    // If desktop mode, add mouse move listener to simulate device orientation
    if (isDesktopMode) {
      document.addEventListener('mousemove', handleMouseMove);
    }
    
    // Initial layout update
    updateARLayout();
  }
  
  // Update AR layout based on screen size and orientation
  function updateARLayout() {
    if (!isActive || !container) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Adjust AR elements based on screen dimensions
    container.style.width = width + 'px';
    container.style.height = height + 'px';
    
    console.log("AR layout updated:", width, "x", height);
  }
  
  // Handle device orientation for AR positioning
  function handleOrientation(event) {
    if (!isActive) return;
    
    const beta = event.beta;  // x-axis rotation (-180 to 180)
    const gamma = event.gamma; // y-axis rotation (-90 to 90)
    const alpha = event.alpha; // z-axis rotation (0 to 360)
    
    updateARElementPositions(beta, gamma, alpha);
  }
  
  // Handle mouse movement for desktop AR mode
  function handleMouseMove(event) {
    if (!isActive) return;
    
    // Convert mouse position to orientation-like values
    const x = event.clientX;
    const y = event.clientY;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Map mouse position to orientation angles
    const gamma = ((x / width) - 0.5) * 180; // -90 to 90
    const beta = ((y / height) - 0.5) * 180;  // -90 to 90
    
    updateARElementPositions(beta, gamma, 0);
  }
  
  // Update positions of AR elements based on orientation
  function updateARElementPositions(beta, gamma, alpha) {
    // Limit the values for stability
    const limitedBeta = Math.max(-45, Math.min(45, beta));
    const limitedGamma = Math.max(-45, Math.min(45, gamma));
    
    // Update AR price visualization
    const priceBar = document.querySelector('.ar-price-bar');
    if (priceBar) {
      priceBar.style.transform = `rotateX(${limitedBeta}deg) rotateY(${limitedGamma}deg)`;
    }
    
    // Update ticker nodes
    const tickerNodes = document.querySelectorAll('.ar-ticker-node');
    tickerNodes.forEach((node, index) => {
      const offsetX = (index % 3 - 1) * 50;
      const offsetY = (Math.floor(index / 3) - 1) * 50;
      
      node.style.transform = `translate(${offsetX + limitedGamma * 2}px, ${offsetY + limitedBeta * 2}px)`;
    });
  }
  
  // Start periodic updates of ticker data
  function startTickerUpdates() {
    // Fetch initial data
    fetchTickerData();
    
    // Set up interval for updates
    const updateInterval = setInterval(() => {
      if (!isActive) {
        clearInterval(updateInterval);
        return;
      }
      
      fetchTickerData();
    }, 5000);
  }
  
  // Fetch ticker data for AR visualization
  function fetchTickerData() {
    if (!isActive) return;
    
    // Try to use the API if available
    if (window.api && api.market) {
      api.market.getMarkets(9)
        .then(data => {
          tickerData = data;
          updateARTickerNodes();
          updateARPriceDisplay();
        })
        .catch(err => {
          console.error("Error fetching ticker data for AR:", err);
          // Use placeholder data
          generatePlaceholderTickerData();
        });
    } else {
      // Generate placeholder data if API is not available
      generatePlaceholderTickerData();
    }
  }
  
  // Generate placeholder ticker data for demo purposes
  function generatePlaceholderTickerData() {
    const symbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOT', 'DOGE', 'AVAX'];
    
    tickerData = symbols.map((symbol, index) => {
      return {
        symbol: symbol,
        current_price: 1000 / (index + 1) + Math.random() * 100,
        price_change_percentage_24h: (Math.random() * 10) - 5,
        market_cap: Math.random() * 1000000000,
        total_volume: Math.random() * 10000000
      };
    });
    
    updateARTickerNodes();
    updateARPriceDisplay();
  }
  
  // Update AR ticker nodes with data
  function updateARTickerNodes() {
    if (!isActive) return;
    
    const tickerNodesContainer = document.querySelector('.ar-ticker-nodes');
    if (!tickerNodesContainer) return;
    
    // Clear existing nodes
    tickerNodesContainer.innerHTML = '';
    
    // Create nodes for ticker data
    tickerData.forEach((ticker, index) => {
      const node = document.createElement('div');
      node.className = 'ar-ticker-node';
      node.dataset.symbol = ticker.symbol;
      
      // Determine positivity for styling
      const isPositive = ticker.price_change_percentage_24h >= 0;
      
      node.innerHTML = `
        <div class="ar-ticker-symbol">${ticker.symbol}</div>
        <div class="ar-ticker-price">$${ticker.current_price.toFixed(2)}</div>
        <div class="ar-ticker-change ${isPositive ? 'positive' : 'negative'}">
          ${isPositive ? '+' : ''}${ticker.price_change_percentage_24h.toFixed(2)}%
        </div>
      `;
      
      // Position the node with some randomization
      const angle = (index / tickerData.length) * Math.PI * 2;
      const radius = 150;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      node.style.left = `calc(50% + ${x}px)`;
      node.style.top = `calc(50% + ${y}px)`;
      
      tickerNodesContainer.appendChild(node);
    });
  }
  
  // Update AR price display
  function updateARPriceDisplay() {
    if (!isActive) return;
    
    // Find the current symbol in ticker data
    const currentSymbolTicker = tickerData.find(ticker => 
      currentSymbol.includes(ticker.symbol)
    );
    
    if (!currentSymbolTicker) return;
    
    // Update the price value
    const priceValue = document.querySelector('.ar-price-value');
    if (priceValue) {
      priceValue.textContent = `$${currentSymbolTicker.current_price.toFixed(2)}`;
      
      // Update color based on price change
      if (currentSymbolTicker.price_change_percentage_24h >= 0) {
        priceValue.classList.remove('negative');
        priceValue.classList.add('positive');
      } else {
        priceValue.classList.remove('positive');
        priceValue.classList.add('negative');
      }
    }
    
    // Update the price bar height proportionally
    const priceBar = document.querySelector('.ar-price-bar');
    if (priceBar) {
      // Scale the bar height based on price (arbitrary scale)
      const barHeightPercentage = Math.min(100, Math.max(10, 
        Math.log(currentSymbolTicker.current_price) * 10));
      
      priceBar.style.height = `${barHeightPercentage}%`;
    }
  }
  
  // Show AR error message
  function showARError(message) {
    if (!container) return;
    
    const error = document.createElement('div');
    error.className = 'ar-error';
    error.textContent = message;
    
    container.innerHTML = '';
    container.appendChild(error);
    container.style.display = 'flex';
    
    // Add a close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ar-close-btn';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', deactivate);
    
    error.appendChild(closeBtn);
  }
  
  // Deactivate AR mode
  function deactivate() {
    if (!isActive) return;
    
    console.log("Deactivating AR Mode...");
    
    isActive = false;
    
    // Hide AR container
    if (container) {
      container.style.display = 'none';
    }
    
    document.body.classList.remove('ar-active');
    
    // Update AR toggle button
    const arToggleBtn = document.getElementById('ar-toggle');
    if (arToggleBtn) {
      arToggleBtn.textContent = 'AR Mode';
      arToggleBtn.classList.remove('active');
    }
    
    // Remove mouse move listener if it was added
    document.removeEventListener('mousemove', handleMouseMove);
    
    console.log("AR Mode deactivated");
  }
  
  // Initialize the module immediately
  init();
  
  // Public API
  return {
    activate: activate,
    deactivate: deactivate,
    isActive: () => isActive
  };
})();