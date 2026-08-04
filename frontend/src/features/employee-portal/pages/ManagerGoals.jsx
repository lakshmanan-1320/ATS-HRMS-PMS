import React, { useEffect, useState, useCallback, useRef } from 'react'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const STATUS_META = {
  draft:       { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Draft' },
  active:      { bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', label: 'Active' },
  in_progress: { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', label: 'In Progress' },
  submitted:   { bg: 'rgba(245,158,11,0.1)',  color: '#d97706', label: 'Submitted' },
  approved:    { bg: 'rgba(16,185,129,0.1)',  color: '#059669', label: 'Approved' },
  completed:   { bg: 'rgba(16,185,129,0.12)', color: '#059669', label: 'Completed' },
  rejected:    { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'Rejected' },
}

const ACTION_META = {
  created:                       { label: 'Goal Created',                  color: '#6366f1' },
  sub_goal_added:                { label: 'Sub-Goal Added',                color: '#8b5cf6' },
  submitted_for_approval:        { label: 'Submitted for Approval',        color: '#d97706' },
  approved:                      { label: 'Approved by Manager',           color: '#059669' },
  rejected:                      { label: 'Rejected by Manager',           color: '#ef4444' },
  activated:                     { label: 'Goal Activated',                color: '#22c55e' },
  completion_requested:          { label: 'Completion Requested',          color: '#0284c7' },
  completion_withdrawn:          { label: 'Completion Request Withdrawn',  color: '#64748b' },
  completion_approved:           { label: 'Completion Approved',           color: '#10b981' },
  completion_rejected:           { label: 'Completion Rejected',           color: '#ef4444' },
  sub_goal_completion_requested: { label: 'Sub-Goal Completion Requested', color: '#0284c7' },
  sub_goal_completed:            { label: 'Sub-Goal Completed',            color: '#10b981' },
  progress_overridden:           { label: 'Progress Overridden',           color: '#d97706' },
}

const PRIORITY_META = {
  high:   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'High' },
  medium: { color: '#d97706', bg: 'rgba(245,158,11,0.08)',  label: 'Medium' },
  low:    { color: '#059669', bg: 'rgba(16,185,129,0.08)',  label: 'Low' },
}

const STATUS_BORDER = {
  submitted:   '#d97706',
  approved:    '#10b981',
  rejected:    '#ef4444',
  in_progress: '#6366f1',
  completed:   '#10b981',
  draft:       '#94a3b8',
}

const inputSt = {
  boxSizing: 'border-box', padding: '8px 12px',
  background: '#ffffff', border: '1px solid #e2e8f0',
  borderRadius: '8px', color: '#1e293b', fontSize: '13px', fontFamily: 'inherit',
  outline: 'none', colorScheme: 'light',
}

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ name, size = 36 }) {
  const colors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444']
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: colors[idx], color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: '700', flexShrink: 0,
    }}>{initials(name)}</div>
  )
}

function Badge({ status }) {
  const s = STATUS_META[status] || STATUS_META.draft
  return (
    <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: s.bg, color: s.color, letterSpacing: '0.01em' }}>
      {s.label}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const p = PRIORITY_META[priority] || PRIORITY_META.medium
  return (
    <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: p.bg, color: p.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {p.label}
    </span>
  )
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) } }, [msg])
  if (!msg) return null
  const isErr = type === 'error'
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
      background: isErr ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
      border: `1px solid ${isErr ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
      color: isErr ? '#ef4444' : '#059669',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>{msg}</div>
  )
}

function RejectModal({ title, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{title || 'Reject'}</div>
        <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px', marginTop: '14px' }}>Reason for rejection</label>
        <textarea
          rows={4} value={reason} onChange={e => setReason(e.target.value)} autoFocus
          placeholder="Provide feedback so the employee can improve and resubmit..."
          style={{ ...inputSt, width: '100%', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={() => onConfirm(reason)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>Reject</button>
        </div>
      </div>
    </div>
  )
}

function GoalTimeline({ goalId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)

  useEffect(() => {
    setLoading(true); setErr(false)
    api.get(`/employee/goals/${goalId}/history`)
      .then(res => setHistory(res.data || []))
      .catch(() => setErr(true))
      .finally(() => setLoading(false))
  }, [goalId])

  if (loading) return <div style={{ padding: '12px 0', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading history...</div>
  if (err) return <div style={{ padding: '12px 0', textAlign: 'center', color: '#ef4444', fontSize: '12px' }}>Failed to load history.</div>
  if (!history.length) return <div style={{ padding: '12px 0', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>No activity recorded yet.</div>

  return (
    <div style={{ marginTop: '12px', padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e8eaf0' }}>
      <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Activity Timeline</div>
      <div style={{ position: 'relative', paddingLeft: '20px' }}>
        <div style={{ position: 'absolute', left: '5px', top: '4px', bottom: '4px', width: '2px', background: '#e8eaf0', borderRadius: '1px' }} />
        {history.map(entry => {
          const meta = ACTION_META[entry.action] || { label: entry.action, color: '#64748b' }
          const isSub = String(entry.goal_id) !== String(goalId)
          return (
            <div key={entry.id} style={{ position: 'relative', marginBottom: '12px' }}>
              <div style={{ position: 'absolute', left: '-16px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: meta.color, border: '2px solid #f8fafc' }} />
              <div style={{ fontSize: '12px', fontWeight: '600', color: meta.color, marginBottom: '2px' }}>{meta.label}</div>
              {isSub && entry.goal_title && <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>↳ {entry.goal_title}</div>}
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {entry.actor_name && <span style={{ color: '#64748b', fontWeight: '500' }}>{entry.actor_name}</span>}
                <span style={{ marginLeft: entry.actor_name ? '8px' : 0 }}>{fmtDateTime(entry.created_at)}</span>
              </div>
              {entry.note && (
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', padding: '6px 10px', background: '#ffffff', borderRadius: '6px', lineHeight: '1.5', borderLeft: `2px solid ${meta.color}40`, border: '1px solid #e8eaf0' }}>
                  {entry.note}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      flex: 1, minWidth: '120px',
      background: '#ffffff', border: '1px solid #e8eaf0',
      borderRadius: '12px', padding: '16px 20px',
      borderTop: `3px solid ${color}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: '800', color, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function Pagination({ page, limit, total, onPageChange }) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return (
    <div style={{ marginTop: '16px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
      {total} {total === 1 ? 'result' : 'results'}
    </div>
  )

  const maxVisible = 5
  let start = Math.max(1, page - Math.floor(maxVisible / 2))
  const end = Math.min(totalPages, start + maxVisible - 1)
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)

  const pgBtn = (active, disabled, onClick, children) => (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        minWidth: '32px', height: '32px', padding: '0 6px', borderRadius: '8px',
        border: `1px solid ${active ? '#6366f1' : '#e2e8f0'}`,
        background: active ? '#6366f1' : disabled ? '#f8fafc' : '#ffffff',
        color: active ? '#ffffff' : disabled ? '#cbd5e1' : '#475569',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >{children}</button>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', flexWrap: 'wrap', gap: '10px' }}>
      <div style={{ fontSize: '13px', color: '#64748b' }}>
        Showing <strong>{Math.min((page - 1) * limit + 1, total)}</strong>–<strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
        {pgBtn(false, page === 1, () => onPageChange(page - 1), '‹')}
        {start > 1 && <>{pgBtn(false, false, () => onPageChange(1), '1')}{start > 2 && <span style={{ color: '#94a3b8', padding: '0 4px' }}>…</span>}</>}
        {pages.map(p => pgBtn(p === page, false, () => onPageChange(p), p))}
        {end < totalPages && <>{end < totalPages - 1 && <span style={{ color: '#94a3b8', padding: '0 4px' }}>…</span>}{pgBtn(false, false, () => onPageChange(totalPages), totalPages)}</>}
        {pgBtn(false, page === totalPages, () => onPageChange(page + 1), '›')}
      </div>
    </div>
  )
}

function FilterBar({ filters, onFiltersChange, employees, statusOptions, placeholder }) {
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  const handleSearch = (val) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: val, page: 1 })
    }, 350)
  }

  const hasActiveFilters = filters.status !== 'all' || filters.employeeId || filters.search

  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
        <input
          ref={searchRef}
          defaultValue={filters.search}
          onChange={e => handleSearch(e.target.value)}
          placeholder={placeholder || 'Search goals...'}
          style={{ ...inputSt, width: '100%', paddingLeft: '32px' }}
        />
      </div>
      <select
        value={filters.status}
        onChange={e => onFiltersChange({ ...filters, status: e.target.value, page: 1 })}
        style={{ ...inputSt, minWidth: '150px' }}
      >
        {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <select
        value={filters.employeeId}
        onChange={e => onFiltersChange({ ...filters, employeeId: e.target.value, page: 1 })}
        style={{ ...inputSt, minWidth: '160px' }}
      >
        <option value="">All Employees</option>
        {employees.map(e => (
          <option key={e.employee_id} value={e.employee_id}>
            {e.first_name} {e.last_name}
          </option>
        ))}
      </select>
      {hasActiveFilters && (
        <button
          onClick={() => {
            if (searchRef.current) searchRef.current.value = ''
            onFiltersChange({ status: 'all', employeeId: '', search: '', page: 1 })
          }}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #fca5a5', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          × Clear
        </button>
      )}
    </div>
  )
}

export default function ManagerGoals() {
  const [activeTab, setActiveTab] = useState('submissions')
  const [directReports, setDirectReports] = useState([])

  const [goalData, setGoalData] = useState({ goals: [], total: 0, page: 1, limit: 10, counts: { submitted: 0, approved: 0, rejected: 0 } })
  const [goalLoading, setGoalLoading] = useState(false)
  const [goalFilters, setGoalFilters] = useState({ status: 'all', employeeId: '', search: '', page: 1 })

  const [completionData, setCompletionData] = useState({ requests: [], total: 0, page: 1, limit: 10, counts: { pending: 0, approved: 0, rejected: 0 } })
  const [completionLoading, setCompletionLoading] = useState(false)
  const [completionFilters, setCompletionFilters] = useState({ status: 'all', employeeId: '', search: '', page: 1 })

  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectMode, setRejectMode] = useState('goal')
  const [expandedHistory, setExpandedHistory] = useState(null)

  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    Promise.all([
      api.get('/employee/manager/direct-reports'),
    ]).then(([reportsRes]) => {
      setDirectReports(reportsRes.data || [])
    }).catch(() => showToast('Failed to load team data', 'error'))
  }, [])

  const fetchGoals = useCallback((filters) => {
    setGoalLoading(true)
    const params = new URLSearchParams()
    if (filters.status && filters.status !== 'all') params.set('status', filters.status)
    if (filters.employeeId) params.set('employee_id', filters.employeeId)
    if (filters.search) params.set('search', filters.search)
    if (filters.page) params.set('page', filters.page)
    params.set('limit', 10)
    api.get(`/employee/manager/team-goals?${params}`)
      .then(res => setGoalData(res.data))
      .catch(() => showToast('Failed to load team goals', 'error'))
      .finally(() => setGoalLoading(false))
  }, [])

  const fetchCompletions = useCallback((filters) => {
    setCompletionLoading(true)
    const params = new URLSearchParams()
    if (filters.status && filters.status !== 'all') params.set('status', filters.status)
    if (filters.employeeId) params.set('employee_id', filters.employeeId)
    if (filters.search) params.set('search', filters.search)
    if (filters.page) params.set('page', filters.page)
    params.set('limit', 10)
    api.get(`/employee/manager/completion-requests?${params}`)
      .then(res => setCompletionData(res.data))
      .catch(() => showToast('Failed to load completion requests', 'error'))
      .finally(() => setCompletionLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'submissions') fetchGoals(goalFilters)
  }, [goalFilters, activeTab])

  useEffect(() => {
    if (activeTab === 'completion') fetchCompletions(completionFilters)
  }, [completionFilters, activeTab])

  async function handleApprove(goalId) {
    try {
      await api.post(`/employee/manager/team-goals/${goalId}/approve`)
      showToast('Goal approved.')
      fetchGoals(goalFilters)
    } catch (err) {
      showToast(err.response?.data?.message || 'Approve failed.', 'error')
    }
  }

  async function handleReject(goalId, reason) {
    try {
      await api.post(`/employee/manager/team-goals/${goalId}/reject`, { reason })
      showToast('Goal rejected.')
      setRejectTarget(null)
      fetchGoals(goalFilters)
    } catch (err) {
      showToast(err.response?.data?.message || 'Reject failed.', 'error')
    }
  }

  async function handleApproveCompletion(goalId) {
    try {
      await api.post(`/employee/manager/completion-requests/${goalId}/approve`)
      showToast('Sub-goal completion approved.')
      fetchCompletions(completionFilters)
    } catch (err) {
      showToast(err.response?.data?.message || 'Approve failed.', 'error')
    }
  }

  async function handleRejectCompletion(goalId, reason) {
    try {
      await api.post(`/employee/manager/completion-requests/${goalId}/reject`, { reason })
      showToast('Completion request rejected.')
      setRejectTarget(null)
      fetchCompletions(completionFilters)
    } catch (err) {
      showToast(err.response?.data?.message || 'Reject failed.', 'error')
    }
  }

  const tabStyle = (key) => ({
    padding: '9px 22px', borderRadius: '8px', border: '1.5px solid',
    cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit',
    background: activeTab === key ? '#6366f1' : '#ffffff',
    color: activeTab === key ? '#fff' : '#64748b',
    borderColor: activeTab === key ? '#6366f1' : '#e2e8f0',
    transition: 'all 0.15s',
  })

  const gCounts = goalData.counts || {}
  const cCounts = completionData.counts || {}

  const GOAL_STATUS_OPTS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'submitted', label: `Pending (${gCounts.submitted || 0})` },
    { value: 'approved', label: `Approved (${gCounts.approved || 0})` },
    { value: 'rejected', label: `Rejected (${gCounts.rejected || 0})` },
  ]

  const COMP_STATUS_OPTS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: `Pending (${cCounts.pending || 0})` },
    { value: 'approved', label: `Approved (${cCounts.approved || 0})` },
    { value: 'rejected', label: `Rejected (${cCounts.rejected || 0})` },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, sans-serif' }}>
      <EmployeeSidebar active="manager-goals" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="Team Goals" />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {/* Page Header */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Team Goals</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Review team submissions and approve completions
            </p>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {activeTab === 'submissions' ? <>
              <StatCard label="Pending Approvals" value={gCounts.submitted || 0} color="#d97706" />
              <StatCard label="Approved Goals"    value={gCounts.approved || 0} color="#10b981" />
              <StatCard label="Rejected Goals"    value={gCounts.rejected || 0} color="#ef4444" />
              <StatCard label="In Progress"       value={gCounts.in_progress || 0} color="#6366f1" />
            </> : <>
              <StatCard label="Pending Completions" value={cCounts.pending || 0}  color="#d97706" />
              <StatCard label="Approved"            value={cCounts.approved || 0} color="#10b981" />
              <StatCard label="Rejected"            value={cCounts.rejected || 0} color="#ef4444" />
            </>}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <button style={tabStyle('submissions')} onClick={() => setActiveTab('submissions')}>
              Goal Approvals
              {gCounts.submitted > 0 && (
                <span style={{ marginLeft: '6px', padding: '1px 7px', borderRadius: '12px', background: activeTab === 'submissions' ? 'rgba(255,255,255,0.3)' : 'rgba(245,158,11,0.15)', color: activeTab === 'submissions' ? '#fff' : '#d97706', fontSize: '11px', fontWeight: '800' }}>
                  {gCounts.submitted}
                </span>
              )}
            </button>
            <button style={tabStyle('completion')} onClick={() => setActiveTab('completion')}>
              Completion Requests
              {cCounts.pending > 0 && (
                <span style={{ marginLeft: '6px', padding: '1px 7px', borderRadius: '12px', background: activeTab === 'completion' ? 'rgba(255,255,255,0.3)' : 'rgba(245,158,11,0.15)', color: activeTab === 'completion' ? '#fff' : '#d97706', fontSize: '11px', fontWeight: '800' }}>
                  {cCounts.pending}
                </span>
              )}
            </button>
          </div>

          {/* GOAL APPROVALS TAB */}
          {activeTab === 'submissions' && (
            <>
              <FilterBar
                filters={goalFilters}
                onFiltersChange={f => setGoalFilters(f)}
                employees={directReports}
                statusOptions={GOAL_STATUS_OPTS}
                placeholder="Search by goal title or description..."
              />

              {goalLoading ? (
                <div style={{ background: '#fff', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', border: '1px solid #e2e8f0' }}>
                  Loading...
                </div>
              ) : goalData.goals.length === 0 ? (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '56px 48px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>No goals found</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                    {goalFilters.status !== 'all' || goalFilters.search || goalFilters.employeeId
                      ? 'Try adjusting your filters'
                      : 'No submitted goals from your team awaiting approval.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {goalData.goals.map(goal => {
                    const borderColor = STATUS_BORDER[goal.status] || '#e2e8f0'
                    const isPending = goal.status === 'submitted'
                    const isApproved = goal.status === 'approved'
                    const isRejected = goal.status === 'rejected'
                    const histOpen = expandedHistory === `goal-${goal.id}`

                    return (
                      <div key={goal.id} style={{
                        background: '#ffffff',
                        border: '1px solid #e8eaf0',
                        borderLeft: `4px solid ${borderColor}`,
                        borderRadius: '12px',
                        padding: '20px 24px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      }}>
                        {/* Card Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                            <Avatar name={goal.created_by_employee_name} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>{goal.title}</div>
                              <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600' }}>
                                {goal.created_by_employee_name || '—'}
                              </div>
                              {goal.description && (
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: '1.5' }}>{goal.description}</div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                            <PriorityBadge priority={goal.priority} />
                            <Badge status={goal.status} />
                          </div>
                        </div>

                        {/* Meta row */}
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px', paddingLeft: '48px' }}>
                          {goal.target_metric && (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>🎯 <strong>Target:</strong> {goal.target_metric}</span>
                          )}
                          {goal.submitted_at && (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>📤 <strong>Submitted:</strong> {fmtDate(goal.submitted_at)}</span>
                          )}
                          {goal.due_date && (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>📅 <strong>Due:</strong> {fmtDate(goal.due_date)}</span>
                          )}
                        </div>

                        {/* Decision Info */}
                        {isApproved && (
                          <div style={{ marginLeft: '48px', marginBottom: '14px', padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#059669', fontWeight: '600' }}>
                              <span>✓ Approved</span>
                              <span style={{ fontWeight: '400', color: '#64748b' }}>
                                on {fmtDateTime(goal.approved_at)}
                                {goal.approved_by_name && ` · by ${goal.approved_by_name}`}
                              </span>
                            </div>
                          </div>
                        )}

                        {isRejected && (
                          <div style={{ marginLeft: '48px', marginBottom: '14px', padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600', marginBottom: goal.rejection_reason ? '6px' : 0 }}>
                              ✗ Rejected on {fmtDateTime(goal.rejected_at)}
                              {goal.rejected_by_name && ` · by ${goal.rejected_by_name}`}
                            </div>
                            {goal.rejection_reason && (
                              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                                <strong>Reason:</strong> {goal.rejection_reason}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '48px' }}>
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(goal.id)}
                                style={{ padding: '7px 16px', borderRadius: '7px', border: '1.5px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.08)', color: '#059669', cursor: 'pointer', fontSize: '12px', fontWeight: '700', fontFamily: 'inherit' }}
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => { setRejectTarget(goal); setRejectMode('goal') }}
                                style={{ padding: '7px 16px', borderRadius: '7px', border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '700', fontFamily: 'inherit' }}
                              >
                                ✗ Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setExpandedHistory(histOpen ? null : `goal-${goal.id}`)}
                            style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #e2e8f0', background: histOpen ? '#f1f5f9' : '#f8fafc', color: histOpen ? '#6366f1' : '#64748b', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: 'inherit', marginLeft: isPending ? '0' : '0' }}
                          >
                            {histOpen ? '▲ Hide History' : '▼ View History'}
                          </button>
                        </div>

                        {histOpen && <div style={{ paddingLeft: '48px', marginTop: '4px' }}><GoalTimeline goalId={goal.id} /></div>}
                      </div>
                    )
                  })}
                </div>
              )}

              <Pagination
                page={goalData.page || 1}
                limit={goalData.limit || 10}
                total={goalData.total || 0}
                onPageChange={p => setGoalFilters(f => ({ ...f, page: p }))}
              />
            </>
          )}

          {/* COMPLETION REQUESTS TAB */}
          {activeTab === 'completion' && (
            <>
              <FilterBar
                filters={completionFilters}
                onFiltersChange={f => setCompletionFilters(f)}
                employees={directReports}
                statusOptions={COMP_STATUS_OPTS}
                placeholder="Search by sub-goal title..."
              />

              {completionLoading ? (
                <div style={{ background: '#fff', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', border: '1px solid #e2e8f0' }}>
                  Loading...
                </div>
              ) : completionData.requests.length === 0 ? (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '56px 48px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>No completion requests</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                    {completionFilters.status !== 'all' || completionFilters.search || completionFilters.employeeId
                      ? 'Try adjusting your filters'
                      : 'No pending completion requests from your team.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {completionData.requests.map(goal => {
                    const isPending = goal.pending_completion
                    const isApproved = !goal.pending_completion && !!goal.completion_approved_at
                    const isRejected = !goal.pending_completion && !!goal.completion_rejected_at
                    const borderColor = isPending ? '#d97706' : isApproved ? '#10b981' : '#ef4444'
                    const histOpen = expandedHistory === `comp-${goal.id}`

                    return (
                      <div key={goal.id} style={{
                        background: '#ffffff',
                        border: '1px solid #e8eaf0',
                        borderLeft: `4px solid ${borderColor}`,
                        borderRadius: '12px',
                        padding: '20px 24px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      }}>
                        {/* Card Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                            <Avatar name={goal.assigned_to_employee_name} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>{goal.title}</div>
                              <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600' }}>
                                {goal.assigned_to_employee_name || '—'}
                              </div>
                              {goal.parent_goal_title && (
                                <div style={{ fontSize: '11px', color: '#8b5cf6', marginTop: '2px' }}>
                                  ↳ Sub-goal of: <strong>{goal.parent_goal_title}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                            <PriorityBadge priority={goal.priority} />
                            {goal.weight && (
                              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                                ⚖️ {goal.weight}%
                              </span>
                            )}
                            {isPending && <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>Pending</span>}
                            {isApproved && <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: '#059669' }}>Approved</span>}
                            {isRejected && <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Rejected</span>}
                          </div>
                        </div>

                        {/* Meta */}
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px', paddingLeft: '48px' }}>
                          {goal.target_metric && <span style={{ fontSize: '12px', color: '#64748b' }}>🎯 <strong>Target:</strong> {goal.target_metric}</span>}
                          {goal.completion_submitted_at && <span style={{ fontSize: '12px', color: '#64748b' }}>📤 <strong>Submitted:</strong> {fmtDate(goal.completion_submitted_at)}</span>}
                          {goal.due_date && <span style={{ fontSize: '12px', color: '#64748b' }}>📅 <strong>Due:</strong> {fmtDate(goal.due_date)}</span>}
                        </div>

                        {/* Employee Note */}
                        {goal.completion_note && (
                          <div style={{ marginLeft: '48px', marginBottom: '12px', padding: '10px 14px', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Employee Note / Evidence</div>
                            <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.6' }}>{goal.completion_note}</div>
                          </div>
                        )}

                        {/* Weight impact info */}
                        {isPending && goal.weight && (
                          <div style={{ marginLeft: '48px', marginBottom: '12px', fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                            Approving this will add <strong style={{ color: '#6366f1' }}>{goal.weight}%</strong> to the parent goal's progress.
                          </div>
                        )}

                        {/* Decision Info */}
                        {isApproved && (
                          <div style={{ marginLeft: '48px', marginBottom: '12px', padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>
                              ✓ Completion Approved
                              <span style={{ fontWeight: '400', color: '#64748b', marginLeft: '8px' }}>
                                on {fmtDateTime(goal.completion_approved_at)}
                                {goal.completion_approved_by_name && ` · by ${goal.completion_approved_by_name}`}
                              </span>
                            </div>
                          </div>
                        )}

                        {isRejected && (
                          <div style={{ marginLeft: '48px', marginBottom: '12px', padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600', marginBottom: goal.completion_rejection_reason ? '6px' : 0 }}>
                              ✗ Completion Rejected on {fmtDateTime(goal.completion_rejected_at)}
                            </div>
                            {goal.completion_rejection_reason && (
                              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                                <strong>Reason:</strong> {goal.completion_rejection_reason}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '48px' }}>
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApproveCompletion(goal.id)}
                                style={{ padding: '7px 16px', borderRadius: '7px', border: '1.5px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.08)', color: '#059669', cursor: 'pointer', fontSize: '12px', fontWeight: '700', fontFamily: 'inherit' }}
                              >
                                ✓ Approve Completion
                              </button>
                              <button
                                onClick={() => { setRejectTarget(goal); setRejectMode('completion') }}
                                style={{ padding: '7px 16px', borderRadius: '7px', border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '700', fontFamily: 'inherit' }}
                              >
                                ✗ Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setExpandedHistory(histOpen ? null : `comp-${goal.id}`)}
                            style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #e2e8f0', background: histOpen ? '#f1f5f9' : '#f8fafc', color: histOpen ? '#6366f1' : '#64748b', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: 'inherit' }}
                          >
                            {histOpen ? '▲ Hide History' : '▼ View History'}
                          </button>
                        </div>

                        {histOpen && <div style={{ paddingLeft: '48px', marginTop: '4px' }}><GoalTimeline goalId={goal.id} /></div>}
                      </div>
                    )
                  })}
                </div>
              )}

              <Pagination
                page={completionData.page || 1}
                limit={completionData.limit || 10}
                total={completionData.total || 0}
                onPageChange={p => setCompletionFilters(f => ({ ...f, page: p }))}
              />
            </>
          )}

        </main>
      </div>

      {rejectTarget && (
        <RejectModal
          title={rejectMode === 'completion' ? 'Reject Completion Request' : 'Reject Goal'}
          onConfirm={(reason) => rejectMode === 'completion'
            ? handleRejectCompletion(rejectTarget.id, reason)
            : handleReject(rejectTarget.id, reason)
          }
          onClose={() => setRejectTarget(null)}
        />
      )}

      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '' })} />
    </div>
  )
}
