import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatbot } from '../../context/ChatbotContext.jsx';
import { FiCopy, FiCheck, FiThumbsUp, FiShield, FiExternalLink, FiBookOpen, FiRefreshCw, FiUser, FiFileText } from 'react-icons/fi';

// Exact Robot Face SVG matching reference image #2
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

/**
 * ChatMessage.jsx
 * Light lavender (#f0f3ff) & Indigo message bubbles matching reference design image #2.
 */
export default function ChatMessage({ message, onRetry, onOpenPolicyReader }) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const navigate = useNavigate();
  const { allPolicies } = useChatbot();

  const isUser = message.sender === 'user';

  function handleCopy() {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleCitationClick = (policyTitle, sectionRef) => {
    let policyId = null;
    const cleanTitle = (policyTitle || '').trim().toLowerCase();

    console.log('[ChatbotClick] Clicked citation:', { policyTitle: cleanTitle, sectionRef });
    console.log('[ChatbotClick] Message sources:', message.sources);
    console.log('[ChatbotClick] Context allPolicies:', allPolicies);

    // 1. Resolve from message sources first
    if (message.sources && message.sources.length > 0) {
      const match = message.sources.find(s => {
        const sTitle = (s.policyTitle || '').trim().toLowerCase();
        const sKey = (s.policyKey || '').trim().toLowerCase();
        return sTitle === cleanTitle || sKey === cleanTitle;
      });
      if (match) {
        policyId = match.policyId;
        console.log('[ChatbotClick] Resolved policy ID from message sources:', policyId);
      }
    }

    // 2. Fallback to global policies list
    if (!policyId && allPolicies && allPolicies.length > 0) {
      const match = allPolicies.find(p => {
        const pTitle = (p.title || '').trim().toLowerCase();
        const pKey = (p.policy_key || '').trim().toLowerCase();
        return pTitle === cleanTitle || pKey === cleanTitle;
      });
      if (match) {
        policyId = match.policy_id;
        console.log('[ChatbotClick] Resolved policy ID from global policies fallback:', policyId);
      }
    }

    if (policyId) {
      const targetUrl = `/employee/policies/${policyId}?section=${encodeURIComponent(sectionRef)}`;
      console.log('[ChatbotClick] Navigating to URL:', targetUrl);
      navigate(targetUrl);
    } else {
      console.warn(`[Chatbot] Could not resolve policy ID for citation: "${policyTitle}"`);
    }
  };

  function renderFormattedText(text) {
    if (!text) return null;

    // Strip any raw 📄 placeholders from the text to prevent them from showing
    const cleanText = text.replace(/📄/g, '').trim();

    // Split text by premium citations pattern: [Policy Title · Section Ref — Section Title]
    const citationRegex = /(\[[^\]]+?\s*·\s*[^·\]]+?\s*—\s*[^\]]+?\])/gi;
    const parts = cleanText.split(citationRegex);

    return parts.map((part, index) => {
      if (part.match(citationRegex)) {
        // Parse title, section, and clean heading
        const match = part.match(/\[([^\]]+?)\s*·\s*([^·\]]+?)\s*—\s*([^\]]+?)\]/i);
        if (match) {
          const policyTitle = match[1].trim();
          const sectionRef = match[2].trim();
          const sectionTitle = match[3].trim();
          return (
            <div
              key={index}
              onClick={() => handleCitationClick(policyTitle, sectionRef)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.borderColor = '#4f46e5';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(88, 86, 214, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = 'none';
              }}
              style={styles.citationCard}
              title={`View ${policyTitle} ${sectionRef}`}
            >
              <FiFileText size={13} style={{ color: '#4f46e5', flexShrink: 0 }} />
              <div style={styles.citationText}>
                <span style={styles.citationSection}>{sectionRef}</span>
                <span style={styles.citationDivider}>—</span>
                <span style={styles.citationTitle}>{sectionTitle}</span>
              </div>
            </div>
          );
        }
      }

      // Parse bold text for non-citation parts
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return boldParts.map((subPart, subIndex) => {
        if (subPart.startsWith('**') && subPart.endsWith('**')) {
          return <strong key={`${index}-${subIndex}`}>{subPart.slice(2, -2)}</strong>;
        }
        return subPart;
      });
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

        {/* Footer Meta & Actions */}
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
  citationCard: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '8px 14px',
    fontSize: 12.5,
    fontWeight: 600,
    color: '#4f46e5',
    cursor: 'pointer',
    marginTop: 6,
    marginBottom: 6,
    transition: 'all 0.2s ease',
    userSelect: 'none',
    width: 'fit-content',
    maxWidth: '100%',
    boxSizing: 'border-box'
  },
  citationText: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap'
  },
  citationSection: {
    color: '#4f46e5',
    fontWeight: 750
  },
  citationDivider: {
    color: '#94a3b8'
  },
  citationTitle: {
    color: '#334155',
    fontWeight: 600
  },
  citationsContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTop: '1px solid #e0e7ff'
  },
  citationsHeader: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  citationsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5
  },
  citationBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    border: '1px solid #e0e7ff',
    borderRadius: 6,
    padding: '2px 7px',
    fontSize: 10.5,
    fontWeight: 600,
    color: '#4338ca',
    cursor: 'pointer'
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
