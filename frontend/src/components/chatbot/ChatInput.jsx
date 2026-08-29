import React, { useState, useRef } from 'react';
import { FiRefreshCw } from 'react-icons/fi';

// Send Arrow Icon
const SendArrowIcon = ({ size = 16, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill={color} />
  </svg>
);

/**
 * ChatInput.jsx
 * Professional input bar with auto-resizing textarea, keyboard handling, and send action.
 */
export default function ChatInput({ onSendMessage, loading }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  function handleSubmit(e) {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    onSendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleChange(e) {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          ref={textareaRef}
          className="chatbot-textarea"
          rows={1}
          placeholder="Ask about an HR policy..."
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={styles.textarea}
        />
        <button
          type="submit"
          disabled={!text.trim() || loading}
          style={{
            ...styles.sendBtn,
            opacity: !text.trim() || loading ? 0.45 : 1,
            cursor: !text.trim() || loading ? 'not-allowed' : 'pointer'
          }}
          title="Send question"
        >
          {loading ? (
            <FiRefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <SendArrowIcon size={15} color="#ffffff" />
          )}
        </button>
      </form>

      <div style={styles.footerRow}>
        <span style={styles.footerDot} />
        <span style={styles.footerText}>Powered by internal verified HR policies</span>
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .chatbot-textarea::placeholder {
          color: #94a3b8;
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    padding: '10px 14px 12px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    flexShrink: 0
  },
  form: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: 24,
    padding: '4px 6px 4px 14px',
    boxShadow: 'none',
    gap: 8,
    transition: 'border-color 0.2s'
  },
  textarea: {
    flex: 1,
    padding: '6px 0',
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    fontSize: 13,
    backgroundColor: 'transparent',
    color: '#1e293b',
    resize: 'none',
    maxHeight: 80,
    fontFamily: 'inherit',
    lineHeight: 1.4,
    caretColor: '#4f46e5'
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 6
  },
  footerDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    backgroundColor: '#22c55e'
  },
  footerText: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: 500
  }
};
