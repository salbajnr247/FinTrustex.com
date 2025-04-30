/**
 * Authentication Service
 * Handles user authentication and session management
 */

// Session token storage key
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'currentUser';

/**
 * Store authentication token
 * @param {string} token - JWT token
 */
function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  api.setAuthHeader(token);
}

/**
 * Remove authentication token
 */
function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  api.removeAuthHeader();
}

/**
 * Store user data
 * @param {Object} user - User data
 */
function storeUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get current user data
 * @returns {Object|null} - User data or null if not logged in
 */
function getCurrentUser() {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
}

/**
 * Remove user data
 */
function removeUser() {
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if authenticated
 */
function isAuthenticated() {
  return !!localStorage.getItem(TOKEN_KEY);
}

/**
 * Initialize authentication state
 * Sets up auth token if it exists
 */
function initAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    api.setAuthHeader(token);
  }
}

/**
 * Login user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} - Login result
 */
async function login(username, password) {
  const response = await api.auth.login({ username, password });
  
  if (response.token) {
    storeToken(response.token);
    
    // Store user data
    if (response.user) {
      storeUser(response.user);
    }
    
    return response;
  }
  
  throw new Error('Login failed: Invalid token in response');
}

/**
 * Register new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - Registration result
 */
async function register(userData) {
  const response = await api.auth.register(userData);
  return response;
}

/**
 * Logout user
 * @returns {Promise<void>} - Logout result
 */
async function logout() {
  try {
    // Call logout endpoint
    await api.auth.logout();
  } finally {
    // Always clean up local data even if server request fails
    removeToken();
    removeUser();
  }
}

/**
 * Verify if current token is valid
 * @returns {Promise<boolean>} - True if token is valid
 */
async function verifyAuth() {
  if (!isAuthenticated()) {
    return false;
  }
  
  try {
    const response = await api.auth.verifyToken();
    return response.valid === true;
  } catch (error) {
    // Clean up invalid token
    removeToken();
    removeUser();
    return false;
  }
}

/**
 * Update stored user data
 * @param {Object} userData - User data updates
 */
function updateUserData(userData) {
  const currentUser = getCurrentUser();
  if (currentUser) {
    const updatedUser = { ...currentUser, ...userData };
    storeUser(updatedUser);
  }
}

/**
 * Check if user needs to complete 2FA
 * @returns {boolean} - True if 2FA is needed
 */
function needs2FA() {
  const user = getCurrentUser();
  return user && user.has2FA && !user.twoFactorVerified;
}

/**
 * Verify 2FA code during login
 * @param {string} code - Verification code
 * @returns {Promise<boolean>} - True if 2FA code is valid
 */
async function verify2FALogin(code) {
  const user = getCurrentUser();
  
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  try {
    const response = await api.security.verify2FALogin(user.id, code);
    
    if (response.success) {
      // Update user data to mark 2FA as verified for this session
      updateUserData({ twoFactorVerified: true });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('2FA verification failed:', error);
    return false;
  }
}

/**
 * Handle 2FA recovery
 * @param {string} recoveryCode - Recovery code
 * @returns {Promise<boolean>} - True if recovery code is valid
 */
async function useRecoveryCode(recoveryCode) {
  const user = getCurrentUser();
  
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  try {
    const response = await api.security.useRecoveryCode(user.id, recoveryCode);
    
    if (response.success) {
      // Update user data to mark 2FA as verified for this session
      updateUserData({ twoFactorVerified: true });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Recovery code verification failed:', error);
    return false;
  }
}

// Initialize authentication state on load
initAuth();

// Export auth service
window.authService = {
  login,
  register,
  logout,
  isAuthenticated,
  verifyAuth,
  getCurrentUser,
  updateUserData,
  needs2FA,
  verify2FALogin,
  useRecoveryCode
};