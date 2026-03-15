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

export default function AIAssistant({ rankResponse }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi! I can help you find the best CD rates and calculate your after-tax yield based on your location. What would you like to know?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);

  const toggleChat = () => setIsOpen(!isOpen);

  const aiBase = import.meta.env.VITE_AI_LAYER_URL;

  const appendMessage = (msg) => setMessages(prev => [...prev, msg]);

  const explainTop3 = async () => {
    if (!aiBase) {
      appendMessage({ role: 'ai', content: 'AI is not configured. Set VITE_AI_LAYER_URL to enable the real chatbot.' });
      return;
    }
    if (!rankResponse) {
      appendMessage({ role: 'ai', content: 'Run a search first so I can explain the ranked results.' });
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${aiBase}/explain-top-3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranking_response: rankResponse }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || 'AI explanation request failed.');
      }

      const payload = await res.json();
      const products = Array.isArray(payload?.products) ? payload.products : [];

      if (!products.length) {
        appendMessage({ role: 'ai', content: 'I could not generate explanations for the top results right now.' });
        return;
      }

      const lines = products.slice(0, 3).map((p) => {
        const title = p?.title || `Rank #${p?.rank_overall ?? ''}`;
        const why = p?.why_this_fits || '';
        const highlights = Array.isArray(p?.highlights) && p.highlights.length
          ? `\n• ${p.highlights.slice(0, 3).join('\n• ')}`
          : '';
        return `${title}\n${why}${highlights}`.trim();
      });

      appendMessage({ role: 'ai', content: lines.join('\n\n') });
    } catch (err) {
      appendMessage({ role: 'ai', content: err.message || 'Unable to reach the AI service right now.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const question = inputValue.trim();
    appendMessage({ role: 'user', content: question });
    setInputValue('');

    if (!aiBase) {
      appendMessage({ role: 'ai', content: 'AI is not configured. Set VITE_AI_LAYER_URL to enable the real chatbot.' });
      return;
    }

    if (!rankResponse) {
      appendMessage({ role: 'ai', content: 'Run a search first so I can answer questions about your ranked products.' });
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${aiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, ranking_response: rankResponse }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || 'AI chat request failed.');
      }

      const payload = await res.json();
      appendMessage({ role: 'ai', content: payload?.response || 'No response returned from AI service.' });
    } catch (err) {
      appendMessage({ role: 'ai', content: err.message || 'Unable to reach the AI service right now.' });
    } finally {
      setIsSending(false);
    }
  };

  const quickActions = ['Explain top 3', 'Best rates', 'Compare options', 'Tax info'];

  const handleQuickAction = (action) => {
    if (action === 'Explain top 3') {
      explainTop3();
      return;
    }
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
              disabled={isSending}
            />
            <button type="submit" className="ai-chat-send-btn" disabled={isSending}>
              <SendIcon className="ai-send-icon" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
