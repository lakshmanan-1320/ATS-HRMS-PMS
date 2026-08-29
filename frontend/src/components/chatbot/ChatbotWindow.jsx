import React from 'react';
import ChatHeader from './ChatHeader.jsx';
import ChatMessages from './ChatMessages.jsx';
import ChatInput from './ChatInput.jsx';

/**
 * ChatbotWindow.jsx
 * Floating HR AI Assistant panel with smooth animations and responsive mobile support.
 */
export default function ChatbotWindow({
  isOpen,
  isMinimized,
  onClose,
  onMinimize,
  onClear,
  messages,
  loading,
  onSendMessage,
  onRetry,
  onOpenPolicyReader
}) {
  if (!isOpen || isMinimized) return null;

  return (
    <div className="chat-window-responsive" style={styles.windowPanel} onClick={(e) => e.stopPropagation()}>
      <ChatHeader
        onMinimize={onMinimize}
        onClose={onClose}
        onClear={onClear}
      />
      <ChatMessages
        messages={messages}
        loading={loading}
        onSelectPrompt={onSendMessage}
        onRetry={onRetry}
        onOpenPolicyReader={onOpenPolicyReader}
      />
      <ChatInput onSendMessage={onSendMessage} loading={loading} />

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (max-width: 640px) {
          .chat-window-responsive {
            width: calc(100vw - 24px) !important;
            height: calc(100vh - 100px) !important;
            right: 12px !important;
            bottom: 80px !important;
            border-radius: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  windowPanel: {
    position: 'fixed',
    bottom: 92,
    right: 28,
    width: 360,
    height: 540,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    boxShadow: '0 20px 50px -10px rgba(88, 86, 214, 0.28), 0 10px 20px -5px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9995,
    border: '1px solid rgba(224, 231, 255, 0.8)',
    animation: 'slideInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  }
};
