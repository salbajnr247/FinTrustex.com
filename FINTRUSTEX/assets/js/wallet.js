async function initWallet() {
  try {
    // Fetch Data from API
    const data = await fetchApiData('wallet');

    // Update Portfolio Overview
    const overview = document.querySelector('.portfolio-overview');
    if (overview) {
      // Calculate total balance (in example using BTC and ETH prices)
      const btcValue = data.btc.balance * 60000; // Example price
      const ethValue = data.eth.balance * 2500;  // Example price
      const totalBalance = btcValue + ethValue;
      
      overview.innerHTML = `
        <h3>Portfolio Overview</h3>
        <p>Total Balance: ${utils.formatCurrency(totalBalance)}</p>
      `;
    }

    // Update Wallet Stats
    const walletStats = document.querySelector('.wallet-stats');
    if (walletStats) {
      // BTC wallet
      const btcWallet = document.createElement('div');
      btcWallet.className = 'wallet-stat card glassmorph';
      btcWallet.innerHTML = `
        <h3>BTC</h3>
        <p id="btc-balance">${utils.formatCurrency(data.btc.balance, 'BTC')}</p>
        <span id="btc-address" class="address">${utils.truncateText(data.btc.address, 10, 10)}</span>
        <span class="address-full" style="display:none">${data.btc.address}</span>
        <button class="btn btn-yellow copy-address" data-coin="btc" aria-label="Copy BTC address"><i class="fas fa-copy"></i> Copy</button>
        <canvas id="btc-qr" class="qr-code" aria-label="QR code for BTC address"></canvas>
        <div class="progress-bar"><div id="btc-progress" style="width: ${Math.min(data.btc.balance * 100, 100)}%"></div></div>
        <div id="btc-transactions">
          <h4>Recent Transactions</h4>
          ${data.btc.transactions.length ? 
            data.btc.transactions.map(tx => `<p>${utils.formatDate(tx.date)}: ${tx.amount > 0 ? '+' : ''}${utils.formatCurrency(tx.amount, 'BTC')}</p>`).join('') :
            '<p class="empty-state">No transactions yet</p>'
          }
        </div>
      `;
      
      // ETH wallet
      const ethWallet = document.createElement('div');
      ethWallet.className = 'wallet-stat card glassmorph';
      ethWallet.innerHTML = `
        <h3>ETH</h3>
        <p id="eth-balance">${utils.formatCurrency(data.eth.balance, 'ETH')}</p>
        <span id="eth-address" class="address">${utils.truncateText(data.eth.address, 10, 10)}</span>
        <span class="address-full" style="display:none">${data.eth.address}</span>
        <button class="btn btn-yellow copy-address" data-coin="eth" aria-label="Copy ETH address"><i class="fas fa-copy"></i> Copy</button>
        <canvas id="eth-qr" class="qr-code" aria-label="QR code for ETH address"></canvas>
        <div class="progress-bar"><div id="eth-progress" style="width: ${Math.min(data.eth.balance * 100, 100)}%"></div></div>
        <div id="eth-transactions">
          <h4>Recent Transactions</h4>
          ${data.eth.transactions.length ? 
            data.eth.transactions.map(tx => `<p>${utils.formatDate(tx.date)}: ${tx.amount > 0 ? '+' : ''}${utils.formatCurrency(tx.amount, 'ETH')}</p>`).join('') :
            '<p class="empty-state">No transactions yet</p>'
          }
        </div>
      `;
      
      // Clear and append wallet cards
      walletStats.innerHTML = '';
      walletStats.appendChild(btcWallet);
      walletStats.appendChild(ethWallet);

      // Generate QR Codes using our utility function
      utils.generateQRCode('btc-qr', data.btc.address, { width: 100 });
      utils.generateQRCode('eth-qr', data.eth.address, { width: 100 });
    }

    // Copy Address Buttons
    document.querySelectorAll('.copy-address').forEach(button => {
      button.addEventListener('click', async () => {
        const coin = button.getAttribute('data-coin');
        const addressContainer = button.closest('.wallet-stat');
        // Get the full address, not the truncated one
        const fullAddress = addressContainer.querySelector('.address-full').textContent;
        
        try {
          // Use our utility function for clipboard
          const success = await utils.copyToClipboard(fullAddress);
          
          if (success) {
            showToast(`Copied ${coin.toUpperCase()} address to clipboard`, 'success');
            
            // Visual feedback
            const addressElement = addressContainer.querySelector(`#${coin}-address`);
            const originalText = addressElement.textContent;
            addressElement.textContent = 'Copied!';
            addressElement.classList.add('copied');
            
            // Reset after 2 seconds
            setTimeout(() => {
              addressElement.textContent = originalText;
              addressElement.classList.remove('copied');
            }, 2000);
          } else {
            throw new Error('Clipboard copy failed');
          }
        } catch (error) {
          console.error('Failed to copy address:', error);
          showToast(`Failed to copy address: ${error.message}`, 'error');
        }
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