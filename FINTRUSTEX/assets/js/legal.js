document.addEventListener('DOMContentLoaded', () => {
  // Mock Legal Data
  const fetchMockLegalData = async () => {
    return {
      terms: [
        { title: '1. Acceptance of Terms', content: 'By using FinTrustEX, you agree to these terms and conditions.' },
        { title: '2. Account Responsibilities', content: 'You are responsible for maintaining the confidentiality of your account.' }
      ],
      privacy: [
        { title: '1. Data Collection', content: 'We collect personal information to provide our services.' },
        { title: '2. Data Security', content: 'We use industry-standard measures to protect your data.' }
      ],
      compliance: [
        'FinTrustEX complies with applicable financial regulations.',
        'Contact our compliance team for inquiries.'
      ]
    };
  };

  // Update Legal Content
  const updateLegalContent = async () => {
    try {
      const legalData = await fetchMockLegalData();
      const termsContent = document.getElementById('terms-content');
      const privacyContent = document.getElementById('privacy-content');
      const complianceContent = document.getElementById('compliance-content');

      if (termsContent) {
        termsContent.innerHTML = legalData.terms.map(term => `
          <h3 class="legal-section">${term.title}</h3>
          <p>${term.content}</p>
        `).join('');
      }

      if (privacyContent) {
        privacyContent.innerHTML = legalData.privacy.map(privacy => `
          <h3 class="legal-section">${privacy.title}</h3>
          <p>${privacy.content}</p>
        `).join('');
      }

      if (complianceContent) {
        complianceContent.innerHTML = legalData.compliance.map(item => `<p>${item}</p>`).join('');
      }

      // Initialize expandable sections
      initExpandableSections();
      AOS.init({ duration: 800 });
    } catch (error) {
      console.error('Error updating legal content:', error);
      showToast('Error loading legal content', 'error');
    }
  };

  // Expandable Sections
  const initExpandableSections = () => {
    const sectionTitles = document.querySelectorAll('.legal-section');
    sectionTitles.forEach(title => {
      title.addEventListener('click', () => {
        const content = title.nextElementSibling;
        const isActive = content.classList.contains('active');
        sectionTitles.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#terms-content p, #privacy-content p').forEach(p => p.classList.remove('active'));
        if (!isActive) {
          title.classList.add('active');
          content.classList.add('active');
        }
      });
    });
  };

  // Initialize
  updateLegalContent();
});