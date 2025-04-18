async function initTrading() {
  try {
    // Fetch Data
    const data = await fetchMockData('trading');

    // Update Order Book
    const orderBook = document.getElementById('order-book');
    if (orderBook) {
      orderBook.innerHTML = data.orderBook.map(order => `
        <p>${order.type.charAt(0).toUpperCase() + order.type.slice(1)}: ${order.price} USDT @ ${order.amount} BTC</p>
      `).join('');
    }

    // Update Trade History
    const tradeHistory = document.getElementById('trade-history');
    if (tradeHistory) {
      tradeHistory.innerHTML = data.tradeHistory.map(trade => `
        <p>${trade.date}: ${trade.type.charAt(0).toUpperCase() + trade.type.slice(1)} ${trade.amount} BTC @ ${trade.price} USDT</p>
      `).join('');
    }

    // Update Chart
    const ctx = document.getElementById('price-chart')?.getContext('2d');
    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['1', '2', '3', '4', '5'],
          datasets: [{
            label: 'BTC/USDT',
            data: [60000, 61000, 60500, 61500, 62000],
            borderColor: '#f7c948',
            fill: false
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

    // Trade Form (Placeholder)
    const tradeForm = document.getElementById('trade-form');
    if (tradeForm) {
      tradeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Order placed', 'success');
      });
    }

    // Price Alert Form (Placeholder)
    const priceAlertForm = document.getElementById('price-alert-form');
    if (priceAlertForm) {
      priceAlertForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Price alert set', 'success');
      });
    }

    // Re-initialize AOS
    AOS.init({ duration: 800 });
  } catch (error) {
    console.error('Error initializing trading:', error);
    showToast('Error loading trading data', 'error');
  }
}