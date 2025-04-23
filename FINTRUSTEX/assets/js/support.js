/**
 * Support Page JavaScript
 * Handles support page functionality including live chat features
 */

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching functionality
  const setupTabs = () => {
    const tabs = document.querySelectorAll('.support-tab');
    const panels = document.querySelectorAll('.support-panel');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs and panels
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Show corresponding panel
        const tabName = tab.getAttribute('data-tab');
        document.getElementById(`${tabName}-panel`).classList.add('active');
      });
    });
  };
  
  // FAQ functionality
  const setupFAQs = () => {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question');
      if (question) {
        question.addEventListener('click', () => {
          item.classList.toggle('expanded');
        });
      }
    });
    
    // FAQ search functionality
    const faqSearchInput = document.getElementById('faq-search-input');
    const faqSearchBtn = document.getElementById('faq-search-btn');
    const faqList = document.getElementById('faq-list');
    
    if (faqSearchInput && faqSearchBtn && faqList) {
      faqSearchBtn.addEventListener('click', () => {
        const searchTerm = faqSearchInput.value.trim().toLowerCase();
        if (!searchTerm) {
          // If search term is empty, show all FAQs
          faqItems.forEach(item => item.style.display = 'block');
          return;
        }
        
        // Filter FAQs based on search term
        faqItems.forEach(item => {
          const question = item.querySelector('.faq-question').textContent.toLowerCase();
          const answer = item.querySelector('.faq-answer').textContent.toLowerCase();
          
          if (question.includes(searchTerm) || answer.includes(searchTerm)) {
            item.style.display = 'block';
            item.classList.add('expanded'); // Expand matching items
          } else {
            item.style.display = 'none';
          }
        });
      });
      
      // Search on Enter key press
      faqSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          faqSearchBtn.click();
        }
      });
      
      // Reset search when input is cleared
      faqSearchInput.addEventListener('input', () => {
        if (faqSearchInput.value === '') {
          faqItems.forEach(item => {
            item.style.display = 'block';
            item.classList.remove('expanded');
          });
        }
      });
    }
  };
  
  // Admin chat functionality
  const setupAdminChat = () => {
    const adminChatInput = document.getElementById('admin-chat-input');
    const adminChatSend = document.getElementById('admin-chat-send');
    const adminChatMessages = document.getElementById('admin-chat-messages');
    
    // Function to add a message to chat
    const addChatMessage = (container, message, type, avatar = '') => {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('chat-message', type);
      
      let content = '';
      if (type === 'received') {
        content += `<div class="message-avatar"><img src="${avatar}" alt="Avatar"></div>`;
      }
      
      content += `
        <div class="message-content">
          <p>${message}</p>
          <span class="message-time">${timeString}</span>
        </div>
      `;
      
      messageDiv.innerHTML = content;
      container.appendChild(messageDiv);
      
      // Scroll to bottom
      container.scrollTop = container.scrollHeight;
    };
    
    if (adminChatSend && adminChatInput && adminChatMessages) {
      // Load previous admin chat from localStorage
      const loadAdminChat = () => {
        try {
          const savedMessages = localStorage.getItem('fintrustex_admin_chat');
          if (savedMessages) {
            const messages = JSON.parse(savedMessages);
            
            // Only display last 20 messages to prevent UI clutter
            const recentMessages = messages.slice(-20);
            
            // Clear existing messages except the welcome message
            const welcomeMessage = adminChatMessages.querySelector('.system');
            if (welcomeMessage) {
              adminChatMessages.innerHTML = '';
              adminChatMessages.appendChild(welcomeMessage);
            } else {
              adminChatMessages.innerHTML = '';
            }
            
            // Add loaded messages
            recentMessages.forEach(msg => {
              addChatMessage(
                adminChatMessages,
                msg.content,
                msg.type,
                msg.type === 'received' ? './assets/images/admin-avatar.svg' : ''
              );
            });
          }
        } catch (error) {
          console.error('Error loading admin chat:', error);
        }
      };
      
      // Save admin chat to localStorage
      const saveAdminChat = (newMessage) => {
        try {
          let messages = [];
          const savedMessages = localStorage.getItem('fintrustex_admin_chat');
          
          if (savedMessages) {
            messages = JSON.parse(savedMessages);
          }
          
          messages.push(newMessage);
          
          // Limit to last 100 messages
          if (messages.length > 100) {
            messages = messages.slice(-100);
          }
          
          localStorage.setItem('fintrustex_admin_chat', JSON.stringify(messages));
        } catch (error) {
          console.error('Error saving admin chat:', error);
        }
      };
      
      // Load chat history
      loadAdminChat();
      
      // Send message handler
      adminChatSend.addEventListener('click', () => {
        const message = adminChatInput.value.trim();
        if (message) {
          // Add user message to chat
          addChatMessage(adminChatMessages, message, 'sent');
          
          // Save user message
          saveAdminChat({ type: 'sent', content: message, timestamp: new Date().toISOString() });
          
          // Clear input
          adminChatInput.value = '';
          
          // Simulate admin response after a short delay
          setTimeout(() => {
            const adminResponse = "I've received your message. An admin will get back to you as soon as possible.";
            
            // Add admin message to chat
            addChatMessage(adminChatMessages, adminResponse, 'received', './assets/images/admin-avatar.svg');
            
            // Save admin response
            saveAdminChat({ type: 'received', content: adminResponse, timestamp: new Date().toISOString() });
            
            // Update admin status to indicate message sent
            const statusText = document.querySelector('#admin-chat-status .status-text');
            if (statusText) {
              statusText.textContent = 'Message sent to admin team';
              
              // Reset status after 5 seconds
              setTimeout(() => {
                statusText.textContent = 'Admin is online';
              }, 5000);
            }
          }, 1000);
        }
      });
      
      // Handle Enter key press
      adminChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          adminChatSend.click();
        }
      });
      
      // Auto-resize textarea
      adminChatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight < 120) ? this.scrollHeight + 'px' : '120px';
      });
    }
  };
  
  // Support ticket display
  const setupTickets = () => {
    const ticketViewButtons = document.querySelectorAll('.ticket-item .btn');
    
    ticketViewButtons.forEach(button => {
      button.addEventListener('click', () => {
        const ticketItem = button.closest('.ticket-item');
        const ticketId = ticketItem.querySelector('.ticket-id').textContent;
        
        // In a real implementation, this would navigate to a ticket detail page
        // or open a modal with ticket details
        alert(`Viewing details for ${ticketId}`);
      });
    });
  };
  
  // Contact form submission
  const setupContactForm = () => {
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const subject = document.getElementById('contact-subject').value;
        const message = document.getElementById('contact-message').value;
        
        // In a real implementation, this would send the form data to the server
        // For now, just show a success message
        alert(`Thank you ${name}! Your support ticket has been submitted. We'll get back to you at ${email} as soon as possible.`);
        
        // Reset form
        contactForm.reset();
        
        // Switch to FAQ tab
        document.querySelector('.support-tab[data-tab="faq"]').click();
      });
    }
  };
  
  // Initialize all support page functionality
  setupTabs();
  setupFAQs();
  setupAdminChat();
  setupTickets();
  setupContactForm();
});