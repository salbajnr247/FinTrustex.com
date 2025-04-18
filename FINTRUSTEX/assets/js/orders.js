async function initOrders() {
  try {
    // Fetch Data
    const data = await fetchMockData('orders');

    // Update Order List
    const orderList = document.getElementById('order-list');
    if (orderList) {
      orderList.innerHTML = `
        <table role="grid">
          <thead>
            <tr>
              <th scope="col">Order ID</th>
              <th scope="col">Pair</th>
              <th scope="col">Type</th>
              <th scope="col">Amount</th>
              <th scope="col">Price</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(order => `
              <tr>
                <td>${order.id}</td>
                <td>${order.pair}</td>
                <td>${order.type}</td>
                <td>${order.amount} ${order.pair.split('/')[0]}</td>
                <td>${order.price} USDT</td>
                <td class="status-${order.status.toLowerCase()}">${order.status}</td>
                <td>
                  <button class="btn btn-outline ${order.status === 'Open' ? 'cancel-order' : 'view-order'}">
                    <i class="fas fa-${order.status === 'Open' ? 'times' : 'eye'}"></i>
                    ${order.status === 'Open' ? 'Cancel' : 'View'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // Filter Orders (Placeholder)
    const filterButton = document.getElementById('filter-orders');
    if (filterButton) {
      filterButton.addEventListener('click', () => {
        showToast('Filter functionality not implemented', 'error');
      });
    }

    // Cancel All Orders (Placeholder)
    const cancelAllButton = document.getElementById('cancel-all');
    if (cancelAllButton) {
      cancelAllButton.addEventListener('click', () => {
        showToast('Cancelled all orders', 'success');
      });
    }

    // Re-initialize AOS
    AOS.init({ duration: 800 });
  } catch (error) {
    console.error('Error initializing orders:', error);
    showToast('Error loading orders', 'error');
  }
}