async function initWallet() {
  try {
    // Fetch Data
    const data = await fetchMockData('wallet');

    // Update Portfolio Overview
    const overview = document.querySelector('.portfolio-overview');
    if (overview) {
      const totalBalance = (data.btc.balance * 60000 + data.eth.balance * 2500).toLocaleString();
      overview.innerHTML = `
        <h3>Portfolio Overview</h3>
        <p>Total Balance: $${totalBalance}</p>
      `;
    }

    // Update Wallet Stats
    const walletStats = document.querySelector('.wallet-stats');
    if (walletStats) {
      walletStats.innerHTML = `
        <div class="wallet-stat card glassmorph">
          <h3>BTC</h3>
          <p id="btc-balance">${data.btc.balance.toFixed(4)}</p>
          <span id="btc-address" class="address">${data.btc.address}</span>
          <button class="btn btn-yellow copy-address" data-coin="btc" aria-label="Copy BTC address"><i class="fas fa-copy"></i> Copy</button>
          <canvas id="btc-qr" class="qr-code" aria-label="QR code for BTC address"></canvas>
          <div class="progress-bar"><div id="btc-progress" style="width: ${data.btc.balance * 100}%"></div></div>
          <div id="btc-transactions">
            <h4>Recent Transactions</h4>
            ${data.btc.transactions.map(tx => `<p>${tx.date}: +${tx.amount} BTC</p>`).join('')}
          </div>
        </div>
        <div class="wallet-stat card glassmorph">
          <h3>ETH</h3>
          <p id="eth-balance">${data.eth.balance.toFixed(4)}</p>
          <span id="eth-address" class="address">${data.eth.address}</span>
          <button class="btn btn-yellow copy-address" data-coin="eth" aria-label="Copy ETH address"><i class="fas fa-copy"></i> Copy</button>
          <canvas id="eth-qr" class="qr-code" aria-label="QR code for ETH address"></canvas>
          <div class="progress-bar"><div id="eth-progress" style="width: ${data.eth.balance * 100}%"></div></div>
          <div id="eth-transactions">
            <h4>Recent Transactions</h4>
            ${data.eth.transactions.map(tx => `<p>${tx.date}: +${tx.amount} ETH</p>`).join('')}
          </div>
        </div>
      `;

      // Generate QR Codes
      QRCode.toCanvas(document.getElementById('btc-qr'), data.btc.address, { width: 100 }, (err) => {
        if (err) console.error('BTC QR Code Error:', err);
      });
      QRCode.toCanvas(document.getElementById('eth-qr'), data.eth.address, { width: 100 }, (err) => {
        if (err) console.error('ETH QR Code Error:', err);
      });
    }

    // Copy Address Buttons
    document.querySelectorAll('.copy-address').forEach(button => {
      button.addEventListener('click', () => {
        const coin = button.getAttribute('data-coin');
        const address = document.getElementById(`${coin}-address`).textContent;
        navigator.clipboard.writeText(address);
        showToast(`Copied ${coin.toUpperCase()} address`, 'success');
      });
    });

    // Backup Wallet (Placeholder)
    const backupButton = document.getElementById('backup-wallet');
    if (backupButton) {
      backupButton.addEventListener('click', () => {
        showToast('Wallet backup initiated', 'success');
      });
    }

    // Export Transactions (Placeholder)
    const exportButton = document.getElementById('export-transactions');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        showToast('Transactions exported', 'success');
      });
    }

    // Deposit Form (Placeholder)
    const depositForm = document.getElementById('deposit-form');
    if (depositForm) {
      depositForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Deposit address shown', 'success');
      });
    }

    // Re-initialize AOS
    AOS.init({ duration: 800 });
  } catch (error) {
    console.error('Error initializing wallet:', error);
    showToast('Error loading wallet data', 'error');
  }
}