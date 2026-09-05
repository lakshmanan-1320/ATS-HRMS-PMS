import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import { useModules, PMS_MODULE_KEYS } from '../../../hooks/useModules'
import axios from 'axios'
import { FiBell, FiRefreshCw, FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiClock, FiTrendingUp, FiTrendingDown, FiMinus, FiUsers, FiTarget, FiBarChart2, FiAward, FiArrowRight, FiCheck, FiCalendar, FiFileText } from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const STATUS_COLORS = {
  active:            { bg: '#dcfce7', text: '#15803d', bar: '#22c55e' },
  completed:         { bg: '#ede9fe', text: '#6d28d9', bar: '#7c3aed' },
  pending_approval:  { bg: '#fef3c7', text: '#b45309', bar: '#d97706' },
  draft:             { bg: '#f1f5f9', text: '#475569', bar: '#64748b' },
  rejected:          { bg: '#fee2e2', text: '#b91c1c', bar: '#ef4444' },
  overdue:           { bg: '#ffedd5', text: '#c2410c', bar: '#f97316' },
}

const KPI_COLORS = {
  pending:   { text: '#475569', bar: '#64748b' },
  submitted: { text: '#b45309', bar: '#d97706' },
  approved:  { text: '#15803d', bar: '#16a34a' },
  rejected:  { text: '#b91c1c', bar: '#ef4444' },
}

const QUICK_LINKS = [
  { icon: '👥', label: 'Employees',   path: '/client-admin/employees',      color: '#6366f1', desc: 'Manage team',    module: null },
  { icon: '🎯', label: 'Goals',       path: '/client-admin/goals',          color: '#a855f7', desc: 'Track OKRs',     module: 'goals' },
  { icon: '📈', label: 'KPI',         path: '/client-admin/kpi',            color: '#0ea5e9', desc: 'Metrics',        module: 'kpi' },
  { icon: '📋', label: 'Appraisal',   path: '/client-admin/appraisal',      color: '#f59e0b', desc: 'Reviews',        module: 'performance' },
  { icon: '🏢', label: 'Departments', path: '/client-admin/departments',    color: '#10b981', desc: 'Org structure', module: null },
  { icon: '📊', label: 'Org Chart',   path: '/client-admin/org-chart',      color: '#ec4899', desc: 'Hierarchy',     module: null },
  { icon: '📅', label: 'Leave',       path: '/client-admin/leave',          color: '#8b5cf6', desc: 'Leave mgmt',     module: 'leave' },
  { icon: '🗓️', label: 'Attendance',  path: '/client-admin/attendance',     color: '#14b8a6', desc: 'Daily logs',     module: 'attendance' },
  { icon: '💰', label: 'Payroll',     path: '/client-admin/payroll',        color: '#10b981', desc: 'Salary & pay',   module: 'payroll' },
]

const NOTIF_META = {
  goal_pending:            { icon: FiAlertCircle, color: '#d97706', label: 'Goal pending approval' },
  kpi_submitted:           { icon: FiInfo,        color: '#0284c7', label: 'KPI awaiting review' },
  goal_rejected:           { icon: FiAlertCircle, color: '#dc2626', label: 'Goal rejected' },
  leave_pending:           { icon: FiClock,       color: '#7c3aed', label: 'Leave request pending' },
  regularization_pending:  { icon: FiAlertCircle, color: '#0891b2', label: 'Regularization pending' },
}

const DATE_RANGES = [
  { value: 'all',     label: 'All Time' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'month',   label: 'This Month' },
  { value: 'week',    label: 'This Week' },
]

const shimmerStyle = {
  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
  backgroundSize: '600px 100%',
  animation: 'caShimmer 1.4s infinite linear',
}

function SkeletonBox({ width = '100%', height = 18, radius = 8, style = {} }) {
  return (
    <>
      <style>{`@keyframes caShimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }`}</style>
      <div style={{ width, height, borderRadius: radius, ...shimmerStyle, ...style }} />
    </>
  )
}

function SkeletonStatCard() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 24px' }}>
      <SkeletonBox width="55%" height={11} style={{ marginBottom: 14 }} />
      <SkeletonBox width="40%" height={32} style={{ marginBottom: 10 }} />
      <SkeletonBox width="70%" height={11} />
    </div>
  )
}

function SkeletonRingCard() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ width: 84, height: 84, borderRadius: '50%', flexShrink: 0, ...shimmerStyle }} />
      <div style={{ flex: 1 }}>
        <SkeletonBox width="50%" height={11} style={{ marginBottom: 10 }} />
        <SkeletonBox width="35%" height={28} style={{ marginBottom: 8 }} />
        <SkeletonBox width="65%" height={11} />
      </div>
    </div>
  )
}

function SkeletonPanel() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 24px' }}>
      <SkeletonBox width="45%" height={14} style={{ marginBottom: 18 }} />
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ marginBottom: 14 }}>
          <SkeletonBox height={8} radius={99} />
        </div>
      ))}
    </div>
  )
}

function formatRelative(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// notifications are now fetched from the server (getRecentNotifications)

const cardBase = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  padding: '22px 24px',
  boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
}

function MetricCard({ label, value, sub, accent, icon: Icon, trend, trendLabel }) {
  return (
    <div style={{ ...cardBase, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '90px', height: '90px', background: `radial-gradient(circle at top right, ${accent}18, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={accent} />
        </div>
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', background: trend > 0 ? '#dcfce7' : trend < 0 ? '#fee2e2' : '#f1f5f9' }}>
            {trend > 0 ? <FiTrendingUp size={12} color="#16a34a" /> : trend < 0 ? <FiTrendingDown size={12} color="#dc2626" /> : <FiMinus size={12} color="#64748b" />}
            <span style={{ fontSize: '11px', fontWeight: '700', color: trend > 0 ? '#15803d' : trend < 0 ? '#b91c1c' : '#475569' }}>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', lineHeight: 1, marginBottom: '4px' }}>{value ?? '—'}</div>
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: sub ? '4px' : '0' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#6b7280' }}>{sub}</div>}
      {trendLabel && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{trendLabel}</div>}
    </div>
  )
}

function ProgressBar({ label, value, max, color, count }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '13px', color: '#374151', textTransform: 'capitalize', fontWeight: '500' }}>{label.replace(/_/g, ' ')}</span>
        <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: '600' }}>{count} &nbsp;·&nbsp; {pct}%</span>
      </div>
      <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

function GoalStatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: '#f1f5f9', text: '#475569' }
  return (
    <span style={{ fontSize: '11px', fontWeight: '700', background: c.bg, color: c.text, padding: '3px 10px', borderRadius: '6px', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

function RingChart({ pct, color, size = 96, label, sublabel }) {
  const r = (size - 14) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {label && <div style={{ fontSize: '15px', fontWeight: '800', color: color, lineHeight: 1 }}>{label}</div>}
        {sublabel && <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>{sublabel}</div>}
      </div>
    </div>
  )
}

function TrendBarChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', paddingTop: '24px' }}>No trend data available yet</div>
  }
  const maxTotal = Math.max(...data.map(d => Number(d.total || 0)), 1)
  const barColor = '#6366f1'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px' }}>
      {data.map((d, i) => {
        const total = Number(d.total || 0)
        const completed = Number(d.completed || 0)
        const heightPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0
        const completedPct = total > 0 ? (completed / total) * 100 : 0
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ fontSize: '10px', color: '#4b5563', fontWeight: '600' }}>{completed}/{total}</div>
            <div style={{ width: '100%', height: '72px', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '100%', height: `${heightPct}%`, minHeight: total > 0 ? '8px' : '2px', background: '#e0e7ff', borderRadius: '5px 5px 0 0', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${completedPct}%`, minHeight: completed > 0 ? '4px' : '0', background: barColor, borderRadius: '4px 4px 0 0', transition: 'height 0.8s ease' }} />
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: '600' }}>{d.month}</div>
          </div>
        )
      })}
    </div>
  )
}

const NOTIF_ROUTES = {
  leave_pending:           '/client-admin/leave-approvals',
  regularization_pending:  '/client-admin/regularizations',
  goal_pending:            '/client-admin/goals',
  goal_rejected:           '/client-admin/goals',
  kpi_submitted:           '/client-admin/kpi',
}

function NotificationPanel({ notifications, onClose, onMarkAllRead, onViewAll, onNotifClick }) {
  const unread = notifications.filter(n => !n.read)
  return (
    <div style={{
      position: 'absolute', top: '52px', right: 0,
      width: '360px', background: '#ffffff',
      border: '1px solid #e2e8f0', borderRadius: '16px',
      boxShadow: '0 16px 48px rgba(0,0,0,0.14)', zIndex: 500,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Notifications</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            {unread.length > 0 ? `${unread.length} unread` : 'All caught up'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unread.length > 0 && (
            <button onClick={onMarkAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#6366f1', fontWeight: '700', padding: '2px 6px' }}>
              Mark all read
            </button>
          )}
          <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#6b7280', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiX size={14} />
          </button>
        </div>
      </div>
      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <FiCheckCircle size={28} color="#10b981" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>No pending actions</div>
          </div>
        ) : notifications.map((n, i) => {
          const meta = NOTIF_META[n.type] || { icon: FiInfo, color: '#6366f1', label: n.type }
          const Icon = meta.icon
          const isClickable = !!NOTIF_ROUTES[n.type]
          return (
            <div key={i}
              onClick={() => isClickable && onNotifClick && onNotifClick(n)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '13px 20px',
                background: n.read ? 'transparent' : `${meta.color}06`,
                borderLeft: n.read ? '3px solid transparent' : `3px solid ${meta.color}`,
                borderBottom: i < notifications.length - 1 ? '1px solid #f8fafc' : 'none',
                cursor: isClickable ? 'pointer' : 'default',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : `${meta.color}06`}
            >
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} color={meta.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: meta.color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{meta.label}</div>
                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: n.read ? '500' : '700', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                {n.actor && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: 2 }}>{n.actor}</div>}
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FiClock size={10} /> {formatRelative(n.created_at)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
        <button onClick={onViewAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#4f46e5', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          View all activity <FiArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
      {children}
    </div>
  )
}

const READ_KEY = 'ca_notif_read_ids'
const getReadIds = () => { try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')) } catch { return new Set() } }
const saveReadIds = ids => localStorage.setItem(READ_KEY, JSON.stringify([...ids]))

export default function ClientAdminDashboard() {
  const navigate = useNavigate()
  const { isEnabled } = useModules()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef(null)

  const isPmsActive = isEnabled('pms') && (isEnabled('goals') || isEnabled('performance') || isEnabled('kpi'))

  const visibleQuickLinks = QUICK_LINKS.filter(l => {
    if (!l.module) return true
    if (PMS_MODULE_KEYS.includes(l.module)) {
      return isPmsActive && isEnabled(l.module)
    }
    return isEnabled(l.module)
  })

  const companyName = stats?.company_name || sessionStorage.getItem('company_name') || 'Your Organisation'
  const userEmail = sessionStorage.getItem('sa_email') || ''
  const displayName = userEmail ? userEmail.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Admin'
  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = useCallback(() => {
    api.get('/client-admin/dashboard/notifications')
      .then(r => {
        const readIds = getReadIds()
        setNotifications(r.data.map((n, i) => ({ ...n, _id: `${n.type}-${i}`, read: readIds.has(`${n.type}-${i}`) })))
      })
      .catch(() => {})
  }, [])

  const loadStats = useCallback(() => {
    setLoading(true)
    setError(null)
    api.get(`/client-admin/dashboard/stats?range=${dateRange}`)
      .then(r => {
        setStats(r.data)
        if (r.data.company_name) sessionStorage.setItem('company_name', r.data.company_name)
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'Could not load dashboard data'
        const status = err.response?.status || 0
        setError(msg)
        setStats(null)
        if (status === 401) { sessionStorage.clear(); window.location.href = '/login' }
      })
      .finally(() => setLoading(false))
  }, [dateRange])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadNotifications() }, [loadNotifications])

  function handleMarkAllRead() {
    const allIds = new Set(notifications.map(n => n._id))
    saveReadIds(allIds)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function handleBellClick() {
    if (!showNotifications) loadNotifications()
    setShowNotifications(v => !v)
  }

  const goalStatuses = stats?.goals?.by_status ? Object.entries(stats.goals.by_status).sort((a, b) => b[1] - a[1]) : []
  const kpiStatuses = stats?.kpis?.by_status ? Object.entries(stats.kpis.by_status).sort((a, b) => b[1] - a[1]) : []
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const goalRate = Number(stats?.goals?.completion_rate || 0)
  const kpiRate = Number(stats?.kpis?.completion_rate || 0)
  const overallScore = stats ? Math.round((goalRate + kpiRate) / 2) : 0
  const perfLabel = overallScore >= 75 ? 'Excellent' : overallScore >= 50 ? 'Good' : 'Needs Focus'
  const perfColor = overallScore >= 75 ? '#16a34a' : overallScore >= 50 ? '#d97706' : '#dc2626'
  const perfBg = overallScore >= 75 ? '#dcfce7' : overallScore >= 50 ? '#fef3c7' : '#fee2e2'

  const pendingGoals = stats?.goals?.by_status?.pending_approval || 0
  const activeGoals = stats?.goals?.by_status?.active || 0
  const overdueGoals = stats?.goals?.by_status?.overdue || 0
  const rejectedGoals = stats?.goals?.by_status?.rejected || 0

  const activeEmpCount = Number(stats?.employees?.active || 0)
  const totalGoalsCount = Number(stats?.goals?.total || 0)
  const employeeUtilization = activeEmpCount > 0
    ? Math.round((totalGoalsCount / activeEmpCount) * 10) / 10
    : 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb' }}>
      <ClientAdminSidebar active="dashboard" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Top Header ── */}
        <header style={{
          background: '#ffffff', borderBottom: '1px solid #e2e8f0',
          padding: '0 36px', height: '62px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 200, flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>{companyName}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Client Admin Panel</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{today}</span>
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={handleBellClick}
                style={{
                  position: 'relative', background: showNotifications ? '#ede9fe' : '#f8fafc',
                  border: `1px solid ${showNotifications ? '#a78bfa' : '#e2e8f0'}`,
                  borderRadius: '10px', width: '42px', height: '42px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <FiBell size={18} color={showNotifications ? '#6366f1' : '#374151'} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', border: '2px solid #fff' }} />
                )}
              </button>
              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setShowNotifications(false)}
                  onMarkAllRead={handleMarkAllRead}
                  onViewAll={() => { navigate('/client-admin/audit'); setShowNotifications(false) }}
                  onNotifClick={n => { navigate(NOTIF_ROUTES[n.type]); setShowNotifications(false) }}
                />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800' }}>
                {displayName.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{displayName}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>Client Admin</div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto' }}>

          {/* ── Welcome Banner ── */}
          <div className="welcome-banner-card" style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
            borderRadius: '20px', padding: '28px 36px', marginBottom: '28px',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(99,102,241,0.2)',
          }}>
            <div style={{ position: 'absolute', right: '-60px', top: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: '40px', bottom: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  {today}
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', margin: '0 0 6px' }}>
                  Welcome back, {companyName}!
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: '400' }}>
                  {isPmsActive
                    ? "Here's your organisation's performance snapshot for today."
                    : "Here's your organisation's workforce & HR operations snapshot for today."}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, flexWrap: 'wrap' }}>
                {/* Date range pills */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '4px' }}>
                  {DATE_RANGES.map(r => (
                    <button key={r.value} onClick={() => setDateRange(r.value)} style={{
                      padding: '5px 11px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                      fontSize: '11px', fontWeight: '700', transition: 'all 0.2s',
                      background: dateRange === r.value ? 'rgba(255,255,255,0.9)' : 'transparent',
                      color: dateRange === r.value ? '#312e81' : 'rgba(255,255,255,0.75)',
                    }}>
                      {r.label}
                    </button>
                  ))}
                </div>
                {stats && isPmsActive ? (
                  <>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '36px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>{overallScore}%</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '4px', fontWeight: '500' }}>Overall Score</div>
                    </div>
                    <div style={{ padding: '8px 20px', background: `${perfColor}25`, border: `1.5px solid ${perfColor}60`, borderRadius: '20px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{perfLabel}</span>
                    </div>
                  </>
                ) : null}
                <button
                  onClick={loadStats}
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '10px', padding: '9px 16px', cursor: 'pointer', color: '#fff', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                >
                  <FiRefreshCw size={13} /> Refresh
                </button>
              </div>
            </div>
          </div>

          {/* ── Quick Access ── */}
          <div style={{ marginBottom: '28px' }}>
            <SectionLabel>Quick Access</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
              {visibleQuickLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  style={{
                    background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '14px',
                    padding: '16px 8px', cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = link.color; e.currentTarget.style.background = `${link.color}0c`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 18px ${link.color}25` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${link.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', margin: '0 auto 8px' }}>{link.icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '3px' }}>{link.label}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>{link.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <SkeletonRingCard /><SkeletonRingCard /><SkeletonRingCard />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <SkeletonPanel /><SkeletonPanel /><SkeletonPanel />
              </div>
            </>
          ) : !stats ? (
            <div style={{ textAlign: 'center', paddingTop: '80px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
              <div style={{ color: '#1e293b', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Failed to load dashboard</div>
              <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>{error}</div>
              <button onClick={loadStats} style={{ padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* ── KPI Summary Row: 3 ring cards ── */}
              {isPmsActive ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  {/* Overall Performance */}
                  <div style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    borderRadius: '16px', padding: '24px',
                    boxShadow: '0 8px 28px rgba(79,70,229,0.25)',
                    display: 'flex', alignItems: 'center', gap: '20px',
                  }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <svg width="76" height="76" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="38" cy="38" r="30" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="7" />
                        <circle cx="38" cy="38" r="30" fill="none" stroke="#ffffff" strokeWidth="7"
                          strokeDasharray={`${2 * Math.PI * 30}`}
                          strokeDashoffset={`${2 * Math.PI * 30 * (1 - overallScore / 100)}`}
                          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '900', color: '#fff' }}>{overallScore}%</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Performance</div>
                      <div style={{ fontSize: '22px', fontWeight: '900', color: '#fff' }}>{perfLabel}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>Goals + KPI composite score</div>
                    </div>
                  </div>

                  {/* Goal Completion */}
                  <div style={{ ...cardBase, display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <RingChart pct={stats.goals.completion_rate} color="#a855f7" size={84} label={`${stats.goals.completion_rate}%`} sublabel="done" />
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Goal Completion</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{stats.goals.by_status.completed || 0}</div>
                      <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px', fontWeight: '500' }}>of {stats.goals.total} goals done</div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', padding: '3px 10px', borderRadius: '20px', background: '#f3e8ff' }}>
                        <FiTarget size={11} color="#a855f7" />
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#7e22ce' }}>{pendingGoals} pending approval</span>
                      </div>
                    </div>
                  </div>

                  {/* KPI Approval */}
                  <div style={{ ...cardBase, display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <RingChart pct={stats.kpis.completion_rate} color="#10b981" size={84} label={`${stats.kpis.completion_rate}%`} sublabel="approved" />
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>KPI Approval</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{stats.kpis.by_status.approved || 0}</div>
                      <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px', fontWeight: '500' }}>of {stats.kpis.total} assignments</div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', padding: '3px 10px', borderRadius: '20px', background: '#d1fae5' }}>
                        <FiBarChart2 size={11} color="#10b981" />
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#065f46' }}>{stats.kpis.by_status.submitted || 0} awaiting review</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  {/* Today's Attendance Ring */}
                  {(() => {
                    const att = stats.attendance_today || { total: stats.employees?.active || 0, present: 0, absent: 0 }
                    const attRate = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0
                    return (
                      <div style={{ ...cardBase, display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <RingChart pct={attRate} color="#10b981" size={84} label={`${attRate}%`} sublabel="present" />
                        <div>
                          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Attendance Rate</div>
                          <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{att.present}</div>
                          <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px', fontWeight: '500' }}>of {att.total} employees present</div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', padding: '3px 10px', borderRadius: '20px', background: '#dcfce7' }}>
                            <FiCheck size={11} color="#15803d" />
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#15803d' }}>{att.absent} absent today</span>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Leave Requests */}
                  <div style={{ ...cardBase, display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FiCalendar size={36} color="#7c3aed" />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Leave Approvals</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{stats.pending_leaves || 0}</div>
                      <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px', fontWeight: '500' }}>pending requests</div>
                      <button onClick={() => navigate('/client-admin/leave-approvals')} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', padding: '3px 10px', borderRadius: '20px', background: '#ede9fe', border: 'none', cursor: 'pointer' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#6d28d9' }}>Review Leaves →</span>
                      </button>
                    </div>
                  </div>

                  {/* Regularization Approvals */}
                  <div style={{ ...cardBase, display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#e0f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FiClock size={36} color="#0891b2" />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Regularizations</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{stats.pending_regularizations || 0}</div>
                      <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px', fontWeight: '500' }}>pending adjustments</div>
                      <button onClick={() => navigate('/client-admin/regularizations')} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', padding: '3px 10px', borderRadius: '20px', background: '#e0f7fa', border: 'none', cursor: 'pointer' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#0891b2' }}>Review Requests →</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 4 Metric Cards ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <MetricCard
                  label="Total Employees"
                  value={stats.employees.active}
                  sub={`${stats.employees.inactive} inactive · ${stats.departments} depts`}
                  accent="#6366f1"
                  icon={FiUsers}
                  trendLabel={isPmsActive ? `${employeeUtilization} goals/employee avg` : `${stats.departments || 0} departments`}
                />
                {isPmsActive ? (
                  <>
                    <MetricCard
                      label="Total Goals"
                      value={stats.goals.total}
                      sub={`${stats.goals.by_status.completed || 0} completed`}
                      accent="#a855f7"
                      icon={FiTarget}
                      trend={goalRate}
                    />
                    <MetricCard
                      label="KPI Assignments"
                      value={stats.kpis.total}
                      sub={`${kpiRate}% approved`}
                      accent="#0ea5e9"
                      icon={FiBarChart2}
                      trend={kpiRate}
                    />
                    <MetricCard
                      label="Appraisal Cycles"
                      value={stats.appraisals.total_cycles}
                      sub={`${stats.appraisals.active_cycles} active · ${stats.appraisals.closed_cycles} closed`}
                      accent="#f59e0b"
                      icon={FiAward}
                    />
                  </>
                ) : (
                  <>
                    <MetricCard
                      label="Present Today"
                      value={stats.attendance_today?.present || 0}
                      sub={`${stats.attendance_today?.absent || 0} absent · ${stats.attendance_today?.half_day || 0} half-day`}
                      accent="#10b981"
                      icon={FiCheckCircle}
                    />
                    <MetricCard
                      label="Pending Leaves"
                      value={stats.pending_leaves || 0}
                      sub="Awaiting admin approval"
                      accent="#8b5cf6"
                      icon={FiCalendar}
                    />
                    <MetricCard
                      label="Pending Regularizations"
                      value={stats.pending_regularizations || 0}
                      sub="Correction requests"
                      accent="#0891b2"
                      icon={FiClock}
                    />
                  </>
                )}
              </div>

              {/* ── Today's Attendance Banner ── */}
              {stats.attendance_today && (() => {
                const att = stats.attendance_today
                const rate = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0
                const items = [
                  { label: 'Total Employees', value: att.total,   color: '#6366f1', bg: '#ede9fe' },
                  { label: 'Present Today',   value: att.present, color: '#16a34a', bg: '#dcfce7' },
                  { label: 'Absent Today',    value: att.absent,  color: '#dc2626', bg: '#fee2e2' },
                  { label: 'Attendance Rate', value: `${rate}%`,  color: '#0284c7', bg: '#e0f2fe' },
                ]
                return (
                  <div style={{ ...cardBase, marginBottom: '20px', padding: '18px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Today's Attendance
                      </div>
                      <button onClick={() => navigate('/client-admin/attendance')} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: '#6366f1', fontWeight: '700', cursor: 'pointer' }}>
                        View Full Report →
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                      {items.map(it => (
                        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: it.bg + '55', borderRadius: '12px', border: `1px solid ${it.color}22` }}>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: it.color, lineHeight: 1 }}>{it.value}</div>
                          <div style={{ fontSize: '12px', color: '#374151', fontWeight: '600', lineHeight: 1.3 }}>{it.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* ── Advanced Analytics: 4 action cards ── */}
              <SectionLabel>Advanced Analytics</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Pending Actions */}
                <div style={{ ...cardBase, borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Pending Actions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      ...(isPmsActive ? [
                        { label: 'Goals to Approve', value: pendingGoals, color: '#d97706', bg: '#fef3c7' },
                        { label: 'KPIs to Review', value: stats.kpis?.by_status?.submitted || 0, color: '#0284c7', bg: '#e0f2fe' },
                        { label: 'Rejected Goals', value: rejectedGoals, color: '#dc2626', bg: '#fee2e2' },
                      ] : []),
                      { label: 'Leave Requests', value: stats.pending_leaves || 0, color: '#7c3aed', bg: '#ede9fe' },
                      { label: 'Regularizations', value: stats.pending_regularizations || 0, color: '#0891b2', bg: '#e0f7fa' },
                      { label: 'Inactive Accounts', value: stats.employees?.inactive || 0, color: '#475569', bg: '#f1f5f9' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>{item.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: item.color, background: item.bg, padding: '2px 10px', borderRadius: '8px', minWidth: '28px', textAlign: 'center' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {isPmsActive ? (
                  <>
                    {/* Goal Health */}
                    <div style={{ ...cardBase, borderLeft: '4px solid #a855f7' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Goal Health</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { label: 'Active', value: activeGoals, color: '#15803d', bg: '#dcfce7' },
                          { label: 'Completed', value: stats.goals?.by_status?.completed || 0, color: '#6d28d9', bg: '#ede9fe' },
                          { label: 'Overdue', value: overdueGoals, color: '#c2410c', bg: '#ffedd5' },
                          { label: 'Draft', value: stats.goals?.by_status?.draft || 0, color: '#475569', bg: '#f1f5f9' },
                        ].map(item => (
                          <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>{item.label}</span>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: item.color, background: item.bg, padding: '2px 10px', borderRadius: '8px', minWidth: '28px', textAlign: 'center' }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Appraisal Status */}
                    <div style={{ ...cardBase, borderLeft: '4px solid #f59e0b' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Appraisal Status</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { label: 'Active Cycles', value: stats.appraisals?.active_cycles || 0, color: '#15803d', bg: '#dcfce7' },
                          { label: 'Draft Cycles', value: stats.appraisals?.draft_cycles || 0, color: '#475569', bg: '#f1f5f9' },
                          { label: 'Closed Cycles', value: stats.appraisals?.closed_cycles || 0, color: '#6d28d9', bg: '#ede9fe' },
                          { label: 'Total Cycles', value: stats.appraisals?.total_cycles || 0, color: '#b45309', bg: '#fef3c7' },
                        ].map(item => (
                          <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>{item.label}</span>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: item.color, background: item.bg, padding: '2px 10px', borderRadius: '8px', minWidth: '28px', textAlign: 'center' }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* KPI Breakdown */}
                    <div style={{ ...cardBase, borderLeft: '4px solid #10b981' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>KPI Breakdown</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { label: 'Approved', value: stats.kpis?.by_status?.approved || 0, color: '#15803d', bg: '#dcfce7' },
                          { label: 'Submitted', value: stats.kpis?.by_status?.submitted || 0, color: '#b45309', bg: '#fef3c7' },
                          { label: 'Pending', value: stats.kpis?.by_status?.pending || 0, color: '#475569', bg: '#f1f5f9' },
                          { label: 'Rejected', value: stats.kpis?.by_status?.rejected || 0, color: '#b91c1c', bg: '#fee2e2' },
                        ].map(item => (
                          <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>{item.label}</span>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: item.color, background: item.bg, padding: '2px 10px', borderRadius: '8px', minWidth: '28px', textAlign: 'center' }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Attendance Overview Card */}
                    <div style={{ ...cardBase, borderLeft: '4px solid #10b981' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Attendance Overview</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { label: 'Present Today', value: stats.attendance_today?.present || 0, color: '#15803d', bg: '#dcfce7' },
                          { label: 'Absent Today', value: stats.attendance_today?.absent || 0, color: '#dc2626', bg: '#fee2e2' },
                          { label: 'Half Day', value: stats.attendance_today?.half_day || 0, color: '#d97706', bg: '#fef3c7' },
                          { label: 'Total Scheduled', value: stats.attendance_today?.total || stats.employees?.active || 0, color: '#4f46e5', bg: '#ede9fe' },
                        ].map(item => (
                          <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>{item.label}</span>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: item.color, background: item.bg, padding: '2px 10px', borderRadius: '8px', minWidth: '28px', textAlign: 'center' }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* HR Operations Status Card */}
                    <div style={{ ...cardBase, borderLeft: '4px solid #6366f1' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>HR Operations</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { label: 'Active Employees', value: stats.employees?.active || 0, color: '#15803d', bg: '#dcfce7' },
                          { label: 'Departments', value: stats.departments || 0, color: '#6366f1', bg: '#ede9fe' },
                          { label: 'Pending Leave Req.', value: stats.pending_leaves || 0, color: '#7c3aed', bg: '#ede9fe' },
                          { label: 'Pending Regularizations', value: stats.pending_regularizations || 0, color: '#0891b2', bg: '#e0f7fa' },
                        ].map(item => (
                          <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>{item.label}</span>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: item.color, background: item.bg, padding: '2px 10px', borderRadius: '8px', minWidth: '28px', textAlign: 'center' }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ── Charts Row ── */}
              <div style={{ display: 'grid', gridTemplateColumns: isPmsActive ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                {isPmsActive && (
                  <>
                    {/* Goals by Status */}
                    <div style={cardBase}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                        <h3 style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700', margin: 0 }}>Goals by Status</h3>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', background: '#f1f5f9', padding: '3px 10px', borderRadius: '20px' }}>{stats.goals?.total || 0} total</span>
                      </div>
                      {goalStatuses.length === 0 ? (
                        <p style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>No goals yet</p>
                      ) : goalStatuses.map(([status, count]) => (
                        <ProgressBar key={status} label={status} value={count} max={stats.goals?.total || 1} color={STATUS_COLORS[status]?.bar || '#6366f1'} count={count} />
                      ))}
                    </div>

                    {/* KPI Status Ring */}
                    <div style={cardBase}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                        <h3 style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700', margin: 0 }}>KPI Status</h3>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', background: '#f1f5f9', padding: '3px 10px', borderRadius: '20px' }}>{stats.kpis?.total || 0} assignments</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
                        <RingChart pct={kpiRate} color="#10b981" size={96} label={`${kpiRate}%`} sublabel="approved" />
                      </div>
                      {kpiStatuses.length === 0 ? (
                        <p style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>No KPIs yet</p>
                      ) : kpiStatuses.map(([status, count]) => (
                        <ProgressBar key={status} label={status} value={count} max={stats.kpis?.total || 1} color={KPI_COLORS[status]?.bar || '#6366f1'} count={count} />
                      ))}
                    </div>
                  </>
                )}

                {/* Employees by Department */}
                <div style={cardBase}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700', margin: 0 }}>Employees by Dept</h3>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', background: '#f1f5f9', padding: '3px 10px', borderRadius: '20px' }}>Top 5</span>
                  </div>
                  {!stats.department_breakdown || stats.department_breakdown.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>No departments yet</p>
                  ) : (() => {
                    const maxCount = Math.max(...stats.department_breakdown.map(d => Number(d.employee_count)))
                    const deptColors = ['#6366f1', '#a855f7', '#0ea5e9', '#10b981', '#f59e0b']
                    return stats.department_breakdown.map((d, i) => (
                      <ProgressBar key={d.department} label={d.department} value={Number(d.employee_count)} max={maxCount} color={deptColors[i % deptColors.length]} count={d.employee_count} />
                    ))
                  })()}
                </div>

                {/* In HRMS Mode, show Latest Alerts here side by side */}
                {!isPmsActive && (
                  <div style={cardBase}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700', margin: 0 }}>Latest Alerts</h3>
                      {unreadCount > 0 && (
                        <span style={{ fontSize: '11px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '20px', fontWeight: '700' }}>
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '16px 0', color: '#6b7280', fontSize: '13px' }}>
                          <FiCheckCircle size={22} color="#10b981" style={{ marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
                          No pending actions
                        </div>
                      ) : notifications.slice(0, 4).map((n, i) => {
                        const meta = NOTIF_META[n.type] || { icon: FiInfo, color: '#6366f1' }
                        const Icon = meta.icon
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: n.read ? '#f8fafc' : `${meta.color}10`, border: `1px solid ${n.read ? '#e2e8f0' : meta.color + '25'}`, borderRadius: '10px' }}>
                            <Icon size={14} color={meta.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: n.read ? '500' : '700', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', fontWeight: '500' }}>{formatRelative(n.created_at)}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <button onClick={() => navigate('/client-admin/audit')} style={{ marginTop: 10, width: '100%', padding: '7px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#6366f1', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      View all activity <FiArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Bottom Row: Trend + Alerts + Performance (When PMS is Active) ── */}
              {isPmsActive && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    {/* Goal Trend */}
                    <div style={cardBase}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <h3 style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700', margin: 0 }}>Goal Trend</h3>
                        <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', background: '#f1f5f9', padding: '3px 8px', borderRadius: '12px' }}>Last 6 months</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#374151', fontWeight: '500' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#e0e7ff', display: 'inline-block' }} /> Total
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#374151', fontWeight: '500' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#6366f1', display: 'inline-block' }} /> Completed
                        </span>
                      </div>
                      <TrendBarChart data={stats.goal_trend} />
                    </div>

                    {/* Latest Alerts */}
                    <div style={cardBase}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h3 style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700', margin: 0 }}>Latest Alerts</h3>
                        {unreadCount > 0 && (
                          <span style={{ fontSize: '11px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '20px', fontWeight: '700' }}>
                            {unreadCount} unread
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {notifications.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '16px 0', color: '#6b7280', fontSize: '13px' }}>
                            <FiCheckCircle size={22} color="#10b981" style={{ marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
                            No pending actions
                          </div>
                        ) : notifications.slice(0, 5).map((n, i) => {
                          const meta = NOTIF_META[n.type] || { icon: FiInfo, color: '#6366f1' }
                          const Icon = meta.icon
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: n.read ? '#f8fafc' : `${meta.color}10`, border: `1px solid ${n.read ? '#e2e8f0' : meta.color + '25'}`, borderRadius: '10px' }}>
                              <Icon size={14} color={meta.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: n.read ? '500' : '700', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', fontWeight: '500' }}>{formatRelative(n.created_at)}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <button onClick={() => navigate('/client-admin/audit')} style={{ marginTop: 10, width: '100%', padding: '7px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#6366f1', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        View all activity <FiArrowRight size={12} />
                      </button>
                    </div>

                    {/* Performance Overview */}
                    <div style={cardBase}>
                      <h3 style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700', margin: '0 0 16px' }}>Performance Overview</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '18px' }}>
                        <RingChart pct={goalRate} color="#a855f7" size={84} label={`${goalRate}%`} sublabel="goals" />
                        <div style={{ flex: 1 }}>
                          {[
                            { label: 'Active Goals', value: activeGoals, color: '#15803d', bg: '#dcfce7' },
                            { label: 'Pending Approval', value: pendingGoals, color: '#b45309', bg: '#fef3c7' },
                            { label: 'Completed', value: stats.goals?.by_status?.completed || 0, color: '#4f46e5', bg: '#ede9fe' },
                          ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>{item.label}</span>
                              <span style={{ fontSize: '14px', fontWeight: '800', color: item.color, background: item.bg, padding: '1px 10px', borderRadius: '8px' }}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '12px', color: '#92400e', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FiAward size={13} color="#d97706" /> Appraisal Cycles
                        </div>
                        <div style={{ display: 'flex', gap: '20px' }}>
                          {[
                            { label: 'Active', value: stats.appraisals?.active_cycles || 0, color: '#15803d' },
                            { label: 'Draft', value: stats.appraisals?.draft_cycles || 0, color: '#475569' },
                            { label: 'Closed', value: stats.appraisals?.closed_cycles || 0, color: '#4f46e5' },
                          ].map(item => (
                            <div key={item.label} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '20px', fontWeight: '800', color: item.color }}>{item.value}</div>
                              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>{item.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Recent Goals ── */}
                  <div style={{ ...cardBase, marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700', margin: 0 }}>Recent Goals</h3>
                      <button onClick={() => navigate('/client-admin/goals')} style={{ background: '#ede9fe', border: 'none', color: '#6d28d9', fontSize: '12px', cursor: 'pointer', fontWeight: '700', padding: '6px 14px', borderRadius: '8px' }}>
                        View all →
                      </button>
                    </div>
                    {!stats.recent_goals || stats.recent_goals.length === 0 ? (
                      <p style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>No goals created yet</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {stats.recent_goals.map(g => (
                          <div key={g.id} style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                              <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{g.title}</div>
                              <GoalStatusBadge status={g.status} />
                            </div>
                            <div style={{ fontSize: '12px', color: '#4b5563', fontWeight: '500' }}>{g.assigned_to || 'Unassigned'} · Weight {g.weight || 0}%</div>
                            {g.due_date && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', fontWeight: '500' }}>Due: {new Date(g.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
