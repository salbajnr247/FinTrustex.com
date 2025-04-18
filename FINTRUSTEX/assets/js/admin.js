document.addEventListener('DOMContentLoaded', () => {
  // Mock API Data
  const fetchMockAdminData = async () => {
    return {
      users: [
        { id: 'USR12345', username: 'Trader1', email: 'trader1@example.com', status: 'Active' },
        { id: 'USR12346', username: 'Trader2', email: 'trader2@example.com', status: 'Suspended' }
      ],
      transactions: [
        { id: 'TX12345', user: 'Trader1', type: 'Deposit', amount: '0.1 BTC', status: 'Pending' },
        { id: 'TX12346', user: 'Trader2', type: 'Withdrawal', amount: '1 ETH', status: 'Approved' }
      ],
      analytics: {
        totalUsers: 1250,
        dailyTransactions: 150,
        chartData: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr'],
          data: [100, 200, 300, 400]
        }
      }
    };
  };

  // Update User List
  const updateUserList = async () => {
    try {
      const data = await fetchMockAdminData();
      const userList = document.getElementById('user-list');
      if (userList) {
        userList.querySelector('tbody').innerHTML = data.users.map(user => `
          <tr>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td class="status-${user.status.toLowerCase()}">${user.status}</td>
            <td>
              <button class="btn btn-outline suspend-user" data-user-id="${user.id}"><i class="fas fa-ban"></i> ${user.status === 'Active' ? 'Suspend' : 'Activate'}</button>
              <button class="btn btn-outline view-user" data-user-id="${user.id}"><i class="fas fa-eye"></i> View</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (error) {
      console.error('Error updating user list:', error);
      showToast('Error loading user data', 'error');
    }
  };

  // Update Transaction List
  const updateTransactionList = async () => {
    try {
      const data = await fetchMockAdminData();
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
                <button class="btn btn-outline approve-tx" data-tx-id="${tx.id}"><i class="fas fa-check"></i> Approve</button>
                <button class="btn btn-outline reject-tx" data-tx-id="${tx.id}"><i class="fas fa-times"></i> Reject</button>
              ` : `
                <button class="btn btn-outline view-tx" data-tx-id="${tx.id}"><i class="fas fa-eye"></i> View</button>
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

  // Update Analytics Chart
  const updateAnalyticsChart = async () => {
    try {
      const data = await fetchMockAdminData();
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