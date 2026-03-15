import React, { useState } from 'react';
import './AIAssistant.css';

const SparkleIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 0L9.44444 6.55556L16 8L9.44444 9.44444L8 16L6.55556 9.44444L0 8L6.55556 6.55556L8 0Z" fill="currentColor" />
  </svg>
);

const SendIcon = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const CloseIcon = ({ className, onClick }) => (
  <svg className={className} onClick={onClick} style={{ cursor: 'pointer' }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi! I can help you find the best CD rates and calculate your after-tax yield based on your location. What would you like to know?' }
  ]);
  const [inputValue, setInputValue] = useState('');

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
    setInputValue('');
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: "That's a great question! However, right now I'm just a demo. In the full version, I can give you personalized CD strategy advice." }]);
    }, 1000);
  };

  const quickActions = ['Best rates', 'Compare options', 'Tax info'];

  const handleQuickAction = (action) => {
    setInputValue(action);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button className="ai-fab" onClick={toggleChat}>
          <div className="ai-fab-icon-wrapper">
             <SparkleIcon className="ai-fab-icon" />
          </div>
          <div className="ai-fab-text">
            <span className="ai-fab-title">AI Assistant</span>
            <span className="ai-fab-subtitle">Ask me anything</span>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <h3>SmartCD.ai Assistant</h3>
              <p>Always here to help</p>
            </div>
            <CloseIcon className="ai-chat-close" onClick={toggleChat} />
          </div>
          
          <div className="ai-chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`ai-message-row ${msg.role}`}>
                {msg.role === 'ai' && (
                  <div className="ai-avatar">
                   <SparkleIcon className="ai-avatar-icon" />
                  </div>
                )}
                <div className={`ai-message-bubble ${msg.role}`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          
          <div className="ai-chat-quick-actions">
            {quickActions.map(action => (
              <button 
                key={action} 
                className="ai-quick-action-btn"
                onClick={() => handleQuickAction(action)}
              >
                {action}
              </button>
            ))}
          </div>

          <form className="ai-chat-input-area" onSubmit={handleSend}>
            <input 
              type="text" 
              className="ai-chat-input" 
              placeholder="Ask about CD rates..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit" className="ai-chat-send-btn">
              <SendIcon className="ai-send-icon" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
