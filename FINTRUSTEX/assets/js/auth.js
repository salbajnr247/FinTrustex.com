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

  // Mock API Data for Ticker
  const fetchMockTickerData = async () => {
    return [
      { pair: 'BTC/USDT', price: 60000, change: 1.2 },
      { pair: 'ETH/USDT', price: 2500, change: -0.8 },
      { pair: 'ADA/USDT', price: 0.35, change: 0.5 }
    ];
  };

  // Update Crypto Ticker
  const updateTicker = async () => {
    try {
      const tickerData = await fetchMockTickerData();
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
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const twoFaCode = document.getElementById('login-2fa').value;

      // Mock 2FA check
      if (twoFaCode && twoFaCode.length !== 6) {
        showToast('Invalid 2FA code', 'error');
        return;
      }

      // Mock login logic
      showToast(`Logged in as ${email}${twoFaCode ? ' with 2FA' : ''}`, 'success');
      // Navigate to dashboard
      window.location.href = './dashboard/dashboard.html';
    });
  }

  // Register Form Submission
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('register-username').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;

      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }

      // Mock registration logic
      showToast(`Registered as ${username}`, 'success');
      // Switch to login tab
      document.querySelector('.tab-btn[data-tab="login"]').click();
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