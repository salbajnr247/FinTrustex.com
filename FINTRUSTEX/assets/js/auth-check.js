/**
 * Authentication Check
 * Verifies user authentication on protected pages and redirects if not authenticated
 */

/**
 * Redirect to login page
 */
function redirectToLogin() {
  window.location.href = window.location.origin + '/auth.html';
}

/**
 * Check if user is authenticated
 * If not, redirect to login page
 */
async function checkAuth() {
  if (!authService.isAuthenticated()) {
    redirectToLogin();
    return false;
  }
  
  try {
    // Verify token validity with server
    const isValid = await authService.verifyAuth();
    
    if (!isValid) {
      redirectToLogin();
      return false;
    }
    
    // Check if 2FA is required but not verified
    if (authService.needs2FA()) {
      // Redirect to 2FA verification page
      window.location.href = window.location.origin + '/auth.html?verify2fa=1';
      return false;
    }
    
    // Authentication successful
    return true;
  } catch (error) {
    console.error('Auth verification error:', error);
    redirectToLogin();
    return false;
  }
}

// Immediately check authentication on protected pages
if (window.location.pathname.includes('/dashboard/')) {
  checkAuth();
}