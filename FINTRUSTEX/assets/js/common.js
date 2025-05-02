/**
 * Common JavaScript utilities for FinTrustEX
 */

// User session management
function getUserInfo() {
  // In a real implementation, this would fetch from the server or local storage
  // For now, return a placeholder
  return {
    id: 1,
    username: 'demo_user',
    isAdmin: false
  };
}

// Notification system
function showNotification(message, type = 'info') {
  const notificationContainer = document.getElementById('notification-container');
  
  if (!notificationContainer) {
    console.error('Notification container not found');
    return;
  }
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  notificationContainer.appendChild(notification);
  
  // Remove notification after 5 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      if (notification.parentNode === notificationContainer) {
        notificationContainer.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Format currency
function formatCurrency(value, currency = 'USD', maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: maximumFractionDigits
  }).format(value);
}

// Format number
function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maximumFractionDigits
  }).format(value);
}

// Format percentage
function formatPercentage(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: maximumFractionDigits
  }).format(value / 100);
}

// Format date
function formatDate(date, options = {}) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

// Truncate string
function truncateString(str, maxLength = 20) {
  if (str.length <= maxLength) {
    return str;
  }
  
  return str.slice(0, maxLength) + '...';
}

// Debounce function
function debounce(func, wait = 300) {
  let timeout;
  
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

// Throttle function
function throttle(func, limit = 300) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Copy to clipboard
function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          resolve(true);
        })
        .catch(error => {
          console.error('Failed to copy: ', error);
          reject(error);
        });
    } else {
      // Fallback for older browsers
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
          resolve(true);
        } else {
          reject(new Error('Copy command was unsuccessful'));
        }
      } catch (error) {
        console.error('Failed to copy: ', error);
        reject(error);
      }
    }
  });
}

// Convert hex color to rgba
function hexToRgba(hex, alpha = 1) {
  if (!hex) {
    return '';
  }
  
  // Remove the hash if it exists
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Initialize common elements
document.addEventListener('DOMContentLoaded', function() {
  // Populate user information if available
  const usernameElement = document.getElementById('username');
  const userAvatarElement = document.getElementById('user-avatar');
  
  if (usernameElement) {
    const userInfo = getUserInfo();
    usernameElement.textContent = userInfo.username;
  }
});

// Export utilities as global variables
window.utils = {
  showNotification,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  truncateString,
  debounce,
  throttle,
  copyToClipboard,
  hexToRgba
};