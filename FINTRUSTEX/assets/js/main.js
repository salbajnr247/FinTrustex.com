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
    } else if (path.includes('notifications.html')) {
      // The notifications.js file will handle initialization
      if (typeof initNotificationsPage === 'function') {
        initNotificationsPage();
      } else {
        console.warn('Notifications page script not loaded');
      }
    }
  } catch (error) {
    console.error('Error initializing page:', error);
    showToast('Error initializing page', 'error');
  }
};

// API Data - Fetches data from our backend API
const fetchApiData = async (type) => {
  try {
    // Get user information (for now, hardcoded user ID 1, but should be based on logged-in user)
    const userId = 1; // This should come from authentication
    
    switch (type) {
      case 'dashboard': {
        // Get user's wallets to calculate total balance
        const wallets = await api.wallet.getUserWallets(userId);
        // Get market tickers
        const markets = await api.market.getMarkets();
        
        // Calculate total balance and 24h change
        let totalBalance = 0;
        let change = 0;
        
        // In a real implementation, you would calculate these values from wallet data
        // and market data, but for now, we're returning simplified data
        
        return {
          balance: totalBalance || 0,
          change: change || 0,
          tickers: markets || []
        };
      }
      
      case 'orders':
        return await api.order.getOrders(userId);
        
      case 'wallet': {
        const wallets = await api.wallet.getUserWallets(userId);
        const transactions = await api.transaction.getTransactions(userId);
        
        // Transform wallet data into the expected format
        // This is a simplified example; you would need to adapt this to your actual API response
        return {
          btc: wallets.find(w => w.currency === 'BTC') || { balance: 0, address: '', transactions: [] },
          eth: wallets.find(w => w.currency === 'ETH') || { balance: 0, address: '', transactions: [] }
        };
      }
      
      case 'trading':
        // For trading, you would typically fetch order book and trading history
        // This is a simplified example
        return {
          orderBook: [],
          tradeHistory: []
        };
        
      default:
        console.warn(`No API handler for data type: ${type}`);
        return {};
    }
  } catch (error) {
    console.error(`Error fetching ${type} data:`, error);
    showToast(`Error fetching ${type} data: ${error.message}`, 'error');
    
    // Return empty data rather than failing completely
    return type === 'dashboard' ? { balance: 0, change: 0, tickers: [] } :
           type === 'orders' ? [] :
           type === 'wallet' ? { btc: { balance: 0, address: '', transactions: [] }, eth: { balance: 0, address: '', transactions: [] } } :
           type === 'trading' ? { orderBook: [], tradeHistory: [] } : {};
  }
};

// Initialize notifications
const initNotifications = async () => {
  try {
    // Get notification bell and count elements
    const notificationCount = document.getElementById('notifications-count');
    const notificationIcon = document.querySelector('.notifications-icon');
    
    if (!notificationCount || !notificationIcon) return;
    
    // Check if API is available
    if (!window.api || !window.api.notifications) {
      console.warn('Notifications API not available');
      return;
    }
    
    // Update notification count
    const updateNotificationCount = async () => {
      try {
        const unreadNotifications = await api.notifications.getUnread();
        const count = unreadNotifications.length;
        
        // Update badge
        notificationCount.textContent = count > 0 ? count : '';
        
        // Return the unread notifications for potential use
        return unreadNotifications;
      } catch (error) {
        console.error('Error fetching unread notifications:', error);
        return [];
      }
    };
    
    // Initial update
    await updateNotificationCount();
    
    // Set up WebSocket listener for new notifications
    if (window.websocketClient) {
      websocketClient.addEventListener('notification', async () => {
        await updateNotificationCount();
      });
    }
    
    // Add click event to notification bell
    notificationIcon.addEventListener('click', () => {
      // Navigate to notifications page
      window.location.href = '/dashboard/notifications.html';
    });
    
    // Set up periodic refresh (every 60 seconds)
    setInterval(updateNotificationCount, 60000);
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
};

// Initialize navigation links
const initNavigationLinks = () => {
  // Get all elements with data-nav attribute
  const navLinks = document.querySelectorAll('[data-nav]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      // Prevent default for <a> elements
      if (link.tagName === 'A') {
        event.preventDefault();
      }
      
      const navPath = link.getAttribute('data-nav');
      if (navPath) {
        window.location.href = navPath;
      }
    });
  });
};

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  // Load required scripts
  if (!window.api) {
    console.warn('API service not loaded. Attempting to load it now.');
    const apiScript = document.createElement('script');
    apiScript.src = '../assets/js/api.js';
    apiScript.onload = () => {
      console.log('API service loaded successfully.');
      initThemeToggle();
      initNotifications();
      initNavigationLinks();
      initPage();
    };
    apiScript.onerror = () => {
      console.error('Failed to load API service.');
      showToast('Error: Failed to load API service', 'error');
    };
    document.head.appendChild(apiScript);
  } else {
    initThemeToggle();
    initNotifications();
    initNavigationLinks();
    initPage();
  }
});