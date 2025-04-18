document.addEventListener('DOMContentLoaded', () => {
  // Mock FAQ Data
  const fetchMockFaqData = async () => {
    return [
      { question: 'How do I reset my password?', answer: 'Click "Forgot Password" on the login page and follow the instructions to reset your password.' },
      { question: 'What is 2FA and how do I enable it?', answer: 'Two-Factor Authentication (2FA) adds an extra layer of security. Enable it in your account settings.' },
      { question: 'How do I deposit funds?', answer: 'Go to the Wallet page, select your currency, and follow the deposit instructions.' }
    ];
  };

  // Update FAQ List
  const updateFaqList = async () => {
    try {
      const faqData = await fetchMockFaqData();
      const faqList = document.getElementById('faq-list');
      if (faqList) {
        faqList.innerHTML = faqData.map(faq => `
          <div class="faq-item">
            <h3 class="faq-question">${faq.question}</h3>
            <div class="faq-answer">${faq.answer}</div>
          </div>
        `).join('');
        // Initialize FAQ toggling
        initFaqToggling();
      }
      AOS.init({ duration: 800 });
    } catch (error) {
      console.error('Error updating FAQ list:', error);
      showToast('Error loading FAQs', 'error');
    }
  };

  // FAQ Toggling
  const initFaqToggling = () => {
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
      question.addEventListener('click', () => {
        const answer = question.nextElementSibling;
        const isActive = answer.classList.contains('active');
        faqQuestions.forEach(q => q.classList.remove('active'));
        document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('active'));
        if (!isActive) {
          question.classList.add('active');
          answer.classList.add('active');
        }
      });
    });
  };

  // Contact Form Submission
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('contact-name').value;
      const email = document.getElementById('contact-email').value;
      const subject = document.getElementById('contact-subject').value;
      const message = document.getElementById('contact-message').value;
      showToast(`Message sent from ${name}`, 'success');
      contactForm.reset();
    });
  }

  // Live Chat (Placeholder)
  const startChatButton = document.getElementById('start-chat');
  if (startChatButton) {
    startChatButton.addEventListener('click', () => {
      showToast('Live chat initiated', 'success');
    });
  }

  // Initialize
  updateFaqList();
});