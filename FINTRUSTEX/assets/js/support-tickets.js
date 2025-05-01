/**
 * Support Tickets JavaScript
 * Handles the support tickets functionality
 */

// Support tickets state
let ticketsData = [];
let currentFilter = 'all';
let selectedTicketId = null;

/**
 * Initialize support tickets page
 */
async function initSupportTickets() {
  try {
    // Check authentication first
    if (window.authService && !authService.isAuthenticated()) {
      window.location.href = '../auth.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    // Set up event listeners
    setupEventListeners();
    
    // Load tickets
    await loadTickets();
    
    // Initialize WebSocket for real-time updates if available
    if (window.websocketClient) {
      websocketClient.addEventListener('ticket_update', handleTicketUpdate);
    }
  } catch (error) {
    console.error('Error initializing support tickets page:', error);
    showToast('Failed to initialize support tickets page. Please try again.', 'error');
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // New ticket button
  const newTicketBtn = document.getElementById('new-ticket-btn');
  if (newTicketBtn) {
    newTicketBtn.addEventListener('click', () => {
      const ticketForm = document.getElementById('new-ticket-form');
      if (ticketForm) {
        ticketForm.style.display = 'block';
        
        // Scroll to form
        ticketForm.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  
  // Cancel ticket button
  const cancelTicketBtn = document.getElementById('cancel-ticket-btn');
  if (cancelTicketBtn) {
    cancelTicketBtn.addEventListener('click', () => {
      const ticketForm = document.getElementById('new-ticket-form');
      if (ticketForm) {
        ticketForm.style.display = 'none';
        document.getElementById('ticket-form').reset();
      }
    });
  }
  
  // Ticket form submission
  const ticketForm = document.getElementById('ticket-form');
  if (ticketForm) {
    ticketForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitNewTicket();
    });
  }
  
  // Filter buttons
  document.querySelectorAll('.ticket-filter').forEach(filter => {
    filter.addEventListener('click', () => {
      // Update active filter
      document.querySelector('.ticket-filter.active').classList.remove('active');
      filter.classList.add('active');
      
      // Get filter value
      const filterValue = filter.dataset.filter;
      currentFilter = filterValue;
      
      // Re-render tickets with filter
      renderTickets();
    });
  });
  
  // Close ticket dialog
  const closeTicketDialog = document.getElementById('close-ticket-dialog');
  if (closeTicketDialog) {
    closeTicketDialog.addEventListener('click', closeTicketDetailDialog);
  }
  
  // Click outside to close dialog
  const ticketDialog = document.getElementById('ticket-dialog');
  if (ticketDialog) {
    ticketDialog.addEventListener('click', (e) => {
      if (e.target === ticketDialog) {
        closeTicketDetailDialog();
      }
    });
  }
  
  // Close ticket button
  const closeTicketBtn = document.getElementById('close-ticket-btn');
  if (closeTicketBtn) {
    closeTicketBtn.addEventListener('click', async () => {
      if (selectedTicketId) {
        await updateTicketStatus(selectedTicketId, 'closed');
      }
    });
  }
  
  // Send reply button
  const sendReplyBtn = document.getElementById('send-reply-btn');
  if (sendReplyBtn) {
    sendReplyBtn.addEventListener('click', async () => {
      if (selectedTicketId) {
        await addTicketReply(selectedTicketId);
      }
    });
  }
}

/**
 * Load tickets
 */
async function loadTickets() {
  try {
    // Show loader
    const loader = document.getElementById('tickets-loader');
    if (loader) {
      loader.style.display = 'flex';
    }
    
    // Fetch tickets from API
    let tickets = [];
    if (window.api && api.support) {
      tickets = await api.support.getTickets();
    } else {
      // Mock data for testing when API is not available
      tickets = [
        {
          id: 'T12345',
          subject: 'Withdrawal Issue',
          category: 'withdrawal',
          priority: 'high',
          status: 'open',
          description: 'I initiated a withdrawal 3 days ago but it\'s still pending. Transaction ID: TXN123456',
          createdAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
          responses: [
            {
              id: 'R1',
              author: 'Admin',
              isAdmin: true,
              content: 'Thank you for reaching out. We\'re investigating your withdrawal issue and will update you shortly.',
              createdAt: new Date(Date.now() - 86400000 * 1) // 1 day ago
            }
          ]
        },
        {
          id: 'T12346',
          subject: 'API Access Request',
          category: 'api',
          priority: 'medium',
          status: 'pending',
          description: 'I would like to request API access for trading. My account has been verified to Tier 2.',
          createdAt: new Date(Date.now() - 86400000 * 5), // 5 days ago
          responses: [
            {
              id: 'R2',
              author: 'Admin',
              isAdmin: true,
              content: 'We\'ve received your API access request. Please provide your IP address range that will be accessing our API.',
              createdAt: new Date(Date.now() - 86400000 * 4) // 4 days ago
            },
            {
              id: 'R3',
              author: 'You',
              isAdmin: false,
              content: 'My IP address range is 192.168.1.0/24',
              createdAt: new Date(Date.now() - 86400000 * 3) // 3 days ago
            }
          ]
        },
        {
          id: 'T12347',
          subject: 'Account Verification',
          category: 'account',
          priority: 'low',
          status: 'closed',
          description: 'I\'ve submitted my KYC documents but haven\'t received any update for a week.',
          createdAt: new Date(Date.now() - 86400000 * 10), // 10 days ago
          responses: [
            {
              id: 'R4',
              author: 'Admin',
              isAdmin: true,
              content: 'Your KYC documents have been reviewed and approved. Your account is now verified to Tier 2.',
              createdAt: new Date(Date.now() - 86400000 * 8) // 8 days ago
            },
            {
              id: 'R5',
              author: 'You',
              isAdmin: false,
              content: 'Thank you for the update!',
              createdAt: new Date(Date.now() - 86400000 * 7) // 7 days ago
            },
            {
              id: 'R6',
              author: 'Admin',
              isAdmin: true,
              content: 'You\'re welcome! Is there anything else we can help you with?',
              createdAt: new Date(Date.now() - 86400000 * 7) // 7 days ago
            },
            {
              id: 'R7',
              author: 'System',
              isAdmin: true,
              content: 'This ticket has been closed due to inactivity. Please create a new ticket if you need further assistance.',
              createdAt: new Date(Date.now() - 86400000 * 6) // 6 days ago
            }
          ]
        }
      ];
    }
    
    // Store in global variable
    ticketsData = tickets;
    
    // Hide loader
    if (loader) {
      loader.style.display = 'none';
    }
    
    // Render tickets
    renderTickets();
  } catch (error) {
    console.error('Error loading tickets:', error);
    showToast('Failed to load support tickets. Please try again later.', 'error');
    
    // Hide loader
    const loader = document.getElementById('tickets-loader');
    if (loader) {
      loader.style.display = 'none';
    }
    
    // Show error state
    const ticketList = document.getElementById('ticket-list');
    if (ticketList) {
      ticketList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Failed to load tickets</h3>
          <p>Please try again later or contact support if the issue persists.</p>
        </div>
      `;
    }
  }
}

/**
 * Render tickets
 */
function renderTickets() {
  const ticketList = document.getElementById('ticket-list');
  if (!ticketList) return;
  
  // Clear existing content (except loader)
  const elements = ticketList.querySelectorAll(':not(#tickets-loader)');
  elements.forEach(el => el.remove());
  
  // Filter tickets
  let filteredTickets = ticketsData;
  if (currentFilter !== 'all') {
    filteredTickets = ticketsData.filter(ticket => ticket.status === currentFilter);
  }
  
  // Show empty state if no tickets
  if (filteredTickets.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    
    let message = 'No support tickets found.';
    if (currentFilter !== 'all') {
      message = `No ${currentFilter} tickets found.`;
    }
    
    emptyState.innerHTML = `
      <i class="fas fa-ticket-alt"></i>
      <h3>${message}</h3>
      <p>Create a new ticket using the "New Ticket" button above.</p>
    `;
    
    ticketList.appendChild(emptyState);
    return;
  }
  
  // Sort tickets by date (newest first)
  filteredTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Render each ticket
  filteredTickets.forEach(ticket => {
    const ticketItem = createTicketElement(ticket);
    ticketList.appendChild(ticketItem);
  });
}

/**
 * Create ticket element
 * @param {Object} ticket - Ticket data
 * @returns {Element} - Ticket element
 */
function createTicketElement(ticket) {
  const ticketItem = document.createElement('div');
  ticketItem.className = `ticket-item ${ticket.status}`;
  ticketItem.dataset.id = ticket.id;
  
  // Format created date
  const createdDate = utils.formatDate(new Date(ticket.createdAt), 'date');
  
  // Get latest response date if available
  let latestActivity = createdDate;
  if (ticket.responses && ticket.responses.length > 0) {
    const latestResponse = ticket.responses[ticket.responses.length - 1];
    latestActivity = utils.formatDate(new Date(latestResponse.createdAt), 'date');
  }
  
  // Truncate description
  const truncatedDesc = utils.truncateText(ticket.description, 100);
  
  // Format status for display
  const statusText = ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1);
  
  ticketItem.innerHTML = `
    <div class="ticket-info">
      <span class="ticket-id">${ticket.id}</span>
      <span class="ticket-category">${ticket.category}</span>
    </div>
    <h3 class="ticket-subject">${ticket.subject}</h3>
    <p class="ticket-preview">${truncatedDesc}</p>
    <div class="ticket-footer">
      <div class="ticket-meta">
        <span class="ticket-date">Created: ${createdDate}</span>
        <span class="ticket-date">Last activity: ${latestActivity}</span>
      </div>
      <span class="ticket-status ${ticket.status}">${statusText}</span>
    </div>
  `;
  
  // Add click event to open ticket detail
  ticketItem.addEventListener('click', () => {
    openTicketDetail(ticket.id);
  });
  
  return ticketItem;
}

/**
 * Open ticket detail dialog
 * @param {string} ticketId - Ticket ID
 */
function openTicketDetail(ticketId) {
  // Find ticket by ID
  const ticket = ticketsData.find(ticket => ticket.id === ticketId);
  if (!ticket) {
    showToast('Ticket not found', 'error');
    return;
  }
  
  // Store selected ticket ID
  selectedTicketId = ticketId;
  
  // Populate dialog
  document.getElementById('dialog-ticket-subject').textContent = ticket.subject;
  document.getElementById('dialog-ticket-id').textContent = ticket.id;
  document.getElementById('dialog-ticket-date').textContent = utils.formatDate(new Date(ticket.createdAt), 'date');
  document.getElementById('dialog-ticket-category').textContent = ticket.category;
  document.getElementById('dialog-ticket-priority').textContent = ticket.priority;
  document.getElementById('dialog-ticket-description').textContent = ticket.description;
  
  // Set status
  const statusElement = document.getElementById('dialog-ticket-status');
  statusElement.className = `ticket-status ${ticket.status}`;
  statusElement.textContent = ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1);
  
  // Show/hide close ticket button based on status
  const closeTicketBtn = document.getElementById('close-ticket-btn');
  if (closeTicketBtn) {
    closeTicketBtn.style.display = ticket.status === 'closed' ? 'none' : 'inline-block';
  }
  
  // Show/hide reply form based on status
  const replyForm = document.getElementById('reply-form');
  if (replyForm) {
    replyForm.style.display = ticket.status === 'closed' ? 'none' : 'block';
  }
  
  // Populate responses
  const responsesContainer = document.getElementById('ticket-responses');
  if (responsesContainer) {
    responsesContainer.innerHTML = '';
    
    if (ticket.responses && ticket.responses.length > 0) {
      ticket.responses.forEach(response => {
        const responseElement = createResponseElement(response);
        responsesContainer.appendChild(responseElement);
      });
    } else {
      responsesContainer.innerHTML = '<div class="empty-response">No responses yet.</div>';
    }
  }
  
  // Show dialog
  const dialog = document.getElementById('ticket-dialog');
  if (dialog) {
    dialog.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent body scroll
  }
}

/**
 * Create response element
 * @param {Object} response - Response data
 * @returns {Element} - Response element
 */
function createResponseElement(response) {
  const responseElement = document.createElement('div');
  responseElement.className = 'ticket-response';
  
  // Format date
  const responseDate = utils.formatDate(new Date(response.createdAt), 'full');
  
  // Add admin badge if needed
  let authorText = response.author;
  if (response.isAdmin) {
    authorText = `${response.author} <span class="admin-badge">Support Team</span>`;
  }
  
  responseElement.innerHTML = `
    <div class="ticket-response-header">
      <div class="ticket-response-author">${authorText}</div>
      <div class="ticket-response-date">${responseDate}</div>
    </div>
    <div class="ticket-response-content">${response.content}</div>
  `;
  
  return responseElement;
}

/**
 * Close ticket detail dialog
 */
function closeTicketDetailDialog() {
  const dialog = document.getElementById('ticket-dialog');
  if (dialog) {
    dialog.classList.remove('active');
    document.body.style.overflow = ''; // Restore body scroll
  }
  
  // Clear selected ticket
  selectedTicketId = null;
  
  // Clear reply input
  const replyInput = document.getElementById('reply-input');
  if (replyInput) {
    replyInput.value = '';
  }
}

/**
 * Submit new ticket
 */
async function submitNewTicket() {
  try {
    // Get form values
    const subject = document.getElementById('ticket-subject').value.trim();
    const category = document.getElementById('ticket-category').value;
    const priority = document.getElementById('ticket-priority').value;
    const description = document.getElementById('ticket-description').value.trim();
    
    // Validate form
    if (!subject || !category || !description) {
      showToast('Please fill out all required fields', 'error');
      return;
    }
    
    // Create ticket object
    const newTicket = {
      subject,
      category,
      priority,
      description,
      status: 'open',
      createdAt: new Date()
    };
    
    // Submit to API
    let createdTicket;
    if (window.api && api.support) {
      createdTicket = await api.support.createTicket(newTicket);
    } else {
      // Mock created ticket for testing
      createdTicket = {
        ...newTicket,
        id: 'T' + Math.floor(Math.random() * 100000),
        responses: []
      };
    }
    
    // Add to tickets data
    ticketsData.unshift(createdTicket);
    
    // Hide form and reset
    const ticketForm = document.getElementById('new-ticket-form');
    if (ticketForm) {
      ticketForm.style.display = 'none';
      document.getElementById('ticket-form').reset();
    }
    
    // Re-render tickets
    renderTickets();
    
    // Show success message
    showToast('Support ticket created successfully', 'success');
  } catch (error) {
    console.error('Error creating ticket:', error);
    showToast('Failed to create support ticket. Please try again.', 'error');
  }
}

/**
 * Add reply to ticket
 * @param {string} ticketId - Ticket ID
 */
async function addTicketReply(ticketId) {
  try {
    // Get reply content
    const replyContent = document.getElementById('reply-input').value.trim();
    if (!replyContent) {
      showToast('Please enter a reply', 'error');
      return;
    }
    
    // Create reply object
    const reply = {
      content: replyContent,
      createdAt: new Date(),
      author: 'You',
      isAdmin: false
    };
    
    // Submit to API
    let updatedTicket;
    if (window.api && api.support) {
      updatedTicket = await api.support.addTicketReply(ticketId, reply);
    } else {
      // Mock for testing
      const ticket = ticketsData.find(t => t.id === ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }
      
      // Generate reply ID
      reply.id = 'R' + Math.floor(Math.random() * 100000);
      
      // Add reply to ticket
      if (!ticket.responses) {
        ticket.responses = [];
      }
      ticket.responses.push(reply);
      
      // Update ticket status to pending
      if (ticket.status === 'open') {
        ticket.status = 'pending';
      }
      
      updatedTicket = ticket;
    }
    
    // Update ticket in data
    const ticketIndex = ticketsData.findIndex(t => t.id === ticketId);
    if (ticketIndex !== -1) {
      ticketsData[ticketIndex] = updatedTicket;
    }
    
    // Clear reply input
    document.getElementById('reply-input').value = '';
    
    // Re-open ticket detail to refresh
    openTicketDetail(ticketId);
    
    // Show success message
    showToast('Reply sent successfully', 'success');
  } catch (error) {
    console.error('Error adding reply:', error);
    showToast('Failed to send reply. Please try again.', 'error');
  }
}

/**
 * Update ticket status
 * @param {string} ticketId - Ticket ID
 * @param {string} status - New status
 */
async function updateTicketStatus(ticketId, status) {
  try {
    // Submit to API
    let updatedTicket;
    if (window.api && api.support) {
      updatedTicket = await api.support.updateTicketStatus(ticketId, status);
    } else {
      // Mock for testing
      const ticket = ticketsData.find(t => t.id === ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }
      
      // Update status
      ticket.status = status;
      
      // Add system message for status change
      if (!ticket.responses) {
        ticket.responses = [];
      }
      
      ticket.responses.push({
        id: 'R' + Math.floor(Math.random() * 100000),
        author: 'System',
        isAdmin: true,
        content: `Ticket status changed to ${status}`,
        createdAt: new Date()
      });
      
      updatedTicket = ticket;
    }
    
    // Update ticket in data
    const ticketIndex = ticketsData.findIndex(t => t.id === ticketId);
    if (ticketIndex !== -1) {
      ticketsData[ticketIndex] = updatedTicket;
    }
    
    // Re-open ticket detail to refresh
    openTicketDetail(ticketId);
    
    // Re-render tickets
    renderTickets();
    
    // Show success message
    showToast(`Ticket status updated to ${status}`, 'success');
  } catch (error) {
    console.error('Error updating ticket status:', error);
    showToast('Failed to update ticket status. Please try again.', 'error');
  }
}

/**
 * Handle ticket update from WebSocket
 * @param {Object} event - Event data
 */
function handleTicketUpdate(event) {
  const updatedTicket = event.detail;
  
  // Update ticket in data
  const ticketIndex = ticketsData.findIndex(t => t.id === updatedTicket.id);
  if (ticketIndex !== -1) {
    ticketsData[ticketIndex] = updatedTicket;
  } else {
    // New ticket
    ticketsData.unshift(updatedTicket);
  }
  
  // Re-render tickets
  renderTickets();
  
  // If the updated ticket is currently open in dialog, refresh it
  if (selectedTicketId === updatedTicket.id) {
    openTicketDetail(updatedTicket.id);
  }
  
  // Show notification
  showToast(`Ticket ${updatedTicket.id} has been updated`, 'info');
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type
 */
function showToast(message, type = 'info') {
  if (window.showToast) {
    window.showToast(message, type);
  } else {
    const toastContainer = document.querySelector('.toast-container') || document.createElement('div');
    toastContainer.classList.add('toast-container');
    if (!document.body.contains(toastContainer)) {
      document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.classList.add('toast', `toast-${type}`);
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initSupportTickets);