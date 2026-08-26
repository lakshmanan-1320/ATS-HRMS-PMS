import React from 'react';
import ChatHeader from './ChatHeader.jsx';
import ChatMessages from './ChatMessages.jsx';
import ChatInput from './ChatInput.jsx';

/**
 * ChatbotWindow.jsx
 * Pixel-perfect replica of reference design image #2:
 * Floating right-end panel (360px x 540px), rounded corners (28px), soft periwinkle shadow.
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
  title,
  onOpenPolicyReader
}) {
  if (!isOpen || isMinimized) return null;

  return (
    <div style={styles.windowPanel} onClick={(e) => e.stopPropagation()}>
      <ChatHeader
        title="AI Assistant"
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
            transform: translateY(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (max-width: 640px) {
          .chat-window-responsive {
            width: calc(100vw - 32px) !important;
            height: 75vh !important;
            right: 16px !important;
            bottom: 84px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  windowPanel: {
    position: 'fixed',
    bottom: 96,
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
    animation: 'slideInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    className: 'chat-window-responsive'
  }
};
