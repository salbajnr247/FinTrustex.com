/**
 * Notification Service for FinTrustEX
 * Handles user notifications for deposits, withdrawals, login attempts, and price alerts
 */

class NotificationService {
  constructor() {
    this.initialized = false;
    this.notificationCount = 0;
    this.notifications = [];
    
    // Initialize service
    this.init();
  }
  
  /**
   * Initialize the notification service
   */
  init() {
    document.addEventListener('DOMContentLoaded', () => {
      // Load notifications from storage
      this.loadNotifications();
      
      // Set up WebSocket listeners for real-time notifications
      this.setupWebSocketListeners();
      
      // Set up UI event listeners
      this.setupEventListeners();
      
      // Update UI
      this.updateUI();
    });
    
    this.initialized = true;
  }
  
  /**
   * Load notifications from localStorage
   */
  loadNotifications() {
    try {
      const savedNotifications = localStorage.getItem('fintrustex_notifications');
      if (savedNotifications) {
        this.notifications = JSON.parse(savedNotifications);
        
        // Mark as read if user has seen them before
        const lastSeen = localStorage.getItem('fintrustex_notifications_last_seen');
        if (lastSeen) {
          const lastSeenTime = new Date(lastSeen).getTime();
          
          this.notificationCount = this.notifications.filter(
            n => !n.read && new Date(n.timestamp).getTime() > lastSeenTime
          ).length;
        } else {
          this.notificationCount = this.notifications.filter(n => !n.read).length;
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications = [];
      this.notificationCount = 0;
    }
  }
  
  /**
   * Save notifications to localStorage
   */
  saveNotifications() {
    try {
      localStorage.setItem('fintrustex_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }
  
  /**
   * Set up WebSocket listeners for real-time notifications
   */
  setupWebSocketListeners() {
    if (window.WebSocketClient && window.WebSocketClient.addMessageListener) {
      // Listen for transaction updates (deposits and withdrawals)
      window.WebSocketClient.addMessageListener('transaction_update', (data) => {
        if (data.status === 'completed') {
          if (data.type === 'deposit') {
            this.addNotification({
              type: 'deposit',
              title: 'Deposit Confirmed',
              message: `Your deposit of ${data.amount} ${data.currency} has been confirmed.`,
              timestamp: new Date().toISOString()
            });
          } else if (data.type === 'withdrawal') {
            this.addNotification({
              type: 'withdrawal',
              title: 'Withdrawal Processed',
              message: `Your withdrawal of ${data.amount} ${data.currency} has been processed.`,
              timestamp: new Date().toISOString()
            });
          }
        }
      });
      
      // Listen for price alerts
      window.WebSocketClient.addMessageListener('price_alert', (data) => {
        this.addNotification({
          type: 'price_alert',
          title: 'Price Alert',
          message: `${data.pair} has ${data.direction === 'above' ? 'reached above' : 'dropped below'} ${data.price}.`,
          timestamp: new Date().toISOString()
        });
      });
      
      // Listen for security alerts (login attempts)
      window.WebSocketClient.addMessageListener('security_alert', (data) => {
        this.addNotification({
          type: 'security',
          title: 'Security Alert',
          message: data.message,
          timestamp: new Date().toISOString()
        });
      });
    }
  }
  
  /**
   * Set up UI event listeners
   */
  setupEventListeners() {
    // Toggle notification panel
    const notificationToggle = document.getElementById('notification-toggle');
    const notificationPanel = document.getElementById('notification-panel');
    
    if (notificationToggle && notificationPanel) {
      notificationToggle.addEventListener('click', () => {
        notificationPanel.classList.toggle('show');
        
        // Mark notifications as seen
        if (notificationPanel.classList.contains('show')) {
          this.markNotificationsAsSeen();
        }
      });
      
      // Close notification panel when clicking outside
      document.addEventListener('click', (event) => {
        if (!notificationToggle.contains(event.target) && 
            !notificationPanel.contains(event.target) && 
            notificationPanel.classList.contains('show')) {
          notificationPanel.classList.remove('show');
        }
      });
      
      // Mark all as read button
      const markAllReadBtn = document.getElementById('mark-all-read');
      if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
          this.markAllAsRead();
        });
      }
      
      // Clear all notifications button
      const clearAllBtn = document.getElementById('clear-notifications');
      if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
          this.clearAllNotifications();
        });
      }
    }
  }
  
  /**
   * Update the UI with current notifications data
   */
  updateUI() {
    // Update notification badge count
    const notificationBadge = document.getElementById('notification-badge');
    if (notificationBadge) {
      if (this.notificationCount > 0) {
        notificationBadge.textContent = this.notificationCount;
        notificationBadge.style.display = 'flex';
      } else {
        notificationBadge.style.display = 'none';
      }
    }
    
    // Update notification list
    const notificationList = document.getElementById('notification-list');
    if (notificationList) {
      // Clear existing notifications
      notificationList.innerHTML = '';
      
      if (this.notifications.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'notification-empty';
        emptyMessage.innerHTML = `
          <div class="empty-icon">
            <i class="fas fa-bell-slash"></i>
          </div>
          <p>You have no notifications</p>
        `;
        notificationList.appendChild(emptyMessage);
      } else {
        // Sort notifications by timestamp (newest first)
        const sortedNotifications = [...this.notifications].sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        
        // Add notifications to the list
        sortedNotifications.forEach(notification => {
          const notificationItem = document.createElement('div');
          notificationItem.className = `notification-item ${notification.read ? 'read' : 'unread'} ${notification.type}`;
          
          // Format the timestamp
          const timestamp = new Date(notification.timestamp);
          const now = new Date();
          let timeDisplay;
          
          if (timestamp.toDateString() === now.toDateString()) {
            // Today: show time
            timeDisplay = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else if (timestamp.getFullYear() === now.getFullYear()) {
            // This year: show month and day
            timeDisplay = timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
          } else {
            // Different year: show date with year
            timeDisplay = timestamp.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
          }
          
          // Get icon based on notification type
          let icon;
          switch (notification.type) {
            case 'deposit':
              icon = 'fa-arrow-down';
              break;
            case 'withdrawal':
              icon = 'fa-arrow-up';
              break;
            case 'price_alert':
              icon = 'fa-chart-line';
              break;
            case 'security':
              icon = 'fa-shield-alt';
              break;
            default:
              icon = 'fa-bell';
          }
          
          notificationItem.innerHTML = `
            <div class="notification-icon">
              <i class="fas ${icon}"></i>
            </div>
            <div class="notification-content">
              <div class="notification-header">
                <h4>${notification.title}</h4>
                <span class="notification-time">${timeDisplay}</span>
              </div>
              <p>${notification.message}</p>
            </div>
            <div class="notification-actions">
              <button class="notification-mark-read" title="${notification.read ? 'Mark as unread' : 'Mark as read'}">
                <i class="fas ${notification.read ? 'fa-envelope' : 'fa-envelope-open'}"></i>
              </button>
              <button class="notification-delete" title="Delete notification">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
          
          // Add event listeners for the action buttons
          notificationList.appendChild(notificationItem);
          
          // Mark as read/unread button
          const markReadBtn = notificationItem.querySelector('.notification-mark-read');
          markReadBtn.addEventListener('click', () => {
            this.toggleNotificationRead(notification);
          });
          
          // Delete button
          const deleteBtn = notificationItem.querySelector('.notification-delete');
          deleteBtn.addEventListener('click', () => {
            this.deleteNotification(notification);
          });
        });
      }
    }
  }
  
  /**
   * Add a new notification
   * @param {Object} notification - The notification object
   */
  addNotification(notification) {
    // Add read property and ID
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
      read: false
    };
    
    // Add to the beginning of the array
    this.notifications.unshift(newNotification);
    
    // Keep only the most recent 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    
    // Increment unread count
    this.notificationCount++;
    
    // Save to localStorage
    this.saveNotifications();
    
    // Update UI
    this.updateUI();
    
    // Show toast notification
    this.showToastNotification(newNotification);
  }
  
  /**
   * Toggle the read status of a notification
   * @param {Object} notification - The notification to toggle
   */
  toggleNotificationRead(notification) {
    const index = this.notifications.findIndex(n => n.id === notification.id);
    if (index !== -1) {
      const wasRead = this.notifications[index].read;
      this.notifications[index].read = !wasRead;
      
      // Update unread count
      if (wasRead) {
        this.notificationCount++;
      } else {
        this.notificationCount--;
      }
      
      // Save to localStorage
      this.saveNotifications();
      
      // Update UI
      this.updateUI();
    }
  }
  
  /**
   * Delete a notification
   * @param {Object} notification - The notification to delete
   */
  deleteNotification(notification) {
    const index = this.notifications.findIndex(n => n.id === notification.id);
    if (index !== -1) {
      // If deleting an unread notification, decrement count
      if (!this.notifications[index].read) {
        this.notificationCount--;
      }
      
      // Remove from array
      this.notifications.splice(index, 1);
      
      // Save to localStorage
      this.saveNotifications();
      
      // Update UI
      this.updateUI();
    }
  }
  
  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    
    this.notificationCount = 0;
    
    // Save to localStorage
    this.saveNotifications();
    
    // Update UI
    this.updateUI();
  }
  
  /**
   * Mark notifications as seen (update last seen timestamp)
   */
  markNotificationsAsSeen() {
    localStorage.setItem('fintrustex_notifications_last_seen', new Date().toISOString());
  }
  
  /**
   * Clear all notifications
   */
  clearAllNotifications() {
    this.notifications = [];
    this.notificationCount = 0;
    
    // Save to localStorage
    this.saveNotifications();
    
    // Update UI
    this.updateUI();
  }
  
  /**
   * Show a toast notification
   * @param {Object} notification - The notification to show
   */
  showToastNotification(notification) {
    // Skip if we're not on a page that supports toast notifications
    if (!document.querySelector('.toast-container')) {
      return;
    }
    
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${notification.type}`;
    
    // Get icon based on notification type
    let icon;
    switch (notification.type) {
      case 'deposit':
        icon = 'fa-arrow-down';
        break;
      case 'withdrawal':
        icon = 'fa-arrow-up';
        break;
      case 'price_alert':
        icon = 'fa-chart-line';
        break;
      case 'security':
        icon = 'fa-shield-alt';
        break;
      default:
        icon = 'fa-bell';
    }
    
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas ${icon}"></i>
      </div>
      <div class="toast-content">
        <h4>${notification.title}</h4>
        <p>${notification.message}</p>
      </div>
      <button class="toast-close">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Add removal event
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        toast.remove();
      }, 300);
    });
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('toast-hiding');
        setTimeout(() => {
          if (toast.parentElement) {
            toast.remove();
          }
        }, 300);
      }
    }, 5000);
    
    // Animate in
    setTimeout(() => {
      toast.classList.add('toast-visible');
    }, 10);
  }
  
  /**
   * Add a test notification (for development purposes)
   */
  addTestNotification(type = 'deposit') {
    let notification;
    
    switch (type) {
      case 'deposit':
        notification = {
          type: 'deposit',
          title: 'Deposit Confirmed',
          message: `Your deposit of 0.5 BTC has been confirmed.`,
          timestamp: new Date().toISOString()
        };
        break;
      case 'withdrawal':
        notification = {
          type: 'withdrawal',
          title: 'Withdrawal Processed',
          message: `Your withdrawal of 1.25 ETH has been processed.`,
          timestamp: new Date().toISOString()
        };
        break;
      case 'price_alert':
        notification = {
          type: 'price_alert',
          title: 'Price Alert',
          message: `BTC/USDT has reached above 45,000 USDT.`,
          timestamp: new Date().toISOString()
        };
        break;
      case 'security':
        notification = {
          type: 'security',
          title: 'Security Alert',
          message: `New login detected from San Francisco, United States.`,
          timestamp: new Date().toISOString()
        };
        break;
    }
    
    this.addNotification(notification);
  }
}

// Create a global notification service instance
window.notificationService = new NotificationService();