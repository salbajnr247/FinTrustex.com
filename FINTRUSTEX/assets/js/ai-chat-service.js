/**
 * AI Chat Service for FinTrustEX
 * Provides a chatbot interface using OpenAI's API when available,
 * otherwise falls back to pre-defined responses
 */

class AIChatService {
  constructor() {
    this.initialized = false;
    this.hasApiKey = false;
    this.conversationHistory = [];
    this.fallbackResponses = [
      "I'm here to help! For detailed account queries, please contact an admin.",
      "That's a great question about cryptocurrency trading. Generally, it's important to do your own research and understand the risks involved.",
      "You can manage your account settings in the Settings page, accessible from the sidebar.",
      "To deposit funds, go to your Wallet page and select the cryptocurrency you want to deposit.",
      "Security is our top priority. Make sure to enable 2FA in your account settings for additional protection.",
      "Market prices are updated in real-time on the trading page. You can set price alerts for specific cryptocurrencies.",
      "Our fees are competitive in the market. You can view the complete fee structure in the documentation section.",
      "If you're experiencing technical difficulties, please try clearing your browser cache or using a different browser."
    ];
    
    this.init();
  }
  
  /**
   * Initialize the AI chat service
   */
  init() {
    // Check if OpenAI API key is available
    this.checkForApiKey();
    
    // Register event listeners
    document.addEventListener('DOMContentLoaded', () => {
      this.setupEventListeners();
      this.loadConversationHistory();
    });
    
    this.initialized = true;
  }
  
  /**
   * Check if OpenAI API key is available
   */
  async checkForApiKey() {
    try {
      // Make a call to the backend to check if API key is configured
      const response = await fetch('/api/ai/status');
      const data = await response.json();
      this.hasApiKey = data.hasApiKey;
      
      // Update the UI to reflect API status
      this.updateApiStatus();
    } catch (error) {
      console.log('AI service status check failed, using fallback responses');
      this.hasApiKey = false;
    }
  }
  
  /**
   * Update the UI to reflect API status
   */
  updateApiStatus() {
    const statusElement = document.getElementById('ai-chat-status');
    if (statusElement) {
      const statusText = statusElement.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = this.hasApiKey 
          ? 'AI Assistant is online and ready' 
          : 'AI Assistant is using basic responses';
      }
    }
    
    const disclaimerElement = document.querySelector('.ai-chat-disclaimer');
    if (disclaimerElement) {
      const disclaimerText = disclaimerElement.querySelector('p');
      if (disclaimerText) {
        disclaimerText.innerHTML = this.hasApiKey
          ? '<i class="fas fa-info-circle"></i> The AI assistant is powered by OpenAI. For account-specific issues, please use the admin chat or contact form.'
          : '<i class="fas fa-info-circle"></i> The AI assistant is currently using basic responses. For detailed assistance, please use the admin chat or contact form.';
      }
    }
  }
  
  /**
   * Set up event listeners for the chat interface
   */
  setupEventListeners() {
    const aiChatInput = document.getElementById('ai-chat-input');
    const aiChatSend = document.getElementById('ai-chat-send');
    
    if (aiChatSend && aiChatInput) {
      aiChatSend.addEventListener('click', () => {
        this.sendMessage(aiChatInput.value);
        aiChatInput.value = '';
      });
      
      aiChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          aiChatSend.click();
        }
      });
    }
  }
  
  /**
   * Send a message to the AI
   * @param {string} message - The message to send
   */
  async sendMessage(message) {
    message = message.trim();
    if (!message) return;
    
    // Get the messages container
    const messagesContainer = document.getElementById('ai-chat-messages');
    if (!messagesContainer) return;
    
    // Add user message to UI
    this.addMessageToUI(messagesContainer, message, 'sent');
    
    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: message });
    
    try {
      let response;
      
      if (this.hasApiKey) {
        // Make API call to OpenAI through backend
        response = await this.getAIResponse(message);
      } else {
        // Use fallback response
        response = this.getFallbackResponse(message);
        // Add artificial delay to simulate processing
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Add AI response to UI
      this.addMessageToUI(messagesContainer, response, 'received', './assets/images/ai-avatar.svg');
      
      // Add to conversation history
      this.conversationHistory.push({ role: 'assistant', content: response });
      
      // Save conversation history
      this.saveConversationHistory();
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Show error message
      this.addMessageToUI(messagesContainer, 'Sorry, I encountered an error processing your request. Please try again later.', 'received', './assets/images/ai-avatar.svg');
    }
  }
  
  /**
   * Get a response from the OpenAI API
   * @param {string} message - The user's message
   * @returns {Promise<string>} The AI response
   */
  async getAIResponse(message) {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: this.conversationHistory.slice(-10) // Send last 10 messages for context
        })
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error calling AI API:', error);
      return this.getFallbackResponse(message);
    }
  }
  
  /**
   * Get a fallback response when OpenAI API is not available
   * @param {string} message - The user's message
   * @returns {string} A fallback response
   */
  getFallbackResponse(message) {
    // Simple keyword matching for basic responses
    message = message.toLowerCase();
    
    if (message.includes('deposit') || message.includes('fund')) {
      return "To deposit funds, navigate to the Wallet section and click on Deposit. Select your preferred cryptocurrency and follow the instructions to generate a deposit address.";
    } else if (message.includes('withdraw')) {
      return "To withdraw funds, go to the Wallet section, select the cryptocurrency you want to withdraw, enter the destination address and amount, then confirm the transaction.";
    } else if (message.includes('fee') || message.includes('fees')) {
      return "FinTrustEX offers competitive trading fees starting at 0.1% for makers and 0.2% for takers. VIP users enjoy reduced fees based on trading volume.";
    } else if (message.includes('2fa') || message.includes('security') || message.includes('secure')) {
      return "Security is our top priority. We recommend enabling Two-Factor Authentication (2FA) in your account settings for additional protection. This adds an extra layer of security beyond just your password.";
    } else if (message.includes('trade') || message.includes('trading')) {
      return "To start trading, navigate to the Trading section from the sidebar. Select your preferred trading pair, enter the amount and price (for limit orders), and click Buy or Sell to execute your trade.";
    } else if (message.includes('api') || message.includes('api key')) {
      return "API access is available for advanced users. You can manage your API keys in the Settings page under the Security tab. Please remember to keep your API keys secure and never share them with others.";
    } else if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return "Hello! I'm the FinTrustEX AI assistant. How can I help you today with your cryptocurrency trading needs?";
    } else if (message.includes('thank')) {
      return "You're welcome! If you have any other questions, feel free to ask. I'm here to help!";
    }
    
    // Return a random fallback response if no keyword matches
    return this.fallbackResponses[Math.floor(Math.random() * this.fallbackResponses.length)];
  }
  
  /**
   * Add a message to the UI
   * @param {HTMLElement} container - The messages container
   * @param {string} message - The message text
   * @param {string} type - The message type ('sent' or 'received')
   * @param {string} avatar - The avatar image URL (for received messages)
   */
  addMessageToUI(container, message, type, avatar = '') {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', type);
    
    let content = '';
    if (type === 'received') {
      content += `<div class="message-avatar"><img src="${avatar}" alt="AI"></div>`;
    }
    
    content += `
      <div class="message-content">
        <p>${message}</p>
        <span class="message-time">${timeString}</span>
      </div>
    `;
    
    messageDiv.innerHTML = content;
    container.appendChild(messageDiv);
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }
  
  /**
   * Save conversation history to localStorage
   */
  saveConversationHistory() {
    try {
      // Only keep the last 50 messages to prevent localStorage overload
      const limitedHistory = this.conversationHistory.slice(-50);
      localStorage.setItem('fintrustex_ai_chat_history', JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
  }
  
  /**
   * Load conversation history from localStorage
   */
  loadConversationHistory() {
    try {
      const savedHistory = localStorage.getItem('fintrustex_ai_chat_history');
      this.conversationHistory = savedHistory ? JSON.parse(savedHistory) : [];
      
      // Render previous messages in UI
      const messagesContainer = document.getElementById('ai-chat-messages');
      if (messagesContainer && this.conversationHistory.length > 0) {
        // Only show the last 10 messages when loading
        const recentMessages = this.conversationHistory.slice(-10);
        
        // Clear the default welcome message
        messagesContainer.innerHTML = '';
        
        // Add messages to UI
        recentMessages.forEach(msg => {
          if (msg.role === 'user') {
            this.addMessageToUI(messagesContainer, msg.content, 'sent');
          } else if (msg.role === 'assistant') {
            this.addMessageToUI(messagesContainer, msg.content, 'received', './assets/images/ai-avatar.svg');
          }
        });
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      this.conversationHistory = [];
    }
  }
  
  /**
   * Clear the conversation history
   */
  clearConversationHistory() {
    this.conversationHistory = [];
    localStorage.removeItem('fintrustex_ai_chat_history');
    
    // Clear UI
    const messagesContainer = document.getElementById('ai-chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
      
      // Add welcome message
      this.addMessageToUI(
        messagesContainer,
        "Hello! I'm FinTrustEX's AI assistant. I can help with basic questions about trading, account management, and platform features. What can I assist you with today?",
        'received',
        './assets/images/ai-avatar.svg'
      );
    }
  }
}

// Create a global AI chat service instance
window.aiChatService = new AIChatService();