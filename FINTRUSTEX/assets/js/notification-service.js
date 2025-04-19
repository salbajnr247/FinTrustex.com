/**
 * Notification Service for FinTrustEX
 * Manages and displays notifications for the user
 */

class NotificationService {
  constructor() {
    this.notifications = [];
    this.notificationTypes = {
      deposit: { icon: 'fa-money-bill-wave', className: 'deposit' },
      withdrawal: { icon: 'fa-wallet', className: 'withdrawal' },
      login: { icon: 'fa-user-shield', className: 'login' },
      system: { icon: 'fa-cogs', className: 'system' },
      price: { icon: 'fa-chart-line', className: 'price' },
      security: { icon: 'fa-shield-alt', className: 'security' },
      news: { icon: 'fa-newspaper', className: 'news' }
    };
    
    this.init();
  }
  
  /**
   * Initialize the notification service
   */
  init() {
    // Load notifications from localStorage
    this.loadNotifications();
    
    // Register event listeners
    document.addEventListener('DOMContentLoaded', () => {
      this.setupEventListeners();
      this.renderNotifications();
    });
    
    // Demo: Add some notifications after a delay
    setTimeout(() => {
      if (this.notifications.length === 0) {
        this.addDemoNotifications();
      }
    }, 2000);
  }
  
  /**
   * Set up event listeners for notification actions
   */
  setupEventListeners() {
    // Mark all as read button
    const markAllReadBtn = document.getElementById('mark-all-read');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', () => this.markAllAsRead());
    }
    
    // View all notifications link
    const viewAllLink = document.getElementById('view-all-notifications');
    if (viewAllLink) {
      viewAllLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Could navigate to a full notifications page
        console.log('View all notifications clicked');
      });
    }
    
    // Set up delegated event listener for notification actions
    const notificationsList = document.getElementById('notifications-list');
    if (notificationsList) {
      notificationsList.addEventListener('click', (e) => {
        if (e.target.closest('.notification-action')) {
          const notificationItem = e.target.closest('.notification-item');
          if (notificationItem && notificationItem.dataset.id) {
            this.removeNotification(notificationItem.dataset.id);
          }
        }
      });
    }
  }
  
  /**
   * Add a new notification
   * @param {Object} notification - The notification to add
   * @param {string} notification.title - The notification title
   * @param {string} notification.message - The notification message
   * @param {string} notification.type - The notification type (deposit, withdrawal, etc.)
   * @param {boolean} notification.isRead - Whether the notification has been read
   */
  addNotification(notification) {
    const id = Date.now().toString();
    const timestamp = new Date().toISOString();
    
    const newNotification = {
      id,
      timestamp,
      isRead: false,
      ...notification
    };
    
    this.notifications.unshift(newNotification);
    this.saveNotifications();
    this.renderNotifications();
    
    return id;
  }
  
  /**
   * Remove a notification by ID
   * @param {string} id - The notification ID to remove
   */
  removeNotification(id) {
    this.notifications = this.notifications.filter(notification => notification.id !== id);
    this.saveNotifications();
    this.renderNotifications();
  }
  
  /**
   * Mark a notification as read
   * @param {string} id - The notification ID to mark as read
   */
  markAsRead(id) {
    const notification = this.notifications.find(notification => notification.id === id);
    if (notification) {
      notification.isRead = true;
      this.saveNotifications();
      this.renderNotifications();
    }
  }
  
  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.isRead = true;
    });
    this.saveNotifications();
    this.renderNotifications();
  }
  
  /**
   * Get the count of unread notifications
   * @returns {number} The count of unread notifications
   */
  getUnreadCount() {
    return this.notifications.filter(notification => !notification.isRead).length;
  }
  
  /**
   * Save notifications to localStorage
   */
  saveNotifications() {
    // Limit the number of stored notifications to prevent localStorage overload
    const limitedNotifications = this.notifications.slice(0, 50);
    localStorage.setItem('fintrustex_notifications', JSON.stringify(limitedNotifications));
  }
  
  /**
   * Load notifications from localStorage
   */
  loadNotifications() {
    try {
      const savedNotifications = localStorage.getItem('fintrustex_notifications');
      this.notifications = savedNotifications ? JSON.parse(savedNotifications) : [];
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications = [];
    }
  }
  
  /**
   * Format timestamp to a relative time string (e.g., "2 minutes ago")
   * @param {string} timestamp - ISO timestamp string
   * @returns {string} Formatted relative time
   */
  formatRelativeTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
    
    return date.toLocaleDateString();
  }
  
  /**
   * Render notifications in the UI
   */
  renderNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    if (!notificationsList) return;
    
    // Clear the current notifications
    notificationsList.innerHTML = '';
    
    // If no notifications, show a message
    if (this.notifications.length === 0) {
      notificationsList.innerHTML = `
        <div class="notification-empty">
          <p>No notifications yet</p>
        </div>
      `;
      return;
    }
    
    // Render each notification (limit to 5 for dashboard display)
    const displayNotifications = this.notifications.slice(0, 5);
    
    displayNotifications.forEach(notification => {
      const { type = 'system', title, message, isRead, id, timestamp } = notification;
      const typeInfo = this.notificationTypes[type] || this.notificationTypes.system;
      
      const element = document.createElement('div');
      element.className = `notification-item${isRead ? '' : ' unread'}`;
      element.dataset.id = id;
      
      element.innerHTML = `
        <div class="notification-icon ${typeInfo.className}">
          <i class="fas ${typeInfo.icon}"></i>
        </div>
        <div class="notification-content">
          <h4>${title}</h4>
          <p>${message}</p>
          <span class="notification-time">${this.formatRelativeTime(timestamp)}</span>
        </div>
        <button class="notification-action"><i class="fas fa-times"></i></button>
      `;
      
      notificationsList.appendChild(element);
    });
    
    // Update unread count if badge element exists
    const unreadBadge = document.getElementById('notification-badge');
    if (unreadBadge) {
      const unreadCount = this.getUnreadCount();
      unreadBadge.textContent = unreadCount;
      unreadBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
  }
  
  /**
   * Add demo notifications for testing
   */
  addDemoNotifications() {
    const demoNotifications = [
      {
        title: 'Deposit Confirmed',
        message: 'Your deposit of 0.05 BTC has been confirmed',
        type: 'deposit'
      },
      {
        title: 'New Login',
        message: 'New login from Chrome on Windows',
        type: 'login',
        isRead: true
      },
      {
        title: 'Price Alert',
        message: 'BTC has reached your target price of $60,000',
        type: 'price',
        isRead: true
      }
    ];
    
    // Add demo notifications with delays to simulate real-time updates
    demoNotifications.forEach((notification, index) => {
      setTimeout(() => {
        this.addNotification(notification);
      }, index * 500);
    });
  }
}

// Create a global notification service instance
window.notificationService = new NotificationService();