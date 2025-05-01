/**
 * Notification Service
 * Handles notification management and real-time updates
 */

class NotificationService {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.initialized = false;
    this.listeners = {
      'new': [],
      'read': [],
      'count': []
    };
    
    // Initialize if the DOM is already loaded
    if (document.readyState === 'complete') {
      this.init();
    } else {
      // Otherwise, wait for DOMContentLoaded
      document.addEventListener('DOMContentLoaded', () => this.init());
    }
  }
  
  /**
   * Initialize notification service
   */
  async init() {
    try {
      // Check if already initialized
      if (this.initialized) return;
      
      console.log('Initializing notification service...');
      
      // Load initial notifications if API is available
      if (window.api && api.notifications) {
        await this.loadNotifications();
      }
      
      // Connect to WebSocket for real-time updates
      this.connectWebSocket();
      
      // Set up periodic refresh (every 60 seconds)
      this.refreshInterval = setInterval(() => this.loadNotifications(), 60000);
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }
  
  /**
   * Load notifications from API
   */
  async loadNotifications() {
    try {
      if (!window.api || !api.notifications) {
        throw new Error('Notifications API not available');
      }
      
      // Get all notifications
      const notifications = await api.notifications.getAll();
      this.notifications = notifications;
      
      // Get unread notifications
      const unreadNotifications = await api.notifications.getUnread();
      const previousUnreadCount = this.unreadCount;
      this.unreadCount = unreadNotifications.length;
      
      // Trigger count changed event if count changed
      if (previousUnreadCount !== this.unreadCount) {
        this.triggerEvent('count', this.unreadCount);
      }
      
      // Update UI count
      this.updateNotificationCount();
      
      return notifications;
    } catch (error) {
      console.error('Failed to load notifications:', error);
      return [];
    }
  }
  
  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket() {
    if (!window.websocketClient) {
      console.warn('WebSocket client not available');
      return;
    }
    
    // Listen for notification events
    websocketClient.addEventListener('notification', (event) => {
      this.handleNewNotification(event.detail);
    });
  }
  
  /**
   * Handle new notification
   * @param {Object} notification - Notification data
   */
  handleNewNotification(notification) {
    // Add to notifications array
    this.notifications.unshift(notification);
    
    // Increment unread count if not read
    if (!notification.isRead) {
      this.unreadCount++;
      this.updateNotificationCount();
      this.triggerEvent('count', this.unreadCount);
    }
    
    // Trigger new notification event
    this.triggerEvent('new', notification);
    
    // Handle special notification types
    if (notification.type === 'ticket_update' && notification.data && notification.data.ticketId) {
      // Trigger ticket update event if websocket client is available
      if (window.websocketClient) {
        const ticketEvent = new CustomEvent('ticket_update', { detail: notification.data });
        websocketClient.dispatchEvent(ticketEvent);
      }
    }
    
    // Show toast notification
    if (window.showToast) {
      showToast(notification.title, 'info');
    }
  }
  
  /**
   * Update notification count in UI
   */
  updateNotificationCount() {
    const countElement = document.getElementById('notifications-count');
    if (countElement) {
      countElement.textContent = this.unreadCount > 0 ? this.unreadCount : '';
    }
  }
  
  /**
   * Mark notification as read
   * @param {number} id - Notification ID
   */
  async markAsRead(id) {
    try {
      if (!window.api || !api.notifications) {
        throw new Error('Notifications API not available');
      }
      
      // Call API
      await api.notifications.markAsRead(id);
      
      // Update local notification
      const notification = this.notifications.find(n => n.id === id);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.updateNotificationCount();
        this.triggerEvent('count', this.unreadCount);
        this.triggerEvent('read', notification);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      if (!window.api || !api.notifications) {
        throw new Error('Notifications API not available');
      }
      
      // Call API
      await api.notifications.markAllAsRead();
      
      // Update local notifications
      this.notifications.forEach(notification => {
        notification.isRead = true;
      });
      
      // Update count
      this.unreadCount = 0;
      this.updateNotificationCount();
      this.triggerEvent('count', this.unreadCount);
      
      return true;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return false;
    }
  }
  
  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(callback);
  }
  
  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  removeEventListener(event, callback) {
    if (!this.listeners[event]) return;
    
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }
  
  /**
   * Trigger event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  triggerEvent(event, data) {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in notification ${event} event listener:`, error);
      }
    });
  }
  
  /**
   * Get unread notifications
   * @returns {Array} - Unread notifications
   */
  getUnreadNotifications() {
    return this.notifications.filter(notification => !notification.isRead);
  }
  
  /**
   * Get unread count
   * @returns {number} - Unread count
   */
  getUnreadCount() {
    return this.unreadCount;
  }
  
  /**
   * Dispose notification service
   */
  dispose() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.listeners = {
      'new': [],
      'read': [],
      'count': []
    };
    
    this.initialized = false;
  }
}

// Create global notification service instance
window.notificationService = new NotificationService();