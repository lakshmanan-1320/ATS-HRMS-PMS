import React from 'react';
import { FiMinus, FiX } from 'react-icons/fi';

// Exact Robot Face SVG matching reference image #2
const RobotAvatarIcon = ({ size = 22, color = '#5856d6' }) => (
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
 * ChatHeader.jsx
 * Pixel-perfect replica of reference image #2:
 * Soft periwinkle gradient, white robot avatar in glow ring, AI Assistant title, 🟢 Online, circular minimize & close.
 */
export default function ChatHeader({ onMinimize, onClose }) {
  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <div style={styles.avatarGlow}>
          <div style={styles.avatarBg}>
            <RobotAvatarIcon size={22} color="#5856d6" />
          </div>
        </div>
        <div>
          <h3 style={styles.title}>AI Assistant</h3>
          <div style={styles.statusRow}>
            <span style={styles.statusDot} />
            <span style={styles.statusText}>Online</span>
          </div>
        </div>
      </div>

      <div style={styles.right}>
        <button onClick={onMinimize} style={styles.iconBtn} title="Minimize chat">
          <FiMinus size={15} color="#ffffff" />
        </button>
        <button onClick={onClose} style={styles.iconBtn} title="Close chat">
          <FiX size={15} color="#ffffff" />
        </button>
      </div>

      <style>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  header: {
    background: 'linear-gradient(135deg, #5856d6 0%, #7b78f6 100%)',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  avatarGlow: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)'
  },
  avatarBg: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    margin: 0,
    fontWeight: 700,
    fontSize: 16.5,
    color: '#ffffff',
    letterSpacing: '-0.2px'
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 2
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: '#34c759',
    boxShadow: '0 0 6px #34c759',
    animation: 'pulseDot 2s infinite'
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: 500
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  iconBtn: {
    background: 'rgba(255, 255, 255, 0.22)',
    border: 'none',
    width: 28,
    height: 28,
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s'
  }
};
