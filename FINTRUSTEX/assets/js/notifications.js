/**
 * Notifications JavaScript
 * Handles the notifications page functionality
 */

// Notification page state
let notificationsData = [];
let currentPage = 1;
const pageSize = 10;
let totalPages = 1;
let currentFilter = 'all';

/**
 * Initialize notifications page
 */
async function initNotificationsPage() {
  try {
    // Check authentication first
    if (window.authService && !authService.isAuthenticated()) {
      window.location.href = '../auth.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    // Set up event listeners
    setupEventListeners();
    
    // Load notifications
    await loadNotifications();
    
    // Initialize WebSocket for real-time updates if available
    if (window.websocketClient) {
      websocketClient.addEventListener('notification', handleNewNotification);
    }
  } catch (error) {
    console.error('Error initializing notifications page:', error);
    showToast('Failed to initialize notifications page. Please try again.', 'error');
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Filter buttons
  document.querySelectorAll('.notification-filter').forEach(filter => {
    filter.addEventListener('click', () => {
      // Update active filter
      document.querySelector('.notification-filter.active').classList.remove('active');
      filter.classList.add('active');
      
      // Get filter value
      const filterValue = filter.dataset.filter;
      currentFilter = filterValue;
      
      // Reset to first page
      currentPage = 1;
      
      // Reload notifications with filter
      loadNotifications();
    });
  });
  
  // Mark all as read button
  const markAllReadButton = document.getElementById('mark-all-read');
  if (markAllReadButton) {
    markAllReadButton.addEventListener('click', markAllAsRead);
  }
  
  // Notification settings button
  const settingsButton = document.getElementById('notification-settings');
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      window.location.href = '/dashboard/settings.html?tab=notifications';
    });
  }
  
  // Pagination buttons
  const prevPageButton = document.getElementById('prev-page');
  if (prevPageButton) {
    prevPageButton.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadNotifications();
      }
    });
  }
  
  const nextPageButton = document.getElementById('next-page');
  if (nextPageButton) {
    nextPageButton.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadNotifications();
      }
    });
  }
}

/**
 * Load notifications
 */
async function loadNotifications() {
  try {
    // Show loader
    const loader = document.getElementById('notifications-loader');
    const notificationList = document.getElementById('notification-list');
    
    if (loader) {
      loader.style.display = 'flex';
    }
    
    // Clear existing notifications
    if (notificationList) {
      // Keep the loader but remove other content
      const elements = notificationList.querySelectorAll(':not(#notifications-loader)');
      elements.forEach(el => el.remove());
    }
    
    // Fetch notifications from API
    let notifications = [];
    if (window.api && api.notifications) {
      notifications = await api.notifications.getAll();
      
      // Store in global variable for access in other functions
      window.notificationsData = notifications;
    } else {
      console.error('Notifications API not available');
      showToast('Failed to load notifications. API not available.', 'error');
    }
    
    // Apply filter
    let filteredNotifications = notifications;
    if (currentFilter !== 'all') {
      filteredNotifications = notifications.filter(notification => {
        if (currentFilter === 'unread') {
          return !notification.isRead;
        } else {
          return notification.type.includes(currentFilter);
        }
      });
    }
    
    // Calculate pagination
    totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));
    updatePaginationControls();
    
    // Slice notifications for current page
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageNotifications = filteredNotifications.slice(startIndex, endIndex);
    
    // Group notifications by date
    const groupedNotifications = groupNotificationsByDate(pageNotifications);
    
    // Hide loader
    if (loader) {
      loader.style.display = 'none';
    }
    
    // Display notifications or empty state
    if (pageNotifications.length === 0) {
      showEmptyState();
    } else {
      renderNotifications(groupedNotifications);
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
    showToast('Failed to load notifications. Please try again.', 'error');
    
    // Hide loader and show error state
    const loader = document.getElementById('notifications-loader');
    if (loader) {
      loader.style.display = 'none';
    }
    
    showEmptyState('error');
  }
}

/**
 * Group notifications by date
 * @param {Array} notifications - Notifications to group
 * @returns {Object} - Grouped notifications
 */
function groupNotificationsByDate(notifications) {
  const groups = {};
  
  notifications.forEach(notification => {
    const date = new Date(notification.createdAt);
    const dateKey = formatDateGroup(date);
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    
    groups[dateKey].push(notification);
  });
  
  return groups;
}

/**
 * Format date for grouping
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date key
 */
function formatDateGroup(date) {
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

/**
 * Render notifications
 * @param {Object} groupedNotifications - Notifications grouped by date
 */
function renderNotifications(groupedNotifications) {
  const notificationList = document.getElementById('notification-list');
  if (!notificationList) return;
  
  // Render each date group
  for (const [dateGroup, notifications] of Object.entries(groupedNotifications)) {
    // Add date divider
    const dateDivider = document.createElement('div');
    dateDivider.className = 'notification-date-divider';
    dateDivider.textContent = dateGroup;
    notificationList.appendChild(dateDivider);
    
    // Render notifications in this group
    notifications.forEach(notification => {
      // Create notification item
      const notificationItem = createNotificationElement(notification);
      notificationList.appendChild(notificationItem);
    });
  }
}

/**
 * Create notification element
 * @param {Object} notification - Notification data
 * @returns {Element} - Notification element
 */
function createNotificationElement(notification) {
  // Create element
  const notificationItem = document.createElement('div');
  notificationItem.className = `notification-item ${notification.isRead ? '' : 'unread'}`;
  notificationItem.dataset.id = notification.id;
  
  // Determine icon based on notification type
  let iconClass = 'fa-bell';
  let iconType = '';
  
  if (notification.type.includes('deposit')) {
    iconClass = 'fa-money-bill-wave';
    iconType = 'deposit';
  } else if (notification.type.includes('withdrawal')) {
    iconClass = 'fa-money-bill-transfer';
    iconType = 'withdrawal';
  } else if (notification.type.includes('login') || notification.type.includes('security')) {
    iconClass = 'fa-shield-alt';
    iconType = 'login';
  } else if (notification.type.includes('price')) {
    iconClass = 'fa-chart-line';
    iconType = 'price';
  } else if (notification.type.includes('system')) {
    iconClass = 'fa-server';
    iconType = 'system';
  }
  
  // Format time
  const timeAgo = utils.formatTimeAgo(new Date(notification.createdAt));
  
  // Set inner HTML
  notificationItem.innerHTML = `
    <div class="notification-icon ${iconType}">
      <i class="fas ${iconClass}"></i>
    </div>
    <div class="notification-content">
      <h4>${notification.title}</h4>
      <p>${notification.message}</p>
      <span class="notification-time">${timeAgo}</span>
    </div>
    <button class="notification-action" data-action="mark-read" title="${notification.isRead ? 'Mark as unread' : 'Mark as read'}">
      <i class="fas ${notification.isRead ? 'fa-envelope' : 'fa-envelope-open'}"></i>
    </button>
  `;
  
  // Add click event listeners
  notificationItem.addEventListener('click', (event) => {
    // Check if the click was on the action button
    const isActionButton = event.target.closest('.notification-action');
    if (isActionButton) {
      event.stopPropagation();
      toggleNotificationReadStatus(notification.id, notificationItem);
      return;
    }
    
    // Mark as read if unread
    if (!notification.isRead) {
      markNotificationAsRead(notification.id, notificationItem);
    }
    
    // Navigate to link if available
    if (notification.data && notification.data.action && notification.data.action.url) {
      window.location.href = notification.data.action.url;
    }
  });
  
  return notificationItem;
}

/**
 * Update pagination controls
 */
function updatePaginationControls() {
  const prevPageButton = document.getElementById('prev-page');
  const nextPageButton = document.getElementById('next-page');
  const currentPageElement = document.getElementById('current-page');
  const totalPagesElement = document.getElementById('total-pages');
  
  if (currentPageElement) {
    currentPageElement.textContent = currentPage;
  }
  
  if (totalPagesElement) {
    totalPagesElement.textContent = totalPages;
  }
  
  if (prevPageButton) {
    prevPageButton.disabled = currentPage <= 1;
  }
  
  if (nextPageButton) {
    nextPageButton.disabled = currentPage >= totalPages;
  }
}

/**
 * Show empty state
 * @param {string} type - Empty state type
 */
function showEmptyState(type = 'empty') {
  const notificationList = document.getElementById('notification-list');
  if (!notificationList) return;
  
  let icon = 'fa-bell-slash';
  let message = 'No notifications yet';
  
  if (type === 'error') {
    icon = 'fa-exclamation-triangle';
    message = 'Failed to load notifications';
  } else if (currentFilter !== 'all') {
    message = `No ${currentFilter} notifications`;
  }
  
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  emptyState.innerHTML = `
    <i class="fas ${icon}"></i>
    <h3>${message}</h3>
    <p>You'll see your notifications here when they arrive.</p>
  `;
  
  notificationList.appendChild(emptyState);
}

/**
 * Toggle notification read status
 * @param {number} notificationId - Notification ID
 * @param {Element} element - Notification element
 */
async function toggleNotificationReadStatus(notificationId, element) {
  try {
    const isCurrentlyUnread = element.classList.contains('unread');
    
    if (isCurrentlyUnread) {
      await markNotificationAsRead(notificationId, element);
    } else {
      // For now, just toggle the UI state as the backend doesn't support marking as unread
      element.classList.add('unread');
      
      // Toggle icon
      const iconElement = element.querySelector('.notification-action i');
      if (iconElement) {
        iconElement.className = 'fas fa-envelope-open';
      }
      
      // Update title
      const actionButton = element.querySelector('.notification-action');
      if (actionButton) {
        actionButton.title = 'Mark as read';
      }
    }
  } catch (error) {
    console.error('Error toggling notification read status:', error);
    showToast('Failed to update notification', 'error');
  }
}

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @param {Element} element - Notification element
 */
async function markNotificationAsRead(notificationId, element) {
  try {
    // Call API
    await api.notifications.markAsRead(notificationId);
    
    // Update UI
    element.classList.remove('unread');
    
    // Update icon
    const iconElement = element.querySelector('.notification-action i');
    if (iconElement) {
      iconElement.className = 'fas fa-envelope';
    }
    
    // Update title
    const actionButton = element.querySelector('.notification-action');
    if (actionButton) {
      actionButton.title = 'Mark as unread';
    }
    
    // Update notification count in header if available
    const notificationsCount = document.getElementById('notifications-count');
    if (notificationsCount) {
      // Get current count
      const currentCount = notificationsCount.textContent;
      if (currentCount && parseInt(currentCount) > 0) {
        const newCount = parseInt(currentCount) - 1;
        notificationsCount.textContent = newCount > 0 ? newCount : '';
      }
    }
    
    // Update stored data
    if (window.notificationsData) {
      const notification = window.notificationsData.find(n => n.id === notificationId);
      if (notification) {
        notification.isRead = true;
      }
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    showToast('Failed to mark notification as read', 'error');
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead() {
  try {
    // Call API
    await api.notifications.markAllAsRead();
    
    // Update UI - remove unread class from all notification items
    document.querySelectorAll('.notification-item.unread').forEach(item => {
      item.classList.remove('unread');
      
      // Update icon
      const iconElement = item.querySelector('.notification-action i');
      if (iconElement) {
        iconElement.className = 'fas fa-envelope';
      }
      
      // Update title
      const actionButton = item.querySelector('.notification-action');
      if (actionButton) {
        actionButton.title = 'Mark as unread';
      }
    });
    
    // Update notifications count in header
    const notificationsCount = document.getElementById('notifications-count');
    if (notificationsCount) {
      notificationsCount.textContent = '';
    }
    
    // Update stored data
    if (window.notificationsData) {
      window.notificationsData.forEach(notification => {
        notification.isRead = true;
      });
    }
    
    // Show success message
    showToast('All notifications marked as read', 'success');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    showToast('Failed to mark all notifications as read', 'error');
  }
}

/**
 * Handle new notification
 * @param {Object} event - Notification event
 */
function handleNewNotification(event) {
  // Get the notification data
  const notification = event.detail;
  
  // Add to stored data if it exists
  if (window.notificationsData) {
    window.notificationsData.unshift(notification);
  }
  
  // Check if it matches current filter
  let matchesFilter = true;
  if (currentFilter !== 'all') {
    if (currentFilter === 'unread') {
      matchesFilter = !notification.isRead;
    } else {
      matchesFilter = notification.type.includes(currentFilter);
    }
  }
  
  // If we're on the first page and it matches filter, prepend to list
  if (currentPage === 1 && matchesFilter) {
    // Check if we need to add a new date group
    const date = new Date(notification.createdAt);
    const dateKey = formatDateGroup(date);
    
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) return;
    
    // Check if this date group exists
    let dateGroup = notificationList.querySelector(`.notification-date-divider:contains("${dateKey}")`);
    if (!dateGroup) {
      // Create new date group
      dateGroup = document.createElement('div');
      dateGroup.className = 'notification-date-divider';
      dateGroup.textContent = dateKey;
      
      // Insert at the top
      if (notificationList.firstChild) {
        notificationList.insertBefore(dateGroup, notificationList.firstChild);
      } else {
        notificationList.appendChild(dateGroup);
      }
    }
    
    // Create notification element
    const notificationElement = createNotificationElement(notification);
    
    // Insert after date group
    dateGroup.insertAdjacentElement('afterend', notificationElement);
    
    // Show toast notification
    showToast(`New notification: ${notification.title}`, 'info');
  } else {
    // Just update counters and pagination
    totalPages = Math.max(1, Math.ceil(window.notificationsData.length / pageSize));
    updatePaginationControls();
    
    // Show toast indicator
    showToast('New notification received', 'info');
  }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initNotificationsPage();
});