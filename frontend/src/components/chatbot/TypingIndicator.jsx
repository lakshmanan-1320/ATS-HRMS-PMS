import React from 'react';

// Sparkle Assistant Avatar Icon
const SparkleAvatarIcon = ({ size = 16, color = '#4f46e5' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14.2 8.3L20.5 10.5L14.2 12.7L12 19L9.8 12.7L3.5 10.5L9.8 8.3L12 2Z" fill={color} />
    <path d="M19 16L20.1 19.1L23.2 20.2L20.1 21.3L19 24.4L17.9 21.3L14.8 20.2L17.9 19.1L19 16Z" fill={color} opacity="0.7" />
  </svg>
);

/**
 * TypingIndicator.jsx
 * Displays subtle HR policy checking status with animated wave dots.
 */
export default function TypingIndicator() {
  return (
    <div style={styles.msgRow}>
      <div style={styles.avatarGlow}>
        <div style={styles.avatarBg}>
          <SparkleAvatarIcon size={16} color="#4f46e5" />
        </div>
      </div>
      <div style={styles.bubble}>
        <div style={styles.wave}>
          <span style={{ ...styles.dot, animationDelay: '0s' }} />
          <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
          <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
          <span style={styles.text}>✨ Checking your HR policies...</span>
        </div>
      </div>
      <style>{`
        @keyframes pulseWave {
          0%, 100% { transform: scale(0.8); opacity: 0.4; }
          50% { transform: scale(1.25); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  msgRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    margin: '8px 0'
  },
  avatarGlow: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#e0e7ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2
  },
  avatarBg: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.15)'
  },
  bubble: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px 16px 16px 4px',
    padding: '10px 14px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
  },
  wave: {
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    animation: 'pulseWave 1.4s infinite ease-in-out'
  },
  text: {
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    marginLeft: 6
  }
};
