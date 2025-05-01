/**
 * Withdrawal Management Script
 * Handles crypto and bank transfer withdrawals
 */

document.addEventListener('DOMContentLoaded', function() {
  // Load components
  loadComponent('navbar-container', 'navbar.html');
  loadComponent('sidebar-container', 'sidebar.html');
  loadComponent('footer-container', 'footer.html');
  
  // Initialize user data
  initUserData();
  
  // Initialize withdrawal page
  initWithdrawalPage();
});

// User data and balances
let userData = null;
let wallets = [];
let pendingWithdrawals = [];
let completedWithdrawals = [];

// Fee constants
const CRYPTO_FEES = {
  btc: 0.0001,
  eth: 0.005,
  usdt: 1.0
};

const BANK_FEES = {
  usd: 25,
  eur: 20,
  gbp: 15
};

const MIN_CRYPTO_WITHDRAWAL = {
  btc: 0.001,
  eth: 0.01,
  usdt: 20
};

const MIN_BANK_WITHDRAWAL = {
  usd: 100,
  eur: 100, 
  gbp: 100
};

// Current withdrawal form state
let currentWithdrawalType = 'crypto';
let cryptoForm = {
  currency: '',
  address: '',
  amount: 0,
  fee: 0,
  twoFaCode: ''
};

let bankForm = {
  currency: '',
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  swiftCode: '',
  amount: 0,
  fee: 0,
  twoFaCode: ''
};

/**
 * Initialize user data
 */
async function initUserData() {
  try {
    // Get user data
    userData = await getCurrentUser();
    document.getElementById('username').textContent = userData.username;
    
    // Load wallets
    wallets = await getUserWallets();
    
    // Load pending withdrawals
    await loadWithdrawals();
    
    // Update available balances
    updateAvailableBalances();
  } catch (error) {
    console.error('Error initializing user data:', error);
    showToast('Error loading user data. Please try again.', 'error');
  }
}

/**
 * Initialize withdrawal page
 */
function initWithdrawalPage() {
  // Set up withdrawal type switcher
  const withdrawTypeOptions = document.querySelectorAll('.withdraw-type-option');
  withdrawTypeOptions.forEach(option => {
    option.addEventListener('click', function() {
      const withdrawType = this.getAttribute('data-withdraw-type');
      setWithdrawalType(withdrawType);
    });
  });
  
  // Check if there's a currency selected from wallet page
  const selectedCurrency = sessionStorage.getItem('selectedWithdrawCurrency');
  if (selectedCurrency) {
    // Set the crypto currency if available
    const cryptoCurrencySelect = document.getElementById('crypto-currency');
    if (cryptoCurrencySelect && ['btc', 'eth', 'usdt'].includes(selectedCurrency)) {
      cryptoCurrencySelect.value = selectedCurrency;
      cryptoForm.currency = selectedCurrency;
      updateCryptoForm();
    }
    
    // Clear the sessionStorage
    sessionStorage.removeItem('selectedWithdrawCurrency');
  }
  
  // Initialize crypto form
  const cryptoCurrencySelect = document.getElementById('crypto-currency');
  cryptoCurrencySelect.addEventListener('change', function() {
    cryptoForm.currency = this.value;
    updateCryptoForm();
  });
  
  const cryptoAddressInput = document.getElementById('crypto-address');
  cryptoAddressInput.addEventListener('input', function() {
    cryptoForm.address = this.value;
  });
  
  const cryptoAmountInput = document.getElementById('crypto-amount');
  cryptoAmountInput.addEventListener('input', function() {
    cryptoForm.amount = parseFloat(this.value) || 0;
    updateCryptoReceiveAmount();
  });
  
  const cryptoMaxBtn = document.getElementById('crypto-max-amount-btn');
  cryptoMaxBtn.addEventListener('click', function() {
    setMaxCryptoAmount();
  });
  
  const crypto2faInput = document.getElementById('crypto-2fa');
  crypto2faInput.addEventListener('input', function() {
    cryptoForm.twoFaCode = this.value;
  });
  
  const cryptoWithdrawForm = document.querySelector('#crypto-withdraw-form form');
  cryptoWithdrawForm.addEventListener('submit', function(e) {
    e.preventDefault();
    submitCryptoWithdrawal();
  });
  
  // Initialize bank form
  const bankCurrencySelect = document.getElementById('bank-currency');
  bankCurrencySelect.addEventListener('change', function() {
    bankForm.currency = this.value;
    updateBankForm();
  });
  
  const bankNameInput = document.getElementById('bank-name');
  bankNameInput.addEventListener('input', function() {
    bankForm.bankName = this.value;
  });
  
  const accountHolderInput = document.getElementById('account-holder');
  accountHolderInput.addEventListener('input', function() {
    bankForm.accountHolder = this.value;
  });
  
  const accountNumberInput = document.getElementById('account-number');
  accountNumberInput.addEventListener('input', function() {
    bankForm.accountNumber = this.value;
  });
  
  const swiftCodeInput = document.getElementById('swift-code');
  swiftCodeInput.addEventListener('input', function() {
    bankForm.swiftCode = this.value;
  });
  
  const bankAmountInput = document.getElementById('bank-amount');
  bankAmountInput.addEventListener('input', function() {
    bankForm.amount = parseFloat(this.value) || 0;
    updateBankReceiveAmount();
  });
  
  const bankMaxBtn = document.getElementById('bank-max-amount-btn');
  bankMaxBtn.addEventListener('click', function() {
    setMaxBankAmount();
  });
  
  const bank2faInput = document.getElementById('bank-2fa');
  bank2faInput.addEventListener('input', function() {
    bankForm.twoFaCode = this.value;
  });
  
  const bankWithdrawForm = document.querySelector('#bank-withdraw-form form');
  bankWithdrawForm.addEventListener('submit', function(e) {
    e.preventDefault();
    submitBankWithdrawal();
  });
  
  // Cancel buttons
  document.getElementById('cancel-crypto-withdraw').addEventListener('click', function() {
    resetCryptoForm();
  });
  
  document.getElementById('cancel-bank-withdraw').addEventListener('click', function() {
    resetBankForm();
  });
  
  // Modal close buttons
  document.getElementById('close-confirmation-modal').addEventListener('click', closeConfirmationModal);
  document.getElementById('cancel-confirmation').addEventListener('click', closeConfirmationModal);
  document.getElementById('close-success-modal').addEventListener('click', closeSuccessModal);
  document.getElementById('close-success').addEventListener('click', closeSuccessModal);
  document.getElementById('close-error-modal').addEventListener('click', closeErrorModal);
  document.getElementById('close-error').addEventListener('click', closeErrorModal);
  
  // Confirm withdrawal button
  document.getElementById('confirm-withdrawal').addEventListener('click', finalizeWithdrawal);
  
  // Retry withdrawal button
  document.getElementById('retry-withdrawal').addEventListener('click', function() {
    closeErrorModal();
  });
}

/**
 * Set the withdrawal type (crypto or bank)
 */
function setWithdrawalType(type) {
  // Update the current withdrawal type
  currentWithdrawalType = type;
  
  // Toggle active class on type options
  const options = document.querySelectorAll('.withdraw-type-option');
  options.forEach(option => {
    if (option.getAttribute('data-withdraw-type') === type) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Show/hide the appropriate forms
  if (type === 'crypto') {
    document.getElementById('crypto-withdraw-form').classList.remove('hidden');
    document.getElementById('bank-withdraw-form').classList.add('hidden');
    
    // Show/hide info sections
    document.querySelectorAll('.crypto-info').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.bank-info').forEach(el => el.classList.add('hidden'));
  } else {
    document.getElementById('crypto-withdraw-form').classList.add('hidden');
    document.getElementById('bank-withdraw-form').classList.remove('hidden');
    
    // Show/hide info sections
    document.querySelectorAll('.crypto-info').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.bank-info').forEach(el => el.classList.remove('hidden'));
  }
}

/**
 * Update available balances based on selected currency
 */
function updateAvailableBalances() {
  // Update crypto balances
  const selectedCryptoCurrency = document.getElementById('crypto-currency').value || 'btc';
  const cryptoWallet = wallets.find(wallet => wallet.currency === selectedCryptoCurrency);
  
  if (cryptoWallet) {
    document.getElementById('crypto-available-balance').textContent = cryptoWallet.balance;
    document.getElementById('crypto-available-currency').textContent = selectedCryptoCurrency.toUpperCase();
  } else {
    document.getElementById('crypto-available-balance').textContent = '0.00';
    document.getElementById('crypto-available-currency').textContent = selectedCryptoCurrency.toUpperCase();
  }
  
  // Update bank balances (convert from USD wallet)
  const usdWallet = wallets.find(wallet => wallet.currency === 'usdt');
  const selectedBankCurrency = document.getElementById('bank-currency').value || 'usd';
  
  if (usdWallet) {
    let convertedBalance = parseFloat(usdWallet.balance);
    
    // Apply simple conversion rates for demo purposes
    if (selectedBankCurrency === 'eur') {
      convertedBalance *= 0.93; // USD to EUR approximate rate
    } else if (selectedBankCurrency === 'gbp') {
      convertedBalance *= 0.79; // USD to GBP approximate rate
    }
    
    document.getElementById('bank-available-balance').textContent = convertedBalance.toFixed(2);
    document.getElementById('bank-available-currency').textContent = selectedBankCurrency.toUpperCase();
  } else {
    document.getElementById('bank-available-balance').textContent = '0.00';
    document.getElementById('bank-available-currency').textContent = selectedBankCurrency.toUpperCase();
  }
}

/**
 * Update crypto form based on selected currency
 */
function updateCryptoForm() {
  const currency = cryptoForm.currency;
  
  if (!currency) return;
  
  // Update currency code display
  document.getElementById('crypto-currency-code').textContent = currency.toUpperCase();
  
  // Update network fee
  const fee = CRYPTO_FEES[currency] || 0;
  cryptoForm.fee = fee;
  document.getElementById('crypto-network-fee').textContent = `${fee} ${currency.toUpperCase()}`;
  
  // Update minimum withdrawal text
  const minWithdrawal = MIN_CRYPTO_WITHDRAWAL[currency] || 0;
  document.getElementById('min-withdrawal').textContent = `The minimum withdrawal amount for ${currency.toUpperCase()} is ${minWithdrawal} ${currency.toUpperCase()}.`;
  
  // Update available balance
  updateAvailableBalances();
  
  // Update receive amount
  updateCryptoReceiveAmount();
}

/**
 * Update bank form based on selected currency
 */
function updateBankForm() {
  const currency = bankForm.currency;
  
  if (!currency) return;
  
  // Update currency code display
  document.getElementById('bank-currency-code').textContent = currency.toUpperCase();
  
  // Update processing fee
  const fee = BANK_FEES[currency] || 0;
  bankForm.fee = fee;
  document.getElementById('bank-processing-fee').textContent = `${getCurrencySymbol(currency)}${fee.toFixed(2)}`;
  
  // Update minimum withdrawal text
  const minWithdrawal = MIN_BANK_WITHDRAWAL[currency] || 0;
  document.getElementById('min-bank-withdrawal').textContent = `The minimum bank withdrawal amount is ${getCurrencySymbol(currency)}${minWithdrawal} ${currency.toUpperCase()}.`;
  
  // Update available balance
  updateAvailableBalances();
  
  // Update receive amount
  updateBankReceiveAmount();
}

/**
 * Update crypto receive amount based on input and fees
 */
function updateCryptoReceiveAmount() {
  const amount = cryptoForm.amount;
  const fee = cryptoForm.fee;
  const currency = cryptoForm.currency;
  
  if (!currency || isNaN(amount)) return;
  
  const receiveAmount = Math.max(0, amount - fee);
  document.getElementById('crypto-receive-amount').textContent = `${receiveAmount.toFixed(8)} ${currency.toUpperCase()}`;
}

/**
 * Update bank receive amount based on input and fees
 */
function updateBankReceiveAmount() {
  const amount = bankForm.amount;
  const fee = bankForm.fee;
  const currency = bankForm.currency;
  
  if (!currency || isNaN(amount)) return;
  
  const receiveAmount = Math.max(0, amount - fee);
  document.getElementById('bank-receive-amount').textContent = `${getCurrencySymbol(currency)}${receiveAmount.toFixed(2)}`;
}

/**
 * Set maximum amount for crypto withdrawal
 */
function setMaxCryptoAmount() {
  const currency = cryptoForm.currency;
  if (!currency) return;
  
  const wallet = wallets.find(w => w.currency === currency);
  if (!wallet) return;
  
  const maxAmount = Math.max(0, parseFloat(wallet.balance) - cryptoForm.fee);
  
  cryptoForm.amount = maxAmount;
  document.getElementById('crypto-amount').value = maxAmount.toFixed(8);
  updateCryptoReceiveAmount();
}

/**
 * Set maximum amount for bank withdrawal
 */
function setMaxBankAmount() {
  const currency = bankForm.currency;
  if (!currency) return;
  
  // For bank transfers, convert from USDT
  const usdtWallet = wallets.find(w => w.currency === 'usdt');
  if (!usdtWallet) return;
  
  let convertedBalance = parseFloat(usdtWallet.balance);
  
  // Apply conversion rates
  if (currency === 'eur') {
    convertedBalance *= 0.93; // USD to EUR
  } else if (currency === 'gbp') {
    convertedBalance *= 0.79; // USD to GBP
  }
  
  const maxAmount = Math.max(0, convertedBalance - bankForm.fee);
  
  bankForm.amount = maxAmount;
  document.getElementById('bank-amount').value = maxAmount.toFixed(2);
  updateBankReceiveAmount();
}

/**
 * Submit crypto withdrawal form
 */
function submitCryptoWithdrawal() {
  // Validate form
  if (!validateCryptoForm()) return;
  
  // Show confirmation modal
  showConfirmationModal('crypto');
}

/**
 * Submit bank withdrawal form
 */
function submitBankWithdrawal() {
  // Validate form
  if (!validateBankForm()) return;
  
  // Show confirmation modal
  showConfirmationModal('bank');
}

/**
 * Validate crypto withdrawal form
 */
function validateCryptoForm() {
  const currency = cryptoForm.currency;
  const address = cryptoForm.address;
  const amount = cryptoForm.amount;
  
  // Check if currency is selected
  if (!currency) {
    showToast('Please select a currency', 'error');
    return false;
  }
  
  // Check if address is provided
  if (!address) {
    showToast('Please enter a valid wallet address', 'error');
    return false;
  }
  
  // Check if address is valid (basic validation)
  if (!isValidCryptoAddress(address, currency)) {
    showToast('Invalid wallet address format', 'error');
    return false;
  }
  
  // Check if amount is provided and greater than 0
  if (!amount || amount <= 0) {
    showToast('Please enter a valid amount', 'error');
    return false;
  }
  
  // Check if amount is greater than minimum
  const minWithdrawal = MIN_CRYPTO_WITHDRAWAL[currency] || 0;
  if (amount < minWithdrawal) {
    showToast(`Minimum withdrawal amount is ${minWithdrawal} ${currency.toUpperCase()}`, 'error');
    return false;
  }
  
  // Check if user has sufficient balance
  const wallet = wallets.find(w => w.currency === currency);
  if (!wallet || parseFloat(wallet.balance) < amount) {
    showToast('Insufficient balance', 'error');
    return false;
  }
  
  // Check if 2FA code is provided if required
  if (userData && userData.twoFactorEnabled) {
    if (!cryptoForm.twoFaCode) {
      showToast('Please enter your 2FA code', 'error');
      return false;
    }
    
    if (cryptoForm.twoFaCode.length !== 6 || !/^\d+$/.test(cryptoForm.twoFaCode)) {
      showToast('Invalid 2FA code format', 'error');
      return false;
    }
  }
  
  return true;
}

/**
 * Validate bank withdrawal form
 */
function validateBankForm() {
  const currency = bankForm.currency;
  const bankName = bankForm.bankName;
  const accountHolder = bankForm.accountHolder;
  const accountNumber = bankForm.accountNumber;
  const swiftCode = bankForm.swiftCode;
  const amount = bankForm.amount;
  
  // Check if currency is selected
  if (!currency) {
    showToast('Please select a currency', 'error');
    return false;
  }
  
  // Check if bank name is provided
  if (!bankName) {
    showToast('Please enter a bank name', 'error');
    return false;
  }
  
  // Check if account holder is provided
  if (!accountHolder) {
    showToast('Please enter the account holder name', 'error');
    return false;
  }
  
  // Check if account number is provided
  if (!accountNumber) {
    showToast('Please enter an account number or IBAN', 'error');
    return false;
  }
  
  // Check if swift code is provided
  if (!swiftCode) {
    showToast('Please enter a SWIFT/BIC code', 'error');
    return false;
  }
  
  // Check if amount is provided and greater than 0
  if (!amount || amount <= 0) {
    showToast('Please enter a valid amount', 'error');
    return false;
  }
  
  // Check if amount is greater than minimum
  const minWithdrawal = MIN_BANK_WITHDRAWAL[currency] || 0;
  if (amount < minWithdrawal) {
    showToast(`Minimum withdrawal amount is ${getCurrencySymbol(currency)}${minWithdrawal}`, 'error');
    return false;
  }
  
  // Check if user has sufficient USDT balance for conversion
  const usdtWallet = wallets.find(w => w.currency === 'usdt');
  
  // Convert amount back to USDT for comparison
  let usdtAmount = amount;
  if (currency === 'eur') {
    usdtAmount /= 0.93; // EUR to USD
  } else if (currency === 'gbp') {
    usdtAmount /= 0.79; // GBP to USD
  }
  
  if (!usdtWallet || parseFloat(usdtWallet.balance) < usdtAmount) {
    showToast('Insufficient balance', 'error');
    return false;
  }
  
  // Check if 2FA code is provided if required
  if (userData && userData.twoFactorEnabled) {
    if (!bankForm.twoFaCode) {
      showToast('Please enter your 2FA code', 'error');
      return false;
    }
    
    if (bankForm.twoFaCode.length !== 6 || !/^\d+$/.test(bankForm.twoFaCode)) {
      showToast('Invalid 2FA code format', 'error');
      return false;
    }
  }
  
  return true;
}

/**
 * Show confirmation modal for withdrawal
 */
function showConfirmationModal(type) {
  const modal = document.getElementById('confirmation-modal');
  
  if (type === 'crypto') {
    document.getElementById('confirm-type').textContent = 'Crypto Withdrawal';
    document.getElementById('confirm-amount').textContent = `${cryptoForm.amount} ${cryptoForm.currency.toUpperCase()}`;
    document.getElementById('confirm-fee').textContent = `${cryptoForm.fee} ${cryptoForm.currency.toUpperCase()}`;
    document.getElementById('confirm-receive').textContent = `${(cryptoForm.amount - cryptoForm.fee).toFixed(8)} ${cryptoForm.currency.toUpperCase()}`;
    
    // Shorten address for display if needed
    let displayAddress = cryptoForm.address;
    if (displayAddress.length > 30) {
      displayAddress = displayAddress.substr(0, 15) + '...' + displayAddress.substr(-15);
    }
    document.getElementById('confirm-destination').textContent = displayAddress;
  } else {
    document.getElementById('confirm-type').textContent = 'Bank Transfer';
    document.getElementById('confirm-amount').textContent = `${getCurrencySymbol(bankForm.currency)}${bankForm.amount.toFixed(2)} ${bankForm.currency.toUpperCase()}`;
    document.getElementById('confirm-fee').textContent = `${getCurrencySymbol(bankForm.currency)}${bankForm.fee.toFixed(2)} ${bankForm.currency.toUpperCase()}`;
    document.getElementById('confirm-receive').textContent = `${getCurrencySymbol(bankForm.currency)}${(bankForm.amount - bankForm.fee).toFixed(2)} ${bankForm.currency.toUpperCase()}`;
    document.getElementById('confirm-destination').textContent = `${bankForm.bankName} - ${bankForm.accountNumber}`;
  }
  
  modal.classList.add('active');
}

/**
 * Close confirmation modal
 */
function closeConfirmationModal() {
  const modal = document.getElementById('confirmation-modal');
  modal.classList.remove('active');
}

/**
 * Show success modal
 */
function showSuccessModal(withdrawalId) {
  const successModal = document.getElementById('success-modal');
  document.getElementById('withdrawal-id').textContent = withdrawalId;
  successModal.classList.add('active');
}

/**
 * Close success modal
 */
function closeSuccessModal() {
  const successModal = document.getElementById('success-modal');
  successModal.classList.remove('active');
  
  // Reset forms
  if (currentWithdrawalType === 'crypto') {
    resetCryptoForm();
  } else {
    resetBankForm();
  }
  
  // Reload withdrawals
  loadWithdrawals();
}

/**
 * Show error modal
 */
function showErrorModal(errorMessage) {
  const errorModal = document.getElementById('error-modal');
  document.getElementById('error-message').textContent = errorMessage;
  errorModal.classList.add('active');
}

/**
 * Close error modal
 */
function closeErrorModal() {
  const errorModal = document.getElementById('error-modal');
  errorModal.classList.remove('active');
}

/**
 * Finalize withdrawal after confirmation
 */
async function finalizeWithdrawal() {
  closeConfirmationModal();
  
  try {
    let withdrawalData;
    let endpoint;
    
    if (currentWithdrawalType === 'crypto') {
      withdrawalData = {
        currency: cryptoForm.currency,
        address: cryptoForm.address,
        amount: cryptoForm.amount,
        fee: cryptoForm.fee,
        netAmount: cryptoForm.amount - cryptoForm.fee,
        twoFaCode: cryptoForm.twoFaCode,
        type: 'crypto'
      };
      endpoint = '/api/withdrawals/crypto';
    } else {
      withdrawalData = {
        currency: bankForm.currency,
        bankName: bankForm.bankName,
        accountHolder: bankForm.accountHolder,
        accountNumber: bankForm.accountNumber,
        swiftCode: bankForm.swiftCode,
        amount: bankForm.amount,
        fee: bankForm.fee,
        netAmount: bankForm.amount - bankForm.fee,
        twoFaCode: bankForm.twoFaCode,
        type: 'bank'
      };
      endpoint = '/api/withdrawals/bank';
    }
    
    // Submit withdrawal request
    const response = await api.post(endpoint, withdrawalData);
    
    if (response.success) {
      // Show success message
      showSuccessModal(response.data.id || 'W' + Date.now().toString().substr(-9));
      
      // Update user data
      await initUserData();
    } else {
      // Show error message
      showErrorModal(response.message || 'An error occurred while processing your withdrawal request. Please try again.');
    }
  } catch (error) {
    console.error('Error submitting withdrawal:', error);
    showErrorModal('An unexpected error occurred. Please try again later.');
  }
}

/**
 * Reset crypto withdrawal form
 */
function resetCryptoForm() {
  document.getElementById('crypto-currency').value = '';
  document.getElementById('crypto-address').value = '';
  document.getElementById('crypto-amount').value = '';
  document.getElementById('crypto-2fa').value = '';
  
  cryptoForm = {
    currency: '',
    address: '',
    amount: 0,
    fee: 0,
    twoFaCode: ''
  };
  
  document.getElementById('crypto-network-fee').textContent = '0.0001 BTC';
  document.getElementById('crypto-receive-amount').textContent = '0.00 BTC';
}

/**
 * Reset bank withdrawal form
 */
function resetBankForm() {
  document.getElementById('bank-currency').value = '';
  document.getElementById('bank-name').value = '';
  document.getElementById('account-holder').value = '';
  document.getElementById('account-number').value = '';
  document.getElementById('swift-code').value = '';
  document.getElementById('bank-amount').value = '';
  document.getElementById('bank-2fa').value = '';
  
  bankForm = {
    currency: '',
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    swiftCode: '',
    amount: 0,
    fee: 0,
    twoFaCode: ''
  };
  
  document.getElementById('bank-processing-fee').textContent = '$25.00';
  document.getElementById('bank-receive-amount').textContent = '$0.00';
}

/**
 * Load withdrawals from API
 */
async function loadWithdrawals() {
  try {
    const response = await api.get('/api/withdrawals');
    
    if (response.success) {
      pendingWithdrawals = response.data.filter(w => ['pending', 'processing'].includes(w.status));
      completedWithdrawals = response.data.filter(w => ['completed', 'rejected'].includes(w.status));
      
      // Render withdrawal status table
      renderWithdrawalStatusTable();
      
      // Render recent withdrawals
      renderRecentWithdrawals();
    }
  } catch (error) {
    console.error('Error loading withdrawals:', error);
  }
}

/**
 * Render withdrawal status table
 */
function renderWithdrawalStatusTable() {
  const tableBody = document.getElementById('withdrawal-status-table-body');
  const emptyStatus = document.getElementById('withdrawal-status-empty');
  
  if (pendingWithdrawals.length === 0) {
    tableBody.innerHTML = '';
    emptyStatus.classList.remove('hidden');
    return;
  }
  
  emptyStatus.classList.add('hidden');
  
  let html = '';
  
  pendingWithdrawals.forEach(withdrawal => {
    html += `
      <tr>
        <td>${formatDate(withdrawal.createdAt)}</td>
        <td>${withdrawal.type === 'crypto' ? 'Crypto' : 'Bank Transfer'}</td>
        <td>${formatAmount(withdrawal)}</td>
        <td>${formatDestination(withdrawal)}</td>
        <td><span class="status-badge status-${withdrawal.status}">${capitalizeFirstLetter(withdrawal.status)}</span></td>
        <td>
          ${withdrawal.status === 'pending' ? `
            <button class="btn btn-small action-button" data-action="cancel" data-id="${withdrawal.id}">Cancel</button>
          ` : ''}
          <button class="btn btn-small action-button" data-action="details" data-id="${withdrawal.id}">Details</button>
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
  
  // Add event listeners to action buttons
  const actionButtons = document.querySelectorAll('.action-button');
  actionButtons.forEach(button => {
    button.addEventListener('click', async function() {
      const action = this.getAttribute('data-action');
      const id = this.getAttribute('data-id');
      
      if (action === 'cancel') {
        await cancelWithdrawal(id);
      } else if (action === 'details') {
        showWithdrawalDetails(id);
      }
    });
  });
}

/**
 * Render recent withdrawals
 */
function renderRecentWithdrawals() {
  const recentWithdrawalsContainer = document.getElementById('recent-withdrawals');
  
  if (completedWithdrawals.length === 0) {
    recentWithdrawalsContainer.innerHTML = '<p class="no-data">No recent withdrawals</p>';
    return;
  }
  
  let html = '<ul class="recent-withdrawals-list">';
  
  // Display the last 3 completed withdrawals
  completedWithdrawals.slice(0, 3).forEach(withdrawal => {
    html += `
      <li>
        <div class="recent-withdrawal-entry">
          <span class="recent-withdrawal-amount">${formatAmount(withdrawal)}</span>
          <span class="recent-withdrawal-date">${formatDate(withdrawal.completedAt || withdrawal.createdAt)}</span>
          <span class="status-badge status-${withdrawal.status === 'completed' ? 'completed' : 'rejected'}">${capitalizeFirstLetter(withdrawal.status)}</span>
        </div>
      </li>
    `;
  });
  
  html += '</ul>';
  recentWithdrawalsContainer.innerHTML = html;
}

/**
 * Cancel a pending withdrawal
 */
async function cancelWithdrawal(id) {
  try {
    const response = await api.post(`/api/withdrawals/${id}/cancel`);
    
    if (response.success) {
      showToast('Withdrawal cancelled successfully', 'success');
      await loadWithdrawals();
    } else {
      showToast(response.message || 'Failed to cancel withdrawal', 'error');
    }
  } catch (error) {
    console.error('Error cancelling withdrawal:', error);
    showToast('An error occurred while cancelling the withdrawal', 'error');
  }
}

/**
 * Show withdrawal details
 */
function showWithdrawalDetails(id) {
  const withdrawal = [...pendingWithdrawals, ...completedWithdrawals].find(w => w.id.toString() === id);
  
  if (!withdrawal) {
    showToast('Withdrawal not found', 'error');
    return;
  }
  
  // TODO: Implement a modal to show detailed withdrawal information
  alert(`
    Withdrawal ID: ${withdrawal.id}
    Type: ${withdrawal.type === 'crypto' ? 'Crypto' : 'Bank Transfer'}
    Amount: ${formatAmount(withdrawal)}
    Status: ${capitalizeFirstLetter(withdrawal.status)}
    Created: ${formatDate(withdrawal.createdAt)}
    ${withdrawal.completedAt ? `Completed: ${formatDate(withdrawal.completedAt)}` : ''}
  `);
}

/**
 * Utility Functions
 */

/**
 * Get currency symbol
 */
function getCurrencySymbol(currency) {
  const symbols = {
    usd: '$',
    eur: '€',
    gbp: '£'
  };
  
  return symbols[currency] || '$';
}

/**
 * Format amount with currency
 */
function formatAmount(withdrawal) {
  if (withdrawal.type === 'crypto') {
    return `${withdrawal.amount} ${withdrawal.currency.toUpperCase()}`;
  } else {
    return `${getCurrencySymbol(withdrawal.currency)}${parseFloat(withdrawal.amount).toFixed(2)}`;
  }
}

/**
 * Format destination (address or bank info)
 */
function formatDestination(withdrawal) {
  if (withdrawal.type === 'crypto') {
    const address = withdrawal.address;
    if (address && address.length > 15) {
      return address.substr(0, 7) + '...' + address.substr(-7);
    }
    return address || 'N/A';
  } else {
    return `${withdrawal.bankName || 'Bank'} - ${withdrawal.accountNumber ? withdrawal.accountNumber.substr(-4) : 'N/A'}`;
  }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Basic crypto address validation
 */
function isValidCryptoAddress(address, currency) {
  if (!address || typeof address !== 'string') return false;
  
  // Simple regex validation for demo purposes
  const patterns = {
    btc: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/,
    eth: /^0x[a-fA-F0-9]{40}$/,
    usdt: /^(T|t)[a-zA-HJ-NP-Z0-9]{33}$|^0x[a-fA-F0-9]{40}$/
  };
  
  return patterns[currency] ? patterns[currency].test(address) : address.length > 10;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  // Check if toast container exists
  let toastContainer = document.querySelector('.toast-container');
  
  // Create container if it doesn't exist
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // Add toast to container
  toastContainer.appendChild(toast);
  
  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toastContainer.removeChild(toast);
    }, 300);
  }, 3000);
}