import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FiCpu,
  FiUser,
  FiSend,
  FiX,
  FiTrash2,
  FiCopy,
  FiCheck,
  FiZap,
  FiShield,
  FiHelpCircle,
  FiBookOpen,
  FiExternalLink,
  FiThumbsUp,
  FiRefreshCw
} from 'react-icons/fi';

/**
 * PolicyAiChatModal.jsx
 * Reusable, isolated, modern AI Policy Assistant Modal Component.
 * Supports any policy category or specific policy ID without code conflicts.
 */
export default function PolicyAiChatModal({
  isOpen,
  onClose,
  category = 'IT_SECURITY',
  policyId = null,
  policyTitle = 'IT & Data Security AI Assistant',
  policyDocRef = 'POL-IT-001',
  presetQuestions = [
    'What is the password length and rotation requirement?',
    'Who do I report phishing emails to and what is the SLA?',
    'Are USB drives and unapproved cloud storage allowed?',
    'What is the workstation locking key shortcut requirement?'
  ],
  onOpenPolicyReader
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [likedMap, setLikedMap] = useState({});

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initial welcome message setup
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          sender: 'ai',
          text: `Hello! I am your AI assistant for **${policyTitle}** (${policyDocRef}). Ask me any questions about policy requirements, SLAs, or security guidelines!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: []
        }
      ]);
    }
  }, [isOpen, policyTitle, policyDocRef, messages.length]);

  // Auto-scroll chat thread to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input field when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSendMessage(textToSend = null) {
    const queryText = (textToSend || inputMessage).trim();
    if (!queryText || loading) return;

    const userMsg = {
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      const token = sessionStorage.getItem('sa_token');
      const res = await axios.post(
        '/api/ai/chat',
        {
          message: queryText,
          category,
          policyId
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      let aiText = '';
      let sources = [];

      if (res.data?.answer) {
        aiText = res.data.answer;
        sources = res.data.sources || [];
      } else if (res.data?.policies && res.data.policies.length > 0) {
        // Fallback when policies are retrieved directly
        const retrievedText = res.data.policies.map((p) => p.chunk_text).join('\n\n');
        aiText = `Here is the relevant excerpt from **${policyTitle}**:\n\n${retrievedText}`;
        sources = res.data.policies;
      } else {
        aiText = `I searched the official policy records for **${policyTitle}**, but could not find a specific section addressing your question. Please consult your manager or HR administrator.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources
        }
      ]);
    } catch (err) {
      console.error('AI Chat Error:', err);
      const errorMsg =
        err.response?.data?.message ||
        'Connecting to local Ollama AI engine... Please ensure Ollama (Gemma 3 4B) is active on http://localhost:11434.';

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ **AI Service Note**: ${errorMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleClearChat() {
    setMessages([
      {
        sender: 'ai',
        text: `Chat cleared. Ask me any question about **${policyTitle}**!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: []
      }
    ]);
  }

  function handleCopyText(text, index) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function handleToggleLike(index) {
    setLikedMap((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIconBg}>
              <FiZap size={20} color="#ffffff" />
            </div>
            <div>
              <div style={styles.headerTitleRow}>
                <h3 style={styles.headerTitle}>{policyTitle}</h3>
                <span style={styles.docBadge}>{policyDocRef}</span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.statusDot}></span>
                <span style={styles.statusText}>Ollama Gemma 3 4B + pgvector</span>
              </div>
            </div>
          </div>

          <div style={styles.headerRight}>
            <button
              onClick={handleClearChat}
              style={styles.iconBtn}
              title="Clear chat history"
            >
              <FiTrash2 size={16} />
            </button>
            <button onClick={onClose} style={styles.closeBtn} title="Close AI Assistant (Esc)">
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Chat Body */}
        <div style={styles.body}>
          {/* Preset Questions Chips (Show at top if thread has < 4 messages) */}
          {presetQuestions && presetQuestions.length > 0 && messages.length <= 3 && (
            <div style={styles.presetContainer}>
              <div style={styles.presetHeader}>
                <FiHelpCircle size={13} color="#6366f1" /> Suggested Quick Questions:
              </div>
              <div style={styles.presetGrid}>
                {presetQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    style={styles.presetChip}
                    disabled={loading}
                  >
                    <FiZap size={12} color="#6366f1" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Thread */}
          <div style={styles.thread}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.msgRow,
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {msg.sender === 'ai' && (
                  <div style={styles.aiAvatar}>
                    <FiCpu size={16} color="#4f46e5" />
                  </div>
                )}

                <div
                  style={{
                    ...styles.msgBubble,
                    ...(msg.sender === 'user' ? styles.userBubble : styles.aiBubble),
                    ...(msg.isError ? styles.errorBubble : {})
                  }}
                >
                  <div style={styles.msgText}>{msg.text}</div>

                  {/* Sources / Citation Badges */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={styles.sourcesContainer}>
                      <div style={styles.sourcesTitle}>
                        <FiBookOpen size={12} /> Referenced Policy Sections:
                      </div>
                      <div style={styles.sourcesGrid}>
                        {msg.sources.map((src, sIdx) => (
                          <div
                            key={sIdx}
                            style={styles.sourceBadge}
                            onClick={() => onOpenPolicyReader && onOpenPolicyReader(src)}
                            title="Click to view policy document"
                          >
                            <FiShield size={12} color="#4f46e5" />
                            <span>{policyDocRef} Section {src.chunk_index + 1}</span>
                            <FiExternalLink size={10} color="#94a3b8" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer metadata & actions */}
                  <div style={styles.msgFooter}>
                    <span style={styles.msgTime}>{msg.timestamp}</span>

                    {msg.sender === 'ai' && !msg.isError && (
                      <div style={styles.msgActions}>
                        <button
                          onClick={() => handleCopyText(msg.text, idx)}
                          style={styles.actionBtn}
                          title="Copy response"
                        >
                          {copiedIndex === idx ? (
                            <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <FiCheck size={13} /> Copied!
                            </span>
                          ) : (
                            <FiCopy size={13} />
                          )}
                        </button>

                        <button
                          onClick={() => handleToggleLike(idx)}
                          style={{
                            ...styles.actionBtn,
                            color: likedMap[idx] ? '#4f46e5' : '#94a3b8'
                          }}
                          title="Helpful response"
                        >
                          <FiThumbsUp size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div style={styles.userAvatar}>
                    <FiUser size={16} color="#ffffff" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading / Typing Indicator */}
            {loading && (
              <div style={styles.msgRow}>
                <div style={styles.aiAvatar}>
                  <FiCpu size={16} color="#4f46e5" />
                </div>
                <div style={{ ...styles.msgBubble, ...styles.aiBubble, padding: '14px 18px' }}>
                  <div style={styles.typingWave}>
                    <span style={styles.typingDot}></span>
                    <span style={{ ...styles.typingDot, animationDelay: '0.2s' }}></span>
                    <span style={{ ...styles.typingDot, animationDelay: '0.4s' }}></span>
                    <span style={styles.typingText}>Searching policy embeddings & querying Gemma 3 4B...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar */}
        <div style={styles.footer}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={styles.form}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={`Ask a question about ${policyTitle}...`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading}
              style={styles.input}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              style={{
                ...styles.sendBtn,
                opacity: !inputMessage.trim() || loading ? 0.6 : 1
              }}
            >
              {loading ? (
                <FiRefreshCw size={17} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <FiSend size={17} />
              )}
            </button>
          </form>
          <div style={styles.disclaimer}>
            Answers are strictly grounded in official company policy records. Press <kbd style={styles.kbd}>Enter</kbd> to send.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulseDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16
  },
  modal: {
    width: '100%',
    maxWidth: 680,
    height: '82vh',
    maxHeight: 740,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid rgba(226, 232, 240, 0.8)'
  },
  header: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#ffffff'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14
  },
  headerIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  headerTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.3px'
  },
  docBadge: {
    background: 'rgba(255, 255, 255, 0.25)',
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '0.04em'
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 2
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#4ade80',
    boxShadow: '0 0 8px #4ade80',
    animation: 'pulseDot 2s infinite'
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: 500
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  iconBtn: {
    background: 'rgba(255, 255, 255, 0.15)',
    border: 'none',
    color: '#ffffff',
    width: 34,
    height: 34,
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  closeBtn: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: '#ffffff',
    width: 36,
    height: 36,
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: 20,
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column'
  },
  presetContainer: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  },
  presetHeader: {
    fontSize: 12,
    fontWeight: 700,
    color: '#475569',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  presetGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  },
  presetChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(99, 102, 241, 0.06)',
    border: '1px solid rgba(99, 102, 241, 0.18)',
    borderRadius: 20,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: '#4f46e5',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left'
  },
  thread: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  msgRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start'
  },
  aiAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  msgBubble: {
    maxWidth: '82%',
    padding: '14px 18px',
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 1.6,
    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
  },
  aiBubble: {
    backgroundColor: '#ffffff',
    color: '#1e293b',
    border: '1px solid #e2e8f0',
    borderTopLeftRadius: 4
  },
  userBubble: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
    color: '#ffffff',
    borderTopRightRadius: 4
  },
  errorBubble: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  },
  msgText: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  sourcesContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: '1px solid #f1f5f9'
  },
  sourcesTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  sourcesGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6
  },
  sourceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: '#334155',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  msgFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    fontSize: 11,
    color: '#94a3b8'
  },
  msgTime: {
    fontSize: 11
  },
  msgActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s'
  },
  typingWave: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    animation: 'pulseDot 1.4s infinite ease-in-out'
  },
  typingText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: 500
  },
  footer: {
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0'
  },
  form: {
    display: 'flex',
    gap: 10,
    alignItems: 'center'
  },
  input: {
    flex: 1,
    padding: '12px 18px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    fontSize: 14,
    outline: 'none',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    transition: 'all 0.2s'
  },
  sendBtn: {
    padding: '12px 20px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
    transition: 'all 0.2s'
  },
  disclaimer: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 11,
    color: '#94a3b8'
  },
  kbd: {
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    padding: '1px 5px',
    fontSize: 10,
    fontWeight: 600,
    color: '#475569'
  }
};
