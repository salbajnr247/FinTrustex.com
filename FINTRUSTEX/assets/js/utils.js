/**
 * FINTRUSTEX Utility Functions
 * Various utility functions for formatting, validating, and processing data
 */

const utils = {
  /**
   * Format currency value
   * @param {number} value - Value to format
   * @param {string} currency - Currency symbol (default: $)
   * @param {number} decimals - Number of decimal places (default: 2)
   * @returns {string} - Formatted currency value
   */
  formatCurrency: (value, currency = '$', decimals = 2) => {
    if (value === undefined || value === null) return '—';
    
    // For crypto with small values, show more decimals
    if (value > 0 && value < 0.01) {
      decimals = 8;
    } else if (value > 0 && value < 1) {
      decimals = 6;
    } else if (value > 1000) {
      decimals = 0;
    }
    
    return `${currency}${parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}`;
  },
  
  /**
   * Format percentage value
   * @param {number} value - Value to format
   * @param {number} decimals - Number of decimal places (default: 2)
   * @returns {string} - Formatted percentage value
   */
  formatPercentage: (value, decimals = 2) => {
    if (value === undefined || value === null) return '—';
    
    const sign = value >= 0 ? '+' : '';
    return `${sign}${parseFloat(value).toFixed(decimals)}%`;
  },
  
  /**
   * Format number with thousands separators
   * @param {number} value - Value to format
   * @param {number} decimals - Number of decimal places (default: 4)
   * @returns {string} - Formatted number
   */
  formatNumber: (value, decimals = 4) => {
    if (value === undefined || value === null) return '—';
    
    return parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },
  
  /**
   * Format date/time
   * @param {string|Date} date - Date to format
   * @param {string} format - Format (default: 'full')
   * @returns {string} - Formatted date
   */
  formatDate: (date, format = 'full') => {
    if (!date) return '—';
    
    const d = new Date(date);
    
    switch (format) {
      case 'date':
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      case 'time':
        return d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
      case 'short':
        return d.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: '2-digit'
        });
      case 'full':
      default:
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
    }
  },
  
  /**
   * Format time ago (relative time)
   * @param {string|Date} date - Date to format
   * @returns {string} - Relative time (e.g., '5 minutes ago')
   */
  formatTimeAgo: (date) => {
    if (!date) return '—';
    
    const d = new Date(date);
    const now = new Date();
    const seconds = Math.floor((now - d) / 1000);
    
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
    
    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} month${months !== 1 ? 's' : ''} ago`;
    }
    
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  },
  
  // Keep timeAgo as an alias for backward compatibility
  timeAgo: function(date) {
    return this.formatTimeAgo(date);
  },
  
  /**
   * Truncate text with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} length - Maximum length (default: 20)
   * @returns {string} - Truncated text
   */
  truncateText: (text, length = 20) => {
    if (!text) return '';
    
    if (text.length <= length) {
      return text;
    }
    
    return `${text.substring(0, length)}...`;
  },
  
  /**
   * Format cryptocurrency symbol
   * @param {string} symbol - Symbol (e.g., 'BTC', 'ETH')
   * @returns {string} - Formatted symbol with icon
   */
  formatCryptoSymbol: (symbol) => {
    if (!symbol) return '';
    
    const symbolIcons = {
      BTC: '<i class="fab fa-bitcoin"></i>',
      ETH: '<i class="fab fa-ethereum"></i>',
      // Add more icons as needed
    };
    
    const icon = symbolIcons[symbol] || '';
    return `${icon} ${symbol}`;
  },
  
  /**
   * Convert between crypto units
   * @param {number} value - Value to convert
   * @param {string} from - From unit (satoshi, wei, gwei, etc.)
   * @param {string} to - To unit (BTC, ETH, etc.)
   * @returns {number} - Converted value
   */
  convertCryptoUnits: (value, from, to) => {
    if (value === undefined || value === null) return 0;
    
    const units = {
      // Bitcoin units
      satoshi: 0.00000001,
      BTC: 1,
      
      // Ethereum units
      wei: 0.000000000000000001,
      gwei: 0.000000001,
      ETH: 1,
      
      // Add more conversions as needed
    };
    
    if (!units[from] || !units[to]) {
      console.error(`Unknown units: ${from} -> ${to}`);
      return value;
    }
    
    return (value * units[from]) / units[to];
  },
  
  /**
   * Generate random ID (for testing)
   * @param {number} length - ID length (default: 8)
   * @returns {string} - Random ID
   */
  generateId: (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  },
  
  /**
   * Debounce function to limit execution rate
   * @param {Function} func - Function to debounce
   * @param {number} wait - Debounce timeout in milliseconds
   * @returns {Function} - Debounced function
   */
  debounce: (func, wait = 300) => {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  /**
   * Throttle function to limit execution rate
   * @param {Function} func - Function to throttle
   * @param {number} limit - Throttle limit in milliseconds
   * @returns {Function} - Throttled function
   */
  throttle: (func, limit = 300) => {
    let inThrottle;
    
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  },
  
  /**
   * Format crypto address for display (shorten with ellipsis)
   * @param {string} address - Crypto address
   * @param {number} displayChars - Number of characters to display at start/end (default: 6)
   * @returns {string} - Formatted address
   */
  formatAddress: (address, displayChars = 6) => {
    if (!address || address.length < displayChars * 2 + 3) {
      return address || '';
    }
    
    return `${address.substring(0, displayChars)}...${address.substring(address.length - displayChars)}`;
  },
  
  /**
   * Format file size
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size
   */
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },
  
  /**
   * Get color based on value (for status indicators)
   * @param {string} status - Status value
   * @returns {string} - CSS color class
   */
  getStatusColor: (status) => {
    const statusColors = {
      completed: 'success',
      pending: 'warning',
      failed: 'danger',
      cancelled: 'secondary',
      approved: 'success',
      rejected: 'danger',
      suspended: 'warning',
      active: 'success',
      inactive: 'secondary',
      processing: 'info',
      verified: 'success',
      unverified: 'warning',
      buy: 'success',
      sell: 'danger',
    };
    
    return statusColors[status?.toLowerCase()] || 'secondary';
  },
  
  /**
   * Validate email address
   * @param {string} email - Email address to validate
   * @returns {boolean} - Is valid email
   */
  isValidEmail: (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  },
  
  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result
   */
  validatePassword: (password) => {
    const result = {
      valid: false,
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      score: 0
    };
    
    // Calculate score (0-100)
    result.score += result.length ? 25 : 0;
    result.score += result.uppercase ? 25 : 0;
    result.score += result.lowercase ? 15 : 0;
    result.score += result.number ? 25 : 0;
    result.score += result.special ? 10 : 0;
    
    // Bonus for length
    if (password.length >= 12) {
      result.score += 10;
    }
    
    // Cap at 100
    result.score = Math.min(100, result.score);
    
    // Set validity
    result.valid = result.score >= 70;
    
    return result;
  },
  
  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} - Cloned object
   */
  deepClone: (obj) => {
    return JSON.parse(JSON.stringify(obj));
  },
  
  /**
   * Get random item from array
   * @param {Array} array - Array to get item from
   * @returns {*} - Random item
   */
  getRandomItem: (array) => {
    if (!array || !array.length) return null;
    return array[Math.floor(Math.random() * array.length)];
  },
  
  /**
   * Get URL query parameters as object
   * @returns {Object} - Query parameters
   */
  getQueryParams: () => {
    const params = {};
    const query = window.location.search.substring(1);
    const pairs = query.split('&');
    
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i].split('=');
      params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    
    return params;
  },
  
  /**
   * Check if a value is empty (null, undefined, empty string, empty array, empty object)
   * @param {*} value - Value to check
   * @returns {boolean} - Is empty
   */
  isEmpty: (value) => {
    if (value === null || value === undefined) {
      return true;
    }
    
    if (typeof value === 'string' && value.trim() === '') {
      return true;
    }
    
    if (Array.isArray(value) && value.length === 0) {
      return true;
    }
    
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      return true;
    }
    
    return false;
  },
  
  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} - Success
   */
  copyToClipboard: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text: ', err);
      return false;
    }
  },
  
  /**
   * Get browser and OS info
   * @returns {Object} - Browser and OS info
   */
  getBrowserInfo: () => {
    const ua = navigator.userAgent;
    let browserName = "Unknown";
    let browserVersion = "";
    let osName = "Unknown";
    let osVersion = "";
    
    // Browser detection
    if (ua.indexOf("Chrome") > -1) {
      browserName = "Chrome";
      browserVersion = ua.match(/Chrome\/([\d.]+)/)[1];
    } else if (ua.indexOf("Safari") > -1) {
      browserName = "Safari";
      browserVersion = ua.match(/Version\/([\d.]+)/)[1];
    } else if (ua.indexOf("Firefox") > -1) {
      browserName = "Firefox";
      browserVersion = ua.match(/Firefox\/([\d.]+)/)[1];
    } else if (ua.indexOf("MSIE") > -1 || ua.indexOf("Trident") > -1) {
      browserName = "Internet Explorer";
      browserVersion = ua.match(/(?:MSIE |rv:)([\d.]+)/)[1];
    } else if (ua.indexOf("Edge") > -1) {
      browserName = "Edge";
      browserVersion = ua.match(/Edge\/([\d.]+)/)[1];
    }
    
    // OS detection
    if (ua.indexOf("Windows") > -1) {
      osName = "Windows";
      if (ua.indexOf("Windows NT 10.0") > -1) osVersion = "10";
      else if (ua.indexOf("Windows NT 6.3") > -1) osVersion = "8.1";
      else if (ua.indexOf("Windows NT 6.2") > -1) osVersion = "8";
      else if (ua.indexOf("Windows NT 6.1") > -1) osVersion = "7";
      else if (ua.indexOf("Windows NT 6.0") > -1) osVersion = "Vista";
      else if (ua.indexOf("Windows NT 5.1") > -1) osVersion = "XP";
    } else if (ua.indexOf("Mac OS X") > -1) {
      osName = "macOS";
      osVersion = ua.match(/Mac OS X ([\d_]+)/)[1].replace(/_/g, '.');
    } else if (ua.indexOf("Linux") > -1) {
      osName = "Linux";
    } else if (ua.indexOf("Android") > -1) {
      osName = "Android";
      osVersion = ua.match(/Android ([\d.]+)/)[1];
    } else if (ua.indexOf("iOS") > -1 || ua.indexOf("iPhone") > -1 || ua.indexOf("iPad") > -1) {
      osName = "iOS";
      osVersion = ua.match(/OS (\d+)_(\d+)_?(\d+)?/)[1];
    }
    
    return {
      browser: {
        name: browserName,
        version: browserVersion,
        userAgent: ua
      },
      os: {
        name: osName,
        version: osVersion
      }
    };
  }
};

// Make utils globally available
window.utils = utils;