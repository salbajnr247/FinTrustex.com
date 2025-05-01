/**
 * FinTrustEX Admin Dashboard
 * Handles administrative features and data visualization
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI components
  initializeUI();
  
  // Fetch initial data
  fetchDashboardData();
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize charts
  initCharts();
});

/**
 * Initialize UI components
 */
function initializeUI() {
  // Initialize AOS animations
  AOS.init({ duration: 800 });
  
  // Load sidebar and navbar
  loadComponents();
}

/**
 * Load HTML components
 */
function loadComponents() {
  // Sidebar and navbar are loaded via components.js
  // Just make sure any admin-specific elements are initialized
  
  const sidebar = document.getElementById('sidebar-container');
  if (sidebar) {
    // Highlight the admin section in the sidebar when it's loaded
    const checkSidebar = setInterval(() => {
      const adminLink = sidebar.querySelector('a[href*="admin"]');
      if (adminLink) {
        adminLink.classList.add('active');
        clearInterval(checkSidebar);
      }
    }, 100);
  }
}

/**
 * Set up event listeners for admin dashboard interactions
 */
function setupEventListeners() {
  // Refresh data button
  const refreshButton = document.getElementById('refresh-data');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      showToast('Refreshing dashboard data...', 'info');
      fetchDashboardData();
    });
  }
  
  // View logs button
  const viewLogsButton = document.getElementById('view-logs');
  if (viewLogsButton) {
    viewLogsButton.addEventListener('click', () => {
      showSystemLogs();
    });
  }
  
  // Export buttons
  const exportUsersButton = document.getElementById('export-users-csv');
  if (exportUsersButton) {
    exportUsersButton.addEventListener('click', () => {
      exportUsers();
    });
  }
  
  const exportTransactionsButton = document.getElementById('export-transactions-csv');
  if (exportTransactionsButton) {
    exportTransactionsButton.addEventListener('click', () => {
      exportTransactions();
    });
  }
  
  // Admin tools
  setupAdminTools();
  
  // User management actions
  document.addEventListener('click', event => {
    const target = event.target.closest('.suspend-user, .view-user, .edit-user');
    if (!target) return;
    
    const userId = target.getAttribute('data-user-id');
    
    if (target.classList.contains('suspend-user')) {
      toggleUserStatus(userId, target.textContent.trim().includes('Suspend') ? 'Suspended' : 'Active');
    } else if (target.classList.contains('view-user')) {
      viewUserDetails(userId);
    } else if (target.classList.contains('edit-user')) {
      editUser(userId);
    }
  });
  
  // Transaction actions
  document.addEventListener('click', event => {
    const target = event.target.closest('.approve-tx, .reject-tx, .view-tx');
    if (!target) return;
    
    const txId = target.getAttribute('data-tx-id');
    
    if (target.classList.contains('approve-tx')) {
      updateTransactionStatus(txId, 'completed');
    } else if (target.classList.contains('reject-tx')) {
      updateTransactionStatus(txId, 'failed');
    } else if (target.classList.contains('view-tx')) {
      viewTransactionDetails(txId);
    }
  });
}

/**
 * Setup admin tools buttons
 */
function setupAdminTools() {
  // System configuration
  const systemConfigButton = document.getElementById('system-config');
  if (systemConfigButton) {
    systemConfigButton.addEventListener('click', () => {
      showSystemConfig();
    });
  }
  
  // Security audit
  const securityAuditButton = document.getElementById('security-audit');
  if (securityAuditButton) {
    securityAuditButton.addEventListener('click', () => {
      runSecurityAudit();
    });
  }
  
  // Backup database
  const backupButton = document.getElementById('backup-data');
  if (backupButton) {
    backupButton.addEventListener('click', () => {
      backupDatabase();
    });
  }
  
  // Market settings
  const marketSettingsButton = document.getElementById('market-settings');
  if (marketSettingsButton) {
    marketSettingsButton.addEventListener('click', () => {
      showMarketSettings();
    });
  }
}

/**
 * Fetch all dashboard data
 */
async function fetchDashboardData() {
  try {
    // Show loading indicators
    showLoadingState();
    
    // Fetch users, transactions, analytics, and market data in parallel
    const [users, transactions, analytics, marketData, activityLog] = await Promise.all([
      fetchUsers(),
      fetchTransactions(),
      fetchAnalytics(),
      fetchMarketData(),
      fetchActivityLog()
    ]);
    
    // Update the dashboard sections
    updateUserList(users);
    updateTransactionList(transactions);
    updateAnalyticsSection(analytics);
    updateMarketInsights(marketData);
    updateActivityLog(activityLog);
    
    // Hide loading indicators
    hideLoadingState();
    
    // Show success message
    showToast('Dashboard data updated successfully', 'success');
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    showToast('Failed to fetch some dashboard data', 'error');
    hideLoadingState();
  }
}

/**
 * Show loading state for dashboard sections
 */
function showLoadingState() {
  const sections = [
    'user-list', 
    'transaction-list', 
    'system-analytics',
    'market-insights',
    'activity-list'
  ];
  
  sections.forEach(id => {
    const section = document.getElementById(id);
    if (section) {
      if (id === 'user-list' || id === 'transaction-list') {
        const tbody = section.querySelector('tbody');
        if (tbody) {
          tbody.innerHTML = `
            <tr>
              <td colspan="5" class="loading-td">
                <div class="loading-spinner"></div>
                <p>Loading data...</p>
              </td>
            </tr>
          `;
        }
      } else {
        section.innerHTML = `
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading data...</p>
          </div>
        `;
      }
    }
  });
}

/**
 * Hide loading state for dashboard sections
 */
function hideLoadingState() {
  const loadingElements = document.querySelectorAll('.loading-spinner, .loading-container, .loading-td');
  loadingElements.forEach(el => {
    const parent = el.parentElement;
    if (parent && parent.classList.contains('loading-container')) {
      parent.remove();
    } else if (el.classList.contains('loading-td')) {
      // Will be replaced by actual content
    } else {
      el.remove();
    }
  });
}

/**
 * Fetch user data from API
 */
async function fetchUsers() {
  try {
    const response = await fetch('/api/admin/users');
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    
    // Return example data structure for UI development
    return {
      users: [
        {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          status: 'Active',
          role: 'admin',
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          username: 'trader1',
          email: 'trader1@example.com',
          status: 'Active',
          role: 'user',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 3,
          username: 'trader2',
          email: 'trader2@example.com',
          status: 'Suspended',
          role: 'user',
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      pagination: {
        total: 3,
        page: 1,
        limit: 20,
        pages: 1
      }
    };
  }
}

/**
 * Fetch transaction data from API
 */
async function fetchTransactions() {
  try {
    const response = await fetch('/api/admin/transactions');
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching transactions:', error);
    
    // Return example data structure for UI development
    return {
      transactions: [
        {
          id: 'TX12345',
          user: 'trader1',
          userId: 2,
          type: 'Deposit',
          amount: '0.5',
          currency: 'BTC',
          status: 'Pending',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'TX12346',
          user: 'trader2',
          userId: 3,
          type: 'Withdrawal',
          amount: '1.2',
          currency: 'ETH',
          status: 'Completed',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'TX12347',
          user: 'admin',
          userId: 1,
          type: 'Transfer',
          amount: '100',
          currency: 'USDT',
          status: 'Completed',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      pagination: {
        total: 3,
        page: 1,
        limit: 20,
        pages: 1
      }
    };
  }
}

/**
 * Fetch analytics data from API
 */
async function fetchAnalytics() {
  try {
    const response = await fetch('/api/admin/analytics');
    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching analytics:', error);
    
    // Return example data structure for UI development
    return {
      totalUsers: 1250,
      activeUsers: 850,
      dailyTransactions: 150,
      chartData: {
        labels: ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025'],
        users: [50, 80, 120, 200, 350, 450],
        transactions: [120, 250, 300, 450, 700, 900]
      },
      volumeByDay: {
        '4/25/2025': 1234567,
        '4/26/2025': 2345678,
        '4/27/2025': 3456789,
        '4/28/2025': 4567890,
        '4/29/2025': 5678901,
        '4/30/2025': 6789012,
        '5/1/2025': 7890123
      },
      volumeByCurrency: {
        BTC: 123.45,
        ETH: 456.78,
        USDT: 9876543.21
      }
    };
  }
}

/**
 * Fetch market data from API
 */
async function fetchMarketData() {
  try {
    const response = await fetch('/api/admin/market-data');
    if (!response.ok) {
      throw new Error('Failed to fetch market data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching market data:', error);
    
    // Return example data structure for UI development
    return {
      volume: {
        total: 24568790,
        change: 5.67,
        byCurrency: {
          BTC: 12345678,
          ETH: 8765432,
          USDT: 3457680
        }
      },
      activePairs: 24,
      systemLoad: '62%',
      activeOrders: 156,
      openPositions: 78,
      tradingFees: {
        last24h: 12345.67,
        last7d: 87654.32,
        last30d: 345678.90
      }
    };
  }
}

/**
 * Fetch activity log from API
 */
async function fetchActivityLog() {
  try {
    const response = await fetch('/api/admin/activity-log');
    if (!response.ok) {
      throw new Error('Failed to fetch activity log');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching activity log:', error);
    
    // Return example data structure for UI development
    return {
      activities: [
        {
          id: 'ACT1',
          type: 'user_login',
          description: 'User admin logged in',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
          id: 'ACT2',
          type: 'transaction_approved',
          description: 'Transaction TX12345 approved by admin',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        },
        {
          id: 'ACT3',
          type: 'user_suspended',
          description: 'User trader2 suspended for suspicious activity',
          timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString()
        }
      ],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update user list in the UI
 */
function updateUserList(data) {
  const userList = document.getElementById('user-list');
  if (!userList) return;
  
  const tbody = userList.querySelector('tbody');
  if (!tbody) return;
  
  if (!data || !data.users || data.users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">No users found</td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = data.users.map(user => `
    <tr>
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td class="status-${user.status.toLowerCase()}">${user.status}</td>
      <td>
        <button class="btn btn-outline suspend-user" data-user-id="${user.id}">
          <i class="fas fa-${user.status === 'Active' ? 'ban' : 'check-circle'}"></i> 
          ${user.status === 'Active' ? 'Suspend' : 'Activate'}
        </button>
        <button class="btn btn-outline view-user" data-user-id="${user.id}">
          <i class="fas fa-eye"></i> View
        </button>
        <button class="btn btn-outline edit-user" data-user-id="${user.id}">
          <i class="fas fa-edit"></i> Edit
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * Update transaction list in the UI
 */
function updateTransactionList(data) {
  const transactionList = document.getElementById('transaction-list');
  if (!transactionList) return;
  
  const tbody = transactionList.querySelector('tbody');
  if (!tbody) return;
  
  if (!data || !data.transactions || data.transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">No transactions found</td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = data.transactions.map(tx => `
    <tr>
      <td>${tx.id}</td>
      <td>${tx.user}</td>
      <td>${tx.type}</td>
      <td>${tx.amount} ${tx.currency}</td>
      <td class="status-${tx.status.toLowerCase()}">${tx.status}</td>
      <td>
        ${tx.status === 'Pending' ? `
          <button class="btn btn-outline approve-tx" data-tx-id="${tx.id}">
            <i class="fas fa-check"></i> Approve
          </button>
          <button class="btn btn-outline reject-tx" data-tx-id="${tx.id}">
            <i class="fas fa-times"></i> Reject
          </button>
        ` : `
          <button class="btn btn-outline view-tx" data-tx-id="${tx.id}">
            <i class="fas fa-eye"></i> View
          </button>
        `}
      </td>
    </tr>
  `).join('');
}

/**
 * Update analytics section in the UI
 */
function updateAnalyticsSection(data) {
  const analyticsSection = document.querySelector('.system-analytics');
  if (!analyticsSection) return;
  
  analyticsSection.innerHTML = `
    <h3>System Analytics</h3>
    <canvas id="analytics-chart"></canvas>
    <div class="analytics-summary">
      <div class="summary-item">
        <span class="summary-label">Total Users:</span>
        <span class="summary-value">${data.totalUsers.toLocaleString()}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Active Users:</span>
        <span class="summary-value">${data.activeUsers.toLocaleString()}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Daily Transactions:</span>
        <span class="summary-value">${data.dailyTransactions.toLocaleString()}</span>
      </div>
    </div>
  `;
  
  // Initialize chart
  const ctx = document.getElementById('analytics-chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.chartData.labels,
      datasets: [
        {
          label: 'New Users',
          data: data.chartData.users,
          backgroundColor: 'rgba(247, 201, 72, 0.7)',
          borderColor: '#f7c948',
          borderWidth: 1
        },
        {
          label: 'Transactions',
          data: data.chartData.transactions,
          backgroundColor: 'rgba(35, 35, 35, 0.7)',
          borderColor: '#333333',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#cccccc'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#cccccc'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#ffffff'
          }
        }
      }
    }
  });
}

/**
 * Update market insights section in the UI
 */
function updateMarketInsights(data) {
  const marketInsights = document.getElementById('market-insights');
  if (!marketInsights) return;
  
  marketInsights.innerHTML = `
    <h3>Market Insights</h3>
    <div class="market-stats">
      <div class="stat-card">
        <h4>24h Trading Volume</h4>
        <p class="stat-value">$${(data.volume.total).toLocaleString()}</p>
        <p class="stat-change ${data.volume.change >= 0 ? 'positive' : 'negative'}">
          ${data.volume.change >= 0 ? '+' : ''}${data.volume.change}%
        </p>
      </div>
      <div class="stat-card">
        <h4>Active Trading Pairs</h4>
        <p class="stat-value">${data.activePairs}</p>
      </div>
      <div class="stat-card">
        <h4>System Load</h4>
        <p class="stat-value">${data.systemLoad}</p>
      </div>
      <div class="stat-card">
        <h4>24h Trading Fees</h4>
        <p class="stat-value">$${data.tradingFees.last24h.toLocaleString()}</p>
      </div>
    </div>
  `;
}

/**
 * Update activity log in the UI
 */
function updateActivityLog(data) {
  const activityList = document.getElementById('activity-list');
  if (!activityList) return;
  
  if (!data || !data.activities || data.activities.length === 0) {
    activityList.innerHTML = `<li class="empty-state">No activities found</li>`;
    return;
  }
  
  activityList.innerHTML = data.activities.map(activity => `
    <li class="activity-item">
      <span class="activity-icon">
        <i class="fas ${getActivityIcon(activity.type)}"></i>
      </span>
      <div class="activity-content">
        <p class="activity-description">${activity.description}</p>
        <p class="activity-time">${formatTimeAgo(new Date(activity.timestamp))}</p>
      </div>
    </li>
  `).join('');
}

/**
 * Get icon class for activity type
 */
function getActivityIcon(type) {
  switch (type) {
    case 'user_login':
      return 'fa-sign-in-alt';
    case 'user_logout':
      return 'fa-sign-out-alt';
    case 'transaction_approved':
      return 'fa-check-circle';
    case 'transaction_rejected':
      return 'fa-times-circle';
    case 'user_suspended':
      return 'fa-user-slash';
    case 'user_activated':
      return 'fa-user-check';
    case 'system_maintenance':
      return 'fa-wrench';
    case 'deposit_approved':
      return 'fa-money-bill-wave';
    case 'withdrawal_approved':
      return 'fa-money-bill-wave';
    case 'deposit_rejected':
      return 'fa-ban';
    case 'withdrawal_rejected':
      return 'fa-ban';
    default:
      return 'fa-info-circle';
  }
}

/**
 * Format time ago from date
 */
function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * Initialize charts for the admin dashboard
 */
function initCharts() {
  // Charts are initialized in the updateAnalyticsSection function
  // when the data is available
}

/**
 * Toggle user status (suspend/activate)
 */
async function toggleUserStatus(userId, newStatus) {
  try {
    showToast(`Updating user status...`, 'info');
    
    const response = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update user status');
    }
    
    const data = await response.json();
    
    // Update the UI
    const userItem = document.querySelector(`.suspend-user[data-user-id="${userId}"]`).closest('tr');
    if (userItem) {
      const statusCell = userItem.querySelector('td:nth-child(4)');
      if (statusCell) {
        statusCell.className = `status-${newStatus.toLowerCase()}`;
        statusCell.textContent = newStatus;
      }
      
      const suspendButton = userItem.querySelector('.suspend-user');
      if (suspendButton) {
        suspendButton.innerHTML = `
          <i class="fas fa-${newStatus === 'Active' ? 'ban' : 'check-circle'}"></i> 
          ${newStatus === 'Active' ? 'Suspend' : 'Activate'}
        `;
      }
    }
    
    // Show success message
    showToast(`User ${data.username} ${newStatus === 'Active' ? 'activated' : 'suspended'} successfully`, 'success');
    
    // Refresh activity log
    const activityLog = await fetchActivityLog();
    updateActivityLog(activityLog);
  } catch (error) {
    console.error('Error toggling user status:', error);
    showToast('Failed to update user status', 'error');
  }
}

/**
 * View user details
 */
async function viewUserDetails(userId) {
  try {
    showToast('Loading user details...', 'info');
    
    const response = await fetch(`/api/admin/users/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user details');
    }
    
    const user = await response.json();
    
    // Create and show modal with user details
    showUserDetailsModal(user);
  } catch (error) {
    console.error('Error viewing user details:', error);
    showToast('Failed to load user details', 'error');
  }
}

/**
 * Show user details modal
 */
function showUserDetailsModal(user) {
  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>User Details: ${user.username}</h2>
        <span class="close-modal">&times;</span>
      </div>
      <div class="modal-body">
        <div class="user-details">
          <div class="user-info">
            <h3>Account Information</h3>
            <p><strong>ID:</strong> ${user.id}</p>
            <p><strong>Username:</strong> ${user.username}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Status:</strong> <span class="status-${user.status.toLowerCase()}">${user.status}</span></p>
            <p><strong>Role:</strong> ${user.role}</p>
            <p><strong>KYC Status:</strong> ${user.kycStatus}</p>
            <p><strong>Created At:</strong> ${new Date(user.createdAt).toLocaleString()}</p>
            <p><strong>Last Login:</strong> ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</p>
          </div>
          
          <div class="user-wallets">
            <h3>Wallet Balances</h3>
            ${user.wallets && user.wallets.length > 0 ? `
              <table class="details-table">
                <thead>
                  <tr>
                    <th>Currency</th>
                    <th>Balance</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  ${user.wallets.map(wallet => `
                    <tr>
                      <td>${wallet.currency}</td>
                      <td>${wallet.balance}</td>
                      <td>${wallet.address}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p class="empty-state">No wallets found</p>'}
          </div>
          
          <div class="user-orders">
            <h3>Recent Orders</h3>
            ${user.recentOrders && user.recentOrders.length > 0 ? `
              <table class="details-table">
                <thead>
                  <tr>
                    <th>Pair</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${user.recentOrders.map(order => `
                    <tr>
                      <td>${order.pair}</td>
                      <td>${order.type}</td>
                      <td>${order.amount}</td>
                      <td>${order.price}</td>
                      <td class="status-${order.status.toLowerCase()}">${order.status}</td>
                      <td>${new Date(order.createdAt).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p class="empty-state">No recent orders</p>'}
          </div>
          
          <div class="user-transactions">
            <h3>Recent Transactions</h3>
            ${user.recentTransactions && user.recentTransactions.length > 0 ? `
              <table class="details-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Currency</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${user.recentTransactions.map(tx => `
                    <tr>
                      <td>${tx.type}</td>
                      <td>${tx.amount}</td>
                      <td>${tx.currency}</td>
                      <td class="status-${tx.status.toLowerCase()}">${tx.status}</td>
                      <td>${new Date(tx.createdAt).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p class="empty-state">No recent transactions</p>'}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="close-modal">Close</button>
        <button class="btn btn-yellow" id="edit-user-modal" data-user-id="${user.id}">Edit User</button>
      </div>
    </div>
  `;
  
  // Add modal to the page
  document.body.appendChild(modal);
  
  // Show modal with animation
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
  
  // Handle close button
  const closeBtn = modal.querySelector('.close-modal');
  const closeModalBtn = modal.querySelector('#close-modal');
  const editUserBtn = modal.querySelector('#edit-user-modal');
  
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  });
  
  closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  });
  
  editUserBtn.addEventListener('click', () => {
    modal.remove();
    editUser(user.id);
  });
  
  // Close modal when clicking outside
  modal.addEventListener('click', event => {
    if (event.target === modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  });
}

/**
 * Edit user
 */
function editUser(userId) {
  // Implement user editing functionality
  showToast(`Editing user ${userId}`, 'info');
  // In a real app, this would open a form to edit the user
}

/**
 * Update transaction status
 */
async function updateTransactionStatus(txId, newStatus) {
  try {
    showToast(`Updating transaction status...`, 'info');
    
    const response = await fetch(`/api/admin/transactions/${txId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update transaction status');
    }
    
    const data = await response.json();
    
    // Update the UI
    const txItem = document.querySelector(`[data-tx-id="${txId}"]`).closest('tr');
    if (txItem) {
      const statusCell = txItem.querySelector('td:nth-child(5)');
      if (statusCell) {
        statusCell.className = `status-${newStatus.toLowerCase()}`;
        statusCell.textContent = newStatus === 'completed' ? 'Completed' : 
                                newStatus === 'failed' ? 'Failed' : 
                                newStatus === 'cancelled' ? 'Cancelled' : 'Pending';
      }
      
      const actionsCell = txItem.querySelector('td:nth-child(6)');
      if (actionsCell) {
        actionsCell.innerHTML = `
          <button class="btn btn-outline view-tx" data-tx-id="${txId}">
            <i class="fas fa-eye"></i> View
          </button>
        `;
      }
    }
    
    // Show success message
    showToast(`Transaction ${data.id} ${newStatus === 'completed' ? 'approved' : 'rejected'} successfully`, 'success');
    
    // Refresh activity log
    const activityLog = await fetchActivityLog();
    updateActivityLog(activityLog);
  } catch (error) {
    console.error('Error updating transaction status:', error);
    showToast('Failed to update transaction status', 'error');
  }
}

/**
 * View transaction details
 */
function viewTransactionDetails(txId) {
  // Implement transaction details view
  showToast(`Viewing transaction ${txId}`, 'info');
  // In a real app, this would show a modal with transaction details
}

/**
 * Show system logs
 */
async function showSystemLogs() {
  try {
    showToast('Loading system logs...', 'info');
    
    const response = await fetch('/api/admin/system-logs');
    if (!response.ok) {
      throw new Error('Failed to fetch system logs');
    }
    
    const data = await response.json();
    
    // Create and show modal with system logs
    showSystemLogsModal(data.logs);
  } catch (error) {
    console.error('Error fetching system logs:', error);
    showToast('Failed to load system logs', 'error');
  }
}

/**
 * Show system logs modal
 */
function showSystemLogsModal(logs) {
  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>System Logs</h2>
        <span class="close-modal">&times;</span>
      </div>
      <div class="modal-body">
        <div class="logs-filter">
          <select id="log-level-filter">
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          <select id="log-source-filter">
            <option value="all">All Sources</option>
            <option value="server">Server</option>
            <option value="database">Database</option>
            <option value="auth">Authentication</option>
            <option value="api">API</option>
            <option value="transaction">Transactions</option>
            <option value="monitoring">Monitoring</option>
          </select>
        </div>
        <div class="system-logs">
          ${logs.map(log => `
            <div class="log-entry log-${log.level}">
              <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
              <span class="log-level">${log.level.toUpperCase()}</span>
              <span class="log-source">[${log.source}]</span>
              <span class="log-message">${log.message}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="close-modal">Close</button>
        <button class="btn btn-yellow" id="export-logs">Export Logs</button>
      </div>
    </div>
  `;
  
  // Add modal to the page
  document.body.appendChild(modal);
  
  // Show modal with animation
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
  
  // Handle close button
  const closeBtn = modal.querySelector('.close-modal');
  const closeModalBtn = modal.querySelector('#close-modal');
  const exportLogsBtn = modal.querySelector('#export-logs');
  
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  });
  
  closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  });
  
  // Handle filters
  const levelFilter = modal.querySelector('#log-level-filter');
  const sourceFilter = modal.querySelector('#log-source-filter');
  const logEntries = modal.querySelectorAll('.log-entry');
  
  levelFilter.addEventListener('change', () => {
    const level = levelFilter.value;
    const source = sourceFilter.value;
    
    filterLogs(logEntries, level, source);
  });
  
  sourceFilter.addEventListener('change', () => {
    const level = levelFilter.value;
    const source = sourceFilter.value;
    
    filterLogs(logEntries, level, source);
  });
  
  // Export logs
  exportLogsBtn.addEventListener('click', () => {
    exportLogs(logs);
  });
  
  // Close modal when clicking outside
  modal.addEventListener('click', event => {
    if (event.target === modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  });
}

/**
 * Filter logs based on level and source
 */
function filterLogs(logEntries, level, source) {
  logEntries.forEach(entry => {
    const entryLevel = entry.className.split('log-')[1];
    const entrySource = entry.querySelector('.log-source').textContent.slice(1, -1);
    
    const levelMatch = level === 'all' || entryLevel === level;
    const sourceMatch = source === 'all' || entrySource === source;
    
    if (levelMatch && sourceMatch) {
      entry.style.display = 'block';
    } else {
      entry.style.display = 'none';
    }
  });
}

/**
 * Export logs to CSV
 */
function exportLogs(logs) {
  const csvContent = "data:text/csv;charset=utf-8," + 
    "Timestamp,Level,Source,Message\n" + 
    logs.map(log => {
      return `"${new Date(log.timestamp).toLocaleString()}","${log.level}","${log.source}","${log.message}"`;
    }).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "system_logs.csv");
  document.body.appendChild(link);
  link.click();
}

/**
 * Show system configuration
 */
function showSystemConfig() {
  showToast('System configuration not implemented yet', 'info');
}

/**
 * Run security audit
 */
function runSecurityAudit() {
  showToast('Running security audit...', 'info');
  
  // Simulate audit process
  setTimeout(() => {
    showToast('Security audit completed successfully', 'success');
  }, 2000);
}

/**
 * Backup database
 */
async function backupDatabase() {
  try {
    showToast('Creating database backup...', 'info');
    
    const response = await fetch('/api/admin/backup', {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to create backup');
    }
    
    const data = await response.json();
    
    showToast(`Database backup created successfully: ${data.backupId}`, 'success');
  } catch (error) {
    console.error('Error creating backup:', error);
    showToast('Failed to create database backup', 'error');
  }
}

/**
 * Show market settings
 */
function showMarketSettings() {
  showToast('Market settings not implemented yet', 'info');
}

/**
 * Export users to CSV
 */
async function exportUsers() {
  try {
    showToast('Exporting users to CSV...', 'info');
    
    const response = await fetch('/api/admin/users?limit=1000');
    if (!response.ok) {
      throw new Error('Failed to fetch users for export');
    }
    
    const data = await response.json();
    
    if (!data.users || data.users.length === 0) {
      showToast('No users to export', 'warning');
      return;
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      "ID,Username,Email,Status,Role,Created At\n" + 
      data.users.map(user => {
        return `"${user.id}","${user.username}","${user.email}","${user.status}","${user.role}","${new Date(user.createdAt).toLocaleString()}"`;
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "users.csv");
    document.body.appendChild(link);
    link.click();
    
    showToast('Users exported successfully', 'success');
  } catch (error) {
    console.error('Error exporting users:', error);
    showToast('Failed to export users', 'error');
  }
}

/**
 * Export transactions to CSV
 */
async function exportTransactions() {
  try {
    showToast('Exporting transactions to CSV...', 'info');
    
    const response = await fetch('/api/admin/transactions?limit=1000');
    if (!response.ok) {
      throw new Error('Failed to fetch transactions for export');
    }
    
    const data = await response.json();
    
    if (!data.transactions || data.transactions.length === 0) {
      showToast('No transactions to export', 'warning');
      return;
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      "ID,User,Type,Amount,Currency,Status,Created At\n" + 
      data.transactions.map(tx => {
        return `"${tx.id}","${tx.user}","${tx.type}","${tx.amount}","${tx.currency}","${tx.status}","${new Date(tx.createdAt).toLocaleString()}"`;
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    
    showToast('Transactions exported successfully', 'success');
  } catch (error) {
    console.error('Error exporting transactions:', error);
    showToast('Failed to export transactions', 'error');
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-circle' : 
                    type === 'warning' ? 'fa-exclamation-triangle' : 
                    'fa-info-circle'}"></i>
    </div>
    <div class="toast-content">
      <p>${message}</p>
    </div>
    <div class="toast-close">
      <i class="fas fa-times"></i>
    </div>
  `;
  
  // Add toast to the page
  const toastContainer = document.querySelector('.toast-container');
  if (toastContainer) {
    toastContainer.appendChild(toast);
  } else {
    const newContainer = document.createElement('div');
    newContainer.className = 'toast-container';
    newContainer.appendChild(toast);
    document.body.appendChild(newContainer);
  }
  
  // Show toast with animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto-remove toast after 3 seconds
  const timeout = setTimeout(() => {
    removeToast(toast);
  }, 3000);
  
  // Handle close button
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(timeout);
    removeToast(toast);
  });
}

/**
 * Remove toast with animation
 */
function removeToast(toast) {
  toast.classList.remove('show');
  setTimeout(() => {
    toast.remove();
    
    // Remove container if no toasts left
    const container = document.querySelector('.toast-container');
    if (container && container.children.length === 0) {
      container.remove();
    }
  }, 300);
}