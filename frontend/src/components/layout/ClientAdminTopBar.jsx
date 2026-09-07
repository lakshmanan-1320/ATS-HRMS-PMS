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
  FiLock
} from 'react-icons/fi'
import axios from 'axios'
import { clearModuleCache } from '../../hooks/useModules'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const SEARCHABLE_ITEMS = [
  { label: 'Client Admin Dashboard', category: 'Overview', path: '/client-admin/dashboard' },
  { label: 'Employees Directory', category: 'Organization', path: '/client-admin/employees' },
  { label: 'Performance Hub', category: 'Performance', path: '/client-admin/performance' },
  { label: 'Bell Curve Calibration', category: 'Performance', path: '/client-admin/bell-curve' },
  { label: '9-Box Talent Matrix', category: 'Performance', path: '/client-admin/nine-box' },
  { label: 'Performance PIP Portal', category: 'Performance', path: '/client-admin/pip' },
  { label: 'KPI Management', category: 'Performance', path: '/client-admin/kpi' },
  { label: 'Departments', category: 'Organization', path: '/client-admin/departments' },
  { label: 'Hierarchy Levels', category: 'Organization', path: '/client-admin/hierarchy' },
  { label: 'Org Chart', category: 'Organization', path: '/client-admin/org-chart' },
  { label: 'Leave Types & Plans', category: 'Attendance & Leave', path: '/client-admin/leave' },
  { label: 'Leave Approvals', category: 'Attendance & Leave', path: '/client-admin/leave-approvals' },
  { label: 'Attendance Tracking', category: 'Attendance & Leave', path: '/client-admin/attendance/tracking' },
  { label: 'Regularizations', category: 'Attendance & Leave', path: '/client-admin/regularizations' },
  { label: 'Payroll & Salary', category: 'Payroll', path: '/client-admin/payroll' },
  { label: 'Audit Logs', category: 'Account', path: '/client-admin/audit' },
  { label: 'Change Password', category: 'Account', path: '/client-admin/change-password' },
]

const NOTIF_META = {
  goal_pending: { icon: FiAlertCircle, color: '#d97706', label: 'Goal pending approval' },
  kpi_submitted: { icon: FiInfo, color: '#0284c7', label: 'KPI awaiting review' },
  goal_rejected: { icon: FiAlertCircle, color: '#dc2626', label: 'Goal rejected' },
  leave_pending: { icon: FiClock, color: '#7c3aed', label: 'Leave request pending' },
  regularization_pending: { icon: FiAlertCircle, color: '#0891b2', label: 'Regularization pending' },
}

const BRAND_RED = 'var(--primary-color, #C2071A)'
const FONT_HEAD = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

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
          <div style={{ fontFamily: FONT_HEAD, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Notifications</div>
          <div style={{ fontFamily: FONT_HEAD, fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            {unread.length > 0 ? `${unread.length} unread` : 'All caught up'}
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
            <FiCheckCircle size={26} color="#10b981" style={{ marginBottom: 6 }} />
            <div style={{ fontFamily: FONT_HEAD, fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>No pending actions</div>
          </div>
        ) : notifications.map((n, i) => {
          const meta = NOTIF_META[n.type] || { icon: FiInfo, color: '#6366f1', label: n.type || 'Alert' }
          const Icon = meta.icon
          return (
            <div key={i}
              onClick={() => onNotifClick && onNotifClick(n)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '12px 18px',
                background: n.read ? 'transparent' : `${meta.color}08`,
                borderLeft: n.read ? '3px solid transparent' : `3px solid ${meta.color}`,
                borderBottom: i < notifications.length - 1 ? '1px solid #f8fafc' : 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} color={meta.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: '12.5px', color: '#1e293b', fontWeight: n.read ? '500' : '700', lineHeight: 1.4 }}>{n.title}</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FiClock size={10} /> 22h ago
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ padding: '10px 18px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
        <button onClick={onViewAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: BRAND_RED, fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          View all activity <FiArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}

export default function ClientAdminTopBar({ title }) {
  const navigate = useNavigate()
  const companyName = sessionStorage.getItem('company_name') || 'Client Admin'
  const userEmail = sessionStorage.getItem('sa_email') || 'admin@insighthcm.in'
  const displayName = userEmail
    .split('@')[0]
    .split(/[._-]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'Demo'

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
    api.get('/client-admin/dashboard/notifications')
      .then(r => setNotifications(r.data))
      .catch(() => { })
  }, [])

  useEffect(() => { loadNotifications() }, [loadNotifications])

  function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function handleLogout() {
    clearModuleCache()
    sessionStorage.clear()
    navigate('/login')
  }

  const filteredSearchResults = searchQuery.trim()
    ? SEARCHABLE_ITEMS.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const unreadCount = notifications.filter(n => !n.read).length || 5

  const fallbackAlerts = [
    { title: 'Casual Leave Request Pending', created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString() },
    { title: 'Sick Leave Application', created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString() },
    { title: 'Regularization Request Pending', created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString() },
    { title: 'Quarterly KPI Evaluation', created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString() },
  ]
  const alertItems = notifications.length > 0 ? notifications : fallbackAlerts

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e4eaf3',
      padding: '0 24px',
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
      {/* Left side: Title + Search + Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Page Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'var(--card-active-bg, #FEECEE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <img src="/insight-tech-icon.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: '15px', fontWeight: 700, color: '#0f1b3d', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              {title || companyName}
            </div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>Client Admin Panel</div>
          </div>
        </div>

        {/* Live Search */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', height: '36px',
            padding: '0 12px', background: '#fff',
            border: `1px solid ${isSearchFocused ? BRAND_RED : '#e4eaf3'}`,
            borderRadius: '9px', width: '240px', transition: 'all 0.2s',
            boxShadow: isSearchFocused ? '0 0 0 3px rgba(194, 7, 26, 0.1)' : 'none'
          }}>
            <FiSearch size={15} color={isSearchFocused ? BRAND_RED : '#93a1bd'} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search menu..."
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontFamily: FONT_HEAD, fontSize: '12.5px', color: '#0f1b3d', width: '100%'
              }}
            />
            {!searchQuery && (
              <span style={{ fontFamily: FONT_HEAD, fontSize: '9.5px', color: '#7b8aa8', background: '#eff3f9', borderRadius: '4px', padding: '2px 6px', flexShrink: 0 }}>⌘ K</span>
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
              position: 'absolute', top: '44px', left: 0, width: '320px',
              background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 400, overflow: 'hidden'
            }}>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
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
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                    >
                      <div>
                        <div style={{ fontFamily: FONT_HEAD, fontSize: '12.5px', fontWeight: 600, color: '#0f1b3d' }}>{res.label}</div>
                        <div style={{ fontFamily: FONT_HEAD, fontSize: '10px', color: '#64748b' }}>{res.category}</div>
                      </div>
                      <FiArrowRight size={13} color="#94a3b8" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#edf3fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FiCalendar size={15} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: '12.5px', fontWeight: 600, color: '#0f1b3d' }}>{todayFormatted}</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Have a productive day!</div>
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
              position: 'relative', background: showNotifications ? 'var(--card-active-bg, #FEECEE)' : '#fff',
              border: `1px solid ${showNotifications ? 'var(--card-active-border, #F7A6AF)' : '#e4eaf3'}`,
              borderRadius: '9px', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <FiBell size={16} color={showNotifications ? BRAND_RED : '#374151'} />
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
              onViewAll={() => { navigate('/client-admin/audit'); setShowNotifications(false) }}
              onNotifClick={(n) => { navigate('/client-admin/audit'); setShowNotifications(false) }}
            />
          )}
        </div>

        {/* Profile Card */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setShowProfile(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              cursor: 'pointer', padding: '4px 8px', borderRadius: '10px',
              background: showProfile ? '#f8fafc' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: BRAND_RED, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT_HEAD, fontSize: '14px', fontWeight: 700, flexShrink: 0,
              boxShadow: '0 2px 8px rgba(194, 7, 26, 0.3)'
            }}>
              {displayName.charAt(0)}
            </div>
            <div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: '13px', fontWeight: 700, color: '#0f1b3d', lineHeight: 1.2 }}>{displayName}</div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Client Admin</div>
            </div>
            <FiChevronDown size={14} color="#94a3b8" style={{ transform: showProfile ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>

          {/* User Profile Dropdown Menu */}
          {showProfile && (
            <div style={{
              position: 'absolute', top: '50px', right: 0,
              width: '220px', background: '#ffffff',
              border: '1px solid #e2e8f0', borderRadius: '14px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 500, overflow: 'hidden'
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontFamily: FONT_HEAD, fontSize: '13px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: '11px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
              </div>
              <button
                onClick={() => { setShowProfile(false); navigate('/client-admin/change-password') }}
                style={{
                  width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: '600',
                  textAlign: 'left', borderBottom: '1px solid #f8fafc'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <FiLock size={14} /> Change Password
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', fontSize: '13px', color: '#C2071A', fontWeight: '600',
                  textAlign: 'left'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#feecee' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <FiLogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

