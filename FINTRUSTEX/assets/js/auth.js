document.addEventListener('DOMContentLoaded', () => {
  // Tab Switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const authForms = document.querySelectorAll('.auth-form');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.getAttribute('data-tab');
      tabButtons.forEach(btn => btn.classList.remove('active'));
      authForms.forEach(form => form.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(`${tab}-form`).classList.add('active');
    });
  });

  // Update Crypto Ticker
  const updateTicker = async () => {
    try {
      // Get market data from API
      const tickerData = await api.market.getMarkets();
      const tickerContainer = document.getElementById('crypto-ticker');
      if (tickerContainer) {
        tickerContainer.innerHTML = tickerData.map(ticker => `
          <div class="ticker-item">
            <span>${ticker.pair}</span>
            <span>$${ticker.price.toLocaleString()}</span>
            <span class="${ticker.change >= 0 ? 'positive' : 'negative'}">${ticker.change >= 0 ? '+' : ''}${ticker.change}%</span>
          </div>
        `).join('');
      }
      // Re-initialize AOS for dynamic content
      AOS.init({ duration: 800 });
    } catch (error) {
      console.error('Error updating ticker:', error);
      showToast('Error loading ticker data', 'error');
    }
  };

  // Login Form Submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const twoFaCode = document.getElementById('login-2fa').value;

      // Simple client-side validation
      if (!email || !password) {
        showToast('Please enter both email and password', 'error');
        return;
      }

      // 2FA code validation (if provided)
      if (twoFaCode && twoFaCode.length !== 6) {
        showToast('2FA code must be 6 digits', 'error');
        return;
      }

      try {
        // Show loading state
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        // Login with API
        const credentials = {
          email,
          password,
          ...(twoFaCode && { twoFactorCode: twoFaCode })
        };

        // Call the API
        const loginResponse = await api.auth.login(credentials);

        // Save session data
        if (window.authService) {
          authService.setSession(loginResponse.token, loginResponse.user);
        } else {
          // Fallback if auth service isn't loaded
          localStorage.setItem('auth_token', loginResponse.token);
          localStorage.setItem('auth_user', JSON.stringify(loginResponse.user));
        }

        showToast(`Welcome back, ${loginResponse.user.username || email}!`, 'success');
        
        // Get redirect URL from query parameters or go to dashboard
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect') || './dashboard/dashboard.html';
        window.location.href = redirectUrl;
      } catch (error) {
        console.error('Login error:', error);
        showToast(error.message || 'Login failed. Please check your credentials.', 'error');
        
        // Reset button
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      }
    });
  }

  // Register Form Submission
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('register-username').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;

      // Simple client-side validation
      if (!username || !email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
      }

      // Password validation
      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }

      if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
      }

      try {
        // Show loading state
        const submitButton = registerForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

        // Register with API
        const userData = {
          username,
          email,
          password
        };

        // Call the API
        await api.auth.register(userData);

        showToast(`Account created successfully! Please log in.`, 'success');
        
        // Switch to login tab and pre-fill email
        document.querySelector('.tab-btn[data-tab="login"]').click();
        document.getElementById('login-email').value = email;
        document.getElementById('login-password').focus();
        
        // Reset button
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      } catch (error) {
        console.error('Registration error:', error);
        showToast(error.message || 'Registration failed. Please try again.', 'error');
        
        // Reset button
        const submitButton = registerForm.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      }
    });
  }

  // Forgot Password (Placeholder)
  const forgotPasswordLink = document.querySelector('.forgot-password');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Password reset link sent', 'success');
    });
  }

  // Initialize Ticker
  updateTicker();

  // Refresh Ticker every 30 seconds
  setInterval(updateTicker, 30000);
});