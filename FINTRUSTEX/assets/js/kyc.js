/**
 * FinTrustEX KYC Verification
 * Handles identity verification and document submission
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize AOS animations
  AOS.init({ duration: 800 });
  
  // Initialize form steps
  initFormSteps();
  
  // Initialize document upload
  initDocumentUpload();
  
  // Initialize ID type selection
  initIdTypeSelection();
  
  // Initialize address document type selection
  initAddressDocTypeSelection();
  
  // Initialize personal info form
  initPersonalInfoForm();
  
  // Check and load existing KYC status
  loadKycStatus();
  
  // Initialize verification agreement checkbox
  initVerificationAgreement();
  
  // Initialize submit button
  initSubmitButton();
});

/**
 * Initialize form steps navigation
 */
function initFormSteps() {
  const formSteps = document.querySelectorAll('.step');
  const formStepContainers = document.querySelectorAll('.form-step');
  
  // Handle step navigation buttons
  document.addEventListener('click', function(e) {
    // Next step buttons
    if (e.target.classList.contains('next-step')) {
      const nextStep = e.target.getAttribute('data-next');
      if (validateCurrentStep()) {
        goToStep(nextStep);
      }
    }
    
    // Previous step buttons
    if (e.target.classList.contains('prev-step')) {
      const prevStep = e.target.getAttribute('data-prev');
      goToStep(prevStep);
    }
  });
  
  /**
   * Go to a specific step
   */
  function goToStep(stepNumber) {
    // Validate step number
    if (!stepNumber || stepNumber < 1 || stepNumber > formSteps.length) {
      return;
    }
    
    // Update step indicators
    formSteps.forEach(step => {
      const stepNum = step.getAttribute('data-step');
      if (parseInt(stepNum) < parseInt(stepNumber)) {
        step.classList.add('completed');
        step.classList.remove('active');
      } else if (parseInt(stepNum) == parseInt(stepNumber)) {
        step.classList.add('active');
        step.classList.remove('completed');
      } else {
        step.classList.remove('active', 'completed');
      }
    });
    
    // Show the correct step content
    formStepContainers.forEach(container => {
      container.classList.remove('active');
      if (container.id === `step-${stepNumber}`) {
        container.classList.add('active');
      }
    });
    
    // If we're on step 4 (review), populate the review sections
    if (stepNumber === '4') {
      populateReviewSection();
    }
  }
  
  /**
   * Validate the current step before proceeding
   */
  function validateCurrentStep() {
    // Find which step is currently active
    const activeStep = document.querySelector('.form-step.active');
    if (!activeStep) return true;
    
    const stepId = activeStep.id;
    
    // Validate based on step
    switch (stepId) {
      case 'step-1':
        return validatePersonalInfo();
      case 'step-2':
        return validateIdDocuments();
      case 'step-3':
        return validateAddressProof();
      default:
        return true;
    }
  }
  
  /**
   * Validate personal information form
   */
  function validatePersonalInfo() {
    const form = document.getElementById('personal-info-form');
    
    // Check if HTML5 validation passes
    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }
    
    // Additional validation
    const dob = new Date(document.getElementById('dob').value);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    
    // Check if user is at least 18 years old
    if (age < 18) {
      showError('You must be at least 18 years old to use this platform.');
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate ID documents
   */
  function validateIdDocuments() {
    // Get active ID type
    const activeIdType = document.querySelector('.id-type.active');
    if (!activeIdType) {
      showError('Please select an ID type.');
      return false;
    }
    
    const idType = activeIdType.getAttribute('data-id-type');
    
    // Check if required documents are uploaded based on ID type
    switch (idType) {
      case 'passport':
        if (!hasFile('passport-file')) {
          showError('Please upload your passport.');
          return false;
        }
        break;
      case 'id-card':
        if (!hasFile('id-front-file') || !hasFile('id-back-file')) {
          showError('Please upload both front and back of your ID card.');
          return false;
        }
        break;
      case 'drivers-license':
        if (!hasFile('license-front-file') || !hasFile('license-back-file')) {
          showError('Please upload both front and back of your driver\'s license.');
          return false;
        }
        break;
    }
    
    // Check if selfie is uploaded
    if (!hasFile('selfie-file')) {
      showError('Please upload a selfie with your ID.');
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate address proof
   */
  function validateAddressProof() {
    // Check if the address form fields are valid
    const addressLine1 = document.getElementById('address-line1');
    const city = document.getElementById('city');
    const state = document.getElementById('state');
    const postalCode = document.getElementById('postal-code');
    const country = document.getElementById('country');
    
    if (!addressLine1.value.trim()) {
      showError('Please enter your address.');
      return false;
    }
    
    if (!city.value.trim()) {
      showError('Please enter your city/town.');
      return false;
    }
    
    if (!state.value.trim()) {
      showError('Please enter your state/province.');
      return false;
    }
    
    if (!postalCode.value.trim()) {
      showError('Please enter your postal/ZIP code.');
      return false;
    }
    
    if (!country.value) {
      showError('Please select your country.');
      return false;
    }
    
    // Check if address proof document is uploaded
    if (!hasFile('address-proof-file')) {
      showError('Please upload an address proof document.');
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if a file input has a file
   */
  function hasFile(inputId) {
    const input = document.getElementById(inputId);
    return input && input.files && input.files.length > 0;
  }
}

/**
 * Initialize document upload
 */
function initDocumentUpload() {
  const fileInputs = document.querySelectorAll('.file-input');
  
  fileInputs.forEach(input => {
    input.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        showError('File size exceeds the 5MB limit.');
        input.value = ''; // Clear the input
        return;
      }
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        showError('Invalid file type. Please upload JPG, PNG, or PDF.');
        input.value = ''; // Clear the input
        return;
      }
      
      // Get preview element
      const previewId = input.id.replace('-file', '-preview');
      const previewElement = document.getElementById(previewId);
      const placeholderElement = input.previousElementSibling.querySelector('.upload-placeholder');
      
      if (previewElement) {
        // Clear previous preview
        previewElement.innerHTML = '';
        
        if (file.type === 'application/pdf') {
          // For PDF files, show icon and filename
          previewElement.innerHTML = `
            <div class="file-preview">
              <i class="fas fa-file-pdf"></i>
              <span>${file.name}</span>
              <button type="button" class="remove-file" data-input="${input.id}">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
        } else {
          // For images, display thumbnail
          const img = document.createElement('img');
          const reader = new FileReader();
          
          reader.onload = function(e) {
            img.src = e.target.result;
          };
          
          reader.readAsDataURL(file);
          
          previewElement.appendChild(img);
          previewElement.innerHTML += `
            <button type="button" class="remove-file" data-input="${input.id}">
              <i class="fas fa-times"></i>
            </button>
          `;
        }
        
        // Hide placeholder, show preview
        previewElement.style.display = 'block';
        placeholderElement.style.display = 'none';
      }
    });
  });
  
  // Handle remove file button
  document.addEventListener('click', function(e) {
    if (e.target.closest('.remove-file')) {
      const button = e.target.closest('.remove-file');
      const inputId = button.getAttribute('data-input');
      const input = document.getElementById(inputId);
      
      if (input) {
        // Clear the file input
        input.value = '';
        
        // Get preview element
        const previewId = inputId.replace('-file', '-preview');
        const previewElement = document.getElementById(previewId);
        const placeholderElement = input.previousElementSibling.querySelector('.upload-placeholder');
        
        if (previewElement) {
          // Clear preview
          previewElement.innerHTML = '';
          previewElement.style.display = 'none';
          placeholderElement.style.display = 'block';
        }
      }
    }
  });
}

/**
 * Initialize ID type selection
 */
function initIdTypeSelection() {
  const idTypes = document.querySelectorAll('.id-type');
  const uploadContainers = {
    'passport': document.getElementById('passport-upload'),
    'id-card': document.getElementById('id-card-upload'),
    'drivers-license': document.getElementById('license-upload')
  };
  
  idTypes.forEach(type => {
    type.addEventListener('click', function() {
      // Remove active class from all types
      idTypes.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked type
      type.classList.add('active');
      
      // Show/hide appropriate upload container
      const idType = type.getAttribute('data-id-type');
      
      // Hide all containers first
      Object.values(uploadContainers).forEach(container => {
        if (container) container.style.display = 'none';
      });
      
      // Show the selected container
      if (uploadContainers[idType]) {
        uploadContainers[idType].style.display = 'block';
      }
    });
  });
}

/**
 * Initialize address document type selection
 */
function initAddressDocTypeSelection() {
  const docTypes = document.querySelectorAll('.doc-type');
  
  docTypes.forEach(type => {
    type.addEventListener('click', function() {
      // Remove active class from all types
      docTypes.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked type
      type.classList.add('active');
    });
  });
}

/**
 * Initialize personal info form
 */
function initPersonalInfoForm() {
  const form = document.getElementById('personal-info-form');
  
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      if (validatePersonalInfo()) {
        // Go to next step
        goToStep('2');
      }
    });
  }
  
  /**
   * Validate personal information form
   */
  function validatePersonalInfo() {
    // Check if HTML5 validation passes
    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }
    
    // Additional validation
    const dob = new Date(document.getElementById('dob').value);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    
    // Check if user is at least 18 years old
    if (age < 18) {
      showError('You must be at least 18 years old to use this platform.');
      return false;
    }
    
    return true;
  }
  
  /**
   * Go to a specific step
   */
  function goToStep(stepNumber) {
    const formSteps = document.querySelectorAll('.step');
    const formStepContainers = document.querySelectorAll('.form-step');
    
    // Validate step number
    if (!stepNumber || stepNumber < 1 || stepNumber > formSteps.length) {
      return;
    }
    
    // Update step indicators
    formSteps.forEach(step => {
      const stepNum = step.getAttribute('data-step');
      if (parseInt(stepNum) < parseInt(stepNumber)) {
        step.classList.add('completed');
        step.classList.remove('active');
      } else if (parseInt(stepNum) == parseInt(stepNumber)) {
        step.classList.add('active');
        step.classList.remove('completed');
      } else {
        step.classList.remove('active', 'completed');
      }
    });
    
    // Show the correct step content
    formStepContainers.forEach(container => {
      container.classList.remove('active');
      if (container.id === `step-${stepNumber}`) {
        container.classList.add('active');
      }
    });
  }
}

/**
 * Initialize verification agreement checkbox
 */
function initVerificationAgreement() {
  const checkbox = document.getElementById('verification-agreement-check');
  const submitButton = document.getElementById('submit-verification');
  
  if (checkbox && submitButton) {
    checkbox.addEventListener('change', function() {
      submitButton.disabled = !checkbox.checked;
    });
  }
}

/**
 * Initialize submit button
 */
function initSubmitButton() {
  const submitButton = document.getElementById('submit-verification');
  
  if (submitButton) {
    submitButton.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Validate final step
      if (!document.getElementById('verification-agreement-check').checked) {
        showError('Please agree to the verification terms.');
        return;
      }
      
      // Submit verification documents
      submitVerification();
    });
  }
}

/**
 * Populate the review section with form data
 */
function populateReviewSection() {
  // Personal info
  const firstName = document.getElementById('first-name').value;
  const lastName = document.getElementById('last-name').value;
  const dob = document.getElementById('dob').value;
  const nationality = document.getElementById('nationality');
  const nationalityText = nationality.options[nationality.selectedIndex].text;
  const phoneCode = document.getElementById('phone-code').value;
  const phone = document.getElementById('phone').value;
  
  const personalInfoSection = document.getElementById('review-personal-info');
  personalInfoSection.innerHTML = `
    <div class="review-item">
      <span class="review-label">Name:</span>
      <span class="review-value">${firstName} ${lastName}</span>
    </div>
    <div class="review-item">
      <span class="review-label">Date of Birth:</span>
      <span class="review-value">${formatDate(dob)}</span>
    </div>
    <div class="review-item">
      <span class="review-label">Citizenship:</span>
      <span class="review-value">${nationalityText}</span>
    </div>
    <div class="review-item">
      <span class="review-label">Phone:</span>
      <span class="review-value">${phoneCode} ${phone}</span>
    </div>
  `;
  
  // ID document info
  const activeIdType = document.querySelector('.id-type.active');
  const idType = activeIdType ? activeIdType.getAttribute('data-id-type') : '';
  
  const idInfoSection = document.getElementById('review-id-info');
  let idInfoHtml = '';
  
  switch (idType) {
    case 'passport':
      const passportFile = document.getElementById('passport-file').files[0];
      idInfoHtml = `
        <div class="review-item">
          <span class="review-label">ID Type:</span>
          <span class="review-value">Passport</span>
        </div>
        <div class="review-item">
          <span class="review-label">Document:</span>
          <span class="review-value">${passportFile ? passportFile.name : 'None'}</span>
        </div>
      `;
      break;
    case 'id-card':
      const idFrontFile = document.getElementById('id-front-file').files[0];
      const idBackFile = document.getElementById('id-back-file').files[0];
      idInfoHtml = `
        <div class="review-item">
          <span class="review-label">ID Type:</span>
          <span class="review-value">ID Card</span>
        </div>
        <div class="review-item">
          <span class="review-label">Front:</span>
          <span class="review-value">${idFrontFile ? idFrontFile.name : 'None'}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Back:</span>
          <span class="review-value">${idBackFile ? idBackFile.name : 'None'}</span>
        </div>
      `;
      break;
    case 'drivers-license':
      const licenseFrontFile = document.getElementById('license-front-file').files[0];
      const licenseBackFile = document.getElementById('license-back-file').files[0];
      idInfoHtml = `
        <div class="review-item">
          <span class="review-label">ID Type:</span>
          <span class="review-value">Driver's License</span>
        </div>
        <div class="review-item">
          <span class="review-label">Front:</span>
          <span class="review-value">${licenseFrontFile ? licenseFrontFile.name : 'None'}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Back:</span>
          <span class="review-value">${licenseBackFile ? licenseBackFile.name : 'None'}</span>
        </div>
      `;
      break;
  }
  
  // Add selfie info
  const selfieFile = document.getElementById('selfie-file').files[0];
  idInfoHtml += `
    <div class="review-item">
      <span class="review-label">Selfie:</span>
      <span class="review-value">${selfieFile ? selfieFile.name : 'None'}</span>
    </div>
  `;
  
  idInfoSection.innerHTML = idInfoHtml;
  
  // Address info
  const addressLine1 = document.getElementById('address-line1').value;
  const addressLine2 = document.getElementById('address-line2').value;
  const city = document.getElementById('city').value;
  const state = document.getElementById('state').value;
  const postalCode = document.getElementById('postal-code').value;
  const country = document.getElementById('country');
  const countryText = country.options[country.selectedIndex].text;
  
  const addressProofFile = document.getElementById('address-proof-file').files[0];
  const activeDocType = document.querySelector('.doc-type.active');
  const docType = activeDocType ? activeDocType.getAttribute('data-doc-type') : '';
  let docTypeText = '';
  
  switch (docType) {
    case 'utility':
      docTypeText = 'Utility Bill';
      break;
    case 'bank':
      docTypeText = 'Bank Statement';
      break;
    case 'tax':
      docTypeText = 'Tax Document';
      break;
  }
  
  const addressInfoSection = document.getElementById('review-address-info');
  addressInfoSection.innerHTML = `
    <div class="review-item">
      <span class="review-label">Address:</span>
      <span class="review-value">${addressLine1}${addressLine2 ? ', ' + addressLine2 : ''}</span>
    </div>
    <div class="review-item">
      <span class="review-label">City:</span>
      <span class="review-value">${city}</span>
    </div>
    <div class="review-item">
      <span class="review-label">State/Province:</span>
      <span class="review-value">${state}</span>
    </div>
    <div class="review-item">
      <span class="review-label">Postal Code:</span>
      <span class="review-value">${postalCode}</span>
    </div>
    <div class="review-item">
      <span class="review-label">Country:</span>
      <span class="review-value">${countryText}</span>
    </div>
    <div class="review-item">
      <span class="review-label">Document Type:</span>
      <span class="review-value">${docTypeText}</span>
    </div>
    <div class="review-item">
      <span class="review-label">Document:</span>
      <span class="review-value">${addressProofFile ? addressProofFile.name : 'None'}</span>
    </div>
  `;
}

/**
 * Submit verification documents
 */
async function submitVerification() {
  // Show loading state
  const submitButton = document.getElementById('submit-verification');
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  
  try {
    // Gather form data
    const formData = new FormData();
    
    // Personal info
    formData.append('firstName', document.getElementById('first-name').value);
    formData.append('lastName', document.getElementById('last-name').value);
    formData.append('dob', document.getElementById('dob').value);
    formData.append('nationality', document.getElementById('nationality').value);
    formData.append('phone', document.getElementById('phone-code').value + document.getElementById('phone').value);
    
    // ID document info
    const activeIdType = document.querySelector('.id-type.active');
    const idType = activeIdType ? activeIdType.getAttribute('data-id-type') : '';
    formData.append('idType', idType);
    
    switch (idType) {
      case 'passport':
        formData.append('passport', document.getElementById('passport-file').files[0]);
        break;
      case 'id-card':
        formData.append('idFront', document.getElementById('id-front-file').files[0]);
        formData.append('idBack', document.getElementById('id-back-file').files[0]);
        break;
      case 'drivers-license':
        formData.append('licenseFront', document.getElementById('license-front-file').files[0]);
        formData.append('licenseBack', document.getElementById('license-back-file').files[0]);
        break;
    }
    
    // Selfie
    formData.append('selfie', document.getElementById('selfie-file').files[0]);
    
    // Address info
    formData.append('addressLine1', document.getElementById('address-line1').value);
    formData.append('addressLine2', document.getElementById('address-line2').value);
    formData.append('city', document.getElementById('city').value);
    formData.append('state', document.getElementById('state').value);
    formData.append('postalCode', document.getElementById('postal-code').value);
    formData.append('country', document.getElementById('country').value);
    
    // Address proof
    const activeDocType = document.querySelector('.doc-type.active');
    const docType = activeDocType ? activeDocType.getAttribute('data-doc-type') : '';
    formData.append('documentType', docType);
    formData.append('addressProof', document.getElementById('address-proof-file').files[0]);
    
    // Submit to API
    const response = await fetch('/api/security/kyc/submit', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit verification');
    }
    
    const data = await response.json();
    
    // Show success modal
    showSuccessModal(data.verificationId);
    
    // Update status badge
    updateStatusBadge('pending');
  } catch (error) {
    console.error('Verification submission error:', error);
    showError(error.message || 'Failed to submit verification. Please try again.');
    
    // Reset button
    submitButton.disabled = false;
    submitButton.innerHTML = 'Submit Verification';
  }
}

/**
 * Show success modal
 */
function showSuccessModal(verificationId) {
  const modal = document.getElementById('success-modal');
  const verificationIdElement = document.getElementById('verification-id');
  
  if (verificationIdElement) {
    verificationIdElement.textContent = verificationId || 'VER-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  
  if (modal) {
    modal.style.display = 'block';
    
    // Close button
    const closeButton = modal.querySelector('.close-modal');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }
    
    // Return to dashboard button
    const returnButton = document.getElementById('close-success-modal');
    if (returnButton) {
      returnButton.addEventListener('click', () => {
        window.location.href = '/dashboard/dashboard.html';
      });
    }
    
    // Close when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
}

/**
 * Load user's KYC status
 */
async function loadKycStatus() {
  try {
    const response = await fetch('/api/security/kyc/status');
    
    if (!response.ok) {
      throw new Error('Failed to load KYC status');
    }
    
    const data = await response.json();
    
    // Update status badge
    updateStatusBadge(data.status);
    
    // Disable form if already submitted or approved
    if (data.status !== 'not_submitted') {
      disableForm();
    }
    
    // Update verification levels
    updateVerificationLevels(data.level || 1);
  } catch (error) {
    console.error('Error loading KYC status:', error);
  }
}

/**
 * Update KYC status badge
 */
function updateStatusBadge(status) {
  const statusBadge = document.getElementById('kyc-status-badge');
  const statusMessage = document.getElementById('kyc-status-message');
  
  if (!statusBadge || !statusMessage) return;
  
  // Remove all status classes
  statusBadge.classList.remove('not-submitted', 'pending', 'approved', 'rejected');
  
  // Update based on status
  switch (status) {
    case 'not_submitted':
      statusBadge.classList.add('not-submitted');
      statusBadge.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>Not Submitted</span>';
      statusMessage.textContent = 'You have not submitted your verification documents yet. Please complete the verification process to unlock all platform features.';
      break;
    case 'pending':
      statusBadge.classList.add('pending');
      statusBadge.innerHTML = '<i class="fas fa-clock"></i><span>Pending Review</span>';
      statusMessage.textContent = 'Your verification documents have been submitted and are currently under review. This process typically takes 24-48 hours to complete.';
      break;
    case 'approved':
      statusBadge.classList.add('approved');
      statusBadge.innerHTML = '<i class="fas fa-check-circle"></i><span>Verified</span>';
      statusMessage.textContent = 'Your identity has been verified successfully. You now have full access to all platform features.';
      break;
    case 'rejected':
      statusBadge.classList.add('rejected');
      statusBadge.innerHTML = '<i class="fas fa-times-circle"></i><span>Rejected</span>';
      statusMessage.textContent = 'Your verification was rejected. Please review the feedback and submit new documents.';
      break;
  }
}

/**
 * Update verification levels display
 */
function updateVerificationLevels(level) {
  const level2Item = document.getElementById('level-2-item');
  const level3Item = document.getElementById('level-3-item');
  
  if (!level2Item || !level3Item) return;
  
  if (level >= 2) {
    level2Item.classList.add('active');
  }
  
  if (level >= 3) {
    level3Item.classList.add('active');
  }
}

/**
 * Disable the form after submission
 */
function disableForm() {
  // Disable all inputs, selects, and buttons
  const inputs = document.querySelectorAll('.form-control, .file-input');
  inputs.forEach(input => {
    input.disabled = true;
  });
  
  // Disable id type selection
  const idTypes = document.querySelectorAll('.id-type');
  idTypes.forEach(type => {
    type.style.pointerEvents = 'none';
    type.style.opacity = '0.6';
  });
  
  // Disable document type selection
  const docTypes = document.querySelectorAll('.doc-type');
  docTypes.forEach(type => {
    type.style.pointerEvents = 'none';
    type.style.opacity = '0.6';
  });
  
  // Hide form navigation buttons
  const formActions = document.querySelectorAll('.form-actions');
  formActions.forEach(actions => {
    actions.style.display = 'none';
  });
  
  // Add message to form
  const formSteps = document.querySelectorAll('.form-step');
  formSteps.forEach(step => {
    const message = document.createElement('div');
    message.className = 'submitted-message';
    message.innerHTML = '<i class="fas fa-info-circle"></i><p>Verification already submitted. You cannot make changes at this time.</p>';
    step.insertBefore(message, step.firstChild);
  });
}

/**
 * Show error message
 */
function showError(message) {
  // Create error element
  const errorElement = document.createElement('div');
  errorElement.className = 'error-toast';
  errorElement.innerHTML = `
    <div class="error-icon">
      <i class="fas fa-exclamation-circle"></i>
    </div>
    <div class="error-message">
      ${message}
    </div>
    <button class="error-close">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Add to page
  document.body.appendChild(errorElement);
  
  // Show with animation
  setTimeout(() => {
    errorElement.classList.add('show');
  }, 10);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorElement.classList.remove('show');
    setTimeout(() => {
      errorElement.remove();
    }, 300);
  }, 5000);
  
  // Close button
  const closeButton = errorElement.querySelector('.error-close');
  closeButton.addEventListener('click', () => {
    errorElement.classList.remove('show');
    setTimeout(() => {
      errorElement.remove();
    }, 300);
  });
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}