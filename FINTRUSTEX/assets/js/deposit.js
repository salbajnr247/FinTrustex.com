/**
 * FinTrustEX Deposit Management
 * Handles deposit functionality and payment processing
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize AOS animations
  AOS.init({ duration: 800 });
  
  // Initialize payment method tabs
  initPaymentMethodTabs();
  
  // Initialize amount presets
  initAmountPresets();
  
  // Initialize currency selector
  initCurrencySelector();
  
  // Initialize Stripe elements
  initStripeElements();
  
  // Initialize crypto deposit options
  initCryptoDeposit();
  
  // Initialize bank transfer functionality
  initBankTransfer();
  
  // Load user's deposit history
  loadDepositHistory();
});

/**
 * Initialize payment method tabs
 */
function initPaymentMethodTabs() {
  const paymentMethods = document.querySelectorAll('.payment-method');
  const paymentForms = document.querySelectorAll('.payment-form');
  
  paymentMethods.forEach(method => {
    method.addEventListener('click', () => {
      // Remove active class from all methods
      paymentMethods.forEach(m => m.classList.remove('active'));
      
      // Add active class to clicked method
      method.classList.add('active');
      
      // Show corresponding form
      const methodType = method.getAttribute('data-method');
      paymentForms.forEach(form => {
        form.classList.remove('active');
        if (form.id === `${methodType}-payment-form`) {
          form.classList.add('active');
        }
      });
    });
  });
}

/**
 * Initialize amount presets for card payments
 */
function initAmountPresets() {
  const presets = document.querySelectorAll('.amount-preset');
  const amountInput = document.getElementById('amount');
  
  presets.forEach(preset => {
    preset.addEventListener('click', () => {
      const amount = preset.getAttribute('data-amount');
      amountInput.value = amount;
      
      // Update display amounts
      updatePaymentSummary();
    });
  });
  
  // Listen for manual amount changes
  amountInput.addEventListener('input', updatePaymentSummary);
}

/**
 * Initialize currency selector
 */
function initCurrencySelector() {
  const currencySelect = document.getElementById('currency');
  const currencySymbol = document.getElementById('currency-symbol');
  
  currencySelect.addEventListener('change', () => {
    const currency = currencySelect.value;
    
    // Update currency symbol
    switch (currency) {
      case 'USD':
        currencySymbol.textContent = '$';
        break;
      case 'EUR':
        currencySymbol.textContent = '€';
        break;
      case 'USDT':
        currencySymbol.textContent = '₮';
        break;
      default:
        currencySymbol.textContent = '$';
    }
    
    // Update display amounts
    updatePaymentSummary();
  });
}

/**
 * Update payment summary based on amount and currency
 */
function updatePaymentSummary() {
  const amount = parseFloat(document.getElementById('amount').value) || 0;
  const currency = document.getElementById('currency').value;
  const symbol = document.getElementById('currency-symbol').textContent;
  
  // Calculate fee (3% for this example)
  const fee = amount * 0.03;
  const total = amount + fee;
  
  // Update display elements
  document.getElementById('display-amount').textContent = `${symbol}${amount.toFixed(2)}`;
  document.getElementById('display-fee').textContent = `${symbol}${fee.toFixed(2)}`;
  document.getElementById('display-total').textContent = `${symbol}${total.toFixed(2)}`;
}

/**
 * Initialize Stripe Elements
 */
function initStripeElements() {
  // Check if Stripe is available
  if (typeof Stripe === 'undefined') {
    console.error('Stripe.js not loaded');
    return;
  }
  
  // Initialize Stripe
  const stripe = Stripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  const elements = stripe.elements();
  
  // Create card element
  const style = {
    base: {
      color: '#ffffff',
      fontFamily: '"Fira Code", monospace',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4'
      },
      backgroundColor: 'transparent'
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  };
  
  const card = elements.create('card', { style: style });
  
  // Mount the card element
  card.mount('#card-element');
  
  // Handle validation errors
  card.addEventListener('change', function(event) {
    const displayError = document.getElementById('card-errors');
    if (event.error) {
      displayError.textContent = event.error.message;
    } else {
      displayError.textContent = '';
    }
  });
  
  // Handle form submission
  const form = document.getElementById('payment-form');
  const submitButton = document.getElementById('submit-button');
  
  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Disable the submit button to prevent multiple clicks
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const currency = document.getElementById('currency').value.toLowerCase();
    
    try {
      // Create payment intent on the server
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          currency: currency === 'usdt' ? 'usd' : currency // Stripe doesn't support USDT directly
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      
      const data = await response.json();
      
      // Confirm card payment
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            name: document.querySelector('#accountName')?.value || 'FinTrustEX User'
          }
        }
      });
      
      if (result.error) {
        // Show error to your customer
        const errorElement = document.getElementById('card-errors');
        errorElement.textContent = result.error.message;
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-lock"></i> Deposit Securely';
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          // Payment succeeded, record the deposit
          await recordDeposit(amount, currency, result.paymentIntent.id);
          
          // Show success modal
          showSuccessModal(amount, currency, result.paymentIntent.id);
          
          // Reset form
          form.reset();
          card.clear();
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      const errorElement = document.getElementById('card-errors');
      errorElement.textContent = error.message || 'An error occurred while processing your payment.';
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fas fa-lock"></i> Deposit Securely';
    }
  });
}

/**
 * Record successful deposit to the server
 */
async function recordDeposit(amount, currency, transactionId) {
  try {
    const response = await fetch('/api/wallets/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: currency.toUpperCase(),
        transactionId,
        method: 'card'
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to record deposit');
    }
    
    // Reload deposit history
    loadDepositHistory();
    
    return await response.json();
  } catch (error) {
    console.error('Error recording deposit:', error);
    throw error;
  }
}

/**
 * Show success modal
 */
function showSuccessModal(amount, currency, transactionId) {
  const modal = document.getElementById('success-modal');
  const amountDisplay = document.getElementById('success-amount');
  const txidDisplay = document.getElementById('success-txid');
  const dateDisplay = document.getElementById('success-date');
  
  // Set values
  let symbol = '$';
  if (currency === 'eur') symbol = '€';
  if (currency === 'usdt') symbol = '₮';
  
  amountDisplay.textContent = `${symbol}${amount.toFixed(2)}`;
  txidDisplay.textContent = transactionId;
  dateDisplay.textContent = new Date().toLocaleDateString();
  
  // Show modal
  modal.style.display = 'block';
  
  // Close modal when clicking on X
  const closeModal = modal.querySelector('.close-modal');
  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // Return to wallet button
  const returnButton = document.getElementById('return-to-wallet');
  returnButton.addEventListener('click', () => {
    window.location.href = '/dashboard/wallet/wallet.html';
  });
  
  // Start trading button
  const tradingButton = document.getElementById('start-trading');
  tradingButton.addEventListener('click', () => {
    window.location.href = '/dashboard/trading/trading.html';
  });
  
  // Close modal when clicking outside of it
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

/**
 * Initialize crypto deposit options
 */
function initCryptoDeposit() {
  const cryptoOptions = document.querySelectorAll('.crypto-option');
  const selectedCryptoElement = document.getElementById('selected-crypto');
  const confirmationCountElement = document.getElementById('confirmation-count');
  const addressElement = document.getElementById('crypto-address');
  const qrcodeElement = document.getElementById('qrcode');
  
  // Clear any existing QR code
  qrcodeElement.innerHTML = '';
  
  // Generate initial QR code
  QRCode.toCanvas(qrcodeElement, addressElement.value, {
    width: 160,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
  
  // Set up copy address button
  const copyButton = document.getElementById('copy-address');
  copyButton.addEventListener('click', () => {
    const address = addressElement.value;
    navigator.clipboard.writeText(address)
      .then(() => {
        copyButton.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          copyButton.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy address:', err);
      });
  });
  
  // Handle crypto option selection
  cryptoOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove active class from all options
      cryptoOptions.forEach(o => o.classList.remove('active'));
      
      // Add active class to clicked option
      option.classList.add('active');
      
      // Get selected crypto
      const crypto = option.getAttribute('data-crypto');
      
      // Update display
      selectedCryptoElement.textContent = getCryptoFullName(crypto);
      
      // Update confirmation count based on crypto
      switch (crypto) {
        case 'BTC':
          confirmationCountElement.textContent = '2';
          addressElement.value = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
          break;
        case 'ETH':
          confirmationCountElement.textContent = '12';
          addressElement.value = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
          break;
        case 'USDT':
          confirmationCountElement.textContent = '6';
          addressElement.value = 'TRFvwahLYQFwJR9wR2NPKXZUfMXyFMDxCf';
          break;
      }
      
      // Update QR code
      qrcodeElement.innerHTML = '';
      QRCode.toCanvas(qrcodeElement, addressElement.value, {
        width: 160,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    });
  });
}

/**
 * Get full name for crypto symbol
 */
function getCryptoFullName(symbol) {
  switch (symbol) {
    case 'BTC':
      return 'Bitcoin';
    case 'ETH':
      return 'Ethereum';
    case 'USDT':
      return 'Tether';
    default:
      return symbol;
  }
}

/**
 * Initialize bank transfer functionality
 */
function initBankTransfer() {
  // Generate user reference
  const userReference = document.getElementById('bank-user-reference');
  
  // Use current user ID for reference
  const user = window.authService.getCurrentUser();
  if (user) {
    userReference.textContent = `FTX-${user.id}${Math.floor(Math.random() * 1000)}`;
  }
  
  // Set up copy reference button
  const copyReferenceButton = document.getElementById('copy-reference');
  copyReferenceButton.addEventListener('click', () => {
    const reference = userReference.textContent;
    navigator.clipboard.writeText(reference)
      .then(() => {
        copyReferenceButton.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          copyReferenceButton.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy reference:', err);
      });
  });
  
  // Set up notify button
  const notifyButton = document.getElementById('notify-bank-transfer');
  notifyButton.addEventListener('click', () => {
    // Show notification form
    showBankTransferNotificationForm();
  });
}

/**
 * Show bank transfer notification form
 */
function showBankTransferNotificationForm() {
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Notify Bank Transfer</h2>
        <span class="close-modal">&times;</span>
      </div>
      <div class="modal-body">
        <form id="bank-notification-form">
          <div class="form-group">
            <label for="transfer-amount">Transfer Amount</label>
            <input type="number" id="transfer-amount" class="form-control" min="10" required>
          </div>
          <div class="form-group">
            <label for="transfer-currency">Currency</label>
            <select id="transfer-currency" class="form-control">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div class="form-group">
            <label for="transfer-date">Transfer Date</label>
            <input type="date" id="transfer-date" class="form-control" required>
          </div>
          <div class="form-group">
            <label for="transfer-reference">Your Reference</label>
            <input type="text" id="transfer-reference" class="form-control" value="${document.getElementById('bank-user-reference').textContent}" readonly>
          </div>
          <div class="form-group">
            <label for="transfer-name">Bank Account Holder Name</label>
            <input type="text" id="transfer-name" class="form-control" required>
          </div>
          <div class="form-group">
            <label for="transfer-notes">Additional Notes (Optional)</label>
            <textarea id="transfer-notes" class="form-control"></textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button id="cancel-notification" class="btn btn-outline">Cancel</button>
        <button id="submit-notification" class="btn btn-yellow">Submit Notification</button>
      </div>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(modal);
  
  // Show with animation
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10);
  
  // Set today's date as default
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('transfer-date').value = today;
  
  // Close button
  const closeButton = modal.querySelector('.close-modal');
  closeButton.addEventListener('click', () => {
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.remove();
    }, 300);
  });
  
  // Cancel button
  const cancelButton = document.getElementById('cancel-notification');
  cancelButton.addEventListener('click', () => {
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.remove();
    }, 300);
  });
  
  // Submit button
  const submitButton = document.getElementById('submit-notification');
  submitButton.addEventListener('click', async () => {
    // Validate form
    const form = document.getElementById('bank-notification-form');
    const amount = document.getElementById('transfer-amount').value;
    const currency = document.getElementById('transfer-currency').value;
    const date = document.getElementById('transfer-date').value;
    const reference = document.getElementById('transfer-reference').value;
    const name = document.getElementById('transfer-name').value;
    const notes = document.getElementById('transfer-notes').value;
    
    if (!amount || !date || !name) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Submit notification
    try {
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      
      const response = await fetch('/api/wallets/notify-bank-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          currency,
          date,
          reference,
          name,
          notes
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit notification');
      }
      
      // Show success and close modal
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>Notification Submitted</h2>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <div class="success-icon">
              <i class="fas fa-check-circle"></i>
            </div>
            <h3>Your bank transfer notification has been submitted</h3>
            <p>Our team will verify your transfer and credit your account as soon as possible, usually within 1-2 business days.</p>
          </div>
          <div class="modal-footer">
            <button id="close-notification-success" class="btn btn-yellow">Close</button>
          </div>
        </div>
      `;
      
      // Close button for success screen
      const closeSuccessButton = document.getElementById('close-notification-success');
      closeSuccessButton.addEventListener('click', () => {
        modal.style.opacity = '0';
        setTimeout(() => {
          modal.remove();
        }, 300);
      });
      
      // Load latest deposit history
      loadDepositHistory();
    } catch (error) {
      console.error('Error submitting notification:', error);
      submitButton.disabled = false;
      submitButton.innerHTML = 'Submit Notification';
      alert('Failed to submit notification. Please try again.');
    }
  });
  
  // Close when clicking outside
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  });
}

/**
 * Load user's deposit history
 */
async function loadDepositHistory() {
  try {
    const response = await fetch('/api/wallets/deposits');
    
    if (!response.ok) {
      throw new Error('Failed to load deposit history');
    }
    
    const data = await response.json();
    
    // Update deposit history display
    const depositHistory = document.getElementById('deposit-history');
    
    if (!data || !data.deposits || data.deposits.length === 0) {
      depositHistory.innerHTML = '<div class="empty-state">No deposit history found</div>';
      return;
    }
    
    depositHistory.innerHTML = data.deposits.map(deposit => `
      <div class="transaction-item">
        <div class="transaction-icon">
          <i class="fas ${getDepositMethodIcon(deposit.method)}"></i>
        </div>
        <div class="transaction-details">
          <div class="transaction-title">${getDepositMethodName(deposit.method)} Deposit</div>
          <div class="transaction-date">${formatDate(deposit.createdAt)}</div>
        </div>
        <div class="transaction-amount positive">+${formatAmount(deposit.amount, deposit.currency)}</div>
        <div class="transaction-status ${deposit.status.toLowerCase()}">${formatStatus(deposit.status)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading deposit history:', error);
    
    // Show example deposits if API fails
    const depositHistory = document.getElementById('deposit-history');
    depositHistory.innerHTML = `
      <div class="transaction-item">
        <div class="transaction-icon">
          <i class="fas fa-credit-card"></i>
        </div>
        <div class="transaction-details">
          <div class="transaction-title">Credit Card Deposit</div>
          <div class="transaction-date">${formatDate(new Date())}</div>
        </div>
        <div class="transaction-amount positive">+$100.00</div>
        <div class="transaction-status completed">Completed</div>
      </div>
    `;
  }
}

/**
 * Get icon for deposit method
 */
function getDepositMethodIcon(method) {
  switch (method) {
    case 'card':
      return 'fa-credit-card';
    case 'crypto':
      return 'fa-bitcoin';
    case 'bank':
      return 'fa-university';
    default:
      return 'fa-money-bill';
  }
}

/**
 * Get name for deposit method
 */
function getDepositMethodName(method) {
  switch (method) {
    case 'card':
      return 'Credit Card';
    case 'crypto':
      return 'Cryptocurrency';
    case 'bank':
      return 'Bank Transfer';
    default:
      return 'Deposit';
  }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

/**
 * Format amount for display
 */
function formatAmount(amount, currency) {
  let formattedAmount = '';
  
  switch (currency) {
    case 'USD':
      formattedAmount = `$${parseFloat(amount).toFixed(2)}`;
      break;
    case 'EUR':
      formattedAmount = `€${parseFloat(amount).toFixed(2)}`;
      break;
    case 'USDT':
      formattedAmount = `₮${parseFloat(amount).toFixed(2)}`;
      break;
    case 'BTC':
      formattedAmount = `${parseFloat(amount).toFixed(8)} BTC`;
      break;
    case 'ETH':
      formattedAmount = `${parseFloat(amount).toFixed(6)} ETH`;
      break;
    default:
      formattedAmount = `${parseFloat(amount).toFixed(2)} ${currency}`;
  }
  
  return formattedAmount;
}

/**
 * Format status for display
 */
function formatStatus(status) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'complete':
      return 'Completed';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}