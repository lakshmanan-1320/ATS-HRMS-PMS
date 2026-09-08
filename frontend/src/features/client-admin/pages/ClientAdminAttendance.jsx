import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import {
  FiRefreshCw, FiSearch, FiUsers, FiCheckCircle, FiXCircle,
  FiClock, FiFilter, FiDownload, FiChevronLeft, FiChevronRight,
  FiCalendar, FiMapPin
} from 'react-icons/fi'

/* ─── CSV Export ─── */
function exportToCSV(rows, date) {
  const headers = ['Employee', 'Code', 'Department', 'Designation', 'Status', 'Check In', 'Check Out', 'Worked Hours', 'Location Status', 'Matched Office', 'Distance (m)', 'Accuracy (m)', 'Shift', 'Grace Minutes', 'Shift Result']
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      `"${(r.first_name || '') + ' ' + (r.last_name || '')}"`,
      r.employee_code || '',
      `"${r.department || ''}"`,
      `"${r.designation || ''}"`,
      r.attendance_status,
      r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
      r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
      r.work_duration_minutes != null ? `${Math.floor(r.work_duration_minutes / 60)}h ${r.work_duration_minutes % 60}m` : '',
      r.location_status || 'LOCATION_NOT_VERIFIED',
      `"${r.matched_office_name || ''}"`,
      r.distance_from_office != null ? r.distance_from_office : '',
      r.gps_accuracy != null ? r.gps_accuracy : '',
      `"${r.shift_name || ''}"`,
      r.grace_minutes != null ? r.grace_minutes : '',
      r.attendance_result || '',
    ].join(','))
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `attendance-${date}.csv`; a.click()
  URL.revokeObjectURL(url)
}

/* ─── Axios instance ─── */
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

/* ─── Avatar colour palette ─── */
const AVATAR_COLORS = [
  ['#6366f1', '#e0e7ff'], ['#8b5cf6', '#ede9fe'], ['#ec4899', '#fce7f3'],
  ['#f59e0b', '#fef3c7'], ['#10b981', '#d1fae5'], ['#0ea5e9', '#e0f2fe'],
  ['#ef4444', '#fee2e2'], ['#14b8a6', '#ccfbf1'],
]
function avatarColor(name = '') {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

/* ─── Helpers ─── */
function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function formatDuration(mins) {
  if (!mins && mins !== 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function formatDisplayDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/* ─── Stat Cards ─── */
function StatSummary({ total, present, absent, onTime = 0, lateArrivals = 0, earlyExits = 0, completedShifts = 0 }) {
  const stats = [
    { label: 'Total Employees', value: total,          icon: FiUsers,       color: '#6366f1', bg: 'linear-gradient(135deg,#6366f1,#818cf8)' },
    { label: 'Present Today',   value: present,        icon: FiCheckCircle, color: '#16a34a', bg: 'linear-gradient(135deg,#16a34a,#22c55e)' },
    { label: 'Absent Today',    value: absent,         icon: FiXCircle,     color: '#dc2626', bg: 'linear-gradient(135deg,#dc2626,#f87171)' },
    { label: 'On Time Checkin', value: onTime,         icon: FiCheckCircle, color: '#10b981', bg: 'linear-gradient(135deg,#10b981,#34d399)' },
    { label: 'Late Arrivals',   value: lateArrivals,   icon: FiClock,       color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
    { label: 'Early Exits',     value: earlyExits,     icon: FiXCircle,     color: '#ef4444', bg: 'linear-gradient(135deg,#ef4444,#f87171)' },
    { label: 'Completed Shift', value: completedShifts, icon: FiCheckCircle, color: '#06b6d4', bg: 'linear-gradient(135deg,#06b6d4,#22d3ee)' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
      {stats.map(c => (
        <div key={c.label} style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)' }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: c.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: `0 3px 8px ${c.color}40`,
          }}>
            <c.icon size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.5px' }}>{c.value}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
  const cfg = status === 'present'
    ? { bg: '#dcfce7', color: '#15803d', dot: '#16a34a', label: 'Present' }
    : { bg: '#fee2e2', color: '#b91c1c', dot: '#dc2626', label: 'Absent' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 700, padding: '4px 10px',
      borderRadius: 20, background: cfg.bg, color: cfg.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

function LocationStatusBadge({ status }) {
  let bg = '#f1f5f9'
  let color = '#64748b'
  let label = 'Location Not Verified'

  if (status === 'INSIDE_FENCE') {
    bg = '#dcfce7'
    color = '#15803d'
    label = 'Inside Fence'
  } else if (status === 'OUTSIDE_FENCE') {
    bg = '#fee2e2'
    color = '#b91c1c'
    label = 'Outside Fence'
  }

  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700,
      padding: '4px 10px', borderRadius: 8, background: bg, color: color,
      textTransform: 'uppercase', letterSpacing: '0.02em', border: `1px solid ${status === 'INSIDE_FENCE' ? '#bbf7d0' : status === 'OUTSIDE_FENCE' ? '#fecaca' : '#cbd5e1'}`
    }}>
      {label}
    </span>
  )
}

/* ─── Pagination ─── */
function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize }) {
  const start = Math.min((page - 1) * pageSize + 1, total)
  const end   = Math.min(page * pageSize, total)

  const pages = []
  const delta = 1
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
    fontFamily: 'inherit',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12, marginTop: 16,
      padding: '14px 18px',
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {/* Left: count + rows-per-page */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
          Showing <strong style={{ color: '#0f172a' }}>{start}–{end}</strong> of <strong style={{ color: '#0f172a' }}>{total}</strong> employees
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Rows per page</span>
          <select
            value={pageSize}
            onChange={e => onPageSize(Number(e.target.value))}
            style={{
              padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 8,
              fontSize: 12, color: '#1e293b', background: '#f8fafc',
              outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Right: page buttons */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            style={{ ...btnBase, background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#cbd5e1' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            <FiChevronLeft size={16} />
          </button>

          {pages.map((p, idx) => p === '…'
            ? <span key={`e${idx}`} style={{ width: 34, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>…</span>
            : (
              <button
                key={p}
                onClick={() => onPage(p)}
                style={{
                  ...btnBase,
                  background: page === p ? '#6366f1' : '#fff',
                  color: page === p ? '#fff' : '#374151',
                  border: page === p ? '1px solid #6366f1' : '1px solid #e2e8f0',
                  boxShadow: page === p ? '0 2px 8px #6366f140' : 'none',
                }}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            style={{ ...btnBase, background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#cbd5e1' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Loading Skeleton ─── */
function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
          {[200, 80, 120, 120, 70, 80, 80, 60, 100, 100, 85, 85].map((w, j) => (
            <td key={j} style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{
                height: 12, width: w, borderRadius: 6,
                background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

/* ─── Main Component ─── */
export default function ClientAdminAttendance() {
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10))
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('all')
  const [deptFilter, setDept]     = useState('')
  const [departments, setDepts]   = useState([])
  const [page, setPage]           = useState(1)
  const [pageSize, setPageSize]   = useState(10)

  useEffect(() => {
    api.get('/client-admin/departments')
      .then(r => setDepts(r.data?.departments || r.data || []))
      .catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    api.get('/attendance/admin/overview', { params: { date, department_id: deptFilter || undefined } })
      .then(r => { setData(r.data); setPage(1) })
      .catch(err => {
        const status = err.response?.status
        if (status === 401) { sessionStorage.clear(); window.location.href = '/login' }
        setError(err.response?.data?.message || 'Failed to load attendance data')
      })
      .finally(() => setLoading(false))
  }, [date, deptFilter])

  useEffect(() => { load() }, [load])

  /* Reset page when filters change */
  useEffect(() => { setPage(1) }, [search, statusFilter])

  const filtered = (data?.records || []).filter(r => {
    const matchStatus = statusFilter === 'all' || r.attendance_status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || [r.first_name, r.last_name, r.employee_code, r.department, r.designation]
      .some(f => f?.toLowerCase().includes(q))
    return matchStatus && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const records    = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const th = {
    padding: '13px 18px', color: '#475569', fontWeight: 700,
    background: '#f8fafc', fontSize: 11, textTransform: 'uppercase',
    letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap', textAlign: 'left',
  }
  const td = {
    padding: '15px 18px', color: '#1e293b', fontSize: 13,
    fontWeight: 500, borderBottom: '1px solid #f1f5f9',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4ff', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to{transform:rotate(360deg)} }
        input[type=date]::-webkit-calendar-picker-indicator { opacity:0.5; cursor:pointer }
      `}</style>

      <ClientAdminSidebar active={window.location.pathname.includes('/dashboard') ? 'attendance-dashboard' : 'attendance-tracking'} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />

        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          <PageHeader
            icon={FiCalendar}
            title="Attendance Overview"
            subtitle={`Daily attendance log for all active employees • ${formatDisplayDate(date)}`}
            actions={
              <>
                <div style={{ position: 'relative' }}>
                  <FiCalendar size={14} color="#94a3b8" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="date"
                    value={date}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={e => setDate(e.target.value)}
                    style={{
                      paddingLeft: 32, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                      border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13,
                      color: '#1e293b', outline: 'none', background: '#fff',
                      fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  />
                </div>

                {filtered.length > 0 && (
                  <button
                    onClick={() => exportToCSV(filtered, date)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '9px 16px', background: '#f8fafc',
                      border: '1px solid #cbd5e1', borderRadius: 10,
                      fontSize: 13, fontWeight: 600, color: '#334155',
                      cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <FiDownload size={14} /> Export CSV
                  </button>
                )}

                <button
                  onClick={load}
                  disabled={loading}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 14px', background: '#f8fafc',
                    border: '1px solid #cbd5e1', borderRadius: 10,
                    fontSize: 13, fontWeight: 600, color: '#334155',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <FiRefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                </button>
              </>
            }
          />

          {/* ── Stat Cards ── */}
          {data && <StatSummary total={data.total} present={data.present} absent={data.absent} onTime={data.onTime} lateArrivals={data.lateArrivals} earlyExits={data.earlyExits} completedShifts={data.completedShifts} />}

          {/* ── Filters ── */}
          <div style={{
            display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
            padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <FiSearch size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                placeholder="Search employee, code or department…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 14px 8px 36px',
                  border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13,
                  color: '#1e293b', outline: 'none', background: '#f8fafc',
                  fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border 0.15s',
                }}
                onFocus={e => e.target.style.border = '1px solid #6366f1'}
                onBlur={e => e.target.style.border = '1px solid #e2e8f0'}
              />
            </div>

            {/* Department */}
            {departments.length > 0 && (
              <select
                value={deptFilter}
                onChange={e => setDept(e.target.value)}
                style={{
                  padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 10,
                  fontSize: 13, color: '#1e293b', outline: 'none', background: '#f8fafc',
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.department_id} value={d.department_id}>{d.name}</option>
                ))}
              </select>
            )}

            {/* Status Toggle */}
            <div style={{ display: 'flex', gap: 3, background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
              {[
                { val: 'all',     label: 'All' },
                { val: 'present', label: 'Present' },
                { val: 'absent',  label: 'Absent' },
              ].map(o => (
                <button
                  key={o.val}
                  onClick={() => setStatus(o.val)}
                  style={{
                    padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.15s', fontFamily: 'inherit',
                    background: statusFilter === o.val ? '#fff' : 'transparent',
                    color: statusFilter === o.val
                      ? (o.val === 'present' ? '#15803d' : o.val === 'absent' ? '#b91c1c' : '#1e293b')
                      : '#64748b',
                    boxShadow: statusFilter === o.val ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {o.label}
                  {data && o.val !== 'all' && (
                    <span style={{
                      marginLeft: 5, fontSize: 10, fontWeight: 800,
                      background: o.val === 'present' ? '#dcfce7' : '#fee2e2',
                      color: o.val === 'present' ? '#15803d' : '#b91c1c',
                      padding: '1px 5px', borderRadius: 10,
                    }}>
                      {o.val === 'present' ? data.present : data.absent}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Clear */}
            {(search || statusFilter !== 'all' || deptFilter) && (
              <button
                onClick={() => { setSearch(''); setStatus('all'); setDept('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, color: '#6366f1', fontWeight: 700,
                  background: '#eef2ff', border: 'none', borderRadius: 8,
                  padding: '6px 12px', cursor: 'pointer',
                }}
              >
                <FiFilter size={12} /> Clear
              </button>
            )}
          </div>

          {/* ── Table Card ── */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}>
            {error ? (
              <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <div style={{ color: '#dc2626', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Failed to load data</div>
                <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>{error}</div>
                <button onClick={load} style={{ padding: '9px 24px', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Retry
                </button>
              </div>
            ) : !loading && filtered.length === 0 ? (
              <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ color: '#1e293b', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No records found</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>Try adjusting your filters or search query.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 20 }}>#</th>
                      {['Employee', 'Code', 'Department', 'Designation', 'Status', 'Check In', 'Check Out', 'Hours', 'Shift', 'Result', 'Location Status', 'Office Location', 'Distance', 'GPS Accuracy'].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  {loading
                    ? <TableSkeleton />
                    : (
                      <tbody>
                        {records.map((r, i) => {
                          const [fg, bg] = avatarColor(r.first_name)
                          const rowNum   = (safePage - 1) * pageSize + i + 1
                          return (
                            <tr
                              key={r.employee_id}
                              style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc', transition: 'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc'}
                            >
                              <td style={{ ...td, color: '#94a3b8', fontSize: 12, fontWeight: 600, paddingLeft: 20, width: 40 }}>
                                {rowNum}
                              </td>
                              <td style={td}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{
                                    width: 34, height: 34, borderRadius: '50%',
                                    background: bg, color: fg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 12, fontWeight: 800, flexShrink: 0,
                                    border: `2px solid ${fg}30`,
                                  }}>
                                    {r.first_name?.[0]}{r.last_name?.[0]}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                                      {r.first_name} {r.last_name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ ...td, color: '#6366f1', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                                {r.employee_code}
                              </td>
                              <td style={{ ...td, color: '#475569' }}>{r.department || '—'}</td>
                              <td style={{ ...td, color: '#64748b' }}>{r.designation || '—'}</td>
                              <td style={td}><StatusBadge status={r.attendance_status} /></td>
                              <td style={{ ...td, color: r.check_in_time ? '#15803d' : '#94a3b8', fontWeight: r.check_in_time ? 600 : 400 }}>
                                {formatTime(r.check_in_time)}
                              </td>
                              <td style={{ ...td, color: r.check_out_time ? '#1e293b' : '#94a3b8' }}>
                                {formatTime(r.check_out_time)}
                              </td>
                              <td style={{ ...td }}>
                                {r.work_duration_minutes != null && r.work_duration_minutes > 0
                                  ? (
                                    <span style={{
                                      background: '#eff6ff', color: '#1d4ed8',
                                      padding: '3px 10px', borderRadius: 8,
                                      fontSize: 12, fontWeight: 700,
                                    }}>
                                      {formatDuration(r.work_duration_minutes)}
                                    </span>
                                  )
                                  : <span style={{ color: '#94a3b8' }}>—</span>
                                }
                              </td>
                              <td style={td}>
                                {r.shift_name ? (
                                  <span style={{
                                    background: r.shift_color_code || '#6366f1', color: '#fff',
                                    padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                    textShadow: '0 1px 2px rgba(0,0,0,0.15)'
                                  }}>
                                    {r.shift_name} ({r.shift_code})
                                  </span>
                                ) : <span style={{ color: '#94a3b8' }}>—</span>}
                              </td>
                              <td style={td}>
                                {r.attendance_result ? (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                                    background: (r.attendance_result === 'ON_TIME' || r.attendance_result === 'COMPLETED_SHIFT')
                                      ? '#dcfce7'
                                      : r.attendance_result === 'LATE_ARRIVAL'
                                        ? '#ffedd5'
                                        : '#fee2e2',
                                    color: (r.attendance_result === 'ON_TIME' || r.attendance_result === 'COMPLETED_SHIFT')
                                      ? '#15803d'
                                      : r.attendance_result === 'LATE_ARRIVAL'
                                        ? '#c2410c'
                                        : '#b91c1c'
                                  }}>
                                    {r.attendance_result.replace('_', ' ')}
                                  </span>
                                ) : <span style={{ color: '#94a3b8' }}>—</span>}
                              </td>
                              <td style={td}>
                                <LocationStatusBadge status={r.location_status} />
                              </td>
                              <td style={td}>
                                {r.matched_office_name || r.zone_name || <span style={{ color: '#94a3b8' }}>—</span>}
                              </td>
                              <td style={{ ...td, fontFamily: 'monospace' }}>
                                {r.distance_from_office != null
                                  ? `${Number(r.distance_from_office).toFixed(1)}m`
                                  : <span style={{ color: '#94a3b8' }}>—</span>}
                              </td>
                              <td style={{ ...td, color: '#64748b' }}>
                                {r.gps_accuracy != null
                                  ? `±${Number(r.gps_accuracy).toFixed(0)}m`
                                  : <span style={{ color: '#94a3b8' }}>—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    )
                  }
                </table>
              </div>
            )}
          </div>

          {/* ── Pagination ── */}
          {!loading && !error && filtered.length > 0 && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={pageSize}
              onPage={p => setPage(Math.max(1, Math.min(p, totalPages)))}
              onPageSize={n => { setPageSize(n); setPage(1) }}
            />
          )}

        </div>
      </div>
    </div>
  )
}
