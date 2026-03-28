import React, { useEffect, useRef, useState } from 'react';
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
  const bodyScrollLockRef = useRef(null);
  const streamAbortRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollRafRef = useRef(null);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi! I can help you understand these results. What would you like to know?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);

  const aiBase = import.meta.env.VITE_AI_LAYER_URL;
  const toggleChat = () => setIsOpen((v) => !v);

  const appendMessage = (msg) => setMessages((prev) => [...prev, msg]);

  useEffect(() => {
    if (!isOpen) return;

    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    });

    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    bodyScrollLockRef.current = {
      scrollY,
      style: {
        overflow: body.style.overflow,
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
      },
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    return () => {
      const saved = bodyScrollLockRef.current;
      if (!saved) return;

      body.style.overflow = saved.style.overflow;
      body.style.position = saved.style.position;
      body.style.top = saved.style.top;
      body.style.left = saved.style.left;
      body.style.right = saved.style.right;
      body.style.width = saved.style.width;

      window.scrollTo(0, saved.scrollY);
      bodyScrollLockRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
        streamAbortRef.current = null;
      }
    };
  }, []);

  const updateLastAiMessage = (updater) => {
    setMessages((prev) => {
      const next = [...prev];
      const idx = (() => {
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (next[i]?.role === 'ai' && next[i]?.streaming) return i;
        }
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (next[i]?.role === 'ai') return i;
        }
        return -1;
      })();

      if (idx >= 0) {
        const current = next[idx];
        const patch = typeof updater === 'function' ? updater(current) : updater;
        next[idx] = { ...current, ...patch };
      }
      return next;
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const question = inputValue.trim();
    if (!question) return;

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
    appendMessage({ role: 'ai', content: '', streaming: true });

    try {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }
      const abortController = new AbortController();
      streamAbortRef.current = abortController;

      const res = await fetch(`${aiBase}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, ranking_response: rankResponse }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || 'AI chat request failed.');
      }

      const reader = res.body?.getReader?.();
      if (!reader) {
        throw new Error('AI chat stream is not available in this environment.');
      }

      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        updateLastAiMessage({ content: result });
      }

      result += decoder.decode();
      updateLastAiMessage({ content: result, streaming: false });
    } catch (err) {
      const message = err?.name === 'AbortError'
        ? 'Request cancelled.'
        : (err.message || 'Unable to reach the AI service right now.');
      updateLastAiMessage({ content: message, streaming: false });
    } finally {
      setIsSending(false);
      if (streamAbortRef.current) {
        streamAbortRef.current = null;
      }
    }
  };

  const quickActions = ['Best rates', 'Compare options', 'Tax info'];
  const handleQuickAction = (action) => setInputValue(action);

  return (
    <>
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

      {isOpen && (
        <>
          <div className="ai-chat-overlay" role="presentation" onClick={toggleChat} />
          <div className="ai-chat-window" role="dialog" aria-modal="true" aria-label="SmartCD.ai Assistant chat">
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
                    {msg.streaming && !msg.content ? (
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
              <div ref={messagesEndRef} />
            </div>

            <div className="ai-chat-quick-actions">
              {quickActions.map((action) => (
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
        </>
      )}
    </>
  );
}
