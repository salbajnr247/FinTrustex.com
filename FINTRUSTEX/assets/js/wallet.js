/**
 * Wallet Management JavaScript
 * 
 * Handles all wallet-related functionality including:
 * - Loading and displaying wallet data
 * - Cryptocurrency balance display
 * - Deposit and withdrawal operations
 * - Transaction history
 * - Portfolio charts and statistics
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    window.location.href = '../../auth.html';
    return;
  }

  // Get the current user
  const currentUser = authService.getCurrentUser();
  if (!currentUser) {
    showToast('Authentication error. Please log in again.', 'error');
    authService.logout();
    window.location.href = '../../auth.html';
    return;
  }

  // DOM elements
  const portfolioChart = document.getElementById('portfolio-chart');
  const allocationChart = document.getElementById('allocation-chart');
  const walletList = document.getElementById('wallet-list');
  const transactionsTableBody = document.getElementById('transactions-table-body');
  const totalBalanceElement = document.getElementById('total-balance');
  const totalChangeElement = document.getElementById('total-change');
  const allocationLegend = document.getElementById('allocation-legend');
  
  // Handle section navigation
  const sections = {
    index: document.getElementById('index'),
    deposit: document.getElementById('deposit'),
    withdraw: document.getElementById('withdraw')
  };
  
  // Show active section based on URL hash
  function navigateToSection() {
    const hash = window.location.hash.slice(1) || 'index';
    
    // Hide all sections
    Object.values(sections).forEach(section => {
      if (section) section.classList.add('hidden');
    });
    
    // Show the active section
    if (sections[hash]) {
      sections[hash].classList.remove('hidden');
      
      // Additional section-specific initialization
      if (hash === 'deposit') {
        initializeDepositSection();
      } else if (hash === 'withdraw') {
        initializeWithdrawSection();
      }
    }
  }
  
  // Listen for hash changes
  window.addEventListener('hashchange', navigateToSection);
  
  // Initialize based on current hash
  navigateToSection();
  
  // Button event listeners
  document.getElementById('deposit-funds')?.addEventListener('click', () => {
    window.location.hash = 'deposit';
  });
  
  document.getElementById('withdraw-funds')?.addEventListener('click', () => {
    window.location.hash = 'withdraw';
  });
  
  document.getElementById('add-wallet')?.addEventListener('click', showAddWalletModal);
  
  document.getElementById('backup-wallet')?.addEventListener('click', backupWallet);
  
  document.getElementById('export-transactions')?.addEventListener('click', exportTransactions);
  
  document.getElementById('cancel-withdraw')?.addEventListener('click', () => {
    window.location.hash = 'index';
  });
  
  // Initialize timeframe buttons
  const timeframeButtons = document.querySelectorAll('.timeframe-btn');
  timeframeButtons.forEach(button => {
    button.addEventListener('click', () => {
      timeframeButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const timeframe = button.dataset.timeframe;
      updatePortfolioChart(timeframe);
    });
  });
  
  // Transaction filters
  const transactionTypeFilter = document.getElementById('transaction-type');
  const transactionCurrencyFilter = document.getElementById('transaction-currency');
  const transactionSearch = document.getElementById('transaction-search');
  
  // Add event listeners to filters
  [transactionTypeFilter, transactionCurrencyFilter].forEach(filter => {
    if (filter) {
      filter.addEventListener('change', filterTransactions);
    }
  });
  
  if (transactionSearch) {
    transactionSearch.addEventListener('input', filterTransactions);
  }
  
  // Pagination
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const paginationInfo = document.getElementById('pagination-info');
  
  let currentPage = 1;
  let totalPages = 1;
  let transactions = [];
  
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        displayTransactionsPage();
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        displayTransactionsPage();
      }
    });
  }
  
  // Initialize wallet dashboard
  await initializeWalletDashboard();
  
  /**
   * Initialize the wallet dashboard with user's data
   */
  async function initializeWalletDashboard() {
    try {
      // Fetch wallet data from API
      const wallets = await api.wallet.getWallets();
      
      // Update total balance
      updateTotalBalance(wallets);
      
      // Display wallets
      displayWallets(wallets);
      
      // Initialize portfolio chart
      initializePortfolioChart('24h'); // Default to 24h timeframe
      
      // Initialize allocation chart
      initializeAllocationChart(wallets);
      
      // Load transaction history
      await loadTransactions();
      
    } catch (error) {
      console.error('Error initializing wallet dashboard:', error);
      showToast('Failed to load wallet data. Please try again later.', 'error');
    }
  }
  
  /**
   * Update the total balance display
   * @param {Array} wallets - User's wallets
   */
  function updateTotalBalance(wallets) {
    // Calculate total balance in USD
    let totalBalance = 0;
    let changePercentage = 0;
    
    if (wallets && wallets.length > 0) {
      // Sum up the fiat balances of all wallets
      wallets.forEach(wallet => {
        totalBalance += parseFloat(wallet.fiatBalance || 0);
        // This is a placeholder for actual change calculation
        if (wallet.changePct) {
          changePercentage += parseFloat(wallet.changePct);
        }
      });
      
      // Average the change percentage
      changePercentage = wallets.length > 0 ? changePercentage / wallets.length : 0;
    }
    
    // Update the UI
    if (totalBalanceElement) {
      totalBalanceElement.textContent = `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    if (totalChangeElement) {
      const isPositive = changePercentage >= 0;
      totalChangeElement.textContent = `${isPositive ? '+' : ''}${changePercentage.toFixed(2)}%`;
      totalChangeElement.className = `change ${isPositive ? 'positive' : 'negative'}`;
    }
  }
  
  /**
   * Display user's wallets in the wallet list
   * @param {Array} wallets - User's wallets
   */
  function displayWallets(wallets) {
    if (!walletList) return;
    
    if (!wallets || wallets.length === 0) {
      walletList.innerHTML = `
        <div class="no-wallets">
          <p>You don't have any wallets yet.</p>
          <button class="btn btn-primary" id="create-first-wallet">Create Your First Wallet</button>
        </div>
      `;
      
      document.getElementById('create-first-wallet')?.addEventListener('click', showAddWalletModal);
      return;
    }
    
    // Clear loading indicator
    walletList.innerHTML = '';
    
    // Create wallet cards
    wallets.forEach(wallet => {
      const walletCard = document.createElement('div');
      walletCard.className = 'wallet-card';
      
      // Get icon and currency name
      const currencyIcon = getCurrencyIcon(wallet.currency);
      const currencyName = getCurrencyName(wallet.currency);
      
      // Format balance and fiat value
      const balance = parseFloat(wallet.balance).toFixed(8);
      const fiatBalance = parseFloat(wallet.fiatBalance || 0).toFixed(2);
      
      walletCard.innerHTML = `
        <div class="wallet-card-header">
          <div class="wallet-currency">
            <img src="${currencyIcon}" alt="${wallet.currency}" class="wallet-icon">
            <span class="wallet-name">${currencyName}</span>
          </div>
          <button class="wallet-more" data-wallet-id="${wallet.id}">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
        <div class="wallet-card-body">
          <div class="wallet-balance">
            <span class="balance-value">${balance} ${wallet.currency}</span>
            <span class="balance-fiat">$${fiatBalance}</span>
          </div>
          <div class="wallet-address">
            <span class="address-text">${wallet.address}</span>
            <button class="address-copy" data-address="${wallet.address}">
              <i class="fas fa-copy"></i>
            </button>
            <span class="address-tooltip">Copy Address</span>
          </div>
          <div class="wallet-buttons">
            <button class="btn btn-primary" data-action="deposit" data-currency="${wallet.currency}">Deposit</button>
            <button class="btn btn-outline" data-action="withdraw" data-currency="${wallet.currency}">Withdraw</button>
          </div>
        </div>
      `;
      
      walletList.appendChild(walletCard);
      
      // Add event listener to copy address button
      walletCard.querySelector('.address-copy').addEventListener('click', (e) => {
        const address = e.currentTarget.dataset.address;
        copyToClipboard(address);
        showToast('Address copied to clipboard', 'success');
      });
      
      // Add event listeners to action buttons
      walletCard.querySelector('[data-action="deposit"]').addEventListener('click', () => {
        const currency = walletCard.querySelector('[data-action="deposit"]').dataset.currency;
        window.location.hash = 'deposit';
        
        // After navigation, set the selected currency
        setTimeout(() => {
          const currencyOptions = document.querySelectorAll('.currency-option');
          currencyOptions.forEach(option => {
            if (option.dataset.currency === currency.toLowerCase()) {
              option.click();
            }
          });
        }, 100);
      });
      
      walletCard.querySelector('[data-action="withdraw"]').addEventListener('click', () => {
        const currency = walletCard.querySelector('[data-action="withdraw"]').dataset.currency;
        window.location.hash = 'withdraw';
        
        // After navigation, set the selected currency
        setTimeout(() => {
          const currencySelect = document.getElementById('withdraw-currency');
          if (currencySelect) {
            currencySelect.value = currency.toLowerCase();
            currencySelect.dispatchEvent(new Event('change'));
          }
        }, 100);
      });
      
      // More options button
      walletCard.querySelector('.wallet-more').addEventListener('click', (e) => {
        const walletId = e.currentTarget.dataset.walletId;
        showWalletOptions(walletId, e.currentTarget);
      });
    });
  }
  
  /**
   * Initialize the portfolio chart
   * @param {string} timeframe - Timeframe for the chart (24h, 7d, 30d, all)
   */
  function initializePortfolioChart(timeframe) {
    if (!portfolioChart) return;
    
    // Sample data - this would come from your API
    const chartData = getPortfolioChartData(timeframe);
    
    // Clear existing chart if any
    if (window.portfolioChartInstance) {
      window.portfolioChartInstance.destroy();
    }
    
    // Create chart
    const ctx = portfolioChart.getContext('2d');
    window.portfolioChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'Portfolio Value (USD)',
          data: chartData.values,
          borderColor: '#f7c948',
          backgroundColor: 'rgba(247, 201, 72, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                return `$${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: '#8e9bae'
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#8e9bae',
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
    
    // Subscribe to real-time price updates if WebSocket is available
    if (window.websocketClient && window.websocketClient.isActive()) {
      websocketClient.addEventListener('price_update', (data) => {
        // Update chart with new price data if we have portfolio data
        // We'll use a simplified approach here, normally you'd recalculate based on holdings
        updatePortfolioChartWithPriceData(data);
      });
    }
  }
  
  /**
   * Update portfolio chart with real-time price data
   * @param {Object} priceData - Price update data from WebSocket
   */
  function updatePortfolioChartWithPriceData(priceData) {
    if (!window.portfolioChartInstance) return;
    
    // Get current chart data
    const chart = window.portfolioChartInstance;
    const dataset = chart.data.datasets[0];
    const data = dataset.data;
    
    if (!data || data.length === 0) return;
    
    // Get last data point
    const lastValue = data[data.length - 1];
    
    // Calculate a new value based on price changes
    // This is simplified - in a real app, you'd calculate based on actual holdings
    let changePercent = 0;
    let count = 0;
    
    if (priceData.pairs && priceData.pairs.length > 0) {
      priceData.pairs.forEach(pair => {
        if (pair.change) {
          changePercent += parseFloat(pair.change);
          count++;
        }
      });
      
      // Average the change percentage
      if (count > 0) {
        changePercent /= count;
      }
    }
    
    // Apply the change to the last value (with some randomness for visual effect)
    // In a real app, you'd calculate the exact portfolio value
    const changeAmount = (lastValue * changePercent / 100) * (0.5 + Math.random());
    const newValue = lastValue + changeAmount;
    
    // Add new data point
    // For simplicity we'll just shift the data and add a new point
    // but keep the labels the same
    data.shift();
    data.push(newValue);
    
    // Update the chart
    chart.update('none'); // Update without animation for smoother real-time updates
    
    // Update the total balance and change percentage
    updateTotalBalanceRealtime(newValue, changePercent);
  }
  
  /**
   * Update total balance display with real-time data
   * @param {number} newValue - New portfolio value
   * @param {number} changePercent - Change percentage
   */
  function updateTotalBalanceRealtime(newValue, changePercent) {
    if (!totalBalanceElement || !totalChangeElement) return;
    
    // Format the new value
    totalBalanceElement.textContent = `$${newValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    // Update the change percentage
    const isPositive = changePercent >= 0;
    totalChangeElement.textContent = `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;
    totalChangeElement.className = `change ${isPositive ? 'positive' : 'negative'}`;
  }
  
  /**
   * Update the portfolio chart with new timeframe
   * @param {string} timeframe - Timeframe for the chart (24h, 7d, 30d, all)
   */
  function updatePortfolioChart(timeframe) {
    if (!portfolioChart || !window.portfolioChartInstance) return;
    
    // Get data for the selected timeframe
    const chartData = getPortfolioChartData(timeframe);
    
    // Update chart data
    window.portfolioChartInstance.data.labels = chartData.labels;
    window.portfolioChartInstance.data.datasets[0].data = chartData.values;
    window.portfolioChartInstance.update();
  }
  
  /**
   * Generate chart data for the selected timeframe
   * @param {string} timeframe - Timeframe for the chart (24h, 7d, 30d, all)
   * @returns {Object} - Chart data object with labels and values
   */
  function getPortfolioChartData(timeframe) {
    // This is a placeholder - in a real app, you would fetch this data from your API
    const now = new Date();
    const labels = [];
    const values = [];
    let dataPoints;
    
    // Determine number of data points based on timeframe
    switch (timeframe) {
      case '24h':
        dataPoints = 24;
        for (let i = 0; i < dataPoints; i++) {
          const time = new Date(now);
          time.setHours(now.getHours() - (dataPoints - i));
          labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          values.push(Math.random() * 2000 + 8000); // Random value between 8000 and 10000
        }
        break;
        
      case '7d':
        dataPoints = 7;
        for (let i = 0; i < dataPoints; i++) {
          const date = new Date(now);
          date.setDate(now.getDate() - (dataPoints - i - 1));
          labels.push(date.toLocaleDateString([], { month: 'short', day: 'numeric' }));
          values.push(Math.random() * 2000 + 8000);
        }
        break;
        
      case '30d':
        dataPoints = 30;
        for (let i = 0; i < dataPoints; i += 2) {
          const date = new Date(now);
          date.setDate(now.getDate() - (dataPoints - i - 1));
          labels.push(date.toLocaleDateString([], { month: 'short', day: 'numeric' }));
          values.push(Math.random() * 3000 + 7000);
        }
        break;
        
      case 'all':
        dataPoints = 12;
        for (let i = 0; i < dataPoints; i++) {
          const date = new Date(now);
          date.setMonth(now.getMonth() - (dataPoints - i - 1));
          labels.push(date.toLocaleDateString([], { month: 'short', year: 'numeric' }));
          values.push(Math.random() * 5000 + 5000);
        }
        break;
    }
    
    return { labels, values };
  }
  
  /**
   * Initialize the allocation chart (pie chart)
   * @param {Array} wallets - User's wallets
   */
  function initializeAllocationChart(wallets) {
    if (!allocationChart || !wallets || wallets.length === 0) return;
    
    // Prepare data for the chart
    const labels = [];
    const values = [];
    const colors = [];
    
    wallets.forEach(wallet => {
      labels.push(wallet.currency);
      values.push(parseFloat(wallet.fiatBalance || 0));
      colors.push(getCurrencyColor(wallet.currency));
    });
    
    // Clear existing chart if any
    if (window.allocationChartInstance) {
      window.allocationChartInstance.destroy();
    }
    
    // Create chart
    const ctx = allocationChart.getContext('2d');
    window.allocationChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${context.label}: $${value.toFixed(2)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
    
    // Create legend
    if (allocationLegend) {
      allocationLegend.innerHTML = '';
      
      labels.forEach((label, index) => {
        const percentage = Math.round((values[index] / values.reduce((a, b) => a + b, 0)) * 100);
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
          <div class="legend-color" style="background-color: ${colors[index]}"></div>
          <span class="legend-label">${label} (${percentage}%)</span>
        `;
        
        allocationLegend.appendChild(legendItem);
      });
    }
  }
  
  /**
   * Load transaction history
   */
  async function loadTransactions() {
    try {
      // Fetch transactions from API
      const response = await api.transactions.getTransactions();
      
      // Store transactions for filtering
      transactions = response;
      
      // Display transactions
      displayTransactions(transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      showToast('Failed to load transaction history. Please try again later.', 'error');
    }
  }
  
  /**
   * Display transactions in the table
   * @param {Array} transactionList - List of transactions
   */
  function displayTransactions(transactionList) {
    if (!transactionsTableBody) return;
    
    if (!transactionList || transactionList.length === 0) {
      transactionsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="no-data">No transactions found</td>
        </tr>
      `;
      
      // Update pagination
      updatePagination(1, 1);
      return;
    }
    
    // Calculate pagination
    const itemsPerPage = 10;
    totalPages = Math.ceil(transactionList.length / itemsPerPage);
    
    // Ensure current page is valid
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    
    // Display the current page
    displayTransactionsPage();
  }
  
  /**
   * Display transactions for the current page
   */
  function displayTransactionsPage() {
    if (!transactionsTableBody) return;
    
    const itemsPerPage = 10;
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, transactions.length);
    const paginatedTransactions = transactions.slice(start, end);
    
    transactionsTableBody.innerHTML = '';
    
    paginatedTransactions.forEach(transaction => {
      const row = document.createElement('tr');
      
      // Determine class based on transaction type
      let typeClass = '';
      switch (transaction.type) {
        case 'deposit':
          typeClass = 'transaction-deposit';
          break;
        case 'withdrawal':
          typeClass = 'transaction-withdrawal';
          break;
        case 'transfer':
          typeClass = 'transaction-transfer';
          break;
      }
      
      // Format amount with sign
      let amountDisplay = transaction.amount;
      if (transaction.type === 'deposit') {
        amountDisplay = `+${transaction.amount}`;
      } else if (transaction.type === 'withdrawal') {
        amountDisplay = `-${transaction.amount}`;
      }
      
      // Determine status class
      let statusClass = '';
      switch (transaction.status) {
        case 'completed':
          statusClass = 'status-completed';
          break;
        case 'pending':
          statusClass = 'status-pending';
          break;
        case 'failed':
          statusClass = 'status-failed';
          break;
      }
      
      row.innerHTML = `
        <td>${formatDate(transaction.timestamp)}</td>
        <td>${capitalizeFirstLetter(transaction.type)}</td>
        <td class="transaction-amount ${typeClass}">${amountDisplay}</td>
        <td>${transaction.currency}</td>
        <td><span class="transaction-status ${statusClass}">${capitalizeFirstLetter(transaction.status)}</span></td>
        <td>
          <div class="transaction-actions">
            <button class="transaction-action" data-action="view" data-transaction-id="${transaction.id}" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
            <button class="transaction-action" data-action="receipt" data-transaction-id="${transaction.id}" title="Download Receipt">
              <i class="fas fa-download"></i>
            </button>
          </div>
        </td>
      `;
      
      transactionsTableBody.appendChild(row);
    });
    
    // Add event listeners to transaction actions
    document.querySelectorAll('.transaction-action').forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const transactionId = e.currentTarget.dataset.transactionId;
        
        if (action === 'view') {
          viewTransactionDetails(transactionId);
        } else if (action === 'receipt') {
          downloadTransactionReceipt(transactionId);
        }
      });
    });
    
    // Update pagination
    updatePagination(currentPage, totalPages);
  }
  
  /**
   * Update pagination controls
   * @param {number} current - Current page
   * @param {number} total - Total pages
   */
  function updatePagination(current, total) {
    if (!prevPageBtn || !nextPageBtn || !paginationInfo) return;
    
    prevPageBtn.disabled = current <= 1;
    nextPageBtn.disabled = current >= total;
    paginationInfo.textContent = `Page ${current} of ${total}`;
  }
  
  /**
   * Filter transactions based on selected filters
   */
  function filterTransactions() {
    if (!transactions || !transactionTypeFilter || !transactionCurrencyFilter || !transactionSearch) return;
    
    const typeFilter = transactionTypeFilter.value;
    const currencyFilter = transactionCurrencyFilter.value;
    const searchQuery = transactionSearch.value.toLowerCase();
    
    let filtered = [...transactions];
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    // Apply currency filter
    if (currencyFilter !== 'all') {
      filtered = filtered.filter(t => t.currency.toLowerCase() === currencyFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(searchQuery) ||
        t.type.toLowerCase().includes(searchQuery) ||
        t.status.toLowerCase().includes(searchQuery) ||
        t.currency.toLowerCase().includes(searchQuery)
      );
    }
    
    // Reset pagination
    currentPage = 1;
    
    // Display filtered transactions
    displayTransactions(filtered);
  }
  
  /**
   * Initialize the deposit section
   */
  function initializeDepositSection() {
    const currencyOptions = document.querySelectorAll('.currency-option');
    const depositAddressElem = document.getElementById('deposit-address');
    const copyAddressBtn = document.getElementById('copy-deposit-address');
    const qrCode = document.getElementById('deposit-qr-code');
    const qrLoading = document.getElementById('deposit-qr-loading');
    const depositCurrencyName = document.getElementById('deposit-currency-name');
    const minDeposit = document.getElementById('min-deposit');
    const confirmationTime = document.getElementById('confirmation-time');
    
    // Default currency (first option)
    let selectedCurrency = 'btc';
    
    // Currency selection
    currencyOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Remove active class from all options
        currencyOptions.forEach(opt => opt.classList.remove('active'));
        
        // Add active class to selected option
        option.classList.add('active');
        
        // Update selected currency
        selectedCurrency = option.dataset.currency;
        
        // Update deposit information
        updateDepositInfo(selectedCurrency);
      });
    });
    
    // Copy address button
    copyAddressBtn?.addEventListener('click', () => {
      const address = depositAddressElem.textContent;
      copyToClipboard(address);
      showToast('Address copied to clipboard', 'success');
    });
    
    // Initialize deposit info with default currency
    updateDepositInfo(selectedCurrency);
    
    /**
     * Update deposit information based on selected currency
     * @param {string} currency - Selected cryptocurrency
     */
    async function updateDepositInfo(currency) {
      if (!depositAddressElem || !qrCode || !qrLoading) return;
      
      // Show loading state
      depositAddressElem.textContent = 'Loading address...';
      if (qrLoading) qrLoading.style.display = 'flex';
      if (qrCode) qrCode.style.display = 'none';
      
      try {
        // Get deposit address for the currency
        const wallet = await getWalletByCurrency(currency);
        
        if (wallet) {
          // Update address
          depositAddressElem.textContent = wallet.address;
          
          // Update QR code
          if (qrCode) {
            QRCode.toCanvas(qrCode, wallet.address, { width: 200 }, function (error) {
              if (error) console.error(error);
              qrLoading.style.display = 'none';
              qrCode.style.display = 'block';
            });
          }
          
          // Update currency name
          if (depositCurrencyName) {
            depositCurrencyName.textContent = getCurrencyName(currency);
          }
          
          // Update minimum deposit
          if (minDeposit) {
            switch (currency) {
              case 'btc':
                minDeposit.textContent = '0.0001 BTC';
                break;
              case 'eth':
                minDeposit.textContent = '0.01 ETH';
                break;
              case 'usdt':
                minDeposit.textContent = '10 USDT';
                break;
              default:
                minDeposit.textContent = '0.001 ' + currency.toUpperCase();
            }
          }
          
          // Update confirmation time
          if (confirmationTime) {
            switch (currency) {
              case 'btc':
                confirmationTime.textContent = '10-60 minutes';
                break;
              case 'eth':
                confirmationTime.textContent = '5-20 minutes';
                break;
              case 'usdt':
                confirmationTime.textContent = '5-20 minutes';
                break;
              default:
                confirmationTime.textContent = '15-30 minutes';
            }
          }
        } else {
          // No wallet found for currency
          depositAddressElem.textContent = 'No address available';
          qrLoading.style.display = 'none';
          showToast(`No ${currency.toUpperCase()} wallet found`, 'error');
        }
        
      } catch (error) {
        console.error('Error getting deposit address:', error);
        depositAddressElem.textContent = 'Error loading address';
        qrLoading.style.display = 'none';
        showToast('Failed to load deposit address. Please try again later.', 'error');
      }
    }
    
    // Load deposit history
    loadDepositHistory();
  }
  
  /**
   * Load deposit history
   */
  async function loadDepositHistory() {
    const depositHistoryTable = document.getElementById('deposit-history-table-body');
    const depositHistoryEmpty = document.getElementById('deposit-history-empty');
    
    if (!depositHistoryTable || !depositHistoryEmpty) return;
    
    try {
      // Get transactions of type 'deposit'
      const deposits = transactions.filter(t => t.type === 'deposit');
      
      if (deposits.length === 0) {
        depositHistoryTable.innerHTML = '';
        depositHistoryEmpty.style.display = 'flex';
        return;
      }
      
      // Sort by date, newest first
      deposits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Take the latest 5 deposits
      const recentDeposits = deposits.slice(0, 5);
      
      // Display in table
      depositHistoryTable.innerHTML = '';
      depositHistoryEmpty.style.display = 'none';
      
      recentDeposits.forEach(deposit => {
        const row = document.createElement('tr');
        
        // Get status class
        let statusClass = '';
        switch (deposit.status) {
          case 'completed':
            statusClass = 'status-completed';
            break;
          case 'pending':
            statusClass = 'status-pending';
            break;
          case 'failed':
            statusClass = 'status-failed';
            break;
        }
        
        row.innerHTML = `
          <td>${formatDate(deposit.timestamp)}</td>
          <td>${deposit.amount} ${deposit.currency}</td>
          <td><span class="transaction-status ${statusClass}">${capitalizeFirstLetter(deposit.status)}</span></td>
        `;
        
        depositHistoryTable.appendChild(row);
      });
      
    } catch (error) {
      console.error('Error loading deposit history:', error);
      depositHistoryTable.innerHTML = `
        <tr>
          <td colspan="3" class="error-message">Failed to load deposit history</td>
        </tr>
      `;
      depositHistoryEmpty.style.display = 'none';
    }
  }
  
  /**
   * Initialize the withdraw section
   */
  function initializeWithdrawSection() {
    const withdrawCurrencySelect = document.getElementById('withdraw-currency');
    const withdrawAddressInput = document.getElementById('withdraw-address');
    const withdrawAmountInput = document.getElementById('withdraw-amount');
    const maxAmountBtn = document.getElementById('max-amount-btn');
    const availableBalanceElem = document.getElementById('available-balance');
    const availableCurrencyElem = document.getElementById('available-currency');
    const withdrawCurrencyCodeElem = document.getElementById('withdraw-currency-code');
    const networkFeeElem = document.getElementById('network-fee');
    const receiveAmountElem = document.getElementById('receive-amount');
    const withdrawForm = document.getElementById('withdraw-form');
    const minWithdrawalElem = document.getElementById('min-withdrawal');
    
    // Track the selected currency and wallet
    let selectedCurrency = '';
    let selectedWallet = null;
    
    // Currency change event
    if (withdrawCurrencySelect) {
      withdrawCurrencySelect.addEventListener('change', async () => {
        selectedCurrency = withdrawCurrencySelect.value;
        
        // Skip if no currency selected
        if (!selectedCurrency) {
          resetWithdrawForm();
          return;
        }
        
        try {
          // Get wallet for the selected currency
          selectedWallet = await getWalletByCurrency(selectedCurrency);
          
          if (selectedWallet) {
            // Update available balance
            if (availableBalanceElem) {
              availableBalanceElem.textContent = selectedWallet.balance;
            }
            
            // Update currency display
            if (availableCurrencyElem) {
              availableCurrencyElem.textContent = selectedCurrency.toUpperCase();
            }
            
            if (withdrawCurrencyCodeElem) {
              withdrawCurrencyCodeElem.textContent = selectedCurrency.toUpperCase();
            }
            
            // Update network fee
            updateNetworkFee(selectedCurrency);
            
            // Update minimum withdrawal info
            if (minWithdrawalElem) {
              switch (selectedCurrency) {
                case 'btc':
                  minWithdrawalElem.textContent = 'The minimum withdrawal amount for BTC is 0.001 BTC.';
                  break;
                case 'eth':
                  minWithdrawalElem.textContent = 'The minimum withdrawal amount for ETH is 0.01 ETH.';
                  break;
                case 'usdt':
                  minWithdrawalElem.textContent = 'The minimum withdrawal amount for USDT is 20 USDT.';
                  break;
                default:
                  minWithdrawalElem.textContent = `The minimum withdrawal amount for ${selectedCurrency.toUpperCase()} is 0.01 ${selectedCurrency.toUpperCase()}.`;
              }
            }
            
            // Calculate receive amount (initial)
            calculateReceiveAmount();
            
          } else {
            showToast(`No ${selectedCurrency.toUpperCase()} wallet found`, 'error');
            resetWithdrawForm();
          }
        } catch (error) {
          console.error('Error getting wallet:', error);
          showToast('Failed to load wallet information. Please try again later.', 'error');
          resetWithdrawForm();
        }
      });
    }
    
    // Amount input changes
    if (withdrawAmountInput) {
      withdrawAmountInput.addEventListener('input', calculateReceiveAmount);
    }
    
    // Max amount button
    if (maxAmountBtn) {
      maxAmountBtn.addEventListener('click', () => {
        if (!selectedWallet) return;
        
        // Get available balance
        const availableBalance = parseFloat(selectedWallet.balance);
        
        // Get network fee
        const networkFee = getNetworkFee(selectedCurrency);
        
        // Calculate max amount (balance - fee)
        const maxAmount = Math.max(0, availableBalance - networkFee);
        
        // Update amount input
        withdrawAmountInput.value = maxAmount.toFixed(8);
        
        // Calculate receive amount
        calculateReceiveAmount();
      });
    }
    
    // Form submission
    if (withdrawForm) {
      withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!selectedWallet || !selectedCurrency) {
          showToast('Please select a currency', 'error');
          return;
        }
        
        const address = withdrawAddressInput.value.trim();
        const amount = parseFloat(withdrawAmountInput.value);
        const code2FA = document.getElementById('withdraw-2fa').value.trim();
        
        // Basic validation
        if (!address) {
          showToast('Please enter a recipient address', 'error');
          withdrawAddressInput.focus();
          return;
        }
        
        if (!amount || isNaN(amount) || amount <= 0) {
          showToast('Please enter a valid amount', 'error');
          withdrawAmountInput.focus();
          return;
        }
        
        // Validate against available balance
        const availableBalance = parseFloat(selectedWallet.balance);
        if (amount > availableBalance) {
          showToast('Insufficient balance for this withdrawal', 'error');
          withdrawAmountInput.focus();
          return;
        }
        
        // Validate minimum withdrawal
        const minWithdrawal = getMinWithdrawal(selectedCurrency);
        if (amount < minWithdrawal) {
          showToast(`Minimum withdrawal amount is ${minWithdrawal} ${selectedCurrency.toUpperCase()}`, 'error');
          withdrawAmountInput.focus();
          return;
        }
        
        // Check if 2FA is required
        const user = authService.getCurrentUser();
        if (user && user.has2FA && !code2FA) {
          showToast('2FA code is required for withdrawals', 'error');
          document.getElementById('withdraw-2fa').focus();
          return;
        }
        
        // Show loading state
        const submitButton = withdrawForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        try {
          // Process withdrawal
          const response = await api.wallet.initiateWithdrawal({
            currency: selectedCurrency,
            address,
            amount,
            twoFactorCode: code2FA
          });
          
          showToast('Withdrawal request submitted successfully', 'success');
          
          // Reset form
          withdrawForm.reset();
          
          // Navigate back to wallet dashboard
          window.location.hash = 'index';
          
          // Refresh wallet data
          initializeWalletDashboard();
          
        } catch (error) {
          console.error('Withdrawal error:', error);
          showToast(error.message || 'Failed to process withdrawal. Please try again later.', 'error');
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonText;
        }
      });
    }
    
    /**
     * Calculate the amount user will receive after fees
     */
    function calculateReceiveAmount() {
      if (!withdrawAmountInput || !receiveAmountElem || !selectedCurrency) return;
      
      const amount = parseFloat(withdrawAmountInput.value) || 0;
      const networkFee = getNetworkFee(selectedCurrency);
      
      // Calculate net amount
      const receiveAmount = Math.max(0, amount - networkFee);
      
      // Update UI
      receiveAmountElem.textContent = `${receiveAmount.toFixed(8)} ${selectedCurrency.toUpperCase()}`;
    }
    
    /**
     * Update the network fee display
     * @param {string} currency - Selected cryptocurrency
     */
    function updateNetworkFee(currency) {
      if (!networkFeeElem) return;
      
      const fee = getNetworkFee(currency);
      networkFeeElem.textContent = `${fee} ${currency.toUpperCase()}`;
    }
    
    /**
     * Reset the withdrawal form
     */
    function resetWithdrawForm() {
      selectedWallet = null;
      
      if (availableBalanceElem) availableBalanceElem.textContent = '0.00';
      if (availableCurrencyElem) availableCurrencyElem.textContent = '';
      if (withdrawCurrencyCodeElem) withdrawCurrencyCodeElem.textContent = '';
      if (networkFeeElem) networkFeeElem.textContent = '0.00';
      if (receiveAmountElem) receiveAmountElem.textContent = '0.00';
      if (minWithdrawalElem) minWithdrawalElem.textContent = 'Select a currency to see minimum withdrawal amount.';
    }
  }
  
  /**
   * Get a wallet by currency
   * @param {string} currency - Currency code (e.g., btc, eth)
   * @returns {Object|null} - Wallet object or null if not found
   */
  async function getWalletByCurrency(currency) {
    try {
      // Get all wallets
      const wallets = await api.wallet.getWallets();
      
      // Find wallet by currency
      return wallets.find(w => w.currency.toLowerCase() === currency.toLowerCase()) || null;
    } catch (error) {
      console.error('Error getting wallet by currency:', error);
      return null;
    }
  }
  
  /**
   * Get the network fee for a currency
   * @param {string} currency - Currency code
   * @returns {number} - Network fee
   */
  function getNetworkFee(currency) {
    // These would typically come from your backend API
    switch (currency) {
      case 'btc':
        return 0.0001;
      case 'eth':
        return 0.005;
      case 'usdt':
        return 10;
      default:
        return 0.001;
    }
  }
  
  /**
   * Get the minimum withdrawal amount for a currency
   * @param {string} currency - Currency code
   * @returns {number} - Minimum withdrawal amount
   */
  function getMinWithdrawal(currency) {
    switch (currency) {
      case 'btc':
        return 0.001;
      case 'eth':
        return 0.01;
      case 'usdt':
        return 20;
      default:
        return 0.01;
    }
  }
  
  /**
   * Show wallet options menu
   * @param {string} walletId - Wallet ID
   * @param {HTMLElement} buttonElement - Button element that triggered the menu
   */
  function showWalletOptions(walletId, buttonElement) {
    // Create menu if it doesn't exist
    let optionsMenu = document.getElementById('wallet-options-menu');
    if (!optionsMenu) {
      optionsMenu = document.createElement('div');
      optionsMenu.id = 'wallet-options-menu';
      optionsMenu.className = 'wallet-options-menu';
      document.body.appendChild(optionsMenu);
      
      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (optionsMenu && !optionsMenu.contains(e.target) && e.target !== buttonElement) {
          optionsMenu.style.display = 'none';
        }
      });
    }
    
    // Position menu near the button
    const buttonRect = buttonElement.getBoundingClientRect();
    optionsMenu.style.top = `${buttonRect.bottom + window.scrollY}px`;
    optionsMenu.style.left = `${buttonRect.left + window.scrollX - 100}px`;
    
    // Menu content
    optionsMenu.innerHTML = `
      <ul>
        <li data-action="view-transactions" data-wallet-id="${walletId}">
          <i class="fas fa-history"></i> View Transactions
        </li>
        <li data-action="export-address" data-wallet-id="${walletId}">
          <i class="fas fa-file-export"></i> Export Address
        </li>
        <li data-action="rename-wallet" data-wallet-id="${walletId}">
          <i class="fas fa-edit"></i> Rename Wallet
        </li>
        <li class="divider"></li>
        <li data-action="view-details" data-wallet-id="${walletId}">
          <i class="fas fa-info-circle"></i> Wallet Details
        </li>
      </ul>
    `;
    
    // Show menu
    optionsMenu.style.display = 'block';
    
    // Menu item click handlers
    optionsMenu.querySelectorAll('li[data-action]').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const id = e.currentTarget.dataset.walletId;
        
        // Hide menu
        optionsMenu.style.display = 'none';
        
        // Handle action
        switch (action) {
          case 'view-transactions':
            filterTransactionsByWallet(id);
            break;
          case 'export-address':
            exportWalletAddress(id);
            break;
          case 'rename-wallet':
            renameWallet(id);
            break;
          case 'view-details':
            viewWalletDetails(id);
            break;
        }
      });
    });
  }
  
  /**
   * Show add wallet modal
   */
  function showAddWalletModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('add-wallet-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'add-wallet-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>Add Wallet</h3>
            <button class="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <p>Select the cryptocurrency you want to add:</p>
            <div class="currency-selector modal-currency-selector">
              <div class="currency-option" data-currency="btc">
                <img src="../../assets/images/bitcoin.svg" alt="Bitcoin">
                <span>Bitcoin (BTC)</span>
              </div>
              <div class="currency-option" data-currency="eth">
                <img src="../../assets/images/ethereum.svg" alt="Ethereum">
                <span>Ethereum (ETH)</span>
              </div>
              <div class="currency-option" data-currency="usdt">
                <img src="../../assets/images/tether.svg" alt="Tether">
                <span>Tether (USDT)</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" id="cancel-add-wallet">Cancel</button>
            <button class="btn btn-primary" id="confirm-add-wallet" disabled>Add Wallet</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Close button
      modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
      });
      
      // Cancel button
      modal.querySelector('#cancel-add-wallet').addEventListener('click', () => {
        modal.style.display = 'none';
      });
      
      // Currency selection
      let selectedCurrency = '';
      const currencyOptions = modal.querySelectorAll('.currency-option');
      currencyOptions.forEach(option => {
        option.addEventListener('click', () => {
          currencyOptions.forEach(opt => opt.classList.remove('active'));
          option.classList.add('active');
          selectedCurrency = option.dataset.currency;
          modal.querySelector('#confirm-add-wallet').disabled = false;
        });
      });
      
      // Confirm button
      modal.querySelector('#confirm-add-wallet').addEventListener('click', async () => {
        if (!selectedCurrency) return;
        
        // Show loading state
        const confirmBtn = modal.querySelector('#confirm-add-wallet');
        const originalText = confirmBtn.textContent;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        try {
          // Create wallet
          const newWallet = await api.wallet.createWallet({
            currency: selectedCurrency,
            label: `${selectedCurrency.toUpperCase()} Wallet`
          });
          
          // Close modal
          modal.style.display = 'none';
          
          // Show success message
          showToast(`${selectedCurrency.toUpperCase()} wallet created successfully`, 'success');
          
          // Refresh wallet dashboard
          await initializeWalletDashboard();
          
        } catch (error) {
          console.error('Error creating wallet:', error);
          showToast(error.message || 'Failed to create wallet. Please try again later.', 'error');
          confirmBtn.disabled = false;
          confirmBtn.textContent = originalText;
        }
      });
      
      // Close modal when clicking outside
      window.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
    
    // Show modal
    modal.style.display = 'block';
  }
  
  /**
   * Filter transactions by wallet ID
   * @param {string} walletId - Wallet ID
   */
  function filterTransactionsByWallet(walletId) {
    // This would be implemented in a real app
    showToast('Transaction filtering by wallet coming soon', 'info');
  }
  
  /**
   * Export wallet address
   * @param {string} walletId - Wallet ID
   */
  function exportWalletAddress(walletId) {
    // This would be implemented in a real app
    showToast('Address export feature coming soon', 'info');
  }
  
  /**
   * Rename wallet
   * @param {string} walletId - Wallet ID
   */
  function renameWallet(walletId) {
    // This would be implemented in a real app
    showToast('Wallet renaming feature coming soon', 'info');
  }
  
  /**
   * View wallet details
   * @param {string} walletId - Wallet ID
   */
  function viewWalletDetails(walletId) {
    // This would be implemented in a real app
    showToast('Wallet details view coming soon', 'info');
  }
  
  /**
   * View transaction details
   * @param {string} transactionId - Transaction ID
   */
  function viewTransactionDetails(transactionId) {
    // Find the transaction
    const transaction = transactions.find(t => t.id === transactionId);
    
    if (!transaction) {
      showToast('Transaction not found', 'error');
      return;
    }
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('transaction-details-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'transaction-details-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    
    // Transaction type icon and class
    let typeIcon, typeClass;
    switch (transaction.type) {
      case 'deposit':
        typeIcon = 'arrow-down';
        typeClass = 'transaction-deposit';
        break;
      case 'withdrawal':
        typeIcon = 'arrow-up';
        typeClass = 'transaction-withdrawal';
        break;
      case 'transfer':
        typeIcon = 'exchange-alt';
        typeClass = 'transaction-transfer';
        break;
      default:
        typeIcon = 'circle';
        typeClass = '';
    }
    
    // Status icon and class
    let statusIcon, statusClass;
    switch (transaction.status) {
      case 'completed':
        statusIcon = 'check-circle';
        statusClass = 'status-completed';
        break;
      case 'pending':
        statusIcon = 'clock';
        statusClass = 'status-pending';
        break;
      case 'failed':
        statusIcon = 'times-circle';
        statusClass = 'status-failed';
        break;
      default:
        statusIcon = 'question-circle';
        statusClass = '';
    }
    
    // Format amount with sign
    let amountDisplay = transaction.amount;
    if (transaction.type === 'deposit') {
      amountDisplay = `+${transaction.amount}`;
    } else if (transaction.type === 'withdrawal') {
      amountDisplay = `-${transaction.amount}`;
    }
    
    // Modal content
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Transaction Details</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="transaction-header">
            <div class="transaction-icon ${typeClass}">
              <i class="fas fa-${typeIcon}"></i>
            </div>
            <div class="transaction-title">
              <h4>${capitalizeFirstLetter(transaction.type)}</h4>
              <span class="transaction-date">${formatDate(transaction.timestamp)}</span>
            </div>
            <div class="transaction-amount-large ${typeClass}">
              ${amountDisplay} ${transaction.currency}
            </div>
          </div>
          
          <div class="transaction-details-list">
            <div class="detail-item">
              <div class="detail-label">Status</div>
              <div class="detail-value">
                <span class="transaction-status ${statusClass}">
                  <i class="fas fa-${statusIcon}"></i>
                  ${capitalizeFirstLetter(transaction.status)}
                </span>
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Transaction ID</div>
              <div class="detail-value">${transaction.id}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Date & Time</div>
              <div class="detail-value">${formatDate(transaction.timestamp, true)}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Type</div>
              <div class="detail-value">${capitalizeFirstLetter(transaction.type)}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Amount</div>
              <div class="detail-value ${typeClass}">${amountDisplay} ${transaction.currency}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Fee</div>
              <div class="detail-value">${transaction.fee || '0.00'} ${transaction.currency}</div>
            </div>
            ${transaction.address ? `
              <div class="detail-item">
                <div class="detail-label">${transaction.type === 'deposit' ? 'From' : 'To'} Address</div>
                <div class="detail-value address-value">
                  ${transaction.address}
                  <button class="copy-btn" data-copy="${transaction.address}">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            ` : ''}
            ${transaction.txid ? `
              <div class="detail-item">
                <div class="detail-label">Blockchain Transaction ID</div>
                <div class="detail-value address-value">
                  ${transaction.txid}
                  <button class="copy-btn" data-copy="${transaction.txid}">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            ` : ''}
            ${transaction.confirmations ? `
              <div class="detail-item">
                <div class="detail-label">Confirmations</div>
                <div class="detail-value">${transaction.confirmations}</div>
              </div>
            ` : ''}
            ${transaction.note ? `
              <div class="detail-item">
                <div class="detail-label">Note</div>
                <div class="detail-value">${transaction.note}</div>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="modal-footer">
          ${transaction.txid ? `
            <a href="${getBlockExplorerUrl(transaction.currency, transaction.txid)}" target="_blank" class="btn btn-outline">
              <i class="fas fa-external-link-alt"></i> View on Blockchain
            </a>
          ` : ''}
          <button class="btn btn-primary" id="close-transaction-details">Close</button>
        </div>
      </div>
    `;
    
    // Show modal
    modal.style.display = 'block';
    
    // Close button
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Close button in footer
    modal.querySelector('#close-transaction-details').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Copy buttons
    modal.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.copy;
        copyToClipboard(text);
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          btn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
      });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
  
  /**
   * Download transaction receipt
   * @param {string} transactionId - Transaction ID
   */
  function downloadTransactionReceipt(transactionId) {
    // Find the transaction
    const transaction = transactions.find(t => t.id === transactionId);
    
    if (!transaction) {
      showToast('Transaction not found', 'error');
      return;
    }
    
    // This would be implemented in a real app
    showToast('Transaction receipt download coming soon', 'info');
  }
  
  /**
   * Backup wallet
   */
  function backupWallet() {
    // This would be implemented in a real app
    showToast('Wallet backup feature coming soon', 'info');
  }
  
  /**
   * Export transactions
   */
  function exportTransactions() {
    // This would be implemented in a real app
    showToast('Transaction export feature coming soon', 'info');
  }
  
  /**
   * Get currency icon URL
   * @param {string} currency - Currency code
   * @returns {string} - Icon URL
   */
  function getCurrencyIcon(currency) {
    currency = currency.toLowerCase();
    
    switch (currency) {
      case 'btc':
        return '../../assets/images/bitcoin.svg';
      case 'eth':
        return '../../assets/images/ethereum.svg';
      case 'usdt':
        return '../../assets/images/tether.svg';
      default:
        return '../../assets/images/generated-icon.png';
    }
  }
  
  /**
   * Get currency full name
   * @param {string} currency - Currency code
   * @returns {string} - Currency name
   */
  function getCurrencyName(currency) {
    currency = currency.toLowerCase();
    
    switch (currency) {
      case 'btc':
        return 'Bitcoin (BTC)';
      case 'eth':
        return 'Ethereum (ETH)';
      case 'usdt':
        return 'Tether (USDT)';
      default:
        return currency.toUpperCase();
    }
  }
  
  /**
   * Get currency color for charts
   * @param {string} currency - Currency code
   * @returns {string} - Color hex code
   */
  function getCurrencyColor(currency) {
    currency = currency.toLowerCase();
    
    switch (currency) {
      case 'btc':
        return '#f7931a';
      case 'eth':
        return '#627eea';
      case 'usdt':
        return '#26a17b';
      case 'ltc':
        return '#b8b8b8';
      case 'xrp':
        return '#23292f';
      case 'bch':
        return '#8dc351';
      case 'bnb':
        return '#f3ba2f';
      case 'dot':
        return '#e6007a';
      case 'link':
        return '#2a5ada';
      case 'ada':
        return '#0033ad';
      default:
        return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    }
  }
  
  /**
   * Get block explorer URL for transaction
   * @param {string} currency - Currency code
   * @param {string} txid - Transaction ID
   * @returns {string} - Block explorer URL
   */
  function getBlockExplorerUrl(currency, txid) {
    currency = currency.toLowerCase();
    
    switch (currency) {
      case 'btc':
        return `https://blockstream.info/tx/${txid}`;
      case 'eth':
        return `https://etherscan.io/tx/${txid}`;
      case 'usdt':
        return `https://etherscan.io/tx/${txid}`;
      default:
        return `https://etherscan.io/tx/${txid}`;
    }
  }
  
  /**
   * Format date
   * @param {string} dateString - Date string
   * @param {boolean} includeTime - Whether to include time
   * @returns {string} - Formatted date
   */
  function formatDate(dateString, includeTime = false) {
    const date = new Date(dateString);
    
    if (includeTime) {
      return date.toLocaleString();
    }
    
    return date.toLocaleDateString();
  }
  
  /**
   * Capitalize first letter of a string
   * @param {string} str - String to capitalize
   * @returns {string} - Capitalized string
   */
  function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   */
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
      .catch(err => console.error('Error copying to clipboard:', err));
  }
  
  /**
   * Show toast message
   * @param {string} message - Message to show
   * @param {string} type - Toast type (success, error, warning, info)
   */
  function showToast(message, type = 'info') {
    // Check if toast container exists
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon based on type
    let icon;
    switch (type) {
      case 'success':
        icon = 'check-circle';
        break;
      case 'error':
        icon = 'exclamation-circle';
        break;
      case 'warning':
        icon = 'exclamation-triangle';
        break;
      default:
        icon = 'info-circle';
    }
    
    // Set toast content
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas fa-${icon}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => {
        toastContainer.removeChild(toast);
      }, 300);
    });
    
    // Auto close after 5 seconds
    setTimeout(() => {
      if (toast.parentNode === toastContainer) {
        toast.classList.remove('show');
        setTimeout(() => {
          if (toast.parentNode === toastContainer) {
            toastContainer.removeChild(toast);
          }
        }, 300);
      }
    }, 5000);
  }
});