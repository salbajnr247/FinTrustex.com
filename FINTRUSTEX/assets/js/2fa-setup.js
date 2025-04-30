/**
 * Two-Factor Authentication Setup
 * Handles the 2FA setup process including QR code generation and verification
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  checkAuth();

  // Get DOM elements
  const nextButtons = document.querySelectorAll('.next-step');
  const prevButtons = document.querySelectorAll('.prev-step');
  const toggleManualLink = document.getElementById('toggle-manual');
  const manualEntryDiv = document.getElementById('manual-entry');
  const qrCodeDiv = document.getElementById('qr-code');
  const qrCodeLoadingDiv = document.getElementById('qr-code-loading');
  const secretCodeElement = document.getElementById('secret-code');
  const copyCodeButton = document.getElementById('copy-code');
  const verifyButton = document.getElementById('verify-btn');
  const verificationCodeInput = document.getElementById('verification-code');
  const verificationMessage = document.getElementById('verification-message');
  const recoveryCodesDiv = document.getElementById('recovery-codes');
  const copyRecoveryCodesButton = document.getElementById('copy-recovery-codes');

  // Store the secret key
  let secret = null;
  let recoveryCodesArray = [];

  // Navigation between steps
  nextButtons.forEach(button => {
    button.addEventListener('click', () => {
      const nextStepId = button.getAttribute('data-next');
      navigateToStep(nextStepId);
    });
  });

  prevButtons.forEach(button => {
    button.addEventListener('click', () => {
      const prevStepId = button.getAttribute('data-prev');
      navigateToStep(prevStepId);
    });
  });

  function navigateToStep(stepId) {
    // Hide all steps
    document.querySelectorAll('.setup-step').forEach(step => {
      step.classList.remove('active');
    });

    // Show the target step
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
      targetStep.classList.add('active');
    }
  }

  // Toggle between QR code and manual entry
  toggleManualLink.addEventListener('click', (e) => {
    e.preventDefault();
    const isManualVisible = manualEntryDiv.style.display !== 'none';
    manualEntryDiv.style.display = isManualVisible ? 'none' : 'block';
    toggleManualLink.textContent = isManualVisible ? 'Can\'t scan? Enter code manually' : 'Back to QR code';
  });

  // Copy secret code to clipboard
  copyCodeButton.addEventListener('click', () => {
    const secretCode = secretCodeElement.textContent;
    navigator.clipboard.writeText(secretCode).then(() => {
      copyCodeButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(() => {
        copyCodeButton.innerHTML = '<i class="fas fa-copy"></i> Copy Code';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  });

  // Copy recovery codes to clipboard
  copyRecoveryCodesButton.addEventListener('click', () => {
    const codes = recoveryCodesArray.join('\n');
    navigator.clipboard.writeText(codes).then(() => {
      copyRecoveryCodesButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(() => {
        copyRecoveryCodesButton.innerHTML = '<i class="fas fa-copy"></i> Copy All Codes';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  });

  // Initialize 2FA setup when reaching step 2
  nextButtons[0].addEventListener('click', async () => {
    // Get user details from local storage
    const user = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!user || !user.id) {
      showToast('Authentication error. Please log in again.', 'error');
      window.location.href = '../../auth.html';
      return;
    }
    
    try {
      // Request 2FA setup
      const response = await api.security.initiate2FA(user.id);
      secret = response.secret;
      
      // Generate QR code
      const qrCodeUrl = response.qrCodeUrl;
      QRCode.toCanvas(qrCodeDiv, qrCodeUrl, { width: 200 }, (error) => {
        if (error) {
          console.error('Error generating QR code:', error);
          return;
        }
        
        // Show QR code and hide loading
        qrCodeLoadingDiv.style.display = 'none';
        qrCodeDiv.style.display = 'block';
        
        // Display secret code for manual entry
        secretCodeElement.textContent = secret;
      });
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      showToast('Failed to setup 2FA. Please try again later.', 'error');
    }
  });

  // Verify the entered code
  verifyButton.addEventListener('click', async () => {
    const code = verificationCodeInput.value.trim();
    
    // Basic validation
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      setVerificationMessage('Please enter a valid 6-digit code', 'error');
      return;
    }
    
    try {
      // Show loading state
      verifyButton.disabled = true;
      verifyButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
      
      // Get user details from local storage
      const user = JSON.parse(localStorage.getItem('currentUser'));
      
      // Verify code
      const response = await api.security.verify2FA(user.id, code, secret);
      
      if (response.success) {
        // Display recovery codes
        recoveryCodesArray = response.recoveryCodes;
        displayRecoveryCodes(recoveryCodesArray);
        
        // Show success step
        navigateToStep('step-success');
        
        // Update user object in local storage to reflect 2FA enabled
        user.has2FA = true;
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        setVerificationMessage('Invalid verification code. Please try again.', 'error');
        verifyButton.disabled = false;
        verifyButton.innerHTML = 'Verify and Activate';
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      setVerificationMessage('Failed to verify code. Please try again.', 'error');
      verifyButton.disabled = false;
      verifyButton.innerHTML = 'Verify and Activate';
    }
  });

  // Helper functions
  function setVerificationMessage(message, type) {
    verificationMessage.textContent = message;
    verificationMessage.className = type;
  }

  function displayRecoveryCodes(codes) {
    recoveryCodesDiv.innerHTML = '';
    codes.forEach(code => {
      const codeElement = document.createElement('div');
      codeElement.textContent = code;
      recoveryCodesDiv.appendChild(codeElement);
    });
  }
});