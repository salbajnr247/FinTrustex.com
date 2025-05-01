/**
 * Notification Service for FinTrustEX
 * 
 * Handles displaying notifications to the user including:
 * - Transaction notifications
 * - System alerts
 * - Price alerts
 * - Security notifications
 */

class NotificationService {
  constructor() {
    this.notificationContainer = null;
    this.notifications = [];
    this.maxNotifications = 5; // Maximum number of notifications to show at once
    this.notificationLifetime = 5000; // How long notifications stay visible (ms)
    this.notificationCount = 0; // Counter for generating unique IDs
  }

  /**
   * Initialize the notification service
   */
  init() {
    // Create notification container if it doesn't exist
    if (!this.notificationContainer) {
      this.notificationContainer = document.createElement('div');
      this.notificationContainer.className = 'notification-container';
      document.body.appendChild(this.notificationContainer);
      
      // Add styles if not already present
      this.addStyles();
    }
    
    // Connect to WebSocket notifications if available
    if (window.websocketClient) {
      websocketClient.addEventListener('notification', this.handleWebSocketNotification.bind(this));
      
      // Load any stored notifications
      const storedNotifications = websocketClient.getRecentNotifications();
      this.notifications = storedNotifications.slice(0, 10);
    }
  }

  /**
   * Add necessary CSS styles
   */
  addStyles() {
    const styleId = 'notification-service-styles';
    
    // Check if styles already exist
    if (document.getElementById(styleId)) {
      return;
    }
    
    // Create style element
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 350px;
        z-index: 10000;
      }
      
      .notification {
        display: flex;
        align-items: flex-start;
        background: rgba(40, 44, 52, 0.9);
        border-left: 4px solid #f7c948;
        color: #fff;
        border-radius: 4px;
        padding: 12px 15px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(120%);
        transition: transform 0.3s ease;
        animation: slide-in 0.3s forwards;
        position: relative;
        overflow: hidden;
      }
      
      .notification.closing {
        animation: slide-out 0.3s forwards;
      }
      
      .notification-icon {
        margin-right: 12px;
        font-size: 20px;
        color: #f7c948;
      }
      
      .notification-content {
        flex: 1;
      }
      
      .notification-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
      }
      
      .notification-message {
        font-size: 13px;
        opacity: 0.9;
      }
      
      .notification-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        padding: 4px;
        margin-left: 8px;
        border-radius: 4px;
        transition: color 0.3s ease;
      }
      
      .notification-close:hover {
        color: rgba(255, 255, 255, 0.9);
      }
      
      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(247, 201, 72, 0.7);
        width: 100%;
        transform-origin: left;
        animation: shrink linear forwards;
      }
      
      .notification-deposit {
        border-left-color: #4CAF50;
      }
      
      .notification-deposit .notification-icon {
        color: #4CAF50;
      }
      
      .notification-deposit .notification-progress {
        background: rgba(76, 175, 80, 0.7);
      }
      
      .notification-withdrawal {
        border-left-color: #2196F3;
      }
      
      .notification-withdrawal .notification-icon {
        color: #2196F3;
      }
      
      .notification-withdrawal .notification-progress {
        background: rgba(33, 150, 243, 0.7);
      }
      
      .notification-price {
        border-left-color: #9C27B0;
      }
      
      .notification-price .notification-icon {
        color: #9C27B0;
      }
      
      .notification-price .notification-progress {
        background: rgba(156, 39, 176, 0.7);
      }
      
      .notification-security {
        border-left-color: #F44336;
      }
      
      .notification-security .notification-icon {
        color: #F44336;
      }
      
      .notification-security .notification-progress {
        background: rgba(244, 67, 54, 0.7);
      }
      
      @keyframes slide-in {
        0% { transform: translateX(120%); }
        100% { transform: translateX(0); }
      }
      
      @keyframes slide-out {
        0% { transform: translateX(0); }
        100% { transform: translateX(120%); }
      }
      
      @keyframes shrink {
        0% { transform: scaleX(1); }
        100% { transform: scaleX(0); }
      }
      
      @media (max-width: 480px) {
        .notification-container {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Handle notification from WebSocket
   * @param {Object} notification - Notification data
   */
  handleWebSocketNotification(notification) {
    // Get notification type
    const type = notification.type || 'info';
    
    // Map notification types to icons
    const typeIcons = {
      'deposit_completed': 'fa-arrow-down',
      'withdrawal_completed': 'fa-arrow-up',
      'price_alert': 'fa-chart-line',
      'security_alert': 'fa-shield-alt',
      'info': 'fa-info-circle'
    };
    
    // Map notification types to CSS classes
    const typeClasses = {
      'deposit_completed': 'notification-deposit',
      'withdrawal_completed': 'notification-withdrawal',
      'price_alert': 'notification-price',
      'security_alert': 'notification-security',
      'info': 'notification-info'
    };
    
    // Show notification
    this.showNotification({
      title: notification.title,
      message: notification.message,
      icon: typeIcons[type] || 'fa-info-circle',
      className: typeClasses[type] || '',
      duration: 6000 // Show for 6 seconds
    });
  }

  /**
   * Show a notification
   * @param {Object} options - Notification options
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification message
   * @param {string} options.icon - Icon class (fontawesome)
   * @param {string} options.className - Additional CSS class
   * @param {number} options.duration - Duration in ms
   * @returns {string} - Notification ID
   */
  showNotification({ title, message, icon = 'fa-info-circle', className = '', duration = 5000 }) {
    // Check if notification container exists
    if (!this.notificationContainer) {
      this.init();
    }
    
    // Generate notification ID
    const id = `notification-${Date.now()}-${this.notificationCount++}`;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${className}`;
    notification.dataset.id = id;
    
    // Set notification content
    notification.innerHTML = `
      <div class="notification-icon">
        <i class="fas ${icon}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close" aria-label="Close notification">
        <i class="fas fa-times"></i>
      </button>
      <div class="notification-progress" style="animation-duration: ${duration}ms;"></div>
    `;
    
    // Add notification to container
    this.notificationContainer.appendChild(notification);
    
    // Add event listener to close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.closeNotification(id);
    });
    
    // Store notification
    this.notifications.push({
      id,
      element: notification,
      timeout: setTimeout(() => {
        this.closeNotification(id);
      }, duration)
    });
    
    // Remove oldest notification if we have too many
    if (this.notifications.length > this.maxNotifications) {
      const oldest = this.notifications.shift();
      this.closeNotification(oldest.id, true);
    }
    
    return id;
  }

  /**
   * Close a notification
   * @param {string} id - Notification ID
   * @param {boolean} immediate - Whether to close immediately
   */
  closeNotification(id, immediate = false) {
    // Find notification
    const index = this.notifications.findIndex(n => n.id === id);
    
    if (index === -1) return;
    
    const notification = this.notifications[index];
    
    // Clear timeout
    clearTimeout(notification.timeout);
    
    // Remove from array
    this.notifications.splice(index, 1);
    
    // Close with animation
    if (!immediate) {
      notification.element.classList.add('closing');
      
      setTimeout(() => {
        if (notification.element.parentNode) {
          notification.element.parentNode.removeChild(notification.element);
        }
      }, 300); // Match animation duration
    } else {
      // Remove immediately
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
    }
  }

  /**
   * Show a success notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @returns {string} - Notification ID
   */
  success(title, message) {
    return this.showNotification({
      title,
      message,
      icon: 'fa-check-circle',
      className: 'notification-deposit',
      duration: 5000
    });
  }

  /**
   * Show an error notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @returns {string} - Notification ID
   */
  error(title, message) {
    return this.showNotification({
      title,
      message,
      icon: 'fa-exclamation-circle',
      className: 'notification-security',
      duration: 8000 // Show errors longer
    });
  }

  /**
   * Show a warning notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @returns {string} - Notification ID
   */
  warning(title, message) {
    return this.showNotification({
      title,
      message,
      icon: 'fa-exclamation-triangle',
      className: 'notification-price',
      duration: 6000
    });
  }

  /**
   * Show an info notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @returns {string} - Notification ID
   */
  info(title, message) {
    return this.showNotification({
      title,
      message,
      icon: 'fa-info-circle',
      className: '',
      duration: 5000
    });
  }
}

// Create and export a singleton instance
const notificationService = new NotificationService();

// Auto-initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    notificationService.init();
  }, 1500); // Slight delay to ensure page and WebSocket are loaded
});

// Make available globally
window.notificationService = notificationService;