import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiCpu, FiZap, FiMessageSquare } from 'react-icons/fi';
import PolicyAiChatModal from '../../features/employee-portal/components/PolicyAiChatModal.jsx';

/**
 * GlobalPolicyAiWidget.jsx
 * Minimal, sleek, floating AI Chatbot launcher button visible across all pages & roles.
 */
export default function GlobalPolicyAiWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const token = sessionStorage.getItem('sa_token');
  const path = location.pathname.toLowerCase();

  // Hide floating widget on login & auth pages
  const isAuthPage =
    path === '/login' ||
    path === '/verify-otp' ||
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path === '/force-change-password';

  if (!token || isAuthPage) {
    return null;
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <div
        style={styles.container}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Tooltip Badge */}
        {isHovered && (
          <div style={styles.tooltip}>
            <FiZap size={13} color="#6366f1" />
            <span>Ask Data Security AI</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(true)}
          style={{
            ...styles.button,
            transform: isHovered ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
            boxShadow: isHovered
              ? '0 12px 28px -4px rgba(79, 70, 229, 0.55), 0 4px 12px rgba(0,0,0,0.1)'
              : '0 8px 20px -4px rgba(79, 70, 229, 0.4)'
          }}
          title="Ask AI Assistant"
        >
          <FiCpu size={24} color="#ffffff" />
          <span style={styles.badgePulse} />
        </button>
      </div>

      {/* Global AI Chat Modal */}
      <PolicyAiChatModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        category="IT_SECURITY"
        policyTitle="IT & Data Security AI Assistant"
        policyDocRef="POL-IT-001"
        presetQuestions={[
          'What is the password length and rotation requirement?',
          'Who do I report phishing emails to and what is the SLA?',
          'Are USB drives and unapproved cloud storage allowed?',
          'What is the workstation locking key shortcut requirement?'
        ]}
      />
    </>
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
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  badgePulse: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    border: '2px solid #ffffff',
    boxShadow: '0 0 8px #22c55e'
  }
};
