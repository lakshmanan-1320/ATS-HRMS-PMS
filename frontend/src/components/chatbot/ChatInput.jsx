import React, { useState, useRef } from 'react';
import { FiRefreshCw } from 'react-icons/fi';

// Exact Tilted Paper Plane Send Icon matching screenshot #2
const PaperPlaneSendIcon = ({ size = 18, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill="none" />
  </svg>
);

/**
 * ChatInput.jsx
 * Pixel-perfect replica of reference image #2:
 * Exact tilted paper plane send icon, rounded pill container, "🟢 I am here to assist you 24/7" footer.
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 90)}px`;
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          ref={textareaRef}
          className="chatbot-textarea"
          rows={1}
          placeholder="Type your message..."
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
            opacity: !text.trim() || loading ? 0.5 : 1,
            cursor: !text.trim() || loading ? 'not-allowed' : 'pointer'
          }}
          title="Send message"
        >
          {loading ? (
            <FiRefreshCw size={17} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <PaperPlaneSendIcon size={18} color="#ffffff" />
          )}
        </button>
      </form>

      <div style={styles.footerRow}>
        <span style={styles.footerDot} />
        <span style={styles.footerText}>I am here to assist you 24/7</span>
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    padding: '12px 16px 14px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #f1f5f9'
  },
  form: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f8f9fc',
    border: '1.5px solid #e8eaf0',
    borderRadius: 50,
    padding: '6px 6px 6px 16px',
    boxShadow: 'none',
    gap: 8
  },
  textarea: {
    flex: 1,
    padding: '6px 0',
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    fontSize: 13.5,
    backgroundColor: 'transparent',
    color: '#374151',
    resize: 'none',
    maxHeight: 80,
    fontFamily: 'inherit',
    lineHeight: 1.4,
    caretColor: '#5856d6'
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #5856d6 0%, #7b78f6 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(88, 86, 214, 0.3)',
    transition: 'opacity 0.2s ease'
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 9
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#34c759'
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 500
  }
};
