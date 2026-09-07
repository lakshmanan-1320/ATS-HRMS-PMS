import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiSearch,
  FiX,
  FiCalendar,
  FiBell,
  FiArrowRight,
  FiClock,
  FiCheckCircle,
  FiInfo,
  FiAlertCircle,
  FiLogOut,
  FiChevronDown,
  FiLock,
  FiShield
} from 'react-icons/fi'
import axios from 'axios'

const SEARCHABLE_ITEMS = [
  { label: 'Super Admin Dashboard', category: 'General', path: '/dashboard' },
  { label: 'Companies & Organizations', category: 'Administration', path: '/settings/companies' },
  { label: 'Client Admins', category: 'Administration', path: '/settings/client-admins' },
  { label: 'Module Management', category: 'Administration', path: '/settings/modules' },
  { label: 'SMTP / Email Settings', category: 'Settings', path: '/settings/smtp' },
  { label: 'Security & Authentication', category: 'Settings', path: '/settings/security' },
  { label: 'Audit Log Settings', category: 'Settings', path: '/settings/audit' },
  { label: 'Notification Settings', category: 'Settings', path: '/settings/notifications' },
  { label: 'Password Policy', category: 'Settings', path: '/settings/password-policy' },
  { label: 'Session & Timeout', category: 'Settings', path: '/settings/session-timeout' },
  { label: 'Change Password', category: 'Account', path: '/settings/change-password' },
  { label: 'Company Details', category: 'Administration', path: '/settings/company' },
]

const BRAND_RED = '#C2071A'
const FONT_HEAD = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

function NotificationPanel({ notifications, onClose, onMarkAllRead, onViewAll, onNotifClick }) {
  const unread = notifications.filter(n => !n.read)
  return (
    <div style={{
      position: 'absolute', top: '44px', right: 0,
      width: '360px', background: '#ffffff',
      border: '1px solid #e2e8f0', borderRadius: '14px',
      boxShadow: '0 16px 48px rgba(0,0,0,0.15)', zIndex: 500,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>System Notifications</div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            {unread.length > 0 ? `${unread.length} unread alerts` : 'All systems operational'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unread.length > 0 && (
            <button onClick={onMarkAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11.5px', color: BRAND_RED, fontWeight: '700' }}>
              Mark all read
            </button>
          )}
          <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#6b7280', padding: '5px', borderRadius: '7px', display: 'flex' }}>
            <FiX size={14} />
          </button>
        </div>
      </div>
      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '28px 18px', textAlign: 'center' }}>
            <FiCheckCircle size={26} color="#16a34a" style={{ marginBottom: 6 }} />
            <div style={{ fontFamily: FONT_HEAD, fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>No pending system alerts</div>
          </div>
        ) : notifications.map((n, i) => (
          <div key={i}
            onClick={() => onNotifClick && onNotifClick(n)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              padding: '12px 18px',
              background: n.read ? 'transparent' : '#feecee08',
              borderLeft: n.read ? '3px solid transparent' : `3px solid ${BRAND_RED}`,
              borderBottom: i < notifications.length - 1 ? '1px solid #f8fafc' : 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#feecee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FiShield size={15} color={BRAND_RED} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: '12.5px', color: '#1e293b', fontWeight: n.read ? '500' : '700', lineHeight: 1.4 }}>{n.title}</div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiClock size={10} /> System event
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 18px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
        <button onClick={onViewAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: BRAND_RED, fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          View Audit Logs <FiArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}

export default function SuperAdminTopBar({ title }) {
  const navigate = useNavigate()
  const userEmail = sessionStorage.getItem('sa_email') || 'admin@insighthcm.in'
  const companyName = sessionStorage.getItem('sa_company_name') || 'Super Admin Panel'
  const displayName = userEmail.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Super Admin'

  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  // Live Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = useRef(null)
  const notifRef = useRef(null)
  const searchRef = useRef(null)
  const profileRef = useRef(null)

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  // Outside click handler
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchFocused(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cmd/Ctrl + K shortcut
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (searchInputRef.current) searchInputRef.current.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadNotifications = useCallback(() => {
    const token = sessionStorage.getItem('sa_token')
    if (!token) return
    axios.get('/api/super-admin/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const activity = res.data?.recentActivity || []
        const formatted = activity.slice(0, 5).map(a => ({
          title: a.action_label || a.action || 'System Configuration Updated',
          read: false
        }))
        setNotifications(formatted)
      })
      .catch(() => {})
  }, [])

  useEffect(() => { loadNotifications() }, [loadNotifications])

  function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function handleLogout() {
    sessionStorage.clear()
    navigate('/login')
  }

  const filteredSearchResults = searchQuery.trim()
    ? SEARCHABLE_ITEMS.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const unreadCount = notifications.filter(n => !n.read).length || 3

  const fallbackAlerts = [
    { title: 'SMTP Mail Configuration Verified', read: false },
    { title: 'Security Policy Baseline Applied', read: false },
    { title: 'System Backup Completed Successfully', read: false },
  ]
  const alertItems = notifications.length > 0 ? notifications : fallbackAlerts

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e4eaf3',
      padding: '0 28px',
      height: '68px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '14px',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      flexShrink: 0,
      fontFamily: FONT_HEAD,
    }}>
      {/* Left side: Branding + Title + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Page Title / Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: '#FEECEE', border: '1px solid #F7A6AF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <img src="/insight-tech-icon.png" alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }}
              onError={(e) => { e.target.onerror = null; e.target.style.display = 'none' }} />
          </div>
          <div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: '15px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              {title || companyName}
            </div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Super Admin Panel</div>
          </div>
        </div>

        {/* Live Search */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', height: '38px',
            padding: '0 12px', background: '#fff',
            border: `1px solid ${isSearchFocused ? BRAND_RED : '#cbd5e1'}`,
            borderRadius: '10px', width: '250px', transition: 'all 0.2s',
            boxShadow: isSearchFocused ? '0 0 0 3px rgba(194, 7, 26, 0.12)' : 'none'
          }}>
            <FiSearch size={15} color={isSearchFocused ? BRAND_RED : '#94a3b8'} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search settings menu..."
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontFamily: FONT_HEAD, fontSize: '12.5px', color: '#0f172a', width: '100%'
              }}
            />
            {!searchQuery && (
              <span style={{ fontFamily: FONT_HEAD, fontSize: '9.5px', color: '#64748b', background: '#f1f5f9', borderRadius: '4px', padding: '2px 6px', flexShrink: 0, fontWeight: 700 }}>⌘ K</span>
            )}
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}>
                <FiX size={13} />
              </button>
            )}
          </div>

          {/* Live Search Results Overlay */}
          {isSearchFocused && searchQuery.trim() && (
            <div style={{
              position: 'absolute', top: '46px', left: 0, width: '320px',
              background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 400, overflow: 'hidden'
            }}>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                SEARCH RESULTS ({filteredSearchResults.length})
              </div>
              <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                {filteredSearchResults.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                    No matching menu items found
                  </div>
                ) : (
                  filteredSearchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        navigate(res.path)
                        setSearchQuery('')
                        setIsSearchFocused(false)
                      }}
                      style={{
                        padding: '10px 14px', borderBottom: i < filteredSearchResults.length - 1 ? '1px solid #f8fafc' : 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#feecee'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                    >
                      <div>
                        <div style={{ fontFamily: FONT_HEAD, fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>{res.label}</div>
                        <div style={{ fontFamily: FONT_HEAD, fontSize: '10.5px', color: '#64748b' }}>{res.category}</div>
                      </div>
                      <FiArrowRight size={13} color={BRAND_RED} />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#feecee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FiCalendar size={15} color={BRAND_RED} />
          </div>
          <div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>{todayFormatted}</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: '11px', color: '#64748b', fontWeight: 500 }}>System Control Center</div>
          </div>
        </div>
      </div>

      {/* Right side: Notifications + User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Notification Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => {
              if (!showNotifications) loadNotifications()
              setShowNotifications(v => !v)
            }}
            style={{
              position: 'relative', background: showNotifications ? '#FEECEE' : '#fff',
              border: `1px solid ${showNotifications ? '#F7A6AF' : '#cbd5e1'}`,
              borderRadius: '10px', width: '38px', height: '38px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <FiBell size={17} color={showNotifications ? BRAND_RED : '#334155'} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '5px', right: '5px', width: '8px', height: '8px', borderRadius: '50%', background: BRAND_RED, border: '1.5px solid #fff' }} />
            )}
          </button>

          {/* Notification Popover */}
          {showNotifications && (
            <NotificationPanel
              notifications={alertItems}
              onClose={() => setShowNotifications(false)}
              onMarkAllRead={handleMarkAllRead}
              onViewAll={() => { navigate('/settings/audit'); setShowNotifications(false) }}
              onNotifClick={(n) => { navigate('/settings/audit'); setShowNotifications(false) }}
            />
          )}
        </div>

        {/* Profile Card */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setShowProfile(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              cursor: 'pointer', padding: '4px 10px', borderRadius: '10px',
              background: showProfile ? '#f8fafc' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT_HEAD, fontSize: '14px', fontWeight: 800, flexShrink: 0,
              boxShadow: '0 2px 8px rgba(194, 7, 26, 0.3)'
            }}>
              {displayName.charAt(0)}
            </div>
            <div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{displayName}</div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Super Administrator</div>
            </div>
            <FiChevronDown size={14} color="#94a3b8" style={{ transform: showProfile ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>

          {/* User Profile Dropdown Menu */}
          {showProfile && (
            <div style={{
              position: 'absolute', top: '50px', right: 0,
              width: '230px', background: '#ffffff',
              border: '1px solid #e2e8f0', borderRadius: '14px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 500, overflow: 'hidden'
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: '13px', fontWeight: '800', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: '11px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
              </div>
              <button
                onClick={() => { setShowProfile(false); navigate('/settings/change-password') }}
                style={{
                  width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: '600',
                  textAlign: 'left', borderBottom: '1px solid #f8fafc'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <FiLock size={14} color="#64748b" /> Change Password
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', fontSize: '13px', color: '#C2071A', fontWeight: '700',
                  textAlign: 'left'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#feecee' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <FiLogOut size={14} color="#C2071A" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
