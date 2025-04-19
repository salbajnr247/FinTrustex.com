/**
 * FINTRUSTEX Authentication Check
 * Prevents unauthorized access to protected pages
 * 
 * This script should be included at the top of all protected pages like:
 * - dashboard.html
 * - wallet.html
 * - trading.html
 * - orders.html
 * - admin.html
 */

(function() {
  /**
   * Check if user is authenticated
   * @returns {boolean} - True if authenticated
   */
  function isAuthenticated() {
    // Try to get auth data from storage
    try {
      // First check if authService is available
      if (window.authService && typeof authService.isAuthenticated === 'function') {
        return authService.isAuthenticated();
      }
      
      // Fallback: check localStorage directly
      const authString = localStorage.getItem('auth');
      if (!authString) {
        return false;
      }
      
      // Decode and parse auth data
      const authData = JSON.parse(atob(authString));
      
      // Check if token exists and is not expired
      if (!authData.token) {
        return false;
      }
      
      // Check token expiry if it exists
      if (authData.tokenExpiry) {
        if (Date.now() > authData.tokenExpiry) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }
  
  /**
   * Redirect to auth page if not authenticated
   */
  function redirectIfNotAuthenticated() {
    if (!isAuthenticated()) {
      // Get current path for redirect after login
      const currentPath = encodeURIComponent(window.location.pathname);
      
      // Show a message that login is required
      if (typeof showToast === 'function') {
        showToast('Login required to access this page', 'warning');
      } else {
        alert('Login required to access this page');
      }
      
      // Redirect to auth page with redirect parameter
      window.location.href = `/auth.html?redirect=${currentPath}`;
    }
  }
  
  // Check authentication immediately to prevent unauthorized page view
  redirectIfNotAuthenticated();
  
  // Also check when page is fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    redirectIfNotAuthenticated();
    
    // Add listener for browser back button
    window.addEventListener('pageshow', function(event) {
      // Check if page is loaded from cache
      if (event.persisted) {
        redirectIfNotAuthenticated();
      }
    });
  });
})();