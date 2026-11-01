import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiX, FiBell, FiArrowRight, FiClock, FiCheckCircle, FiInfo, FiAlertCircle } from 'react-icons/fi'
import axios from 'axios'
import { clearModuleCache } from '../../hooks/useModules'
import PmsTopBar, { PmsIconButton } from './PmsTopBar'
import { PMS } from '../../features/employee-portal/theme'

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
  goal_pending: { icon: FiAlertCircle, label: 'Goal pending approval' },
  kpi_submitted: { icon: FiInfo, label: 'KPI awaiting review' },
  goal_rejected: { icon: FiAlertCircle, label: 'Goal rejected' },
  leave_pending: { icon: FiClock, label: 'Leave request pending' },
  regularization_pending: { icon: FiAlertCircle, label: 'Regularization pending' },
}

export function timeAgo(value) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  if (isNaN(diff)) return ''
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

export function humanize(text = '') {
  return String(text).replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
}

function NotificationPanel({ notifications, onClose, onMarkAllRead, onViewAll, onNotifClick }) {
  const unread = notifications.filter(n => !n.read)
  return (
    <div style={{
      position: 'absolute', top: '50px', right: 0, width: '360px', maxWidth: 'calc(100vw - 32px)',
      background: PMS.white, border: `1px solid ${PMS.border}`, borderRadius: '16px',
      boxShadow: '0 16px 36px rgba(0,18,51,0.14)', zIndex: 500, overflow: 'hidden', fontFamily: PMS.fontHead,
    }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${PMS.pillGrey}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: PMS.navy }}>Notifications</div>
          <div style={{ fontSize: '11.5px', color: PMS.muted, marginTop: '2px' }}>
            {unread.length > 0 ? `${unread.length} unread` : 'All caught up'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unread.length > 0 && (
            <button type="button" onClick={onMarkAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11.5px', color: PMS.blue, fontWeight: 700 }}>
              Mark all read
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: PMS.surfaceAlt, border: `1px solid ${PMS.border}`, cursor: 'pointer', color: PMS.slate, padding: '5px', borderRadius: '50%', display: 'flex' }}>
            <FiX size={13} />
          </button>
        </div>
      </div>
      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '28px 18px', textAlign: 'center' }}>
            <FiCheckCircle size={24} color={PMS.blue} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: '13px', color: PMS.muted }}>No pending actions</div>
          </div>
        ) : notifications.map((n, i) => {
          const meta = NOTIF_META[n.type] || { icon: FiInfo, label: 'Alert' }
          const Icon = meta.icon
          return (
            <button
              type="button"
              key={i}
              onClick={() => onNotifClick && onNotifClick(n)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%', textAlign: 'left',
                padding: '12px 18px', background: PMS.white, border: 'none',
                borderBottom: i < notifications.length - 1 ? `1px solid ${PMS.pillGrey}` : 'none', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = PMS.surfaceAlt }}
              onMouseLeave={e => { e.currentTarget.style.background = PMS.white }}
            >
              <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: PMS.ice, color: PMS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '12.5px', color: PMS.navy, fontWeight: n.read ? 500 : 700, lineHeight: 1.4 }}>{humanize(n.title) || meta.label}</span>
                <span style={{ display: 'block', fontSize: '10.5px', color: PMS.muted, marginTop: '2px' }}>
                  {[n.actor, timeAgo(n.created_at)].filter(Boolean).join(' · ')}
                </span>
              </span>
              {!n.read && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: PMS.blue, flexShrink: 0, marginTop: '6px' }} />}
            </button>
          )
        })}
      </div>
      <div style={{ padding: '10px 18px', borderTop: `1px solid ${PMS.pillGrey}`, textAlign: 'center' }}>
        <button type="button" onClick={onViewAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: PMS.blue, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          View all activity <FiArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}

export default function ClientAdminTopBar({ title }) {
  const navigate = useNavigate()
  const userEmail = sessionStorage.getItem('sa_email') || ''
  const displayName = userEmail
    ? userEmail.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Admin'

  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = useCallback(() => {
    api.get('/client-admin/dashboard/notifications')
      .then(r => setNotifications(prev => {
        const readKeys = new Set(prev.filter(n => n.read).map(n => `${n.type}|${n.title}|${n.created_at}`))
        return (Array.isArray(r.data) ? r.data : []).map(n => ({ ...n, read: readKeys.has(`${n.type}|${n.title}|${n.created_at}`) }))
      }))
      .catch(() => { })
  }, [])

  useEffect(() => { loadNotifications() }, [loadNotifications])

  function handleLogout() {
    clearModuleCache()
    sessionStorage.clear()
    navigate('/login')
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const bell = (
    <div ref={notifRef} style={{ position: 'relative' }}>
      <PmsIconButton
        title="Notifications"
        active={showNotifications}
        onClick={() => {
          if (!showNotifications) loadNotifications()
          setShowNotifications(v => !v)
        }}
      >
        <FiBell size={15} />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: '9px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', background: PMS.blue, border: '1.5px solid #fff' }} />
        )}
      </PmsIconButton>
      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
          onViewAll={() => { navigate('/client-admin/audit'); setShowNotifications(false) }}
          onNotifClick={() => { navigate('/client-admin/audit'); setShowNotifications(false) }}
        />
      )}
    </div>
  )

  return (
    <PmsTopBar
      title={title}
      searchItems={SEARCHABLE_ITEMS}
      displayName={displayName}
      userEmail={userEmail}
      roleLabel="Client Admin"
      homePath="/client-admin/dashboard"
      calendarPath="/client-admin/holidays"
      calendarTitle="Holiday calendar"
      prefsPath="/client-admin/permissions"
      prefsTitle="Permissions & settings"
      changePasswordPath="/client-admin/change-password"
      onLogout={handleLogout}
      notificationSlot={bell}
    />
  )
}
