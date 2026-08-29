import React from 'react';
import { FiMinus, FiX, FiTrash2 } from 'react-icons/fi';

// Sparkles / HR AI Assistant Icon
const SparkleAvatarIcon = ({ size = 20, color = '#5856d6' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14.2 8.3L20.5 10.5L14.2 12.7L12 19L9.8 12.7L3.5 10.5L9.8 8.3L12 2Z" fill={color} />
    <path d="M19 16L20.1 19.1L23.2 20.2L20.1 21.3L19 24.4L17.9 21.3L14.8 20.2L17.9 19.1L19 16Z" fill={color} opacity="0.7" />
    <path d="M5 2L5.8 4.2L8 5L5.8 5.8L5 8L4.2 5.8L2 5L4.2 4.2L5 2Z" fill={color} opacity="0.7" />
  </svg>
);

/**
 * ChatHeader.jsx
 * Professional enterprise header for Insight HR Assistant.
 */
export default function ChatHeader({ onMinimize, onClose, onClear }) {
  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <div style={styles.avatarGlow}>
          <div style={styles.avatarBg}>
            <SparkleAvatarIcon size={20} color="#5856d6" />
          </div>
        </div>
        <div>
          <div style={styles.titleRow}>
            <h3 style={styles.title}>Insight HR Assistant</h3>
            <span style={styles.sparkleTag}>AI</span>
          </div>
          <div style={styles.subtitleRow}>
            <span style={styles.statusDot} />
            <span style={styles.statusText}>Online</span>
            <span style={styles.dotDivider}>•</span>
            <span style={styles.subtitleText}>Your HR Policy Assistant</span>
          </div>
        </div>
      </div>

      <div style={styles.right}>
        {onClear && (
          <button onClick={onClear} style={styles.iconBtn} title="Clear conversation">
            <FiTrash2 size={13} color="#ffffff" />
          </button>
        )}
        <button onClick={onMinimize} style={styles.iconBtn} title="Minimize chat">
          <FiMinus size={14} color="#ffffff" />
        </button>
        <button onClick={onClose} style={styles.iconBtn} title="Close chat">
          <FiX size={14} color="#ffffff" />
        </button>
      </div>

      <style>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  header: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #7c3aed 100%)',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    boxShadow: '0 2px 10px rgba(79, 70, 229, 0.2)'
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  avatarGlow: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12)'
  },
  avatarBg: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  title: {
    margin: 0,
    fontWeight: 700,
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: '-0.2px'
  },
  sparkleTag: {
    fontSize: 10,
    fontWeight: 700,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    color: '#ffffff',
    padding: '1px 5px',
    borderRadius: 6,
    letterSpacing: '0.3px'
  },
  subtitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginTop: 2
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    boxShadow: '0 0 6px #22c55e',
    animation: 'pulseDot 2s infinite'
  },
  statusText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: 600
  },
  dotDivider: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)'
  },
  subtitleText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: 400
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  iconBtn: {
    background: 'rgba(255, 255, 255, 0.18)',
    border: 'none',
    width: 26,
    height: 26,
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    outline: 'none'
  }
};
