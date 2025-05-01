// index.js

document.addEventListener("DOMContentLoaded", () => {
  // Mobile menu toggle
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navList = document.querySelector(".nav-list");

  if (mobileMenuToggle && navList) {
    mobileMenuToggle.addEventListener("click", () => {
      const expanded =
        mobileMenuToggle.getAttribute("aria-expanded") === "true";
      mobileMenuToggle.setAttribute("aria-expanded", !expanded);
      navList.classList.toggle("active");
    });
  }

  // FAQ accordion toggle
  const faqButtons = document.querySelectorAll(".faq-question");
  faqButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", !isExpanded);
      const answerId = button.getAttribute("aria-controls");
      const answer = document.getElementById(answerId);
      if (answer) {
        answer.hidden = isExpanded;
      }
    });
  });

  // Smooth scrolling for nav links
  const navLinks = document.querySelectorAll('a.nav-link[href^="#"]');
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
        // Close mobile menu if open
        if (navList.classList.contains("active")) {
          navList.classList.remove("active");
          mobileMenuToggle.setAttribute("aria-expanded", false);
        }
      }
    });
  });

  // Optional: Back to top button
  const backToTopBtn = document.createElement("button");
  backToTopBtn.className = "back-to-top";
  backToTopBtn.setAttribute("aria-label", "Back to top");
  backToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
  document.body.appendChild(backToTopBtn);

  backToTopBtn.style.display = "none";

  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      backToTopBtn.style.display = "block";
    } else {
      backToTopBtn.style.display = "none";
    }
  });

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});
