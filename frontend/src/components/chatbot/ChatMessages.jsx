import React, { useRef, useEffect, useState } from 'react';
import { FiCompass, FiMessageSquare, FiNavigation, FiHelpCircle, FiArrowDown } from 'react-icons/fi';
import ChatMessage from './ChatMessage.jsx';
import TypingIndicator from './TypingIndicator.jsx';

// Exact Robot Face SVG matching screenshot #1
const RobotAvatarIcon = ({ size = 20, color = '#5856d6' }) => (
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
 * ChatMessages.jsx
 * Pixel-perfect replica of reference screenshot #1:
 * Exact icons (Compass, MessageSquare, Navigation, HelpCircle), lavender welcome card, rounded chip buttons.
 */
export default function ChatMessages({
  messages,
  loading,
  onSelectPrompt,
  onRetry,
  onOpenPolicyReader
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const referencePrompts = [
    { text: 'How can you help me?', icon: FiCompass },
    { text: 'Explain this feature', icon: FiMessageSquare },
    { text: 'Help me navigate the system', icon: FiNavigation },
    { text: 'I need assistance', icon: FiHelpCircle }
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function handleScroll() {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 80);
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} style={styles.container}>
      {/* Welcome & Empty State - Exact Replica of Screenshot #1 */}
      {messages.length === 0 && (
        <div style={styles.welcomeSection}>
          <div style={styles.welcomeRow}>
            <div style={styles.robotAvatarGlow}>
              <div style={styles.robotAvatarBg}>
                <RobotAvatarIcon size={20} color="#5856d6" />
              </div>
            </div>
            <div style={styles.welcomeBubble}>
              <div style={styles.welcomeTextHi}>
                Hi! <span style={{ fontSize: 16 }}>👋</span>
              </div>
              <div style={styles.welcomeTextQuestion}>How can I help you today?</div>
            </div>
          </div>

          <div style={styles.chipsContainer}>
            {referencePrompts.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectPrompt(item.text)}
                  style={styles.chipBtn}
                  disabled={loading}
                >
                  <IconComp size={16} color="#5856d6" />
                  <span>{item.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages Thread */}
      {messages.map((msg, idx) => (
        <ChatMessage
          key={idx}
          message={msg}
          onRetry={onRetry}
          onOpenPolicyReader={onOpenPolicyReader}
        />
      ))}

      {/* Thinking State */}
      {loading && <TypingIndicator />}

      <div ref={bottomRef} />

      {/* Scroll to Bottom Button */}
      {showScrollBottom && (
        <button onClick={scrollToBottom} style={styles.scrollBtn} title="Scroll to latest">
          <FiArrowDown size={14} color="#5856d6" />
        </button>
      )}
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  welcomeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  welcomeRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10
  },
  robotAvatarGlow: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    backgroundColor: '#ebf0ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  robotAvatarBg: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(88, 86, 214, 0.15)'
  },
  welcomeBubble: {
    backgroundColor: '#f0f3ff',
    border: '1px solid #e0e7ff',
    borderRadius: '20px 20px 20px 6px',
    padding: '14px 20px',
    maxWidth: '85%'
  },
  welcomeTextHi: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1e1b4b',
    marginBottom: 3
  },
  welcomeTextQuestion: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1e1b4b'
  },
  chipsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingLeft: 52,
    marginTop: 2
  },
  chipBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f3f5ff',
    border: '1px solid #e0e7ff',
    borderRadius: 24,
    padding: '10px 18px',
    fontSize: 13.5,
    fontWeight: 600,
    color: '#4338ca',
    cursor: 'pointer',
    width: 'fit-content',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(88, 86, 214, 0.04)'
  },
  scrollBtn: {
    position: 'sticky',
    bottom: 10,
    alignSelf: 'center',
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  }
};
