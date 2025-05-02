/**
 * Sidebar functionality for FinTrustEX
 * Handles sidebar toggle, responsive behavior, and related utilities
 */

document.addEventListener('DOMContentLoaded', function() {
  // Get the sidebar toggle button and sidebar element
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');
  const dashboardContainer = document.querySelector('.dashboard-container');
  
  // Set up sidebar toggle click handler
  if (sidebarToggle && sidebar && mainContent) {
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('expanded');
      
      // Save sidebar state to localStorage
      localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });
    
    // Restore sidebar state from localStorage
    const sidebarCollapsed = localStorage.getItem('sidebar_collapsed');
    if (sidebarCollapsed === 'true') {
      sidebar.classList.add('collapsed');
      mainContent.classList.add('expanded');
    }
  }
  
  // Handle responsive behavior
  function handleResize() {
    if (window.innerWidth < 768) {
      sidebar.classList.add('collapsed');
      mainContent.classList.add('expanded');
    } else {
      // Only restore state if it's not mobile
      const sidebarCollapsed = localStorage.getItem('sidebar_collapsed');
      if (sidebarCollapsed === 'true') {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
      } else {
        sidebar.classList.remove('collapsed');
        mainContent.classList.remove('expanded');
      }
    }
  }
  
  // Call once on page load
  handleResize();
  
  // Add resize event listener
  window.addEventListener('resize', handleResize);
  
  // Handle dark/light mode toggle if it exists
  const themeSwitcher = document.getElementById('theme-switcher');
  if (themeSwitcher) {
    themeSwitcher.addEventListener('click', function() {
      // Toggle the theme class on the body
      document.body.classList.toggle('dark-mode');
      
      // Save theme preference to localStorage
      const isDarkMode = document.body.classList.contains('dark-mode');
      localStorage.setItem('dark_mode', isDarkMode);
    });
    
    // Restore theme preference from localStorage
    const darkMode = localStorage.getItem('dark_mode');
    if (darkMode === 'true') {
      document.body.classList.add('dark-mode');
    }
  }
  
  // Add active class to current page's sidebar menu item
  const currentPath = window.location.pathname;
  const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
  
  sidebarLinks.forEach(link => {
    if (currentPath === link.getAttribute('href') || currentPath.endsWith(link.getAttribute('href'))) {
      link.parentElement.classList.add('active');
    } else {
      link.parentElement.classList.remove('active');
    }
  });
});