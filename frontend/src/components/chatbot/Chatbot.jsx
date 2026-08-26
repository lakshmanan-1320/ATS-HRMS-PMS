import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useChatbot } from '../../context/ChatbotContext.jsx';
import { sendChatMessage } from '../../services/chatbotService.js';
import ChatbotButton from './ChatbotButton.jsx';
import ChatbotWindow from './ChatbotWindow.jsx';

/**
 * Chatbot.jsx
 * Global root chatbot container mounted in App.jsx.
 * Handles floating button, floating panel window, keyboard shortcuts, and API requests.
 */
export default function Chatbot({ onOpenPolicyReader }) {
  const location = useLocation();
  const {
    messages,
    isOpen,
    setIsOpen,
    isMinimized,
    unreadCount,
    openChat,
    closeChat,
    toggleMinimize,
    clearHistory,
    addMessage,
    activeCategory,
    activePolicyTitle
  } = useChatbot();

  const [loading, setLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState(null);

  const token = sessionStorage.getItem('sa_token');
  const path = location.pathname.toLowerCase();

  // Hide chatbot on login & auth screens
  const isAuthPage =
    path === '/login' ||
    path === '/verify-otp' ||
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path === '/force-change-password';

  // ESC key listener to close window
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isMinimized) {
        closeChat();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized, closeChat]);

  if (!token || isAuthPage) {
    return null;
  }

  async function handleSend(textToSend) {
    const query = textToSend.trim();
    if (!query || loading) return;

    const userMsg = {
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    addMessage(userMsg);
    setLastUserMessage(query);
    setLoading(true);

    try {
      const data = await sendChatMessage(query, activeCategory);

      let aiText = '';
      let sources = [];

      if (data?.answer) {
        aiText = data.answer;
        sources = data.sources || [];
      } else if (data?.policies && data.policies.length > 0) {
        const excerpt = data.policies.map((p) => p.chunk_text).join('\n\n');
        aiText = `Here is the relevant excerpt from the official policy records:\n\n${excerpt}`;
        sources = data.policies;
      } else {
        aiText = `I searched the official company policy records, but could not find a specific section answering your question. Please consult your HR administrator or manager.`;
      }

      addMessage({
        sender: 'ai',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources
      });
    } catch (err) {
      console.error('AI Chat Error:', err);
      const errorMsg =
        err.response?.data?.message ||
        'Sorry, I couldn\'t process that request right now. Please verify Ollama is active on http://localhost:11434 and try again.';

      addMessage({
        sender: 'ai',
        text: `⚠️ ${errorMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      });
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    if (lastUserMessage) {
      handleSend(lastUserMessage);
    }
  }

  return (
    <>
      {/* Floating Trigger Circle Button */}
      <ChatbotButton
        onClick={() => {
          if (!isOpen) openChat();
          else if (isMinimized) toggleMinimize();
          else closeChat();
        }}
        unreadCount={unreadCount}
        isOpen={isOpen && !isMinimized}
      />

      {/* Floating Right-End Chat Window Panel */}
      <ChatbotWindow
        isOpen={isOpen}
        isMinimized={isMinimized}
        onClose={closeChat}
        onMinimize={toggleMinimize}
        onClear={clearHistory}
        messages={messages}
        loading={loading}
        onSendMessage={handleSend}
        onRetry={handleRetry}
        title={activePolicyTitle}
        onOpenPolicyReader={onOpenPolicyReader}
      />
    </>
  );
}
