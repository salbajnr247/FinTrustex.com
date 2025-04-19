/**
 * FINTRUSTEX Authentication Service
 * Handles user authentication, token management, and secure session storage
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.refreshTimeout = null;
    
    // Initialize authentication state
    this.initAuth();
  }

  /**
   * Initialize authentication state from storage
   */
  initAuth() {
    try {
      // Get auth data from storage
      const authData = this.getAuthFromStorage();
      
      if (authData) {
        // Set current user and tokens
        this.currentUser = authData.user;
        this.token = authData.token;
        this.refreshToken = authData.refreshToken;
        this.tokenExpiry = authData.tokenExpiry;
        
        // Setup token refresh if expiry is set
        if (this.tokenExpiry) {
          this.setupTokenRefresh();
        }
        
        console.log('Auth initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      this.clearAuth();
    }
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - Registration response
   */
  async register(userData) {
    try {
      // Validate user data
      if (!userData.email || !utils.isValidEmail(userData.email)) {
        throw new Error('Valid email address is required');
      }
      
      if (!userData.password) {
        throw new Error('Password is required');
      }
      
      const passwordValidation = utils.validatePassword(userData.password);
      if (!passwordValidation.valid) {
        throw new Error('Password does not meet security requirements');
      }
      
      // Call registration API
      const response = await api.register(userData);
      
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} - Login response
   */
  async login(credentials) {
    try {
      // Validate credentials
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }
      
      // Call login API
      const response = await api.login(credentials);
      
      // Set authentication data
      if (response && response.token) {
        this.setAuth(response.user, response.token, response.refreshToken, response.tokenExpiry);
        
        // Update storage
        this.saveAuthToStorage();
        
        return response;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Set authentication data
   * @param {Object} user - User data
   * @param {string} token - JWT token
   * @param {string} refreshToken - Refresh token
   * @param {number|string} tokenExpiry - Token expiry timestamp
   */
  setAuth(user, token, refreshToken, tokenExpiry) {
    this.currentUser = user;
    this.token = token;
    this.refreshToken = refreshToken;
    
    // Convert expiry to number if it's a string
    if (tokenExpiry && typeof tokenExpiry === 'string') {
      this.tokenExpiry = new Date(tokenExpiry).getTime();
    } else {
      this.tokenExpiry = tokenExpiry;
    }
    
    // Set authorization header for API requests
    if (window.api && typeof api.setAuthHeader === 'function') {
      api.setAuthHeader(token);
    }
    
    // Setup token refresh
    this.setupTokenRefresh();
  }

  /**
   * Logout user
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      // Call logout API
      if (this.isAuthenticated()) {
        await api.logout();
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear authentication data
      this.clearAuth();
    }
  }

  /**
   * Clear authentication data
   */
  clearAuth() {
    this.currentUser = null;
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    
    // Clear token refresh timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    
    // Remove authorization header
    if (window.api && typeof api.removeAuthHeader === 'function') {
      api.removeAuthHeader();
    }
    
    // Clear storage
    this.clearAuthFromStorage();
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} - Is authenticated
   */
  isAuthenticated() {
    return !!(this.token && this.currentUser);
  }

  /**
   * Get current user
   * @returns {Object|null} - Current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get current token
   * @returns {string|null} - Current token
   */
  getToken() {
    return this.token;
  }

  /**
   * Check if token is valid
   * @returns {boolean} - Is token valid
   */
  isTokenValid() {
    if (!this.token || !this.tokenExpiry) {
      return false;
    }
    
    // Check if token is expired
    const now = Date.now();
    return now < this.tokenExpiry;
  }

  /**
   * Setup token refresh
   */
  setupTokenRefresh() {
    // Clear existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    
    // Check if token expiry is set
    if (!this.tokenExpiry) {
      return;
    }
    
    // Calculate time until refresh (refresh 5 minutes before expiry)
    const now = Date.now();
    const refreshTime = this.tokenExpiry - now - (5 * 60 * 1000);
    
    // If token is already expired or will expire in less than 1 minute, refresh immediately
    if (refreshTime < 60000) {
      this.refreshAccessToken();
      return;
    }
    
    // Set up refresh timeout
    this.refreshTimeout = setTimeout(() => {
      this.refreshAccessToken();
    }, refreshTime);
    
    console.log(`Token refresh scheduled in ${Math.round(refreshTime / 60000)} minutes`);
  }

  /**
   * Refresh access token
   * @returns {Promise<boolean>} - Refresh success
   */
  async refreshAccessToken() {
    // If no refresh token, cannot refresh
    if (!this.refreshToken) {
      return false;
    }
    
    try {
      // Call refresh token API
      const response = await this.callRefreshToken();
      
      // Set new tokens
      if (response && response.token) {
        this.setAuth(
          response.user || this.currentUser,
          response.token,
          response.refreshToken || this.refreshToken,
          response.tokenExpiry
        );
        
        // Update storage
        this.saveAuthToStorage();
        
        console.log('Token refreshed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      
      // If refresh fails with 401 or 403, clear auth
      if (error.status === 401 || error.status === 403) {
        this.clearAuth();
      }
      
      return false;
    }
  }

  /**
   * Call refresh token API
   * @returns {Promise<Object>} - Refresh token response
   */
  async callRefreshToken() {
    // This is a stub - in a real application, this would call the refresh token API
    return new Promise((resolve, reject) => {
      // Simulate API call
      setTimeout(() => {
        if (this.refreshToken) {
          // Simulate successful token refresh
          const newTokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
          resolve({
            token: `new_token_${Date.now()}`,
            refreshToken: this.refreshToken,
            tokenExpiry: newTokenExpiry,
            user: this.currentUser
          });
        } else {
          reject(new Error('No refresh token available'));
        }
      }, 300);
    });
  }

  /**
   * Save authentication data to storage
   */
  saveAuthToStorage() {
    try {
      const authData = {
        user: this.currentUser,
        token: this.token,
        refreshToken: this.refreshToken,
        tokenExpiry: this.tokenExpiry
      };
      
      // Save to local storage
      localStorage.setItem('auth', btoa(JSON.stringify(authData)));
    } catch (error) {
      console.error('Failed to save auth to storage:', error);
    }
  }

  /**
   * Get authentication data from storage
   * @returns {Object|null} - Auth data
   */
  getAuthFromStorage() {
    try {
      // Get from local storage
      const authString = localStorage.getItem('auth');
      
      if (!authString) {
        return null;
      }
      
      // Decode and parse
      const authData = JSON.parse(atob(authString));
      
      // Check if token is expired
      if (authData.tokenExpiry && Date.now() > authData.tokenExpiry) {
        // Token is expired, try to refresh
        // For now, just clear auth
        this.clearAuthFromStorage();
        return null;
      }
      
      return authData;
    } catch (error) {
      console.error('Failed to get auth from storage:', error);
      return null;
    }
  }

  /**
   * Clear authentication data from storage
   */
  clearAuthFromStorage() {
    try {
      // Remove from local storage
      localStorage.removeItem('auth');
    } catch (error) {
      console.error('Failed to clear auth from storage:', error);
    }
  }

  /**
   * Verify current token
   * @returns {Promise<boolean>} - Is token valid
   */
  async verifyToken() {
    // If not authenticated, return false
    if (!this.isAuthenticated()) {
      return false;
    }
    
    try {
      // Call verify token API
      await api.verifyToken();
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      
      // If verification fails with 401 or 403, try to refresh token
      if (error.status === 401 || error.status === 403) {
        // Try to refresh token
        const refreshSuccess = await this.refreshAccessToken();
        
        // If refresh succeeds, token is valid
        return refreshSuccess;
      }
      
      return false;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} - Reset request response
   */
  async requestPasswordReset(email) {
    try {
      // Validate email
      if (!email || !utils.isValidEmail(email)) {
        throw new Error('Valid email address is required');
      }
      
      // Call password reset API
      const response = await api.requestPasswordReset(email);
      
      return response;
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  }

  /**
   * Reset password
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Reset response
   */
  async resetPassword(token, newPassword) {
    try {
      // Validate password
      const passwordValidation = utils.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw new Error('Password does not meet security requirements');
      }
      
      // Call reset password API
      const response = await api.resetPassword(token, newPassword);
      
      return response;
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Check password strength
   * @param {string} password - Password to check
   * @returns {Object} - Password strength
   */
  checkPasswordStrength(password) {
    return utils.validatePassword(password);
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} - Updated profile
   */
  async updateProfile(profileData) {
    try {
      // Call update profile API
      const response = await api.updateProfile(profileData);
      
      // Update current user with new data
      if (response && this.currentUser) {
        this.currentUser = { ...this.currentUser, ...response };
        
        // Update storage
        this.saveAuthToStorage();
      }
      
      return response;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Update security settings
   * @param {Object} securityData - Security data
   * @returns {Promise<Object>} - Update response
   */
  async updateSecurity(securityData) {
    try {
      // Validate current password
      if (!securityData.currentPassword) {
        throw new Error('Current password is required');
      }
      
      // If new password is provided, validate it
      if (securityData.newPassword) {
        const passwordValidation = utils.validatePassword(securityData.newPassword);
        if (!passwordValidation.valid) {
          throw new Error('New password does not meet security requirements');
        }
      }
      
      // Call update security API
      const response = await api.updateSecurity(securityData);
      
      return response;
    } catch (error) {
      console.error('Security update failed:', error);
      throw error;
    }
  }

  /**
   * Enable two-factor authentication
   * @returns {Promise<Object>} - 2FA setup data
   */
  async enableTwoFactor() {
    try {
      // Call enable 2FA API
      const response = await api.enableTwoFactor();
      
      return response;
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      throw error;
    }
  }

  /**
   * Verify two-factor authentication
   * @param {string} code - Verification code
   * @returns {Promise<Object>} - Verification response
   */
  async verifyTwoFactor(code) {
    try {
      // Validate code
      if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
        throw new Error('Valid 6-digit code is required');
      }
      
      // Call verify 2FA API
      const response = await api.verifyTwoFactor(code);
      
      // Update user data if successful
      if (response && response.user) {
        this.currentUser = response.user;
        
        // Update storage
        this.saveAuthToStorage();
      }
      
      return response;
    } catch (error) {
      console.error('Failed to verify 2FA:', error);
      throw error;
    }
  }

  /**
   * Disable two-factor authentication
   * @param {string} code - Verification code
   * @returns {Promise<Object>} - Disable response
   */
  async disableTwoFactor(code) {
    try {
      // Validate code
      if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
        throw new Error('Valid 6-digit code is required');
      }
      
      // Call disable 2FA API
      const response = await api.disableTwoFactor(code);
      
      // Update user data if successful
      if (response && response.user) {
        this.currentUser = response.user;
        
        // Update storage
        this.saveAuthToStorage();
      }
      
      return response;
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      throw error;
    }
  }

  /**
   * Get security activity log
   * @returns {Promise<Array>} - Activity log
   */
  async getActivityLog() {
    try {
      // Call activity log API
      const response = await api.getActivityLog();
      
      return response;
    } catch (error) {
      console.error('Failed to get activity log:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const authService = new AuthService();

// Make it globally available
window.authService = authService;