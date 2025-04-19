// Utility functions for the frontend

// Format currency with proper symbol
function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  if (currency === 'USD' || currency === 'USDT') {
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
  
  // For cryptocurrencies, use appropriate precision
  if (['BTC', 'ETH', 'LTC'].includes(currency)) {
    return `${parseFloat(amount).toFixed(8)} ${currency}`;
  }
  
  // Default formatter
  return `${parseFloat(amount).toFixed(2)} ${currency}`;
}

// Format date and time
function formatDateTime(dateString, options = {}) {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const defaultOptions = { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  };
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
}

// Format date only
function formatDate(dateString) {
  return formatDateTime(dateString, { dateStyle: 'medium', timeStyle: undefined });
}

// Format percentage
function formatPercentage(value, digits = 2) {
  const num = parseFloat(value);
  if (isNaN(num)) return '0%';
  
  const formatted = num.toFixed(digits);
  return (num > 0 ? '+' : '') + formatted + '%';
}

// Truncate text (e.g., for addresses)
function truncateText(text, startChars = 6, endChars = 6) {
  if (!text) return '';
  if (text.length <= startChars + endChars) return text;
  
  return `${text.substring(0, startChars)}...${text.substring(text.length - endChars)}`;
}

// Copy text to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
}

// Generate a QR code (uses QRCode.js)
function generateQRCode(elementId, text, options = {}) {
  if (!window.QRCode) {
    console.error('QRCode library not loaded');
    return false;
  }
  
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found`);
    return false;
  }
  
  const defaultOptions = {
    width: 128,
    height: 128,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  };
  
  try {
    QRCode.toCanvas(element, text, { ...defaultOptions, ...options });
    return true;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return false;
  }
}

// Debounce function (for search inputs, etc.)
function debounce(func, wait = 300) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Calculate relative time (e.g., "2 hours ago")
function getRelativeTime(dateString) {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const now = new Date();
  const secondsAgo = Math.floor((now - date) / 1000);
  
  if (secondsAgo < 60) {
    return 'Just now';
  }
  
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) {
    return `${minutesAgo} ${minutesAgo === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return `${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 30) {
    return `${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`;
  }
  
  const monthsAgo = Math.floor(daysAgo / 30);
  if (monthsAgo < 12) {
    return `${monthsAgo} ${monthsAgo === 1 ? 'month' : 'months'} ago`;
  }
  
  const yearsAgo = Math.floor(monthsAgo / 12);
  return `${yearsAgo} ${yearsAgo === 1 ? 'year' : 'years'} ago`;
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate strong password
function isStrongPassword(password) {
  // At least 8 characters, containing uppercase, lowercase, number, and special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return passwordRegex.test(password);
}

// Get password strength (1-5)
function getPasswordStrength(password) {
  if (!password) return 0;
  
  let strength = 0;
  
  // Length check
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  
  // Character variety checks
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;
  
  return Math.min(5, strength);
}

// Get a descriptive password strength label
function getPasswordStrengthLabel(password) {
  const strength = getPasswordStrength(password);
  
  switch (strength) {
    case 0: return 'None';
    case 1: return 'Very Weak';
    case 2: return 'Weak';
    case 3: return 'Medium';
    case 4: return 'Strong';
    case 5: return 'Very Strong';
    default: return 'Unknown';
  }
}

// Export all utilities
const utils = {
  formatCurrency,
  formatDateTime,
  formatDate,
  formatPercentage,
  truncateText,
  copyToClipboard,
  generateQRCode,
  debounce,
  getRelativeTime,
  isValidEmail,
  isStrongPassword,
  getPasswordStrength,
  getPasswordStrengthLabel
};

// Make utilities globally accessible
window.utils = utils;