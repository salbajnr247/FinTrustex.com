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
  const verify2faForm = document.getElementById('verify-2fa-form');
  const recoveryCodeForm = document.getElementById('recovery-code-form');
  
  let currentUser = null; // Store user data temporarily for 2FA verification
  
  // Check if 2FA verification is needed (from URL parameter)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('verify2fa') === '1') {
    // Check if we have a user in storage that needs 2FA
    const storedUser = authService.getCurrentUser();
    if (storedUser && storedUser.has2FA) {
      showTwoFactorForm(storedUser);
    }
  }
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      // Simple client-side validation
      if (!username || !password) {
        showToast('Please enter both username/email and password', 'error');
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
          username,
          password
        };

        // Call the API
        const loginResponse = await api.auth.login(credentials);
        
        // Check if 2FA is required
        if (loginResponse.requires2FA) {
          // Store user info temporarily for 2FA verification
          currentUser = loginResponse.user;
          
          // Show 2FA verification form
          showTwoFactorForm(currentUser);
          
          // Reset login button
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonText;
          
          return;
        }

        // Standard login success (no 2FA required)
        completeLogin(loginResponse);
        
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
  
  // 2FA Verification Form Submission
  if (verify2faForm) {
    verify2faForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const verificationCode = document.getElementById('verification-code').value;
      
      // Basic validation
      if (!verificationCode || verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
        showToast('Please enter a valid 6-digit verification code', 'error');
        return;
      }
      
      try {
        // Show loading state
        const submitButton = verify2faForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        
        // Get user from temp storage or auth service
        const user = currentUser || authService.getCurrentUser();
        
        if (!user) {
          showToast('Authentication error. Please try logging in again.', 'error');
          showLoginForm();
          return;
        }
        
        // Verify 2FA code
        const verifyResponse = await api.security.verify2FALogin(user.id, verificationCode);
        
        if (verifyResponse.success) {
          // Complete login process by requesting a token
          const tokenResponse = await api.auth.login({
            username: user.username || user.email,
            code: verificationCode,
            twoFactorAuth: true
          });
          
          // Complete login with the token response
          completeLogin(tokenResponse);
        } else {
          showToast('Invalid verification code. Please try again.', 'error');
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonText;
        }
      } catch (error) {
        console.error('2FA verification error:', error);
        showToast(error.message || 'Verification failed. Please try again.', 'error');
        
        // Reset button
        const submitButton = verify2faForm.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      }
    });
    
    // Use recovery code link
    document.getElementById('use-recovery-code').addEventListener('click', (e) => {
      e.preventDefault();
      showRecoveryCodeForm();
    });
    
    // Cancel 2FA verification
    document.getElementById('cancel-2fa').addEventListener('click', (e) => {
      e.preventDefault();
      // Clear temporary user data
      currentUser = null;
      // Go back to login form
      showLoginForm();
    });
  }
  
  // Recovery Code Form Submission
  if (recoveryCodeForm) {
    recoveryCodeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const recoveryCode = document.getElementById('recovery-code').value.trim();
      
      // Basic validation
      if (!recoveryCode) {
        showToast('Please enter a recovery code', 'error');
        return;
      }
      
      try {
        // Show loading state
        const submitButton = recoveryCodeForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        
        // Get user from temp storage or auth service
        const user = currentUser || authService.getCurrentUser();
        
        if (!user) {
          showToast('Authentication error. Please try logging in again.', 'error');
          showLoginForm();
          return;
        }
        
        // Use recovery code
        const recoveryResponse = await api.security.useRecoveryCode(user.id, recoveryCode);
        
        if (recoveryResponse.success) {
          // Complete login process by requesting a token
          const tokenResponse = await api.auth.login({
            username: user.username || user.email,
            recoveryCode,
            twoFactorRecovery: true
          });
          
          // Complete login with the token response
          completeLogin(tokenResponse);
        } else {
          showToast('Invalid recovery code. Please try again.', 'error');
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonText;
        }
      } catch (error) {
        console.error('Recovery code error:', error);
        showToast(error.message || 'Recovery failed. Please try again.', 'error');
        
        // Reset button
        const submitButton = recoveryCodeForm.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      }
    });
    
    // Back to 2FA link
    document.getElementById('back-to-2fa').addEventListener('click', (e) => {
      e.preventDefault();
      showTwoFactorForm(currentUser || authService.getCurrentUser());
    });
    
    // Cancel recovery
    document.getElementById('cancel-recovery').addEventListener('click', (e) => {
      e.preventDefault();
      // Clear temporary user data
      currentUser = null;
      // Go back to login form
      showLoginForm();
    });
  }
  
  // Helper Functions
  function showLoginForm() {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    authForms.forEach(form => form.classList.remove('active'));
    
    const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
    if (loginTab) loginTab.classList.add('active');
    
    if (loginForm) loginForm.classList.add('active');
    if (verify2faForm) verify2faForm.classList.remove('active');
    if (recoveryCodeForm) recoveryCodeForm.classList.remove('active');
  }
  
  function showTwoFactorForm(user) {
    authForms.forEach(form => form.classList.remove('active'));
    if (verify2faForm) verify2faForm.classList.add('active');
    
    // Hide tabs during 2FA verification
    const tabsContainer = document.querySelector('.auth-tabs');
    if (tabsContainer) tabsContainer.style.display = 'none';
    
    // Update message with username if available
    const authMessage = verify2faForm.querySelector('.auth-message');
    if (authMessage && user && (user.username || user.email)) {
      authMessage.textContent = `Hi ${user.username || user.email}, please enter the verification code from your authenticator app.`;
    }
    
    // Focus on verification code input
    const codeInput = document.getElementById('verification-code');
    if (codeInput) codeInput.focus();
  }
  
  function showRecoveryCodeForm() {
    authForms.forEach(form => form.classList.remove('active'));
    if (recoveryCodeForm) recoveryCodeForm.classList.add('active');
    
    // Hide tabs during recovery
    const tabsContainer = document.querySelector('.auth-tabs');
    if (tabsContainer) tabsContainer.style.display = 'none';
    
    // Focus on recovery code input
    const recoveryInput = document.getElementById('recovery-code');
    if (recoveryInput) recoveryInput.focus();
  }
  
  function completeLogin(loginResponse) {
    // Store user data in auth service
    if (window.authService) {
      authService.storeUser(loginResponse.user);
      authService.storeToken(loginResponse.token);
    } else {
      // Fallback if auth service isn't available
      localStorage.setItem('auth_token', loginResponse.token);
      localStorage.setItem('currentUser', JSON.stringify(loginResponse.user));
    }
    
    const name = loginResponse.user.username || loginResponse.user.email || 'user';
    showToast(`Welcome back, ${name}!`, 'success');
    
    // Get redirect URL from query parameters or go to dashboard
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect') || './dashboard/dashboard.html';
    window.location.href = redirectUrl;
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
          password,
          firstName: '', // These fields are optional
          lastName: '',
          companyName: ''
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

  // Forgot Password
  const forgotPasswordLink = document.querySelector('.forgot-password');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // Get email from login form
      const email = document.getElementById('login-email').value;
      
      if (!email) {
        showToast('Please enter your email address first', 'warning');
        document.getElementById('login-email').focus();
        return;
      }
      
      try {
        // Show loading state
        forgotPasswordLink.innerText = 'Sending reset link...';
        forgotPasswordLink.style.pointerEvents = 'none';
        
        // Request password reset
        await api.auth.requestPasswordReset(email);
        
        showToast('If your email is registered, you will receive a password reset link', 'success');
      } catch (error) {
        console.error('Password reset error:', error);
        // Don't reveal if email exists or not for security reasons
        showToast('If your email is registered, you will receive a password reset link', 'success');
      } finally {
        // Reset link state
        setTimeout(() => {
          forgotPasswordLink.innerText = 'Forgot Password?';
          forgotPasswordLink.style.pointerEvents = 'auto';
        }, 2000);
      }
    });
  }

  // Initialize Ticker
  updateTicker();

  // Refresh Ticker every 30 seconds
  setInterval(updateTicker, 30000);
});