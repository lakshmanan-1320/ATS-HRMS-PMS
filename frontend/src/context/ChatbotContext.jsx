import React, { createContext, useContext, useState, useEffect } from 'react';

const ChatbotContext = createContext(null);

const STORAGE_KEY = 'pms_ai_chat_history_v1';

export function ChatbotProvider({ children }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
    return [];
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activePolicyTitle, setActivePolicyTitle] = useState('AI Assistant');
  const [allPolicies, setAllPolicies] = useState([]);

  // Fetch policy key-to-id mapping once when the chatbot is opened
  useEffect(() => {
    if (isOpen) {
      const fetchPolicies = async () => {
        try {
          const token = sessionStorage.getItem('sa_token');
          if (!token) return;
          
          const response = await fetch('/api/policies', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const resData = await response.json();
          if (resData.success) {
            setAllPolicies(resData.data || []);
          }
        } catch (e) {
          console.error('Failed to fetch policies in chatbot context:', e);
        }
      };
      fetchPolicies();
    }
  }, [isOpen]);

  // Persist chat history to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }, [messages]);

  // Reset unread count when chat window opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
    }
  }, [isOpen, isMinimized]);

  function openChat(category = null, title = 'AI Assistant') {
    setActiveCategory(category);
    setActivePolicyTitle(title);
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  }

  function closeChat() {
    setIsOpen(false);
    setIsMinimized(false);
  }

  function toggleMinimize() {
    setIsMinimized((prev) => !prev);
  }

  function clearHistory() {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function addMessage(msg) {
    setMessages((prev) => [...prev, msg]);
    if (msg.sender === 'ai' && (!isOpen || isMinimized)) {
      setUnreadCount((prev) => prev + 1);
    }
  }

  return (
    <ChatbotContext.Provider
      value={{
        messages,
        setMessages,
        isOpen,
        setIsOpen,
        isMinimized,
        setIsMinimized,
        unreadCount,
        openChat,
        closeChat,
        toggleMinimize,
        clearHistory,
        addMessage,
        activeCategory,
        activePolicyTitle,
        allPolicies
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
}
