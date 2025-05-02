/**
 * Authentication Module for FinTrustEX
 * Handles user authentication, session management, and related utilities
 */

// Local storage keys
const USER_STORAGE_KEY = 'fintrustex_user';
const TOKEN_STORAGE_KEY = 'fintrustex_token';

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
function isAuthenticated() {
  const user = getCurrentUser();
  const token = getAuthToken();
  return !!user && !!token;
}

/**
 * Get the current authenticated user
 * @returns {Object|null} User object or null if not authenticated
 */
function getCurrentUser() {
  const userJson = localStorage.getItem(USER_STORAGE_KEY);
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

/**
 * Get the authentication token
 * @returns {string|null} Authentication token or null if not present
 */
function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Save user session data
 * @param {Object} user - User object
 * @param {string} token - Authentication token
 */
function saveUserSession(user, token) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

/**
 * Clear user session data (logout)
 */
function logout() {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Registered user data
 */
async function registerUser(userData) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Registration failed');
    }
    
    const user = await response.json();
    // Generate a mock token (in a real app, the server would provide this)
    const token = 'mock_token_' + Math.random().toString(36).substring(2);
    
    // Save user session
    saveUserSession(user, token);
    
    return user;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Log in a user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} Logged in user data
 */
async function loginUser(username, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }
    
    const user = await response.json();
    // Generate a mock token (in a real app, the server would provide this)
    const token = 'mock_token_' + Math.random().toString(36).substring(2);
    
    // Save user session
    saveUserSession(user, token);
    
    return user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Update user profile
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} Updated user data
 */
async function updateUserProfile(userData) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch('/api/users/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update profile');
    }
    
    const updatedUser = await response.json();
    
    // Update stored user data
    const currentUser = getCurrentUser();
    const mergedUser = { ...currentUser, ...updatedUser };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mergedUser));
    
    return updatedUser;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
}

/**
 * Check if the current user is an admin
 * @returns {boolean} True if user is an admin
 */
function isAdmin() {
  const user = getCurrentUser();
  return user && user.isAdmin === true;
}

/**
 * Get the user's username
 * @returns {string|null} Username or null if not authenticated
 */
function getUsername() {
  const user = getCurrentUser();
  return user ? user.username : null;
}

/**
 * Get the user's ID
 * @returns {string|number|null} User ID or null if not authenticated
 */
function getUserId() {
  const user = getCurrentUser();
  return user ? user.id : null;
}

/**
 * Verify two-factor authentication code
 * @param {string} code - 2FA code
 * @returns {Promise<boolean>} True if code is valid
 */
async function verifyTwoFactorCode(code) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch('/api/auth/verify-2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ code })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify 2FA code');
    }
    
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('2FA verification error:', error);
    throw error;
  }
}