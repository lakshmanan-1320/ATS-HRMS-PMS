import React from 'react';
import { FiCpu } from 'react-icons/fi';

/**
 * TypingIndicator.jsx
 * Animated 3-dot thinking state indicator for Ollama Gemma 3 4B inference.
 */
export default function TypingIndicator() {
  return (
    <div style={styles.msgRow}>
      <div style={styles.avatar}>
        <FiCpu size={15} color="#4f46e5" />
      </div>
      <div style={styles.bubble}>
        <div style={styles.wave}>
          <span style={{ ...styles.dot, animationDelay: '0s' }} />
          <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
          <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
          <span style={styles.text}>AI Assistant is thinking...</span>
        </div>
      </div>
      <style>{`
        @keyframes pulseWave {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
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
    margin: '6px 0'
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  bubble: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px 16px 16px 4px',
    padding: '12px 16px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
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
    color: '#64748b',
    marginLeft: 6
  }
};
