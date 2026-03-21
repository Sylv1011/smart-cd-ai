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
  <svg className={`${className || ''} cursor-pointer`} onClick={onClick} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  const removeTypingMessage = () =>
    setMessages((prev) => (prev.length && prev[prev.length - 1]?.typing ? prev.slice(0, -1) : prev));

  const isExplainTop3Command = (text) => {
    const q = (text || '').trim().toLowerCase();
    if (!q) return false;
    return (
      q === 'explain top 3' ||
      q === 'explain top three' ||
      q.startsWith('explain top 3') ||
      q.startsWith('explain top three')
    );
  };

  const buildSlimRankingResponse = (full) => {
    if (!full || typeof full !== 'object') return null;

    const pickOffer = (o, { keepRank } = { keepRank: false }) => {
      if (!o || typeof o !== 'object') return null;

      const productType = o.product_type;
      const institutionName = o.institution_name || o.issuing_bank || null;
      const brokerageFirm = o.brokerage_firm || null;

      const slim = {
        ...(keepRank && o.rank_overall != null ? { rank_overall: o.rank_overall } : {}),
        product_type: productType,
        institution_name: institutionName,
        brokerage_firm: brokerageFirm,
        term_months: o.term_months,
        apy_nominal: o.apy_nominal,
        after_tax_apy: o.after_tax_apy,
        after_tax_interest_usd: o.after_tax_interest_usd,
        minimum_deposit: o.minimum_deposit,
      };

      // FDIC insured is only useful for non-treasury products; omit nulls.
      if (productType !== 'treasury' && o.fdic_insured != null) {
        slim.fdic_insured = o.fdic_insured;
      }

      return slim;
    };

    const mapList = (arr, opts) => (Array.isArray(arr) ? arr.map(o => pickOffer(o, opts)).filter(Boolean) : []);

    return {
      overall_top: mapList(full.overall_top, { keepRank: true }),
      bank_cds: mapList(full.bank_cds),
      brokered_cds: mapList(full.brokered_cds),
      treasuries: mapList(full.treasuries),
    };
  };

  const explainTop3 = async () => {
    if (!aiBase) {
      appendMessage({ role: 'ai', content: 'AI is not configured. Set VITE_AI_LAYER_URL to enable the real chatbot.' });
      return;
    }
    if (!rankResponse) {
      appendMessage({ role: 'ai', content: 'Run a search first so I can explain the ranked results.' });
      return;
    }

    const slim = buildSlimRankingResponse(rankResponse);

    setIsSending(true);
    try {
      const res = await fetch(`${aiBase}/explain-top-3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranking_response: slim || rankResponse }),
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
    appendMessage({ role: 'ai', content: '...', typing: true });
    try {
      if (isExplainTop3Command(question)) {
        const slim = buildSlimRankingResponse(rankResponse);

        const res = await fetch(`${aiBase}/explain-top-3`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ranking_response: slim || rankResponse }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.detail || 'AI explanation request failed.');
        }

        const payload = await res.json();
        const products = Array.isArray(payload?.products) ? payload.products : [];

        let text = 'I could not generate explanations for the top results right now.';
        if (products.length) {
          const lines = products.slice(0, 3).map((p) => {
            const title = p?.title || `Rank #${p?.rank_overall ?? ''}`;
            const why = p?.why_this_fits || '';
            const highlights = Array.isArray(p?.highlights) && p.highlights.length
              ? `\nâ€¢ ${p.highlights.slice(0, 3).join('\nâ€¢ ')}`
              : '';
            return `${title}\n${why}${highlights}`.trim();
          });
          text = lines.join('\n\n');
        }

        removeTypingMessage();
        appendMessage({ role: 'ai', content: text });
        return;
      }

      const slim = buildSlimRankingResponse(rankResponse);
      const res = await fetch(`${aiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, ranking_response: slim || rankResponse }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || 'AI chat request failed.');
      }

      const payload = await res.json();
      removeTypingMessage();
      appendMessage({ role: 'ai', content: payload?.response || 'No response returned from AI service.' });
    } catch (err) {
      removeTypingMessage();
      appendMessage({ role: 'ai', content: err.message || 'Unable to reach the AI service right now.' });
    } finally {
      setIsSending(false);
    }
  };

  const quickActions = ['Explain top 3', 'Best rates', 'Compare options', 'Tax info'];

  const handleQuickAction = (action) => {
    setInputValue(action);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button type="button" className="ai-fab" aria-label="Open AI assistant chat" onClick={toggleChat}>
          <div className="ai-fab-icon-wrapper flex items-center justify-center">
             <SparkleIcon className="ai-fab-icon" />
          </div>
          <div className="ai-fab-text flex flex-col items-start">
            <span className="ai-fab-title font-bold text-[0.95rem] leading-[1.2]">AI Assistant</span>
            <span className="ai-fab-subtitle font-medium text-xs opacity-90">Ask me anything</span>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <h3 className="m-0 text-[1.1rem] font-bold">SmartCD.ai Assistant</h3>
              <p className="m-0 mt-1 text-[0.85rem] opacity-90">Always here to help</p>
            </div>
            <button type="button" className="ai-chat-close-btn" aria-label="Close AI assistant chat" onClick={toggleChat}>
              <CloseIcon className="ai-chat-close" />
            </button>
          </div>
          
          <div className="ai-chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`ai-message-row ${msg.role}`}>
                {msg.role === 'ai' && (
                  <div className="ai-avatar">
                   <SparkleIcon className="ai-avatar-icon w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`ai-message-bubble ${msg.role}`}>
                  {msg.typing ? (
                    <span className="ai-typing-dots" aria-label="Thinking">
                      <span />
                      <span />
                      <span />
                    </span>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="ai-chat-quick-actions">
            {quickActions.map(action => (
              <button 
                type="button"
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
              className="ai-chat-input placeholder:text-[#6B7280]" 
              placeholder="Ask about CD rates..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isSending}
            />
            <button type="submit" className="ai-chat-send-btn" aria-label="Send message" disabled={isSending}>
              <SendIcon className="ai-send-icon" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
