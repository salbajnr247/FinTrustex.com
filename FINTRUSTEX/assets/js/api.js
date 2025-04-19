// API Service - Handles all communication with the backend API

// Base API URL (set to your server URL)
const API_BASE_URL = '/api';

// Default headers
let defaultHeaders = {
  'Content-Type': 'application/json'
};

// Set auth header
function setAuthHeader(token) {
  defaultHeaders['Authorization'] = token;
}

// Remove auth header
function removeAuthHeader() {
  delete defaultHeaders['Authorization'];
}

// Helper function for making API requests
async function apiRequest(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: { ...defaultHeaders }
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    // Handle response errors
    if (!response.ok) {
      // If unauthorized, clear session and redirect to login
      if (response.status === 401 && window.authService) {
        console.warn('Authentication token expired or invalid');
        window.authService.clearSession();
        window.location.href = '/auth.html';
        throw new Error('Authentication expired, please log in again');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// User-related API calls
const userApi = {
  getUser: async (id) => apiRequest(`/users/${id}`),
  createUser: async (userData) => apiRequest('/users', 'POST', userData),
};

// Wallet-related API calls
const walletApi = {
  getUserWallets: async (userId) => apiRequest(`/wallets?userId=${userId}`),
  getWallet: async (id) => apiRequest(`/wallets/${id}`),
  updateBalance: async (id, newBalance) => apiRequest(`/wallets/${id}/balance`, 'PUT', { newBalance }),
};

// Order-related API calls
const orderApi = {
  getOrders: async (userId) => apiRequest(`/orders?userId=${userId}`),
  getOrder: async (id) => apiRequest(`/orders/${id}`),
  createOrder: async (orderData) => apiRequest('/orders', 'POST', orderData),
  updateOrderStatus: async (id, status) => apiRequest(`/orders/${id}/status`, 'PUT', { status }),
};

// Transaction-related API calls
const transactionApi = {
  getTransactions: async (userId) => apiRequest(`/transactions?userId=${userId}`),
  getTransaction: async (id) => apiRequest(`/transactions/${id}`),
  createTransaction: async (transactionData) => apiRequest('/transactions', 'POST', transactionData),
};

// Market data API calls (you can implement these as needed)
const marketApi = {
  getTicker: async (pair) => apiRequest(`/market/ticker/${pair}`),
  getMarkets: async () => apiRequest('/market/tickers'),
};

// Authentication API calls
const authApi = {
  login: async (credentials) => apiRequest('/auth/login', 'POST', credentials),
  register: async (userData) => apiRequest('/auth/register', 'POST', userData),
  verifyToken: async () => apiRequest('/auth/verify'),
};

// Export all API services
const api = {
  setAuthHeader,
  removeAuthHeader,
  auth: authApi,
  user: userApi,
  wallet: walletApi,
  order: orderApi,
  transaction: transactionApi,
  market: marketApi,
};

// Make API globally accessible
window.api = api;