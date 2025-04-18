document.addEventListener('DOMContentLoaded', async function () {
  // Base path adjustment for nested directories
  const basePath = window.location.pathname.includes('dashboard/wallet') || 
                   window.location.pathname.includes('dashboard/trading') || 
                   window.location.pathname.includes('dashboard/orders') || 
                   window.location.pathname.includes('dashboard/admin') ? '../../components/' : 
                   window.location.pathname.includes('dashboard/dashboard') ? '../components/' : 
                   window.location.pathname.includes('auth.html') || 
                   window.location.pathname.includes('support.html') || 
                   window.location.pathname.includes('legal.html') ? './components/' : '../components/';

  // Load Navbar
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    try {
      const navbarResponse = await fetch(`${basePath}navbar.html`);
      if (!navbarResponse.ok) throw new Error(`Failed to load navbar.html: ${navbarResponse.status}`);
      navbarContainer.innerHTML = await navbarResponse.text();
    } catch (error) {
      console.error('Error loading navbar:', error);
      navbarContainer.innerHTML = '<div class="navbar-error">Error loading navbar</div>';
    }
  }

  // Load Sidebar (only for dashboard-related pages)
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    try {
      const sidebarResponse = await fetch(`${basePath}sidebar.html`);
      if (!sidebarResponse.ok) throw new Error(`Failed to load sidebar.html: ${sidebarResponse.status}`);
      sidebarContainer.innerHTML = await sidebarResponse.text();
    } catch (error) {
      console.error('Error loading sidebar:', error);
      sidebarContainer.innerHTML = '<div class="sidebar-error">Error loading sidebar</div>';
    }
  }

  // Load Footer
  const footerContainer = document.getElementById('footer-container');
  if (footerContainer) {
    try {
      const footerResponse = await fetch(`${basePath}footer.html`);
      if (!footerResponse.ok) throw new Error(`Failed to load footer.html: ${navbarResponse.status}`);
      footerContainer.innerHTML = await footerResponse.text();
    } catch (error) {
      console.error('Error loading footer:', error);
      footerContainer.innerHTML = '<div class="footer-error">Error loading footer</div>';
    }
  }

  // Add active class to current page
  const sidebarLinks = sidebarContainer?.querySelectorAll('nav ul li a') || [];
  sidebarLinks.forEach(link => {
    const href = link.getAttribute('href');
    const currentPath = window.location.pathname.includes('dashboard.html') ? '../dashboard.html' :
                        window.location.pathname.includes('admin.html') ? '../admin/admin.html' :
                        window.location.pathname.includes('trading.html') ? '../trading/trading.html' :
                        window.location.pathname.includes('wallet.html') ? '../wallet/wallet.html' :
                        window.location.pathname.includes('orders.html') ? '../orders/orders.html' :
                        window.location.pathname.includes('support.html') ? './support.html' :
                        window.location.pathname.includes('legal.html') ? './legal.html' : href;
    if (href === currentPath) {
      link.parentElement.classList.add('active');
    }
  });

  // Dynamic Sidebar Navigation
  sidebarLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const url = link.getAttribute('href');
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch page: ${response.status}`);
        const content = await response.text();
        const app = document.querySelector('#app');
        if (app) {
          app.innerHTML = content;
          AOS.init({ duration: 800 });
        }
        sidebarLinks.forEach(l => l.parentElement.classList.remove('active'));
        link.parentElement.classList.add('active');
      } catch (error) {
        console.error('Error fetching page:', error);
      }
    });
  });

  // Hamburger Menu Toggle
  const hamburger = document.getElementById('hamburger-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }

  // Navbar Button Navigation
  const navButtons = document.querySelectorAll('.nav-actions .btn[data-nav]');
  navButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const navPath = button.getAttribute('data-nav');
      const [path, hash] = navPath.split('#');
      const urlMap = {
        '/dashboard': './dashboard/dashboard.html',
        '/dashboard/admin': './dashboard/admin/admin.html',
        '/dashboard/trading': './dashboard/trading/trading.html',
        '/dashboard/wallet': './dashboard/wallet/wallet.html',
        '/dashboard/orders': './dashboard/orders/orders.html',
        '/support': './support.html',
        '/legal': './legal.html'
      };
      const url = urlMap[path] || path;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch page: ${response.status}`);
        const content = await response.text();
        const app = document.querySelector('#app');
        if (app) {
          app.innerHTML = content;
          AOS.init({ duration: 800 });
          if (hash) {
            const section = document.getElementById(hash);
            if (section) section.scrollIntoView();
          }
        }
        sidebarLinks.forEach(l => l.parentElement.classList.remove('active'));
        const activeLink = Array.from(sidebarLinks).find(l => l.getAttribute('data-nav') === path);
        if (activeLink) activeLink.parentElement.classList.add('active');
      } catch (error) {
        console.error('Error fetching page:', error);
      }
    });
  });
});