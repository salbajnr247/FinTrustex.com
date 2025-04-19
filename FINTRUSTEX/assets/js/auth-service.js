/**
 * Authentication Service
 * Handles user authentication, session management, and security
 */

class AuthService {
  constructor() {
    // Storage keys
    this.TOKEN_KEY = 'auth_token';
    this.USER_KEY = 'auth_user';
    this.REFRESH_TOKEN_KEY = 'auth_refresh_token';
    
    // Session data
    this.token = localStorage.getItem(this.TOKEN_KEY) || null;
    this.user = null;
    this.refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY) || null;
    
    // Token refresh
    this.refreshInterval = null;
    this.tokenExpiryTime = null;
    
    // Initialize
    this.init();
  }

  /**
   * Initialize authentication service
   */
  init() {
    // Load user data from storage
    const storedUser = localStorage.getItem(this.USER_KEY);
    if (storedUser) {
      try {
        this.user = JSON.parse(storedUser);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        this.clearSession();
      }
    }
    
    // Set up token in API service
    if (this.token && window.api) {
      window.api.setAuthHeader(this.token);
    }
    
    // Set up token refresh if needed
    this.setupTokenRefresh();
  }

  /**
   * Set up automatic token refresh
   */
  setupTokenRefresh() {
    if (!this.token) return;
    
    // Clear any existing refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Parse JWT to get expiry time
    try {
      const payloadBase64 = this.token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      
      if (payload.exp) {
        // Token expiry time in milliseconds
        this.tokenExpiryTime = payload.exp * 1000;
        
        // Calculate refresh time (5 minutes before expiry)
        const now = Date.now();
        const timeUntilRefresh = Math.max(0, this.tokenExpiryTime - now - 5 * 60 * 1000);
        
        if (timeUntilRefresh > 0) {
          console.log(`Token will refresh in ${Math.round(timeUntilRefresh / 60000)} minutes`);
          
          // Set up refresh timeout
          setTimeout(() => this.refreshToken(), timeUntilRefresh);
        } else {
          // Token already expired or about to expire, refresh now
          this.refreshToken();
        }
      }
    } catch (error) {
      console.error('Failed to parse JWT token:', error);
    }
  }

  /**
   * Refresh authentication token
   * @returns {Promise<boolean>} - Success status
   */
  async refreshToken() {
    if (!this.refreshToken) return false;
    
    try {
      // Call refresh token API
      const response = await window.api.auth.refreshToken(this.refreshToken);
      
      if (response && response.token) {
        // Update tokens
        this.setSession(response.token, this.user, response.refreshToken);
        return true;
      }
      
      throw new Error('Invalid refresh token response');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      
      // If refresh fails, user needs to log in again
      this.clearSession();
      return false;
    }
  }

  /**
   * Set authentication session
   * @param {string} token - JWT token
   * @param {Object} user - User data
   * @param {string} refreshToken - Refresh token
   */
  setSession(token, user, refreshToken = null) {
    // Update properties
    this.token = token;
    this.user = user;
    this.refreshToken = refreshToken;
    
    // Store in local storage
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    
    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
    
    // Update API service
    if (window.api) {
      window.api.setAuthHeader(token);
    }
    
    // Set up token refresh
    this.setupTokenRefresh();
    
    // Dispatch auth event
    this.dispatchAuthEvent('login');
  }

  /**
   * Clear authentication session
   */
  clearSession() {
    // Clear properties
    this.token = null;
    this.user = null;
    this.refreshToken = null;
    this.tokenExpiryTime = null;
    
    // Clear from storage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    
    // Remove from API service
    if (window.api) {
      window.api.removeAuthHeader();
    }
    
    // Clear refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Dispatch auth event
    this.dispatchAuthEvent('logout');
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} - Authentication status
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * Get current user data
   * @returns {Object|null} - User data
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Check if current user has a specific role
   * @param {string} role - Role to check
   * @returns {boolean} - Whether user has the role
   */
  hasRole(role) {
    if (!this.user || !this.user.roles) return false;
    return this.user.roles.includes(role);
  }

  /**
   * Check if current user has permission
   * @param {string} permission - Permission to check
   * @returns {boolean} - Whether user has the permission
   */
  hasPermission(permission) {
    if (!this.user || !this.user.permissions) return false;
    return this.user.permissions.includes(permission);
  }

  /**
   * Get auth token
   * @returns {string|null} - JWT token
   */
  getToken() {
    return this.token;
  }

  /**
   * Login user
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} - Login response
   */
  async login(credentials) {
    try {
      const response = await window.api.auth.login(credentials);
      
      if (response && response.token) {
        this.setSession(
          response.token,
          response.user,
          response.refreshToken || null
        );
      }
      
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} - Registration response
   */
  async register(userData) {
    try {
      return await window.api.auth.register(userData);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Logout current user
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      if (this.isAuthenticated()) {
        await window.api.auth.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearSession();
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} - Password reset response
   */
  async requestPasswordReset(email) {
    try {
      return await window.api.auth.requestPasswordReset(email);
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  }

  /**
   * Complete password reset
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Reset completion response
   */
  async resetPassword(token, newPassword) {
    try {
      return await window.api.auth.resetPassword(token, newPassword);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} - Updated profile
   */
  async updateProfile(profileData) {
    try {
      const response = await window.api.user.updateProfile(profileData);
      
      // Update stored user data
      if (response && this.user) {
        this.user = { ...this.user, ...response };
        localStorage.setItem(this.USER_KEY, JSON.stringify(this.user));
        
        // Dispatch profile update event
        this.dispatchAuthEvent('profile-update');
      }
      
      return response;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Enable two-factor authentication
   * @returns {Promise<Object>} - 2FA setup response
   */
  async enableTwoFactor() {
    try {
      const response = await window.api.user.enableTwoFactor();
      
      // Update stored user data
      if (response && this.user) {
        this.user = { ...this.user, twoFactorEnabled: true };
        localStorage.setItem(this.USER_KEY, JSON.stringify(this.user));
      }
      
      return response;
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      throw error;
    }
  }

  /**
   * Disable two-factor authentication
   * @param {string} code - 2FA code
   * @returns {Promise<Object>} - 2FA disable response
   */
  async disableTwoFactor(code) {
    try {
      const response = await window.api.user.disableTwoFactor(code);
      
      // Update stored user data
      if (response && this.user) {
        this.user = { ...this.user, twoFactorEnabled: false };
        localStorage.setItem(this.USER_KEY, JSON.stringify(this.user));
      }
      
      return response;
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Password change response
   */
  async changePassword(currentPassword, newPassword) {
    try {
      return await window.api.user.updateSecurity({
        currentPassword,
        newPassword
      });
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }

  /**
   * Dispatch authentication event
   * @param {string} type - Event type
   */
  dispatchAuthEvent(type) {
    const event = new CustomEvent('auth', {
      detail: {
        type,
        user: this.user,
        authenticated: this.isAuthenticated()
      }
    });
    
    document.dispatchEvent(event);
  }
}

// Create a singleton instance
const authService = new AuthService();

// Make the service globally accessible
window.authService = authService;