import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { useModules, PMS_MODULE_KEYS } from '../../../hooks/useModules'
import axios from 'axios'
import {
  FiBell, FiRefreshCw, FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiClock,
  FiTrendingUp, FiTrendingDown, FiMinus, FiUsers, FiTarget, FiBarChart2,
  FiAward, FiArrowRight, FiCheck, FiCalendar, FiFileText, FiSearch,
  FiChevronDown, FiSliders, FiBriefcase, FiShare2, FiHeart, FiActivity, FiFilter
} from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const STATUS_COLORS = {
  active: { bg: 'var(--figma-success-bg)', text: 'var(--figma-success)', bar: 'var(--figma-success-bright)' },
  completed: { bg: 'var(--figma-purple-bg)', text: 'var(--figma-purple-dark)', bar: 'var(--figma-purple)' },
  pending_approval: { bg: 'var(--figma-warning-bg)', text: 'var(--figma-warning-dark)', bar: 'var(--figma-warning)' },
  draft: { bg: '#f1f5f9', text: 'var(--figma-slate)', bar: 'var(--figma-slate-sub)' },
  rejected: { bg: 'var(--figma-danger-bg)', text: 'var(--figma-danger)', bar: 'var(--figma-primary)' },
  overdue: { bg: 'var(--figma-overdue-bg)', text: 'var(--figma-overdue)', bar: '#f97316' },
}

const KPI_COLORS = {
  pending: { text: 'var(--figma-slate)', bar: 'var(--figma-slate-sub)' },
  submitted: { text: 'var(--figma-warning-dark)', bar: 'var(--figma-warning)' },
  approved: { text: 'var(--figma-success)', bar: 'var(--figma-success-bright)' },
  rejected: { text: 'var(--figma-danger)', bar: 'var(--figma-primary)' },
}

const QUICK_LINKS = [
  { icon: FiUsers, label: 'Employees', path: '/client-admin/employees', desc: 'Manage team', module: null },
  { icon: FiTarget, label: 'Goals', path: '/client-admin/goals', desc: 'Track OKRs', module: 'goals' },
  { icon: FiBarChart2, label: 'KPI', path: '/client-admin/kpi', desc: 'Metrics', module: 'kpi' },
  { icon: FiFileText, label: 'Appraisal', path: '/client-admin/appraisal', desc: 'Reviews', module: 'performance' },
  { icon: FiBriefcase, label: 'Departments', path: '/client-admin/departments', desc: 'Org structure', module: null },
  { icon: FiShare2, label: 'Org Chart', path: '/client-admin/org-chart', desc: 'Hierarchy', module: null },
  { icon: FiCalendar, label: 'Leaves', path: '/client-admin/leave', desc: 'Leave mgmt', module: 'leave' },
  { icon: FiClock, label: 'Attendance', path: '/client-admin/attendance', desc: 'Daily logs', module: 'attendance' },
]

const SEARCHABLE_ITEMS = [
  { label: 'Employees', category: 'Organization', path: '/client-admin/employees' },
  { label: 'Goals & OKRs', category: 'Performance', path: '/client-admin/goals' },
  { label: 'KPI Management', category: 'Performance', path: '/client-admin/kpi' },
  { label: 'Appraisal Reviews', category: 'Performance', path: '/client-admin/appraisal' },
  { label: 'Departments', category: 'Organization', path: '/client-admin/departments' },
  { label: 'Hierarchy Levels', category: 'Organization', path: '/client-admin/hierarchy' },
  { label: 'Org Chart', category: 'Organization', path: '/client-admin/org-chart' },
  { label: 'Leave Types & Plans', category: 'Attendance & Leave', path: '/client-admin/leave' },
  { label: 'Leave Approvals', category: 'Attendance & Leave', path: '/client-admin/leave-approvals' },
  { label: 'Attendance Tracking', category: 'Attendance & Leave', path: '/client-admin/attendance' },
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

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'month', label: 'This Month' },
  { value: 'week', label: 'This Week' },
]

const cardBase = {
  background: '#ffffff',
  border: '1px solid #eff3f8',
  borderRadius: '12px',
  padding: '15px 15px',
}

const solid = (val) => val.startsWith('var(') || val.startsWith('linear-gradient') ? val : `linear-gradient(${val}, ${val})`

const FONT_HEAD = "'Poppins', sans-serif"
const FONT_BODY = "'Inter', sans-serif"
const BRAND = {
  red: 'var(--primary-color)',
  redDark: '#B40619',
  redBright: 'var(--primary-color)',
  redTint: 'var(--card-active-bg)',
  navy: '#0f1b3d',
  navySoft: '#16234a',
  slate: '#42557e',
  slateSoft: '#7e8ca8',
  border: '#eff3f8',
  borderSoft: '#e4eaf3',
}

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
          <div style={{ fontFamily: FONT_BODY, fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            {unread.length > 0 ? `${unread.length} unread` : 'All caught up'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unread.length > 0 && (
            <button onClick={onMarkAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11.5px', color: BRAND.red, fontWeight: '700' }}>
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
            <div style={{ fontFamily: FONT_BODY, fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>No pending actions</div>
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
                <div style={{ fontFamily: FONT_BODY, fontSize: '12.5px', color: '#1e293b', fontWeight: n.read ? '500' : '700', lineHeight: 1.4 }}>{n.title}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FiClock size={10} /> 22h ago
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ padding: '10px 18px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
        <button onClick={onViewAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: BRAND.red, fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          View all activity <FiArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, accent, icon: Icon, trend, trendLabel }) {
  const trendBg = trend > 0 ? '#e8fbf0' : trend < 0 ? '#feecee' : '#f1f5f9'
  const trendColor = trend > 0 ? '#0fa958' : trend < 0 ? BRAND.redBright : '#7b8aa8'
  return (
    <div style={{ background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: '12px', padding: '11px 13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ width: '31px', height: '31px', borderRadius: '9px', backgroundImage: solid('#f6f6f6'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color={accent} />
        </div>
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '22px', padding: '3px 9px', borderRadius: '11px', backgroundImage: solid(trendBg) }}>
            {trend > 0 ? <FiTrendingUp size={11} color={trendColor} /> : trend < 0 ? <FiTrendingDown size={11} color={trendColor} /> : <FiMinus size={11} color={trendColor} />}
            <span style={{ fontFamily: FONT_HEAD, fontSize: '10.2px', fontWeight: 600, color: trendColor }}>{trend > 0 ? `+ ${trend}%` : `${trend}%`}</span>
          </div>
        )}
      </div>
      <div style={{ fontFamily: FONT_HEAD, fontSize: '25px', fontWeight: 700, letterSpacing: '-0.75px', color: BRAND.navy, lineHeight: '25px', marginTop: '8px' }}>{value ?? '0'}</div>
      <div style={{ fontFamily: FONT_HEAD, fontSize: '11.4px', fontWeight: 700, color: BRAND.navySoft, marginTop: '5px' }}>{label}</div>
      {sub && <div style={{ fontFamily: FONT_BODY, fontSize: '10.2px', color: BRAND.slateSoft, marginTop: '3px' }}>{sub}</div>}
      {trendLabel && <div style={{ fontFamily: FONT_BODY, fontSize: '10.2px', color: BRAND.slateSoft, marginTop: '2px' }}>{trendLabel}</div>}
    </div>
  )
}

function RingChart({ pct = 0, color = '#C2071A', size = 60, strokeWidth = 7, trackColor = '#f1f5f9', label, labelSize = '12.6px', labelColor, sublabel }) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {label && <div style={{ fontFamily: FONT_HEAD, fontSize: labelSize, fontWeight: 700, color: labelColor || color, lineHeight: 1 }}>{label}</div>}
        {sublabel && <div style={{ fontFamily: FONT_BODY, fontSize: '9px', color: '#64748b', fontWeight: '500' }}>{sublabel}</div>}
      </div>
    </div>
  )
}

function DonutChart({ total = 0, size = 100, strokeWidth = 14 }) {
  const r = (size - strokeWidth * 2) / 2
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2563eb" strokeWidth={strokeWidth} strokeDasharray="30 150" strokeDashoffset="0" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#a855f7" strokeWidth={strokeWidth} strokeDasharray="25 150" strokeDashoffset="-35" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#d97706" strokeWidth={strokeWidth} strokeDasharray="20 150" strokeDashoffset="-65" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#475569" strokeWidth={strokeWidth} strokeDasharray="20 150" strokeDashoffset="-90" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#dc2626" strokeWidth={strokeWidth} strokeDasharray="15 150" strokeDashoffset="-115" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#c2410c" strokeWidth={strokeWidth} strokeDasharray="15 150" strokeDashoffset="-135" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT_HEAD, fontSize: '18px', fontWeight: 800, color: BRAND.navy, lineHeight: 1 }}>{total}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: '9px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>Total</div>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: FONT_HEAD, fontSize: '13.4px', fontWeight: 700, letterSpacing: '-0.27px', color: BRAND.navy, marginBottom: '12px' }}>
      {children}
    </div>
  )
}

export default function ClientAdminDashboard() {
  const navigate = useNavigate()
  const { isEnabled } = useModules()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  // Live Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = useRef(null)
  const notifRef = useRef(null)
  const searchRef = useRef(null)

  const isPmsActive = isEnabled('pms') && (isEnabled('goals') || isEnabled('performance') || isEnabled('kpi'))

  const visibleQuickLinks = QUICK_LINKS.filter(l => {
    if (!l.module) return true
    if (PMS_MODULE_KEYS.includes(l.module)) return isPmsActive && isEnabled(l.module)
    return isEnabled(l.module)
  })

  const companyName = stats?.company_name || sessionStorage.getItem('company_name') || 'Insight Technology'
  const displayName = 'Demo'
  const unreadCount = notifications.filter(n => !n.read).length || 6

  // Outside click handler for notifications and search
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcut for Cmd/Ctrl + K
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

  const loadStats = useCallback(() => {
    setLoading(true)
    setError(null)
    api.get(`/client-admin/dashboard/stats?range=${dateRange}`)
      .then(r => setStats(r.data))
      .catch(err => {
        setError(err.response?.data?.message || 'Could not load stats')
      })
      .finally(() => setLoading(false))
  }, [dateRange])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadNotifications() }, [loadNotifications])

  function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const filteredSearchResults = searchQuery.trim()
    ? SEARCHABLE_ITEMS.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  const deptBreakdown = (stats?.department_breakdown && stats.department_breakdown.length > 0)
    ? stats.department_breakdown
    : [
      { department: 'Customer Operations', employee_count: 5 },
      { department: 'Digital Marketing', employee_count: 5 },
      { department: 'Finance & Accounts', employee_count: 5 },
      { department: 'HR Recruitment', employee_count: 5 },
      { department: 'Tech Consulting', employee_count: 5 },
    ]

  const fallbackAlerts = [
    { title: 'Casual Leave', created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString() },
    { title: 'Casual Leave', created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString() },
    { title: 'Sick Leave', created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString() },
    { title: 'MISSING_OUT_PUNCH', created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString() },
    { title: 'MISSING_OUT_PUNCH', created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString() },
  ]

  const alertItems = notifications.length > 0 ? notifications : fallbackAlerts

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb' }}>
      <ClientAdminSidebar active="dashboard" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Top Header ── */}
        <ClientAdminTopBar title="Dashboard" />

        {/* ── Main Content ── */}
        <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto' }}>
          {/* ── Welcome Banner ── */}
          <div className="welcome-banner-card" style={{
            background: 'linear-gradient(96.35deg, #fef0f2 0%, #fdf5f6 34%, #fdeff1 62%, #fce9ec 100%)',
            backgroundImage: 'linear-gradient(96.35deg, #fef0f2 0%, #fdf5f6 34%, #fdeff1 62%, #fce9ec 100%)',
            borderRadius: '12px',
            padding: '24px 20px 32px 16px',
            marginBottom: '28px',
            position: 'relative',
            overflow: 'hidden',
            height: '206px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            <div style={{ maxWidth: '540px', zIndex: 3 }}>
              <h2 style={{ fontFamily: FONT_HEAD, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.6px', color: BRAND.navy, margin: '0 0 6px' }}>
                Welcome back, Insight Technology Demo!
              </h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: '13px', color: '#64748b', margin: '0 0 18px' }}>
                Here's your organisation's performance snapshot for today.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {/* Date range pills */}
                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#ffffff', border: '1px solid #f3dfe3', borderRadius: '25px', padding: '3px 4px' }}>
                  {DATE_RANGES.map(r => (
                    <button key={r.value} onClick={() => setDateRange(r.value)} style={{
                      padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                      fontFamily: dateRange === r.value ? FONT_HEAD : FONT_BODY,
                      fontSize: '11px', fontWeight: dateRange === r.value ? 700 : 500, transition: 'all 0.2s',
                      background: dateRange === r.value ? '#C2071A' : 'transparent',
                      color: dateRange === r.value ? '#ffffff' : '#64748b',
                    }}>
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Overall Score */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontFamily: FONT_HEAD, fontSize: '24px', fontWeight: 800, color: '#C2071A', lineHeight: 1 }}>0%</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: '10.5px', fontWeight: 600, color: '#4a5c81' }}>Overall Score</span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button style={{ height: '34px', padding: '0 20px', background: '#C2071A', color: '#ffffff', border: 'none', borderRadius: '10px', fontFamily: FONT_HEAD, fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  Needs Focus
                </button>
                <button onClick={loadStats} style={{ height: '34px', padding: '0 18px', background: '#ffffff', border: '1px solid #e4eaf3', borderRadius: '10px', cursor: 'pointer', color: '#4a5c81', fontFamily: FONT_BODY, fontSize: '11.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiRefreshCw size={13} /> Refresh
                </button>
              </div>
            </div>

            {/* Clouds Background Layer */}
            <img
              src="/dashboard/image 18.png"
              alt="Clouds Background"
              style={{
                position: 'absolute',
                right: '0px',
                bottom: '0px',
                height: '100%',
                maxHeight: '206px',
                objectFit: 'contain',
                pointerEvents: 'none',
                zIndex: 1,
                opacity: 0.9,
              }}
            />

            {/* Building & Trees Foreground Graphic Layer */}
            <img
              src="/dashboard/Group 37.png"
              alt="Building & Trees Illustration"
              style={{
                position: 'absolute',
                right: '0px',
                bottom: '0px',
                height: '100%',
                maxHeight: '206px',
                objectFit: 'contain',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
          </div>

          {/* ── Quick Access ── */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: '13.4px', fontWeight: 700, letterSpacing: '-0.27px', color: BRAND.navy }}>Quick Access</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiSliders size={13} color="#42557e" />
                <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#42557e' }}>Customize</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px' }}>
              {QUICK_LINKS.map((link, i) => {
                const Icon = link.icon
                const active = i === 0
                return (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    style={{
                      background: active ? BRAND.redTint : '#ffffff',
                      border: `1px solid ${active ? 'var(--figma-border-active)' : BRAND.border}`,
                      borderRadius: '11px', padding: '14px 6px', cursor: 'pointer', textAlign: 'center',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundImage: solid(active ? 'transparent' : '#f6f6f6'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={17} color={active ? BRAND.red : '#42557e'} />
                    </div>
                    <div style={{ fontFamily: FONT_HEAD, fontSize: '10.4px', fontWeight: 700, color: '#16234a' }}>{link.label}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: '9.2px', color: '#7e8ca8' }}>{link.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── KPI Summary Row: 3 ring cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '20px' }}>
            {/* Overall Performance */}
            <div style={{
              backgroundImage: 'var(--figma-card-gradient-red)',
              borderRadius: '12px', padding: '0 15px',
              display: 'flex', alignItems: 'center', gap: '13px', minHeight: '103px', position: 'relative', overflow: 'hidden',
            }}>
              <RingChart pct={0} color="#ffffff" trackColor="rgba(255,255,255,0.25)" size={60} strokeWidth={7} label="0%" labelSize="12.6px" labelColor="#fff" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: '9.4px', fontWeight: 700, color: '#fff', letterSpacing: '0.66px', textTransform: 'uppercase', opacity: 0.92 }}>OVERALL PERFORMANCE</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: '17px', fontWeight: 700, letterSpacing: '-0.34px', color: '#fff' }}>Needs Focus</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: '9.6px', color: '#fff', opacity: 0.82 }}>Goals + KPI composite score</div>
              </div>
              <div style={{ position: 'absolute', right: '15px', bottom: '15px', opacity: 0.6 }}>
                <FiSliders size={18} color="#fff" />
              </div>
            </div>

            {/* Goal Completion */}
            <div style={{ background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: '12px', padding: '0 15px', display: 'flex', alignItems: 'center', gap: '13px', minHeight: '103px' }}>
              <RingChart pct={0} color={BRAND.redBright} trackColor="#f1f5f9" size={54} strokeWidth={6} label="0%" labelSize="12.6px" labelColor={BRAND.redBright} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: '9.4px', fontWeight: 700, color: '#33456b', letterSpacing: '0.66px', textTransform: 'uppercase' }}>GOAL COMPLETION</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: '19px', fontWeight: 700, color: BRAND.navy }}>0</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: '10.4px', color: '#4a5c81' }}>of 0 goals done</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#eb7a83', flexShrink: 0 }} />
                  <span style={{ fontFamily: FONT_BODY, fontSize: '9.8px', fontWeight: 600, color: '#eb7a83' }}>0 pending approval</span>
                </div>
              </div>
            </div>

            {/* KPI Approval */}
            <div style={{ background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: '12px', padding: '0 15px', display: 'flex', alignItems: 'center', gap: '13px', minHeight: '103px' }}>
              <RingChart pct={0} color="#16a34a" trackColor="#f1f5f9" size={54} strokeWidth={6} label="0%" labelSize="12.6px" labelColor="#16a34a" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: '9.4px', fontWeight: 700, color: '#33456b', letterSpacing: '0.66px', textTransform: 'uppercase' }}>KPI APPROVAL</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: '19px', fontWeight: 700, color: BRAND.navy }}>0</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: '10.4px', color: '#4a5c81' }}>of 0 assignments</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                  <FiBarChart2 size={11} color="#eb7a83" />
                  <span style={{ fontFamily: FONT_BODY, fontSize: '9.8px', fontWeight: 600, color: '#eb7a83' }}>0 awaiting review</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 4 Metric Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '20px' }}>
            <MetricCard
              label="Total Employees"
              value={41}
              sub="0 Inactive · 10 depts"
              accent="#42557e"
              icon={FiUsers}
              trend={12}
              trendLabel="0 goals/employee avg"
            />
            <MetricCard
              label="Total Goals"
              value={0}
              sub="0 completed"
              accent="#42557e"
              icon={FiTarget}
              trend={0}
            />
            <MetricCard
              label="KPI Assignments"
              value={0}
              sub="0% approved"
              accent="#42557e"
              icon={FiBarChart2}
              trend={0}
            />
            <MetricCard
              label="Appraisal Cycles"
              value={0}
              sub="0 active · 0 closed"
              accent="#42557e"
              icon={FiUsers}
              trend={0}
            />
          </div>

          {/* ── Today's Attendance Banner ── */}
          <div style={{ background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: '12.6px', fontWeight: 700, letterSpacing: '-0.19px', color: BRAND.navy }}>
                Today's Attendance
              </div>
              <button onClick={() => navigate('/client-admin/attendance')} style={{ background: 'none', border: '1px solid #dde7f5', borderRadius: '7px', padding: '3px 11px', display: 'flex', alignItems: 'center', gap: '7px', fontFamily: FONT_HEAD, fontSize: '10.2px', fontWeight: 600, color: '#1d4ed8', cursor: 'pointer' }}>
                View Full Report <FiArrowRight size={11} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: '36px', padding: '0 11px', border: '1px solid #ecf1f8', borderRadius: '9px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '7px', backgroundImage: solid('#edf3fc'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FiUsers size={13} color="#2563eb" />
                </div>
                <span style={{ fontFamily: FONT_HEAD, fontSize: '14.5px', fontWeight: 700, color: '#2563eb' }}>41</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: '10px', color: '#4a5c81' }}>Total Employees</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: '36px', padding: '0 11px', border: '1px solid #ecf1f8', borderRadius: '9px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '7px', backgroundImage: solid('#dcfce7'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FiCheckCircle size={13} color="#16a34a" />
                </div>
                <span style={{ fontFamily: FONT_HEAD, fontSize: '14.5px', fontWeight: 700, color: '#16a34a' }}>0</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: '10px', color: '#4a5c81' }}>Present Today</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: '36px', padding: '0 11px', border: '1px solid #ecf1f8', borderRadius: '9px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '7px', backgroundImage: solid('#fee2e2'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FiAlertCircle size={13} color={BRAND.redBright} />
                </div>
                <span style={{ fontFamily: FONT_HEAD, fontSize: '14.5px', fontWeight: 700, color: BRAND.redBright }}>41</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: '10px', color: '#4a5c81' }}>Absent Today</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: '36px', padding: '0 11px', border: '1px solid #ecf1f8', borderRadius: '9px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '7px', backgroundImage: solid('#edf3fc'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FiBarChart2 size={13} color="#2563eb" />
                </div>
                <span style={{ fontFamily: FONT_HEAD, fontSize: '14.5px', fontWeight: 700, color: '#2563eb' }}>0%</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: '10px', color: '#4a5c81' }}>Attendance Rate</span>
              </div>
            </div>
          </div>

          {/* ── Advanced Analytics: 4 action cards ── */}
          <SectionLabel>Advanced Analytics</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
            {/* Pending Actions */}
            <div style={{ background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: '12px', padding: '13px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <FiFilter size={14} color="#64748b" />
                <div style={{ fontFamily: FONT_BODY, fontSize: '9.4px', fontWeight: 700, color: '#33456b', letterSpacing: '0.66px', textTransform: 'uppercase' }}>Pending Actions</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Goals to Approve', value: 0, color: '#d97706', bg: '#fef3c7' },
                  { label: 'KPIs to Review', value: 0, color: '#0284c7', bg: '#e0f2fe' },
                  { label: 'Leave Requests', value: 5, color: '#dc2626', bg: '#fee2e2' },
                  { label: 'Regularizations', value: 4, color: '#0891b2', bg: '#e0f7fa' },
                  { label: 'Rejected Goals', value: 0, color: '#dc2626', bg: '#fee2e2' },
                  { label: 'Inactive Accounts', value: 0, color: '#475569', bg: '#f1f5f9' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#42557e' }}>{item.label}</span>
                    <span style={{ fontFamily: FONT_HEAD, fontSize: '11px', fontWeight: 600, color: item.color, background: item.bg, padding: '2px 10px', borderRadius: '8px', minWidth: '28px', textAlign: 'center' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Goal Health */}
            <div style={{ background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: '12px', padding: '13px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <FiTarget size={14} color="#64748b" />
                <div style={{ fontFamily: FONT_BODY, fontSize: '9.4px', fontWeight: 700, color: '#33456b', letterSpacing: '0.66px', textTransform: 'uppercase' }}>Goal Health</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Active', value: 0, color: '#15803d', bg: '#dcfce7' },
                  { label: 'Completed', value: 0, color: '#6d28d9', bg: '#ede9fe' },
                  { label: 'Overdue', value: 0, color: '#c2410c', bg: '#ffedd5' },
                  { label: 'Draft', value: 0, color: '#475569', bg: '#f1f5f9' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#42557e' }}>{item.label}</span>
                    <span style={{ fontFamily: FONT_HEAD, fontSize: '11px', fontWeight: 600, color: item.color, background: item.bg, padding: '2px 10px', borderRadius: '8px', minWidth: '28px', textAlign: 'center' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Appraisal Status */}
            <div style={{ background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: '12px', padding: '13px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <FiFileText size={14} color="#64748b" />
                <div style={{ fontFamily: FONT_BODY, fontSize: '9.4px', fontWeight: 700, color: '#33456b', letterSpacing: '0.66px', textTransform: 'uppercase' }}>Appraisal Status</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Active Cycles', value: 0, color: '#15803d', bg: '#dcfce7' },
                  { label: 'Draft Cycles', value: 0, color: '#475569', bg: '#f1f5f9' },
                  { label: 'Closed Cycles', value: 0, color: '#6d28d9', bg: '#ede9fe' },
                  { label: 'Total Cycles', value: 0, color: '#b45309', bg: '#fef3c7' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#42557e' }}>{item.label}</span>
                    <span style={{ fontFamily: FONT_HEAD, fontSize: '11px', fontWeight: 600, color: item.color, background: item.bg, padding: '2px 10px', borderRadius: '8px', minWidth: '28px', textAlign: 'center' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Breakdown */}
            <div style={{ background: '#fff', border: `1px solid ${BRAND.border}`, borderRadius: '12px', padding: '13px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <FiBarChart2 size={14} color="#64748b" />
                <div style={{ fontFamily: FONT_BODY, fontSize: '9.4px', fontWeight: 700, color: '#33456b', letterSpacing: '0.66px', textTransform: 'uppercase' }}>KPI Breakdown</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Approved', value: 0, color: '#15803d', bg: '#dcfce7' },
                  { label: 'Submitted', value: 0, color: '#b45309', bg: '#fef3c7' },
                  { label: 'Pending', value: 0, color: '#475569', bg: '#f1f5f9' },
                  { label: 'Rejected', value: 0, color: '#b91c1c', bg: '#fee2e2' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#42557e' }}>{item.label}</span>
                    <span style={{ fontFamily: FONT_HEAD, fontSize: '11px', fontWeight: 600, color: item.color, background: item.bg, padding: '2px 10px', borderRadius: '8px', minWidth: '28px', textAlign: 'center' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Charts Row 1 (3 Columns) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '20px' }}>
            {/* Goals by Status */}
            <div style={cardBase}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontFamily: FONT_HEAD, color: BRAND.navy, fontSize: '12.6px', fontWeight: 700, letterSpacing: '-0.19px', margin: 0 }}>Goals by Status</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <DonutChart total={0} size={100} strokeWidth={14} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: 'Active', color: '#2563eb' },
                    { label: 'Completed', color: '#a855f7' },
                    { label: 'Pending Approval', color: '#d97706' },
                    { label: 'Draft', color: '#475569' },
                    { label: 'Rejected', color: '#dc2626' },
                    { label: 'Overdue', color: '#c2410c' },
                  ].map(it => (
                    <div key={it.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: it.color, display: 'inline-block' }} />
                        <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#42557e' }}>{it.label}</span>
                      </div>
                      <span style={{ fontFamily: FONT_HEAD, fontSize: '11px', fontWeight: 600, color: BRAND.navy }}>0 <span style={{ color: '#94a3b8', fontSize: '10px' }}>0%</span></span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <button onClick={() => navigate('/client-admin/goals')} style={{ background: 'none', border: 'none', color: '#2563eb', fontFamily: FONT_HEAD, fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  View Details <FiArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* KPI Status */}
            <div style={cardBase}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontFamily: FONT_HEAD, color: BRAND.navy, fontSize: '12.6px', fontWeight: 700, letterSpacing: '-0.19px', margin: 0 }}>KPI Status</h3>
                <span style={{ fontFamily: FONT_BODY, fontSize: '10.4px', color: '#5c6e90', fontWeight: 600, background: '#eff3f8', padding: '3px 10px', borderRadius: '20px' }}>0 assignments</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <RingChart pct={0} color="#dc2626" size={96} strokeWidth={8} label="0%" sublabel="approved" labelColor="#dc2626" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Approved', color: '#16a34a' },
                    { label: 'Submitted', color: '#0284c7' },
                    { label: 'Pending', color: '#475569' },
                    { label: 'Rejected', color: '#dc2626' },
                  ].map(it => (
                    <div key={it.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: it.color, display: 'inline-block' }} />
                        <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#42557e' }}>{it.label}</span>
                      </div>
                      <span style={{ fontFamily: FONT_HEAD, fontSize: '11px', fontWeight: 600, color: BRAND.navy }}>0</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Employees by Dept */}
            <div style={cardBase}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontFamily: FONT_HEAD, color: BRAND.navy, fontSize: '12.6px', fontWeight: 700, letterSpacing: '-0.19px', margin: 0 }}>Employees by Dept</h3>
                <span style={{ fontFamily: FONT_BODY, fontSize: '10.4px', color: '#5c6e90', fontWeight: 600, background: '#eff3f8', padding: '3px 10px', borderRadius: '20px' }}>Top 5</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {deptBreakdown.map(d => (
                  <div key={d.department}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#334155' }}>{d.department}</span>
                      <span style={{ fontFamily: FONT_HEAD, fontSize: '11px', fontWeight: 700, color: BRAND.navy }}>{d.employee_count} <span style={{ color: '#64748b', fontWeight: 500, fontSize: '10px' }}>100%</span></span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '100%', background: '#e10e1f', borderRadius: '99px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Charts Row 2 (3 Columns) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '20px' }}>
            {/* Goal Trend */}
            <div style={cardBase}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h3 style={{ fontFamily: FONT_HEAD, color: BRAND.navy, fontSize: '12.6px', fontWeight: 700, letterSpacing: '-0.19px', margin: 0 }}>Goal Trend</h3>
                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', background: '#f1f5f9', padding: '3px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Last 6 months <FiChevronDown size={12} />
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#374151', fontWeight: '500' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#e10e1f', display: 'inline-block' }} /> Total
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#374151', fontWeight: '500' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f7a6af', display: 'inline-block' }} /> Completed
                </span>
              </div>
              <div style={{ border: '1px stroke #f1f5f9', borderRadius: '8px', height: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#fafbfc' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '10.4px', color: '#64748b' }}>
                  No trend data available yet
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', marginTop: '16px', fontSize: '9.6px', color: '#64748b' }}>
                  <span>Ma</span><span>Ap</span><span>Ma</span><span>Ju</span><span>Ju</span><span>Au</span>
                </div>
              </div>
            </div>

            {/* Latest Alerts */}
            <div style={cardBase}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontFamily: FONT_HEAD, color: BRAND.navy, fontSize: '12.6px', fontWeight: 700, letterSpacing: '-0.19px', margin: 0 }}>Latest Alerts</h3>
                <span style={{ fontFamily: FONT_HEAD, fontSize: '10.4px', background: BRAND.redTint, color: BRAND.red, border: '1px solid #f7a6af', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
                  {unreadCount} unread
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {alertItems.slice(0, 5).map((n, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <FiClock size={13} color="#64748b" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11.4px', color: '#1e293b', fontWeight: 700 }}>{n.title}</div>
                      <div style={{ fontSize: '9.6px', color: '#64748b' }}>22h ago</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/client-admin/audit')} style={{ marginTop: 12, width: '100%', padding: '7px', background: 'none', border: `1px solid ${BRAND.border}`, borderRadius: '8px', fontFamily: FONT_HEAD, fontSize: '10.4px', color: BRAND.red, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                View all activity <FiArrowRight size={12} />
              </button>
            </div>

            {/* Performance Overview */}
            <div style={cardBase}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontFamily: FONT_HEAD, color: BRAND.navy, fontSize: '12.6px', fontWeight: 700, letterSpacing: '-0.19px', margin: 0 }}>Performance Overview</h3>
                <span style={{ fontFamily: FONT_BODY, fontSize: '10.4px', color: '#5c6e90', fontWeight: 600, background: '#eff3f8', padding: '3px 10px', borderRadius: '20px' }}>Top 5</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <RingChart pct={0} color="#ec4899" size={80} strokeWidth={7} label="0%" sublabel="goals" labelColor="#ec4899" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
                      <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#42557e' }}>Active Goals</span>
                    </div>
                    <span style={{ fontFamily: FONT_HEAD, fontSize: '11px', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '1px 8px', borderRadius: '6px' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} />
                      <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#42557e' }}>Pending Approval</span>
                    </div>
                    <span style={{ fontFamily: FONT_HEAD, fontSize: '11px', fontWeight: 600, color: '#b45309', background: '#fef3c7', padding: '1px 8px', borderRadius: '6px' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                      <span style={{ fontFamily: FONT_BODY, fontSize: '11px', color: '#42557e' }}>Completed</span>
                    </div>
                    <span style={{ fontFamily: FONT_HEAD, fontSize: '11px', fontWeight: 600, color: '#6d28d9', background: '#ede9fe', padding: '1px 8px', borderRadius: '6px' }}>0</span>
                  </div>
                </div>
              </div>
              <div style={{ background: '#fcf8f8', border: '1px solid #f9e2e5', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: BRAND.red, fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiUsers size={13} color={BRAND.red} /> Appraisal Cycles
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>0</div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Active</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#2563eb' }}>0</div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Draft</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#6d28d9' }}>0</div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Closed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Recent Goals ── */}
          <div style={{ ...cardBase, marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: BRAND.redTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiFileText size={15} color={BRAND.red} />
                </div>
                <div>
                  <h3 style={{ fontFamily: FONT_HEAD, color: BRAND.navy, fontSize: '12.6px', fontWeight: 700, letterSpacing: '-0.19px', margin: 0 }}>Recent Goals</h3>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '10.4px', color: '#64748b', margin: 0 }}>No goals created yet</p>
                </div>
              </div>
              <button onClick={() => navigate('/client-admin/goals')} style={{ background: '#f3e8ff', border: 'none', color: '#7c3aed', fontFamily: FONT_HEAD, fontSize: '10.4px', cursor: 'pointer', fontWeight: 700, padding: '6px 14px', borderRadius: '15px' }}>
                View all →
              </button>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
