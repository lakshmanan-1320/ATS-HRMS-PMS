import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const STATUS_STYLE = {
  PENDING:  { bg: 'rgba(234,179,8,0.12)',  color: '#d97706' },
  APPROVED: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  REJECTED: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
}

const TYPE_LABELS = {
  MISSED_CHECKIN:   'Missed Check-In',
  MISSED_CHECKOUT:  'Missed Check-Out',
  WRONG_PUNCH_TIME: 'Wrong Punch Time',
  MARK_AS_PRESENT:  'Mark as Present',
  MARK_AS_ABSENT:   'Mark as Absent',
}

const PAGE_SIZE = 10

function formatDateStr(iso) {
  if (!iso) return '—'
  return iso.split('T')[0]
}

function formatTimeStr(iso) {
  if (!iso) return '—'
  const parts = iso.split('T')
  return parts.length < 2 ? iso : parts[1].slice(0, 5)
}

const selectStyle = {
  padding: '7px 12px', background: '#ffffff', border: '1px solid #e2e8f0',
  borderRadius: '8px', fontSize: '13px', color: '#374151', outline: 'none',
  cursor: 'pointer', fontFamily: 'inherit',
}

const filterInputStyle = {
  padding: '7px 12px', background: '#ffffff', border: '1px solid #e2e8f0',
  borderRadius: '8px', fontSize: '13px', color: '#374151', outline: 'none',
  fontFamily: 'inherit',
}

export default function RegularizationRequest() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    api.get('/v1/regularizations/my')
      .then(res => setRequests(res.data?.data || []))
      .catch(err => console.error('Failed to load regularizations', err))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    return {
      total:     requests.length,
      pending:   requests.filter(r => r.current_status === 'PENDING').length,
      approved:  requests.filter(r => r.current_status === 'APPROVED').length,
      rejected:  requests.filter(r => r.current_status === 'REJECTED').length,
      thisMonth: requests.filter(r => {
        const d = new Date(r.attendance_date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length,
    }
  }, [requests])

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filterStatus !== 'ALL' && r.current_status !== filterStatus) return false
      if (filterType !== 'ALL' && r.regularization_type !== filterType) return false
      const dateStr = r.attendance_date.split('T')[0]
      if (filterFrom && dateStr < filterFrom) return false
      if (filterTo && dateStr > filterTo) return false
      return true
    })
  }, [requests, filterStatus, filterType, filterFrom, filterTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [filterStatus, filterType, filterFrom, filterTo])

  function resetFilters() {
    setFilterStatus('ALL')
    setFilterType('ALL')
    setFilterFrom('')
    setFilterTo('')
  }

  function exportPDF() {
    const rows = filtered.map(r => `
      <tr>
        <td>${formatDateStr(r.attendance_date)}</td>
        <td>${TYPE_LABELS[r.regularization_type] || r.regularization_type}</td>
        <td style="font-family:monospace">${formatTimeStr(r.requested_checkin_time)}</td>
        <td style="font-family:monospace">${formatTimeStr(r.requested_checkout_time)}</td>
        <td>${r.reason || '—'}</td>
        <td><span class="badge ${r.current_status}">${r.current_status}</span></td>
        <td>${r.current_status === 'REJECTED' && r.rejection_reason ? r.rejection_reason : '—'}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Regularization History</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;padding:28px;color:#1e293b;margin:0}
    h2{margin:0 0 2px;font-size:20px;font-weight:700}
    .sub{margin:0 0 20px;font-size:12px;color:#64748b}
    .kpis{display:flex;gap:12px;margin-bottom:22px}
    .kpi{border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;flex:1;text-align:center}
    .kpi-val{font-size:24px;font-weight:800;line-height:1}
    .kpi-lbl{font-size:11px;color:#64748b;margin-top:4px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#f8fafc;padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;font-size:10px;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;font-weight:700}
    td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top}
    .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
    .PENDING{background:#fef3c7;color:#d97706}
    .APPROVED{background:#d1fae5;color:#059669}
    .REJECTED{background:#fee2e2;color:#ef4444}
    @media print{body{padding:16px}}
  </style>
</head>
<body>
  <h2>My Regularization History</h2>
  <p class="sub">Exported on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
  <div class="kpis">
    <div class="kpi"><div class="kpi-val">${stats.total}</div><div class="kpi-lbl">Total</div></div>
    <div class="kpi"><div class="kpi-val" style="color:#d97706">${stats.pending}</div><div class="kpi-lbl">Pending</div></div>
    <div class="kpi"><div class="kpi-val" style="color:#059669">${stats.approved}</div><div class="kpi-lbl">Approved</div></div>
    <div class="kpi"><div class="kpi-val" style="color:#ef4444">${stats.rejected}</div><div class="kpi-lbl">Rejected</div></div>
    <div class="kpi"><div class="kpi-val" style="color:#0284c7">${stats.thisMonth}</div><div class="kpi-lbl">This Month</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Type</th><th>Check-In</th><th>Check-Out</th>
        <th>Reason</th><th>Status</th><th>Rejection Note</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.onload = () => { win.focus(); win.print() }
  }

  const hasFilters = filterStatus !== 'ALL' || filterType !== 'ALL' || filterFrom || filterTo

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter,sans-serif' }}>
      <EmployeeSidebar active="regularization" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="Regularizations" />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Attendance Regularization</h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                Track and manage your attendance correction requests
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
              <button
                onClick={exportPDF}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', background: '#ffffff',
                  border: '1px solid #e2e8f0', borderRadius: '10px',
                  fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <span style={{ fontSize: '14px' }}>↓</span> Export PDF
              </button>
              <button
                onClick={() => navigate('/employee/regularization/new')}
                style={{
                  padding: '9px 20px',
                  background: 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
                  border: 'none', borderRadius: '10px',
                  fontSize: '13px', fontWeight: '600', color: '#ffffff', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                }}
              >
                + New Request
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Requests', value: stats.total,     color: '#6366f1', bg: 'rgba(99,102,241,0.09)',  icon: '📋' },
              { label: 'Pending',        value: stats.pending,   color: '#d97706', bg: 'rgba(234,179,8,0.09)',   icon: '⏳' },
              { label: 'Approved',       value: stats.approved,  color: '#059669', bg: 'rgba(16,185,129,0.09)',  icon: '✅' },
              { label: 'Rejected',       value: stats.rejected,  color: '#ef4444', bg: 'rgba(239,68,68,0.09)',   icon: '❌' },
              { label: 'This Month',     value: stats.thisMonth, color: '#0284c7', bg: 'rgba(2,132,199,0.09)',   icon: '📅' },
            ].map(k => (
              <div key={k.label} style={{
                background: '#ffffff', borderRadius: '16px', padding: '20px',
                border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', background: k.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', marginBottom: '12px',
                }}>
                  {k.icon}
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: k.color, lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '18px 24px',
            border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginRight: '4px' }}>
                Filters
              </span>

              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
                <option value="ALL">All Types</option>
                <option value="MISSED_CHECKIN">Missed Check-In</option>
                <option value="MISSED_CHECKOUT">Missed Check-Out</option>
                <option value="WRONG_PUNCH_TIME">Wrong Punch Time</option>
                <option value="MARK_AS_PRESENT">Mark as Present</option>
                <option value="MARK_AS_ABSENT">Mark as Absent</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>From</span>
                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={filterInputStyle} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>To</span>
                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={filterInputStyle} />
              </div>

              {hasFilters && (
                <button onClick={resetFilters} style={{
                  padding: '7px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: '8px', fontSize: '12px', color: '#64748b', cursor: 'pointer', fontWeight: '500',
                }}>
                  Clear
                </button>
              )}

              <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8' }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Table */}
          <div style={{
            background: '#ffffff', borderRadius: '16px', overflow: 'hidden',
            border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                Loading requests...
              </div>
            ) : paginated.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                  {hasFilters
                    ? 'No requests match the selected filters.'
                    : 'No regularization requests submitted yet.'}
                </div>
                {!hasFilters && (
                  <button
                    onClick={() => navigate('/employee/regularization/new')}
                    style={{
                      marginTop: '16px', padding: '9px 20px',
                      background: 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
                      border: 'none', borderRadius: '10px',
                      fontSize: '13px', fontWeight: '600', color: '#fff', cursor: 'pointer',
                    }}
                  >
                    + Submit First Request
                  </button>
                )}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Date', 'Type', 'Check-In', 'Check-Out', 'Reason', 'Status'].map(h => (
                      <th key={h} style={{
                        padding: '14px 20px', color: '#64748b', fontWeight: '600',
                        fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
                        borderBottom: '1px solid #e8eaf0',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(r => {
                    const badge = STATUS_STYLE[r.current_status] || STATUS_STYLE.PENDING
                    return (
                      <tr
                        key={r.regularization_id}
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 20px', color: '#0f172a', fontWeight: '600' }}>
                          {formatDateStr(r.attendance_date)}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#475569' }}>
                          {TYPE_LABELS[r.regularization_type] || r.regularization_type.replace(/_/g, ' ')}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#475569', fontFamily: 'monospace', fontSize: '12px' }}>
                          {formatTimeStr(r.requested_checkin_time)}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#475569', fontFamily: 'monospace', fontSize: '12px' }}>
                          {formatTimeStr(r.requested_checkout_time)}
                        </td>
                        <td
                          style={{ padding: '14px 20px', color: '#475569', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={r.reason}
                        >
                          {r.reason}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            display: 'inline-block', fontSize: '11px', fontWeight: '600',
                            padding: '3px 10px', borderRadius: '20px',
                            background: badge.bg, color: badge.color,
                          }}>
                            {r.current_status}
                          </span>
                          {r.current_status === 'REJECTED' && r.rejection_reason && (
                            <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                              Note: {r.rejection_reason}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {!loading && filtered.length > PAGE_SIZE && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 24px', borderTop: '1px solid #f1f5f9',
              }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: '8px',
                      background: page === 1 ? '#f8fafc' : '#fff',
                      color: page === 1 ? '#cbd5e1' : '#374151',
                      cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px',
                    }}
                  >
                    ← Prev
                  </button>
                  {pageNumbers.map((p, i) =>
                    p === '...' ? (
                      <span key={`e${i}`} style={{ padding: '6px 4px', color: '#94a3b8', fontSize: '13px' }}>…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                          padding: '6px 12px', borderRadius: '8px', fontSize: '13px',
                          border: `1px solid ${page === p ? '#10b981' : '#e2e8f0'}`,
                          background: page === p ? '#10b981' : '#fff',
                          color: page === p ? '#fff' : '#374151',
                          fontWeight: page === p ? '600' : '400', cursor: 'pointer',
                        }}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: '8px',
                      background: page === totalPages ? '#f8fafc' : '#fff',
                      color: page === totalPages ? '#cbd5e1' : '#374151',
                      cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px',
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
