async function initDashboard() {
  try {
    // Fetch Data from API
    const data = await fetchApiData('dashboard');

    // Update Portfolio Overview
    const overview = document.querySelector('.dashboard-overview');
    if (overview) {
      overview.innerHTML = `
        <h3>Portfolio Overview</h3>
        <p>Total Balance: $${data.balance.toLocaleString()}</p>
        <p>24h Change: <span class="${data.change >= 0 ? 'positive' : 'negative'}">${data.change >= 0 ? '+' : ''}${data.change}%</span></p>
      `;
    }

    // Update Market Tickers
    const tickers = document.getElementById('market-tickers');
    if (tickers) {
      tickers.innerHTML = `
        <h3>Market Tickers</h3>
        ${data.tickers.map(ticker => `
          <div class="ticker-item">
            <span>${ticker.pair}</span>
            <span>$${ticker.price.toLocaleString()}</span>
            <span class="${ticker.change >= 0 ? 'positive' : 'negative'}">${ticker.change >= 0 ? '+' : ''}${ticker.change}%</span>
          </div>
        `).join('')}
      `;
    }

    // Refresh Button
    const refreshButton = document.getElementById('refresh-data');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        initDashboard();
        showToast('Data refreshed', 'success');
      });
    }

    // Analytics Button (Placeholder)
    const analyticsButton = document.getElementById('view-analytics');
    if (analyticsButton) {
      analyticsButton.addEventListener('click', () => {
        showToast('Navigating to Analytics', 'success');
        // Navigate to analytics page (e.g., '../earn/earn.html')
      });
    }

    // Re-initialize AOS for dynamic content
    AOS.init({ duration: 800 });
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showToast('Error loading dashboard data', 'error');
  }
}