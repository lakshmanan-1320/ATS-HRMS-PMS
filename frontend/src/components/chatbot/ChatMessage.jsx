import React, { useState } from 'react';
import { FiCopy, FiCheck, FiThumbsUp, FiFileText, FiRefreshCw, FiUser, FiDatabase } from 'react-icons/fi';

const RobotAvatarIcon = ({ size = 18, color = '#5856d6' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2V5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="2" r="1.5" fill={color} />
    <rect x="4" y="5" width="16" height="14" rx="5" stroke={color} strokeWidth="2" fill="none" />
    <rect x="7.5" y="9.5" width="3" height="3" rx="1" fill={color} />
    <rect x="13.5" y="9.5" width="3" height="3" rx="1" fill={color} />
    <path d="M9.5 15H14.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <rect x="2" y="10" width="2" height="4" rx="1" fill={color} />
    <rect x="20" y="10" width="2" height="4" rx="1" fill={color} />
  </svg>
);

function getSourceLabel(source) {
  if (source.sourceType === 'EMPLOYEE_DATA') {
    return source.label || 'Live HRMS record';
  }

  return source.policy_title || source.policyTitle || source.policy_key || source.policyKey || 'Policy source';
}

export default function ChatMessage({ message, onRetry }) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);

  const isUser = message.sender === 'user';
  const sources = (message.sources || []).filter(Boolean);

  function handleCopy() {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function renderFormattedText(text) {
    if (!text) return null;

    const cleanText = text
      .replace(/\[DOCUMENT\s+\d+:[^\]]*\]/gi, '')
      .replace(/\[POL-[A-Z0-9-]+\s*(?:\|\s*[^\]]*)?\]/gi, '')
      .trim();

    const parts = cleanText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }

  return (
    <div
      style={{
        ...styles.row,
        justifyContent: isUser ? 'flex-end' : 'flex-start'
      }}
    >
      {!isUser && (
        <div style={styles.robotAvatarGlow}>
          <div style={styles.robotAvatarBg}>
            <RobotAvatarIcon size={18} color="#5856d6" />
          </div>
        </div>
      )}

      <div
        style={{
          ...styles.bubble,
          ...(isUser ? styles.userBubble : styles.aiBubble),
          ...(message.isError ? styles.errorBubble : {})
        }}
      >
        <div style={styles.text}>{renderFormattedText(message.text)}</div>

        {!isUser && !message.isError && sources.length > 0 && (
          <div style={styles.sources}>
            {sources.slice(0, 4).map((source, idx) => {
              const isEmployeeSource = source.sourceType === 'EMPLOYEE_DATA';
              const IconComp = isEmployeeSource ? FiDatabase : FiFileText;
              return (
                <span key={idx} style={styles.sourceBadge}>
                  <IconComp size={11} />
                  {getSourceLabel(source)}
                </span>
              );
            })}
          </div>
        )}

        <div style={styles.footer}>
          <span style={styles.time}>{message.timestamp}</span>

          {!isUser && !message.isError && (
            <div style={styles.actions}>
              <button onClick={handleCopy} style={styles.actionBtn} title="Copy">
                {copied ? <FiCheck size={12} color="#16a34a" /> : <FiCopy size={12} />}
              </button>
              <button
                onClick={() => setLiked(!liked)}
                style={{ ...styles.actionBtn, color: liked ? '#5856d6' : '#94a3b8' }}
                title="Helpful"
              >
                <FiThumbsUp size={12} />
              </button>
            </div>
          )}

          {message.isError && onRetry && (
            <button onClick={onRetry} style={styles.retryBtn}>
              <FiRefreshCw size={11} /> Try Again
            </button>
          )}
        </div>
      </div>

      {isUser && (
        <div style={styles.userAvatarBg}>
          <FiUser size={16} color="#ffffff" />
        </div>
      )}
    </div>
  );
}

const styles = {
  row: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    margin: '6px 0'
  },
  robotAvatarGlow: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: '#ebf0ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  robotAvatarBg: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(88, 86, 214, 0.15)'
  },
  userAvatarBg: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #5856d6 0%, #7b78f6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  bubble: {
    maxWidth: '82%',
    padding: '13px 18px',
    borderRadius: 18,
    fontSize: 13.5,
    lineHeight: 1.55
  },
  aiBubble: {
    backgroundColor: '#f0f3ff',
    color: '#1e1b4b',
    border: '1px solid #e0e7ff',
    borderTopLeftRadius: 4
  },
  userBubble: {
    background: 'linear-gradient(135deg, #5856d6 0%, #7b78f6 100%)',
    color: '#ffffff',
    borderTopRightRadius: 4,
    boxShadow: '0 4px 12px rgba(88, 86, 214, 0.25)'
  },
  errorBubble: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  },
  text: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  sources: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 10,
    paddingTop: 8,
    borderTop: '1px solid #e0e7ff'
  },
  sourceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    border: '1px solid #e0e7ff',
    borderRadius: 6,
    padding: '2px 7px',
    fontSize: 10.5,
    fontWeight: 600,
    color: '#4338ca'
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    fontSize: 10.5,
    color: '#94a3b8'
  },
  time: {
    fontSize: 10.5
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center'
  },
  retryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer'
  }
};
