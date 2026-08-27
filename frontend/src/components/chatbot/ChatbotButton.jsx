import React, { useState } from 'react';
import { FiZap } from 'react-icons/fi';

// Exact Speech Bubble SVG matching reference image #2
const FloatingChatIcon = ({ size = 26, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3C6.477 3 2 6.925 2 11.765C2 14.535 3.447 16.985 5.72 18.572C5.46 19.535 4.88 20.655 4.14 21.435C4.01 21.572 4.09 21.785 4.27 21.785C6.07 21.785 7.77 20.735 8.92 19.785C9.91 20.135 10.94 20.325 12 20.325C17.523 20.325 22 16.4 22 11.565C22 6.725 17.523 3 12 3Z" />
  </svg>
);

/**
 * ChatbotButton.jsx
 * Pixel-perfect replica of reference design image #2:
 * Exact Speech bubble chat icon floating circle button (56px x 56px), green online dot.
 */
export default function ChatbotButton({ onClick, unreadCount, isOpen }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={styles.container}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip Badge */}
      {isHovered && !isOpen && (
        <div style={styles.tooltip}>
          <FiZap size={13} color="#5856d6" />
          <span>AI Assistant</span>
        </div>
      )}

      <button
        onClick={onClick}
        style={{
          ...styles.button,
          transform: isHovered ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
          boxShadow: isHovered
            ? '0 12px 28px -4px rgba(88, 86, 214, 0.55), 0 4px 12px rgba(0,0,0,0.1)'
            : '0 8px 20px -4px rgba(88, 86, 214, 0.4)'
        }}
        aria-label="Toggle AI Assistant"
      >
        <FloatingChatIcon size={26} color="#ffffff" />
        <span style={styles.statusPulse} />

        {/* Unread Count Badge */}
        {unreadCount > 0 && !isOpen && (
          <span style={styles.unreadBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      <style>{`
        @keyframes pulseOnline {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.18); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 28,
    right: 28,
    zIndex: 9990,
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  tooltip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 10,
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.1)',
    whiteSpace: 'nowrap',
    animation: 'fadeIn 0.2s ease-in-out'
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #5856d6 0%, #7b78f6 100%)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  statusPulse: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#34c759',
    border: '2px solid #ffffff',
    boxShadow: '0 0 8px #34c759',
    animation: 'pulseOnline 2.5s infinite ease-in-out'
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: 10,
    border: '2px solid #ffffff',
    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
  }
};
