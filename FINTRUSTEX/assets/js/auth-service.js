// Authentication Service - Handles user authentication and session management

// LocalStorage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Session management
const authService = {
  // Get the current authentication token
  getToken: () => localStorage.getItem(TOKEN_KEY),
  
  // Get the current user information
  getCurrentUser: () => {
    const userJson = localStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  },
  
  // Check if user is authenticated
  isAuthenticated: () => !!localStorage.getItem(TOKEN_KEY),
  
  // Save authentication data after successful login
  setSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    
    // Set default auth header for API requests
    if (window.api && api.setAuthHeader) {
      api.setAuthHeader(`Bearer ${token}`);
    }
  },
  
  // Clear session data on logout
  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    // Remove auth header
    if (window.api && api.removeAuthHeader) {
      api.removeAuthHeader();
    }
  },
  
  // Login user
  login: async (email, password) => {
    try {
      // Call your API login endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      const data = await response.json();
      
      // Save session data
      authService.setSession(data.token, data.user);
      
      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Register a new user
  register: async (userData) => {
    try {
      // Call your API register endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  // Logout user
  logout: () => {
    authService.clearSession();
    // Redirect to login page
    window.location.href = '/auth.html';
  },
  
  // Check authentication status and redirect if not authenticated
  checkAuth: () => {
    const dashboardPages = [
      '/dashboard.html',
      '/dashboard/dashboard.html',
      '/dashboard/admin/admin.html',
      '/dashboard/trading/trading.html',
      '/dashboard/wallet/wallet.html',
      '/dashboard/orders/orders.html'
    ];
    
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.includes('auth.html');
    const isDashboardPage = dashboardPages.some(page => currentPath.includes(page));
    
    if (isDashboardPage && !authService.isAuthenticated()) {
      // Not authenticated and trying to access protected page
      window.location.href = '/auth.html?redirect=' + encodeURIComponent(currentPath);
      return false;
    } else if (isAuthPage && authService.isAuthenticated()) {
      // Already authenticated and on login page
      window.location.href = '/dashboard/dashboard.html';
      return false;
    }
    
    return true;
  }
};

// Update API authorization header
if (window.api) {
  const token = authService.getToken();
  if (token) {
    api.setAuthHeader(`Bearer ${token}`);
  }
}

// Export the authentication service
window.authService = authService;