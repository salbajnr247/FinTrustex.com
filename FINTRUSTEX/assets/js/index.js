// Mobile menu toggle
const mobileToggle = document.getElementById('mobileMenuToggle');
const navList = document.querySelector('.nav-list');

mobileToggle.addEventListener('click', () => {
  const expanded = mobileToggle.getAttribute('aria-expanded') === 'true' || false;
  mobileToggle.setAttribute('aria-expanded', !expanded);
  mobileToggle.classList.toggle('open');
  navList.classList.toggle('show');
});

// Close mobile menu on nav link click
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (navList.classList.contains('show')) {
      navList.classList.remove('show');
      mobileToggle.classList.remove('open');
      mobileToggle.setAttribute('aria-expanded', false);
    }
  });
});

// Scroll-triggered animations for features, testimonials, and team members
const observerOptions = {
  threshold: 0.1,
};

const revealOnScroll = (entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
};

const observer = new IntersectionObserver(revealOnScroll, observerOptions);

document.querySelectorAll('.feature-card, .testimonial-card, .team-member').forEach(el => {
  observer.observe(el);
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    e.preventDefault();
    const targetID = anchor.getAttribute('href').substring(1);
    const targetElem = document.getElementById(targetID);
    if (targetElem) {
      targetElem.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
