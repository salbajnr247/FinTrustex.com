/**
 * Security Settings JavaScript
 * Handles security features including password changes and 2FA management
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  await checkAuth();

  // DOM elements - Password section
  const changePasswordBtn = document.getElementById('change-password-btn');
  const passwordForm = document.getElementById('password-form');
  const changePasswordForm = document.getElementById('change-password-form');
  const cancelPasswordBtn = document.getElementById('cancel-password-btn');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const strengthMeter = document.getElementById('strength-meter-fill');
  const strengthText = document.getElementById('strength-text');
  
  // DOM elements - 2FA section
  const twoFactorStatus = document.getElementById('2fa-status');
  const setup2FABtn = document.getElementById('setup-2fa-btn');
  const disable2FABtn = document.getElementById('disable-2fa-btn');
  const disable2FAForm = document.getElementById('disable-2fa-form');
  const disable2FAConfirmForm = document.getElementById('disable-2fa-confirm-form');
  const cancelDisable2FA = document.getElementById('cancel-disable-2fa');
  
  // DOM elements - Activity log
  const activityLog = document.getElementById('activity-log');
  
  // DOM elements - Session management
  const logoutSessionsBtn = document.getElementById('logout-sessions-btn');
  
  // Load user security settings
  const currentUser = authService.getCurrentUser();
  if (!currentUser) {
    window.location.href = '../../auth.html';
    return;
  }
  
  // Initialize 2FA status display
  updateTwoFactorStatus();
  
  // Load activity log
  loadActivityLog();
  
  // Event listeners - Password change
  changePasswordBtn.addEventListener('click', () => {
    passwordForm.style.display = 'block';
    changePasswordBtn.style.display = 'none';
  });
  
  cancelPasswordBtn.addEventListener('click', () => {
    passwordForm.style.display = 'none';
    changePasswordBtn.style.display = 'block';
    changePasswordForm.reset();
  });
  
  // Password strength check
  newPasswordInput.addEventListener('input', () => {
    const password = newPasswordInput.value;
    updatePasswordStrength(password);
  });
  
  // Password change form submission
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      confirmPasswordInput.focus();
      return;
    }
    
    // Password strength validation
    const strength = checkPasswordStrength(newPassword);
    if (strength.score < 2) {
      showToast('Password is too weak. Please choose a stronger password.', 'error');
      newPasswordInput.focus();
      return;
    }
    
    try {
      // Show loading state
      const submitButton = changePasswordForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
      
      // Call API to update password
      await api.security.updatePassword({
        userId: currentUser.id,
        currentPassword,
        newPassword
      });
      
      // Show success message
      showToast('Password updated successfully', 'success');
      
      // Reset and hide form
      passwordForm.style.display = 'none';
      changePasswordBtn.style.display = 'block';
      changePasswordForm.reset();
    } catch (error) {
      console.error('Password update error:', error);
      showToast(error.message || 'Failed to update password. Please try again.', 'error');
    } finally {
      // Reset button
      const submitButton = changePasswordForm.querySelector('button[type="submit"]');
      submitButton.disabled = false;
      submitButton.innerHTML = 'Save Changes';
    }
  });
  
  // Event listeners - 2FA
  setup2FABtn.addEventListener('click', () => {
    window.location.href = './2fa-setup.html';
  });
  
  disable2FABtn.addEventListener('click', () => {
    disable2FAForm.style.display = 'block';
    disable2FABtn.style.display = 'none';
  });
  
  cancelDisable2FA.addEventListener('click', () => {
    disable2FAForm.style.display = 'none';
    disable2FABtn.style.display = 'block';
    disable2FAConfirmForm.reset();
  });
  
  // 2FA disable form submission
  disable2FAConfirmForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const verificationCode = document.getElementById('disable-2fa-code').value;
    
    // Basic validation
    if (!verificationCode || verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
      showToast('Please enter a valid 6-digit verification code', 'error');
      return;
    }
    
    try {
      // Show loading state
      const submitButton = disable2FAConfirmForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Disabling...';
      
      // Call API to disable 2FA
      await api.security.disable2FA(currentUser.id, verificationCode);
      
      // Update user data
      authService.updateUserData({ has2FA: false });
      
      // Update UI
      updateTwoFactorStatus();
      
      // Show success message
      showToast('Two-factor authentication disabled successfully', 'success');
      
      // Reset and hide form
      disable2FAForm.style.display = 'none';
      disable2FAConfirmForm.reset();
    } catch (error) {
      console.error('2FA disable error:', error);
      showToast(error.message || 'Failed to disable 2FA. Please try again.', 'error');
    } finally {
      // Reset button
      const submitButton = disable2FAConfirmForm.querySelector('button[type="submit"]');
      submitButton.disabled = false;
      submitButton.innerHTML = 'Confirm Disable';
    }
  });
  
  // Event listeners - Session management
  logoutSessionsBtn.addEventListener('click', async () => {
    try {
      logoutSessionsBtn.disabled = true;
      logoutSessionsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      
      // Call API to logout all other sessions
      await api.security.logoutOtherSessions();
      
      showToast('All other sessions have been logged out', 'success');
    } catch (error) {
      console.error('Logout sessions error:', error);
      showToast(error.message || 'Failed to logout sessions. Please try again.', 'error');
    } finally {
      logoutSessionsBtn.disabled = false;
      logoutSessionsBtn.innerHTML = 'Log Out All Other Sessions';
    }
  });
  
  // Functions
  function updateTwoFactorStatus() {
    const user = authService.getCurrentUser();
    const has2FA = user && user.has2FA;
    
    if (has2FA) {
      twoFactorStatus.innerHTML = '<span class="status-indicator enabled"><i class="fas fa-check-circle"></i> Enabled</span>';
      setup2FABtn.style.display = 'none';
      disable2FABtn.style.display = 'block';
    } else {
      twoFactorStatus.innerHTML = '<span class="status-indicator disabled"><i class="fas fa-times-circle"></i> Not Enabled</span>';
      setup2FABtn.style.display = 'block';
      disable2FABtn.style.display = 'none';
      disable2FAForm.style.display = 'none';
    }
  }
  
  async function loadActivityLog() {
    try {
      // Call API to get activity log
      const activities = await api.security.getActivityLog();
      
      // Display activity log
      displayActivityLog(activities);
    } catch (error) {
      console.error('Activity log error:', error);
      activityLog.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>Failed to load activity log. Please try again later.</p>
        </div>
      `;
    }
  }
  
  function displayActivityLog(activities) {
    if (!activities || activities.length === 0) {
      activityLog.innerHTML = '<p>No recent activity found.</p>';
      return;
    }
    
    const activityHtml = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">
          <i class="fas fa-${getActivityIcon(activity.type)}"></i>
        </div>
        <div class="activity-details">
          <div class="activity-description">${activity.description}</div>
          <div class="activity-meta">
            <span class="activity-time">${formatDate(activity.timestamp)}</span>
            <span class="activity-ip">${activity.ipAddress || 'Unknown'}</span>
          </div>
        </div>
      </div>
    `).join('');
    
    activityLog.innerHTML = activityHtml;
  }
  
  function getActivityIcon(type) {
    const icons = {
      'login': 'sign-in-alt',
      'logout': 'sign-out-alt',
      'password_change': 'key',
      '2fa_setup': 'shield-alt',
      '2fa_disable': 'shield-alt',
      'account_update': 'user-edit',
      'failed_login': 'exclamation-triangle'
    };
    
    return icons[type] || 'history';
  }
  
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
  
  /**
   * Update password strength meter
   * @param {string} password - Password to check
   */
  function updatePasswordStrength(password) {
    const result = checkPasswordStrength(password);
    
    // Update strength meter
    const percentage = (result.score / 4) * 100;
    strengthMeter.style.width = `${percentage}%`;
    
    // Update color based on strength
    let color;
    switch (result.score) {
      case 0:
        color = '#ff4d4d'; // Red
        strengthText.textContent = 'Very Weak';
        break;
      case 1:
        color = '#ffa64d'; // Orange
        strengthText.textContent = 'Weak';
        break;
      case 2:
        color = '#ffff4d'; // Yellow
        strengthText.textContent = 'Fair';
        break;
      case 3:
        color = '#4dff4d'; // Light Green
        strengthText.textContent = 'Good';
        break;
      case 4:
        color = '#4dffb3'; // Green
        strengthText.textContent = 'Strong';
        break;
      default:
        color = '#ccc';
        strengthText.textContent = 'Password strength';
    }
    
    strengthMeter.style.backgroundColor = color;
  }
  
  /**
   * Check password strength
   * @param {string} password - Password to check
   * @returns {Object} - Strength result
   */
  function checkPasswordStrength(password) {
    // Basic password strength check
    let score = 0;
    const result = { score, feedback: [] };
    
    if (!password) {
      return result;
    }
    
    // Length check
    if (password.length >= 8) {
      score++;
    } else {
      result.feedback.push('Password should be at least 8 characters long');
    }
    
    // Contains uppercase letters
    if (/[A-Z]/.test(password)) {
      score++;
    } else {
      result.feedback.push('Add uppercase letters');
    }
    
    // Contains lowercase letters
    if (/[a-z]/.test(password)) {
      score++;
    } else {
      result.feedback.push('Add lowercase letters');
    }
    
    // Contains numbers
    if (/\d/.test(password)) {
      score++;
    } else {
      result.feedback.push('Add numbers');
    }
    
    // Contains special characters
    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    } else {
      result.feedback.push('Add special characters');
    }
    
    // Normalize score to 0-4 range
    result.score = Math.min(4, Math.floor(score * 0.8));
    
    return result;
  }
});