// Shared Utilities
const showToast = (message, type = 'success') => {
  const toastContainer = document.querySelector('.toast-container') || document.createElement('div');
  toastContainer.classList.add('toast-container');
  document.body.appendChild(toastContainer);
  const toast = document.createElement('div');
  toast.classList.add('toast', `toast-${type}`);
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

// Theme Toggle
const initThemeToggle = () => {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      document.body.classList.toggle('dark-theme');
      showToast('Theme toggled', 'success');
    });
  }
};

// Initialize Page-Specific Scripts
const initPage = () => {
  const path = window.location.pathname;
  try {
    if (path.includes('dashboard.html')) {
      initDashboard();
    } else if (path.includes('orders.html')) {
      initOrders();
    } else if (path.includes('wallet.html')) {
      initWallet();
    } else if (path.includes('trading.html')) {
      initTrading();
    }
  } catch (error) {
    console.error('Error initializing page:', error);
    showToast('Error initializing page', 'error');
  }
};

// Mock API Data (Replace with actual API calls)
const fetchMockData = async (type) => {
  const mockData = {
    dashboard: {
      balance: 12500,
      change: 2.5,
      tickers: [
        { pair: 'BTC/USDT', price: 60000, change: 1.2 },
        { pair: 'ETH/USDT', price: 2500, change: -0.8 }
      ]
    },
    orders: [
      { id: 'ORD12345', pair: 'BTC/USDT', type: 'Limit', amount: 0.1, price: 60000, status: 'Open' },
      { id: 'ORD12346', pair: 'ETH/USDT', type: 'Market', amount: 1, price: 2500, status: 'Filled' }
    ],
    wallet: {
      btc: { balance: 0.0000, address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', transactions: [{ date: '2025-04-17', amount: 0.01 }] },
      eth: { balance: 0.0000, address: '0x1234567890abcdef1234567890abcdef12345678', transactions: [{ date: '2025-04-17', amount: 0.5 }] }
    },
    trading: {
      orderBook: [
        { type: 'bid', price: 60000, amount: 1 },
        { type: 'ask', price: 61000, amount: 1 }
      ],
      tradeHistory: [{ date: '2025-04-17', type: 'buy', amount: 0.1, price: 60000 }]
    }
  };
  return mockData[type] || {};
};

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initPage();
});