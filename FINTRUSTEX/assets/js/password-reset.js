/**
 * Password Reset Functionality
 * Handles password reset form and token validation
 */

document.addEventListener('DOMContentLoaded', () => {
  // Get the reset token from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');
  
  // Check if token is present
  if (!resetToken) {
    showError('Invalid or missing reset token. Please request a new password reset link.');
    return;
  }
  
  // Select form elements
  const resetForm = document.getElementById('reset-password-form');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const strengthMeter = document.getElementById('strength-meter-fill');
  const strengthText = document.getElementById('strength-text');
  
  // Password strength check
  newPasswordInput.addEventListener('input', () => {
    const password = newPasswordInput.value;
    updatePasswordStrength(password);
  });
  
  // Handle form submission
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Basic validation
    if (!newPassword || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
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
      const submitButton = resetForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
      
      // Call API to reset password
      await api.auth.resetPassword(resetToken, newPassword);
      
      // Show success message
      showSuccess('Your password has been reset successfully. You can now log in with your new password.');
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        window.location.href = './auth.html';
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      showToast(error.message || 'Failed to reset password. Please try again.', 'error');
      
      // Reset button
      const submitButton = resetForm.querySelector('button[type="submit"]');
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    }
  });
  
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
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  function showError(message) {
    const form = document.getElementById('reset-password-form');
    const instructions = document.getElementById('reset-instructions');
    
    form.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
        <a href="./auth.html" class="btn btn-yellow">Back to Login</a>
      </div>
    `;
    
    if (instructions) {
      instructions.style.display = 'none';
    }
  }
  
  /**
   * Show success message
   * @param {string} message - Success message
   */
  function showSuccess(message) {
    const form = document.getElementById('reset-password-form');
    const instructions = document.getElementById('reset-instructions');
    
    form.innerHTML = `
      <div class="success-message">
        <i class="fas fa-check-circle"></i>
        <p>${message}</p>
        <div class="redirect-message">
          <span>Redirecting to login page...</span>
          <span class="spinner"></span>
        </div>
      </div>
    `;
    
    if (instructions) {
      instructions.style.display = 'none';
    }
  }
});