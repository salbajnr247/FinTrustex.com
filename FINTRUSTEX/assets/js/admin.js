import websocketClient from './websocket-client.js';
import marketDataService from './market-data-service.js';
import api from './api.js';
import * as utils from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize WebSocket for real-time updates
  initWebSocketConnection();
  
  // Fetch Admin Data from API
  const fetchAdminData = async () => {
    try {
      // Use API client to fetch data
      const [users, transactions, analytics] = await Promise.all([
        api.getUsers(),
        api.getTransactions(),
        api.getAnalytics()
      ]);
      
      return {
        users: users || [],
        transactions: transactions || [],
        analytics: analytics || {
          totalUsers: 0,
          dailyTransactions: 0,
          chartData: {
            labels: [],
            data: []
          }
        }
      };
    } catch (error) {
      console.error('Error fetching admin data:', error);
      // Return empty data structure if API fails
      return {
        users: [],
        transactions: [],
        analytics: {
          totalUsers: 0,
          dailyTransactions: 0,
          chartData: {
            labels: [],
            data: []
          }
        }
      };
    }
  };

  // Initialize WebSocket connection for real-time updates
  function initWebSocketConnection() {
    // Setup WebSocket event listeners
    websocketClient.on('user_update', (data) => {
      // Handle user update events
      updateUserList();
      showToast(`User ${data.username} ${data.action}`, 'info');
    });
    
    websocketClient.on('transaction_update', (data) => {
      // Handle transaction update events
      updateTransactionList();
      showToast(`Transaction ${data.id} ${data.status}`, 'info');
    });
    
    websocketClient.on('market_data', (data) => {
      // Handle market data updates for admin analytics
      updateMarketInsights(data);
    });
    
    // Connect to WebSocket server
    websocketClient.connect();
  }
  
  // Update Market Insights based on real-time data
  function updateMarketInsights(data) {
    const marketInsights = document.getElementById('market-insights');
    if (!marketInsights) return;
    
    // Update trading volume statistics
    const volumeData = data.volume || {};
    const priceData = data.prices || {};
    
    marketInsights.innerHTML = `
      <h3>Market Insights</h3>
      <div class="market-stats">
        <div class="stat-card">
          <h4>24h Trading Volume</h4>
          <p class="stat-value">${utils.formatCurrency(volumeData.total || 0)}</p>
          <p class="stat-change ${(volumeData.change || 0) >= 0 ? 'positive' : 'negative'}">
            ${utils.formatPercentage(volumeData.change || 0)}
          </p>
        </div>
        <div class="stat-card">
          <h4>Active Trading Pairs</h4>
          <p class="stat-value">${data.activePairs || 0}</p>
        </div>
        <div class="stat-card">
          <h4>System Load</h4>
          <p class="stat-value">${data.systemLoad || '0%'}</p>
        </div>
      </div>
    `;
  }

  // Update User List
  const updateUserList = async () => {
    try {
      const data = await fetchAdminData();
      const userList = document.getElementById('user-list');
      if (userList) {
        userList.querySelector('tbody').innerHTML = data.users.map(user => `
          <tr>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td class="status-${user.status.toLowerCase()}">${user.status}</td>
            <td>
              <button class="btn btn-outline suspend-user" data-user-id="${user.id}">
                <i class="fas fa-ban"></i> ${user.status === 'Active' ? 'Suspend' : 'Activate'}
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
    } catch (error) {
      console.error('Error updating user list:', error);
      showToast('Error loading user data', 'error');
    }
  };

  // Update Transaction List with real-time data
  const updateTransactionList = async () => {
    try {
      const data = await fetchAdminData();
      const transactionList = document.getElementById('transaction-list');
      if (transactionList) {
        transactionList.querySelector('tbody').innerHTML = data.transactions.map(tx => `
          <tr>
            <td>${tx.id}</td>
            <td>${tx.user}</td>
            <td>${tx.type}</td>
            <td>${tx.amount}</td>
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

        // Check for pending deposits and show alert
        if (data.transactions.some(tx => tx.status === 'Pending' && tx.type === 'Deposit')) {
          showToast('New pending deposit requires review', 'warning');
        }
      }
    } catch (error) {
      console.error('Error updating transaction list:', error);
      showToast('Error loading transaction data', 'error');
    }
  };

  // Update Analytics Chart with real-time data
  const updateAnalyticsChart = async () => {
    try {
      const data = await fetchAdminData();
      const analyticsSection = document.querySelector('.system-analytics');
      if (analyticsSection) {
        analyticsSection.innerHTML = `
          <h3>System Analytics</h3>
          <canvas id="analytics-chart"></canvas>
          <p>Total Users: ${data.analytics.totalUsers.toLocaleString()}</p>
          <p>Daily Transactions: ${data.analytics.dailyTransactions.toLocaleString()}</p>
        `;
        const ctx = document.getElementById('analytics-chart').getContext('2d');
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.analytics.chartData.labels,
            datasets: [{
              label: 'Monthly Transactions',
              data: data.analytics.chartData.data,
              backgroundColor: 'rgba(247, 201, 72, 0.5)',
              borderColor: '#f7c948',
              borderWidth: 1
            }]
          },
          options: {
            plugins: { legend: { labels: { color: '#e0e7ff' } } },
            scales: {
              x: { ticks: { color: '#e0e7ff' } },
              y: { ticks: { color: '#e0e7ff' } }
            }
          }
        });
      }
      AOS.init({ duration: 800 });
    } catch (error) {
      console.error('Error updating analytics:', error);
      showToast('Error loading analytics data', 'error');
    }
  };

  // Admin Actions
  const initAdminActions = () => {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('suspend-user')) {
        const userId = e.target.getAttribute('data-user-id');
        showToast(`User ${userId} ${e.target.textContent.includes('Suspend') ? 'suspended' : 'activated'}`, 'success');
      } else if (e.target.classList.contains('view-user')) {
        const userId = e.target.getAttribute('data-user-id');
        showToast(`Viewing user ${userId}`, 'success');
      } else if (e.target.classList.contains('approve-tx')) {
        const txId = e.target.getAttribute('data-tx-id');
        showToast(`Transaction ${txId} approved`, 'success');
      } else if (e.target.classList.contains('reject-tx')) {
        const txId = e.target.getAttribute('data-tx-id');
        showToast(`Transaction ${txId} rejected`, 'success');
      } else if (e.target.classList.contains('view-tx')) {
        const txId = e.target.getAttribute('data-tx-id');
        showToast(`Viewing transaction ${txId}`, 'success');
      }
    });
  };

  // Refresh Button
  const refreshButton = document.getElementById('refresh-data');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      updateUserList();
      updateTransactionList();
      updateAnalyticsChart();
      showToast('Data refreshed', 'success');
    });
  }

  // View Logs (Placeholder)
  const viewLogsButton = document.getElementById('view-logs');
  if (viewLogsButton) {
    viewLogsButton.addEventListener('click', () => {
      showToast('Navigating to system logs', 'success');
    });
  }

  // Initialize
  updateUserList();
  updateTransactionList();
  updateAnalyticsChart();
  initAdminActions();
});