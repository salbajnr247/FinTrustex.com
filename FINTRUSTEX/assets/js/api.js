/**
 * API Service
 * Handles all API interactions for the application
 */

// Base API configuration
const API_CONFIG = {
  // External APIs
  coingecko: {
    baseUrl: 'https://api.coingecko.com/api/v3',
    headers: { 'Accept': 'application/json' }
  },
  binance: {
    baseUrl: 'https://api.binance.com/api/v3',
    headers: { 'Accept': 'application/json' }
  },
  // Internal API
  internal: {
    baseUrl: '/api',
    headers: { 'Content-Type': 'application/json' }
  }
};

// Authentication token handling
let authToken = null;

/**
 * Set authorization header for API requests
 * @param {string} token - JWT token
 */
function setAuthHeader(token) {
  authToken = token;
}

/**
 * Remove authorization header
 */
function removeAuthHeader() {
  authToken = null;
}

/**
 * Make API request
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {Object} data - Request body data
 * @param {string} apiType - API type (coingecko, binance, or internal)
 * @returns {Promise<any>} - API response
 */
async function apiRequest(endpoint, method = 'GET', data = null, apiType = 'internal') {
  try {
    const config = API_CONFIG[apiType];
    if (!config) {
      throw new Error(`Invalid API type: ${apiType}`);
    }

    const url = `${config.baseUrl}${endpoint}`;
    const headers = { ...config.headers };
    
    // Add auth token for internal API
    if (apiType === 'internal' && authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const fetchOptions = {
      method,
      headers,
      credentials: apiType === 'internal' ? 'include' : 'omit',
    };

    // Add request body for non-GET requests
    if (method !== 'GET' && data) {
      fetchOptions.body = JSON.stringify(data);
    }

    const response = await fetch(url, fetchOptions);
    
    // Parse response based on content type
    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Check for API errors
    if (!response.ok) {
      const errorMessage = responseData.error || responseData.message || 'Unknown API error';
      throw new Error(errorMessage);
    }

    return responseData;
  } catch (error) {
    console.error(`API Error (${apiType}): ${error.message}`);
    throw error;
  }
}

// Market Data API - CoinGecko & Binance
const market = {
  /**
   * Get current prices for multiple cryptocurrencies
   * @param {Array<string>} coins - Array of coin IDs
   * @param {string} currency - Currency (default: usd)
   * @returns {Promise<Object>} - Prices
   */
  async getPrices(coins = ['bitcoin', 'ethereum', 'cardano'], currency = 'usd') {
    const coinsParam = coins.join(',');
    return apiRequest(`/simple/price?ids=${coinsParam}&vs_currencies=${currency}`, 'GET', null, 'coingecko');
  },

  /**
   * Get detailed coin data
   * @param {string} coinId - Coin ID
   * @returns {Promise<Object>} - Coin data
   */
  async getCoinData(coinId) {
    return apiRequest(`/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`, 'GET', null, 'coingecko');
  },

  /**
   * Get trending coins
   * @returns {Promise<Object>} - Trending coins
   */
  async getTrending() {
    return apiRequest('/search/trending', 'GET', null, 'coingecko');
  },

  /**
   * Get market data for top cryptocurrencies
   * @param {number} count - Number of results
   * @param {string} currency - Currency (default: usd)
   * @returns {Promise<Array>} - Market data
   */
  async getMarkets(count = 20, currency = 'usd') {
    return apiRequest(`/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${count}&page=1&sparkline=false`, 'GET', null, 'coingecko');
  },

  /**
   * Get current ticker data from Binance
   * @param {string} symbol - Trading pair symbol (e.g., BTCUSDT)
   * @returns {Promise<Object>} - Ticker data
   */
  async getBinanceTicker(symbol = 'BTCUSDT') {
    return apiRequest(`/ticker/24hr?symbol=${symbol}`, 'GET', null, 'binance');
  },

  /**
   * Get ticker prices for multiple symbols from Binance
   * @returns {Promise<Array>} - Array of ticker prices
   */
  async getAllBinanceTickers() {
    return apiRequest('/ticker/price', 'GET', null, 'binance');
  },

  /**
   * Get current order book from Binance
   * @param {string} symbol - Trading pair symbol (e.g., BTCUSDT)
   * @param {number} limit - Number of entries (max 1000)
   * @returns {Promise<Object>} - Order book
   */
  async getOrderBook(symbol = 'BTCUSDT', limit = 20) {
    return apiRequest(`/depth?symbol=${symbol}&limit=${limit}`, 'GET', null, 'binance');
  },

  /**
   * Get recent trades from Binance
   * @param {string} symbol - Trading pair symbol (e.g., BTCUSDT)
   * @param {number} limit - Number of trades (max 1000)
   * @returns {Promise<Array>} - Recent trades
   */
  async getRecentTrades(symbol = 'BTCUSDT', limit = 20) {
    return apiRequest(`/trades?symbol=${symbol}&limit=${limit}`, 'GET', null, 'binance');
  },

  /**
   * Get candlestick data from Binance
   * @param {string} symbol - Trading pair symbol
   * @param {string} interval - Candle interval (1m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M)
   * @param {number} limit - Number of candles (max 1000)
   * @returns {Promise<Array>} - Candlestick data
   */
  async getKlines(symbol = 'BTCUSDT', interval = '1h', limit = 100) {
    return apiRequest(`/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, 'GET', null, 'binance');
  }
};

// User Auth API
const auth = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - Registration response
   */
  async register(userData) {
    return apiRequest('/auth/register', 'POST', userData);
  },

  /**
   * Login user
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} - Login response with token
   */
  async login(credentials) {
    const response = await apiRequest('/auth/login', 'POST', credentials);
    if (response.token) {
      setAuthHeader(response.token);
    }
    return response;
  },

  /**
   * Logout user
   * @returns {Promise<Object>} - Logout response
   */
  async logout() {
    try {
      await apiRequest('/auth/logout', 'POST');
    } finally {
      removeAuthHeader();
    }
    return { success: true };
  },

  /**
   * Verify current auth token
   * @returns {Promise<Object>} - Verification response
   */
  async verifyToken() {
    return apiRequest('/auth/verify', 'GET');
  },

  /**
   * Reset password request
   * @param {string} email - User email
   * @returns {Promise<Object>} - Reset password response
   */
  async requestPasswordReset(email) {
    return apiRequest('/auth/reset-password', 'POST', { email });
  },

  /**
   * Complete password reset
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Reset completion response
   */
  async resetPassword(token, newPassword) {
    return apiRequest('/auth/reset-password/confirm', 'POST', { token, newPassword });
  }
};

// Wallet API
const wallet = {
  /**
   * Get user wallets
   * @returns {Promise<Array>} - User wallets
   */
  async getWallets() {
    return apiRequest('/wallets', 'GET');
  },

  /**
   * Get specific wallet
   * @param {string} id - Wallet ID
   * @returns {Promise<Object>} - Wallet data
   */
  async getWallet(id) {
    return apiRequest(`/wallets/${id}`, 'GET');
  },

  /**
   * Create new wallet
   * @param {Object} walletData - Wallet data
   * @returns {Promise<Object>} - Created wallet
   */
  async createWallet(walletData) {
    return apiRequest('/wallets', 'POST', walletData);
  },

  /**
   * Get wallet transactions
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Array>} - Wallet transactions
   */
  async getWalletTransactions(walletId) {
    return apiRequest(`/wallets/${walletId}/transactions`, 'GET');
  },

  /**
   * Create deposit address
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Object>} - Deposit address
   */
  async createDepositAddress(walletId) {
    return apiRequest(`/wallets/${walletId}/deposit-address`, 'POST');
  },

  /**
   * Initiate withdrawal
   * @param {Object} withdrawalData - Withdrawal data
   * @returns {Promise<Object>} - Withdrawal confirmation
   */
  async initiateWithdrawal(withdrawalData) {
    return apiRequest('/withdrawals', 'POST', withdrawalData);
  }
};

// Trading API
const trading = {
  /**
   * Get trading pairs
   * @returns {Promise<Array>} - Trading pairs
   */
  async getTradingPairs() {
    return apiRequest('/trading/pairs', 'GET');
  },

  /**
   * Get order book
   * @param {string} pair - Trading pair
   * @returns {Promise<Object>} - Order book
   */
  async getOrderBook(pair) {
    return apiRequest(`/trading/orderbook/${pair}`, 'GET');
  },

  /**
   * Create new order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} - Created order
   */
  async createOrder(orderData) {
    return apiRequest('/trading/orders', 'POST', orderData);
  },

  /**
   * Cancel order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} - Cancellation confirmation
   */
  async cancelOrder(orderId) {
    return apiRequest(`/trading/orders/${orderId}/cancel`, 'POST');
  },

  /**
   * Get user's open orders
   * @returns {Promise<Array>} - Open orders
   */
  async getOpenOrders() {
    return apiRequest('/trading/orders/open', 'GET');
  },

  /**
   * Get user's order history
   * @returns {Promise<Array>} - Order history
   */
  async getOrderHistory() {
    return apiRequest('/trading/orders/history', 'GET');
  },

  /**
   * Get trade history
   * @returns {Promise<Array>} - Trade history
   */
  async getTradeHistory() {
    return apiRequest('/trading/trades', 'GET');
  }
};

// Transaction API
const transactions = {
  /**
   * Get user transactions
   * @returns {Promise<Array>} - User transactions
   */
  async getTransactions() {
    return apiRequest('/transactions', 'GET');
  },

  /**
   * Get transaction details
   * @param {string} id - Transaction ID
   * @returns {Promise<Object>} - Transaction details
   */
  async getTransaction(id) {
    return apiRequest(`/transactions/${id}`, 'GET');
  }
};

// User API
const user = {
  /**
   * Get user profile
   * @returns {Promise<Object>} - User profile
   */
  async getProfile() {
    return apiRequest('/user/profile', 'GET');
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} - Updated profile
   */
  async updateProfile(profileData) {
    return apiRequest('/user/profile', 'PUT', profileData);
  },

  /**
   * Update user security settings
   * @param {Object} securityData - Security data
   * @returns {Promise<Object>} - Security update confirmation
   */
  async updateSecurity(securityData) {
    return apiRequest('/user/security', 'PUT', securityData);
  },

  /**
   * Get KYC status
   * @returns {Promise<Object>} - KYC status
   */
  async getKycStatus() {
    return apiRequest('/user/kyc', 'GET');
  },

  /**
   * Submit KYC information
   * @param {Object} kycData - KYC data
   * @returns {Promise<Object>} - KYC submission confirmation
   */
  async submitKyc(kycData) {
    return apiRequest('/user/kyc', 'POST', kycData);
  }
};

// Admin API
const admin = {
  /**
   * Get users
   * @returns {Promise<Array>} - Users
   */
  async getUsers() {
    return apiRequest('/admin/users', 'GET');
  },

  /**
   * Get user details
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User details
   */
  async getUser(userId) {
    return apiRequest(`/admin/users/${userId}`, 'GET');
  },

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Updated user
   */
  async updateUser(userId, userData) {
    return apiRequest(`/admin/users/${userId}`, 'PUT', userData);
  },

  /**
   * Get pending withdrawals
   * @returns {Promise<Array>} - Pending withdrawals
   */
  async getPendingWithdrawals() {
    return apiRequest('/admin/withdrawals/pending', 'GET');
  },

  /**
   * Approve withdrawal
   * @param {string} withdrawalId - Withdrawal ID
   * @returns {Promise<Object>} - Approval confirmation
   */
  async approveWithdrawal(withdrawalId) {
    return apiRequest(`/admin/withdrawals/${withdrawalId}/approve`, 'POST');
  },

  /**
   * Reject withdrawal
   * @param {string} withdrawalId - Withdrawal ID
   * @returns {Promise<Object>} - Rejection confirmation
   */
  async rejectWithdrawal(withdrawalId) {
    return apiRequest(`/admin/withdrawals/${withdrawalId}/reject`, 'POST');
  },

  /**
   * Get KYC applications
   * @returns {Promise<Array>} - KYC applications
   */
  async getKycApplications() {
    return apiRequest('/admin/kyc/applications', 'GET');
  },

  /**
   * Review KYC application
   * @param {string} applicationId - Application ID
   * @param {Object} reviewData - Review data
   * @returns {Promise<Object>} - Review confirmation
   */
  async reviewKycApplication(applicationId, reviewData) {
    return apiRequest(`/admin/kyc/applications/${applicationId}/review`, 'POST', reviewData);
  }
};

// Export API
const api = {
  setAuthHeader,
  removeAuthHeader,
  market,
  auth,
  wallet,
  trading,
  transactions,
  user,
  admin
};

// Make API globally accessible
window.api = api;