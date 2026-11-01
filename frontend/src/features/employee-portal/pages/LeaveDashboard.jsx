import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'
import { FiPlus, FiDownload, FiAlertCircle, FiCalendar, FiClock, FiCheck, FiX } from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const STATUS_COLOR = {
  PENDING:   { bg: 'rgba(245,158,11,0.12)',  color: '#d97706', border: 'rgba(245,158,11,0.3)' },
  APPROVED:  { bg: 'rgba(16,185,129,0.12)',  color: '#059669', border: 'rgba(16,185,129,0.3)' },
  REJECTED:  { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  CANCELLED: { bg: 'rgba(100,116,139,0.12)', color: '#7D8597', border: 'rgba(100,116,139,0.3)' },
}

const ITEMS_PER_PAGE = 10

function fmt(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(t) {
  if (!t) return '-'
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function UsedPct(used, allocated) {
  return allocated > 0 ? (used / allocated) * 100 : 0
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', padding: '16px 20px', borderTop: '1px solid #F1F4F8' }}>
      <button
        onClick={() => onChange(page - 1)} disabled={page === 1}
        style={{ padding: '5px 10px', border: '1px solid #E3E7EE', borderRadius: '6px', background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#cbd5e1' : '#374151', cursor: page === 1 ? 'default' : 'pointer', fontSize: '12px', fontWeight: '600' }}
      >← Prev</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onChange(p)}
          style={{ width: '30px', height: '30px', border: '1px solid', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', borderColor: p === page ? '#0466C8' : '#E3E7EE', background: p === page ? 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)' : '#fff', color: p === page ? '#fff' : '#374151' }}
        >{p}</button>
      ))}
      <button
        onClick={() => onChange(page + 1)} disabled={page === totalPages}
        style={{ padding: '5px 10px', border: '1px solid #E3E7EE', borderRadius: '6px', background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#cbd5e1' : '#374151', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '12px', fontWeight: '600' }}
      >Next →</button>
    </div>
  )
}

export default function LeaveDashboard() {
  const navigate = useNavigate()

  const [balances,     setBalances]     = useState([])
  const [requests,     setRequests]     = useState([])
  const [permRequests, setPermRequests] = useState([])
  const [ohData,       setOhData]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [ohLoading,    setOhLoading]    = useState(true)
  const [togglingId,   setTogglingId]   = useState(null)
  const [toast,        setToast]        = useState(null)

  const [histTab, setHistTab] = useState('leave')

  // Leave filters
  const [fStatus,    setFStatus]    = useState('ALL')
  const [fLeaveType, setFLeaveType] = useState('ALL')
  const [fDateFrom,  setFDateFrom]  = useState('')
  const [fDateTo,    setFDateTo]    = useState('')

  // Permission filters
  const [pFStatus, setPFStatus] = useState('ALL')

  // Pagination
  const [leavePage, setLeavePage] = useState(1)
  const [permPage,  setPermPage]  = useState(1)

  function showToast(msg, type = 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  function loadLeave() {
    setLoading(true)
    Promise.all([
      api.get('/v1/leave/balances/my'),
      api.get('/v1/leave/leaves/my'),
    ]).then(([bRes, rRes]) => {
      setBalances(bRes.data || [])
      setRequests(rRes.data || [])
    }).catch(err => console.error('Leave load error', err))
      .finally(() => setLoading(false))
  }

  function loadOH() {
    setOhLoading(true)
    api.get('/v1/leave/optional-holidays/my')
      .then(res => setOhData(res.data))
      .catch(err => console.error('OH load error', err))
      .finally(() => setOhLoading(false))
  }

  function loadPerms() {
    api.get('/v1/permissions/requests/my')
      .then(res => setPermRequests(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Perm load error', err))
  }

  useEffect(() => { loadLeave(); loadOH(); loadPerms() }, [])

  // Filtered leave
  const filteredLeave = useMemo(() => requests.filter(r => {
    if (fStatus !== 'ALL' && r.current_status !== fStatus) return false
    if (fLeaveType !== 'ALL' && String(r.leave_type_id) !== String(fLeaveType)) return false
    if (fDateFrom && r.start_date < fDateFrom) return false
    if (fDateTo && r.end_date > fDateTo) return false
    return true
  }), [requests, fStatus, fLeaveType, fDateFrom, fDateTo])

  const filteredPerm = useMemo(() => permRequests.filter(r =>
    pFStatus === 'ALL' || r.status === pFStatus
  ), [permRequests, pFStatus])

  const leaveTotalPages = Math.max(1, Math.ceil(filteredLeave.length / ITEMS_PER_PAGE))
  const permTotalPages  = Math.max(1, Math.ceil(filteredPerm.length / ITEMS_PER_PAGE))

  const pagedLeave = filteredLeave.slice((leavePage - 1) * ITEMS_PER_PAGE, leavePage * ITEMS_PER_PAGE)
  const pagedPerm  = filteredPerm.slice((permPage - 1) * ITEMS_PER_PAGE, permPage * ITEMS_PER_PAGE)

  useEffect(() => setLeavePage(1), [fStatus, fLeaveType, fDateFrom, fDateTo])
  useEffect(() => setPermPage(1), [pFStatus])

  function cancelLeave(id) {
    if (!window.confirm('Cancel this leave request?')) return
    api.post(`/v1/leave/leaves/${id}/cancel`, { remarks: 'Cancelled by Employee' })
      .then(loadLeave)
      .catch(err => showToast(err.response?.data?.message || 'Failed to cancel.'))
  }

  function cancelPerm(id) {
    if (!window.confirm('Cancel this permission request?')) return
    api.post(`/v1/permissions/requests/${id}/cancel`)
      .then(loadPerms)
      .catch(err => showToast(err.response?.data?.message || 'Failed to cancel.'))
  }

  function toggleOH(holidayId) {
    if (togglingId) return
    setTogglingId(holidayId)
    api.post(`/v1/leave/optional-holidays/${holidayId}/toggle`)
      .then(res => setOhData(res.data))
      .catch(err => showToast(err.response?.data?.message || 'Failed to update.'))
      .finally(() => setTogglingId(null))
  }

  function exportLeavesPDF() {
    const doc = new jsPDF()
    doc.setFontSize(16); doc.setFont(undefined, 'bold')
    doc.text('Leave Request History', 14, 18)
    doc.setFontSize(10); doc.setFont(undefined, 'normal')
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 26)
    autoTable(doc, {
      startY: 32,
      head: [['Leave Type', 'Start Date', 'End Date', 'Days', 'Session', 'Status', 'Reason']],
      body: filteredLeave.map(r => [
        r.leave_type_name || '-', fmt(r.start_date), fmt(r.end_date),
        r.total_leave_days, r.session_type || 'FULL_DAY', r.current_status, r.leave_reason || '-',
      ]),
      headStyles: { fillColor: [99, 102, 241], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })
    doc.save('leave-requests.pdf')
  }

  function exportPermPDF() {
    const doc = new jsPDF()
    doc.setFontSize(16); doc.setFont(undefined, 'bold')
    doc.text('Permission Request History', 14, 18)
    doc.setFontSize(10); doc.setFont(undefined, 'normal')
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 26)
    autoTable(doc, {
      startY: 32,
      head: [['Date', 'Start Time', 'End Time', 'Duration (hrs)', 'Status', 'Reason']],
      body: filteredPerm.map(r => [
        fmt(r.permission_date), fmtTime(r.start_time), fmtTime(r.end_time),
        r.duration_hours || '-', r.status || '-', r.reason || '-',
      ]),
      headStyles: { fillColor: [16, 185, 129], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })
    doc.save('permission-requests.pdf')
  }

  const ohUsedPct = ohData && ohData.allocated_days > 0
    ? UsedPct(ohData.used_days, ohData.allocated_days) : 0

  // ── Styles ───────────────────────────────────────────────────────
  const s = {
    page: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
    main: { flex: 1, padding: '28px 32px', overflowY: 'auto' },
    section: { fontSize: '11px', fontWeight: '700', color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
    divider: { flex: 1, height: '1px', background: '#E3E7EE' },
    balanceGrid: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' },
    tableCard: { background: '#fff', border: 'none', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)', marginBottom: '32px' },
    th: { padding: '14px 16px', color: '#ffffff', fontWeight: '700', borderBottom: 'none', background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.06em' },
    td: { padding: '14px 16px', color: '#001233', borderBottom: '1px solid #edf2f7', fontSize: '13px' },
    emptyCell: { padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' },
    badge: (st) => ({
      display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px',
      background: (STATUS_COLOR[st] || STATUS_COLOR.CANCELLED).bg,
      color: (STATUS_COLOR[st] || STATUS_COLOR.CANCELLED).color,
    }),
    filterBar: { display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderBottom: '1px solid #E3E7EE', flexWrap: 'wrap', background: '#fcfcfd' },
    filterInput: { padding: '7px 12px', border: '1px solid #E3E7EE', borderRadius: '8px', fontSize: '12px', color: '#374151', background: '#fff', outline: 'none', height: '34px', boxSizing: 'border-box' },
    tabBar: { display: 'flex', gap: 0, padding: '0 18px', borderBottom: '1px solid #E3E7EE' },
    tab: (active) => ({
      padding: '13px 20px', fontSize: '13px', fontWeight: active ? '700' : '500',
      color: active ? '#0466C8' : '#7D8597', border: 'none', borderBottom: active ? '2.5px solid #0466C8' : '2.5px solid transparent',
      background: 'none', cursor: 'pointer', marginBottom: '-1px', transition: 'all 0.15s',
    }),
    cancelBtn: { padding: '4px 10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#ef4444', cursor: 'pointer' },
    exportBtn: { marginLeft: 'auto', padding: '8px 16px', background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(4, 102, 200, 0.25)' },
    applyBtn: { padding: '9px 18px', background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 3px 10px rgba(4, 102, 200, 0.25)' },
  }

  return (
    <div className="pms-page" style={s.page}>
      <EmployeeSidebar active="leave" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="Leave" />
        <main style={s.main}>

          {/* Page Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#001233', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiCalendar size={20} color="#0466C8" strokeWidth={2.5} />
                </div>
                My Leave Dashboard
              </h1>
              <p style={{ fontSize: '13px', color: '#7D8597', margin: 0, fontWeight: 500 }}>Track balances, optional holidays, and manage your time off</p>
            </div>
            <button style={s.applyBtn} onClick={() => navigate('/employee/leave-request')}>
              <FiPlus size={16} color="#ffffff" stroke="#ffffff" strokeWidth={2.5} />
              Apply Leave / Permission
            </button>
          </div>

          {/* Leave Balances */}
          <div style={s.section}><span>Leave Balances</span><div style={s.divider} /></div>
          {loading ? (
            <div style={{ color: '#94a3b8', fontSize: '13px', padding: '32px', textAlign: 'center' }}>Loading balances…</div>
          ) : (
            <div style={s.balanceGrid}>
              {balances.map(b => {
                const usedPct = UsedPct(parseFloat(b.used_days), parseFloat(b.allocated_days))
                const accent  = b.is_paid_leave ? '#0466C8' : '#10b981'
                return (
                  <div
                    key={b.leave_balance_id}
                    style={{ display: 'flex', background: '#fff', border: `1px solid ${accent}28`, borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'default' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,0.1), 0 0 0 1px ${accent}44` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)' }}
                  >
                    {/* Left: gradient panel */}
                    <div style={{ background: b.is_paid_leave ? 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '18px 24px', width: '210px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{b.leave_type_name}</div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                          <span style={{ fontSize: '38px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>{b.available_days}</span>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', paddingBottom: '5px' }}>days available</span>
                        </div>
                      </div>
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, usedPct)}%`, background: 'rgba(255,255,255,0.85)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Utilization</span>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.95)', fontWeight: '700' }}>{Math.round(usedPct)}% used</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: stats panel */}
                    <div style={{ flex: 1, padding: '18px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        {[
                          ['Allocated', parseFloat(b.allocated_days), accent,    'Total days assigned'],
                          ['Used',      parseFloat(b.used_days),      '#33415C', 'Days taken so far'],
                          ['Pending',   parseFloat(b.pending_days),   '#d97706', 'Awaiting approval'],
                        ].map(([lbl, val, col, desc]) => (
                          <div key={lbl} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: lbl === 'Pending' ? '#f59e0b' : lbl === 'Used' ? '#94a3b8' : accent }} />
                              <span style={{ fontSize: '10px', color: '#7D8597', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{lbl}</span>
                            </div>
                            <span style={{ fontSize: '28px', fontWeight: '900', color: col, lineHeight: 1, marginBottom: '4px' }}>{val}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{desc}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #F1F4F8' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Leave Type</span>
                        <div style={{ padding: '4px 12px', borderRadius: '6px', background: `${accent}0d`, border: `1px solid ${accent}28` }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: accent }}>{b.is_paid_leave ? 'Paid Leave' : 'Unpaid Leave'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {balances.length === 0 && (
                <div style={{ gridColumn: '1/-1', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '32px' }}>No leave balance data available.</div>
              )}
            </div>
          )}

          {/* Optional Holiday Eligibility */}
          <div style={{ ...s.section, marginBottom: '14px' }}><span>Optional Holiday Eligibility</span><div style={s.divider} /></div>
          {ohLoading ? (
            <div style={{ color: '#94a3b8', fontSize: '13px', padding: '24px', textAlign: 'center' }}>Loading optional holiday data…</div>
          ) : ohData ? (
            <div style={{ background: '#fff', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '20px', padding: '26px', marginBottom: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#001233', marginBottom: '4px' }}>Optional Holidays</div>
                  <div style={{ fontSize: '12px', color: '#7D8597' }}>Leave Year {ohData.leave_year} &nbsp;·&nbsp; {fmt(ohData.leave_year_start)} – {fmt(ohData.leave_year_end)}</div>
                </div>
                {ohData.calendar_count === 0 ? (
                  <div style={{ padding: '5px 12px', borderRadius: '20px', background: 'rgba(100,116,139,0.08)', color: '#7D8597', fontSize: '12px', fontWeight: '700' }}>No holidays this year</div>
                ) : ohData.remaining_days > 0 ? (
                  <div style={{ padding: '5px 12px', borderRadius: '20px', background: 'rgba(245,158,11,0.1)', color: '#d97706', fontSize: '12px', fontWeight: '700', border: '1px solid rgba(245,158,11,0.25)' }}>{ohData.remaining_days} of {ohData.allocated_days} remaining</div>
                ) : (
                  <div style={{ padding: '5px 12px', borderRadius: '20px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: '700', border: '1px solid rgba(239,68,68,0.2)' }}>Quota fully used</div>
                )}
              </div>

              {ohData.calendar_count < ohData.configured_max && ohData.calendar_count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', fontSize: '12px', color: '#d97706' }}>
                  <FiAlertCircle size={14} color="#d97706" />
                  <span>Your configured entitlement is {ohData.configured_max} optional holidays, but only <strong>{ohData.calendar_count}</strong> {ohData.calendar_count !== 1 ? 'are' : 'is'} available in the calendar. Your effective limit is <strong>{ohData.allocated_days}</strong>.</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '20px' }}>
                {[['Limit', ohData.allocated_days, '#0466C8'], ['Availed', ohData.used_days, '#d97706'], ['Remaining', ohData.remaining_days, '#059669']].map(([lbl, val, col]) => (
                  <div key={lbl} style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', textAlign: 'center', border: `1px solid ${col}22` }}>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: col, lineHeight: 1, marginBottom: '4px' }}>{val}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lbl}</div>
                  </div>
                ))}
              </div>

              {ohData.allocated_days > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: '#7D8597' }}>
                    <span>Utilization ({ohData.used_days} of {ohData.allocated_days} availed)</span>
                    <span>{Math.round(ohUsedPct)}%</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '6px', background: '#F1F4F8', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '6px', width: `${Math.min(100, ohUsedPct)}%`, background: ohUsedPct >= 100 ? 'linear-gradient(90deg,#ef4444,#dc2626)' : 'linear-gradient(90deg,#f59e0b,#d97706)', transition: 'width 0.5s' }} />
                  </div>
                </div>
              )}

              <div style={{ fontSize: '12px', fontWeight: '700', color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Available Optional Holidays — choose up to {ohData.allocated_days}
              </div>
              {(!ohData.available_optional_holidays || ohData.available_optional_holidays.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '28px', color: '#94a3b8', fontSize: '13px' }}>No optional holidays in calendar for this leave year.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {ohData.available_optional_holidays.map(h => {
                    const isQuotaFull = ohData.remaining_days <= 0
                    const isDisabled  = !h.is_availed && isQuotaFull
                    const isToggling  = togglingId === h.holiday_id
                    return (
                      <div key={h.holiday_id}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', cursor: (isToggling || isDisabled) ? 'not-allowed' : 'pointer', border: `1px solid ${h.is_availed ? 'rgba(245,158,11,0.3)' : '#E3E7EE'}`, background: h.is_availed ? 'rgba(245,158,11,0.06)' : '#f8fafc', opacity: isDisabled ? 0.4 : 1, transition: 'all 0.15s' }}
                        onClick={() => { if (!isDisabled && !isToggling) toggleOH(h.holiday_id) }}
                        title={isDisabled ? 'Quota exhausted — un-avail another first' : h.is_availed ? 'Click to un-avail' : `Click to avail (${ohData.remaining_days} slot${ohData.remaining_days !== 1 ? 's' : ''} remaining)`}
                      >
                        <div style={{ width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, border: `2px solid ${h.is_availed ? '#f59e0b' : '#cbd5e1'}`, background: h.is_availed ? '#f59e0b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff', fontWeight: '800', transition: 'all 0.15s' }}>
                          {isToggling ? '…' : h.is_availed ? <FiCheck size={12} color="#ffffff" /> : ''}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#001233' }}>{h.holiday_name}</div>
                          <div style={{ fontSize: '11px', color: '#7D8597', marginTop: '2px' }}>{fmt(h.holiday_date)}</div>
                          {h.description && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{h.description}</div>}
                        </div>
                        <div style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: h.is_availed ? 'rgba(245,158,11,0.1)' : 'transparent', color: h.is_availed ? '#d97706' : '#94a3b8', border: `1px solid ${h.is_availed ? 'rgba(245,158,11,0.25)' : 'transparent'}` }}>
                          {h.is_availed ? 'Availed' : isDisabled ? 'Quota full' : 'Available'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}

          {/* Request History */}
          <div style={s.section}><span>Request History</span><div style={s.divider} /></div>
          <div style={s.tableCard}>
            {/* Tab bar */}
            <div style={s.tabBar}>
              {[['leave', `Leave Requests (${requests.length})`], ['permission', `Permission Requests (${permRequests.length})`]].map(([id, label]) => (
                <button key={id} style={s.tab(histTab === id)} onClick={() => setHistTab(id)}>{label}</button>
              ))}
            </div>

            {/* Filters */}
            {histTab === 'leave' ? (
              <div style={s.filterBar}>
                <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={s.filterInput}>
                  <option value="ALL">All Statuses</option>
                  {['PENDING','APPROVED','REJECTED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={fLeaveType} onChange={e => setFLeaveType(e.target.value)} style={s.filterInput}>
                  <option value="ALL">All Leave Types</option>
                  {balances.map(b => <option key={b.leave_type_id} value={b.leave_type_id}>{b.leave_type_name}</option>)}
                </select>
                <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} style={{ ...s.filterInput, colorScheme: 'light' }} title="From date" />
                <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} style={{ ...s.filterInput, colorScheme: 'light' }} title="To date" />
                {(fStatus !== 'ALL' || fLeaveType !== 'ALL' || fDateFrom || fDateTo) && (
                  <button onClick={() => { setFStatus('ALL'); setFLeaveType('ALL'); setFDateFrom(''); setFDateTo('') }}
                    style={{ padding: '6px 12px', border: '1px solid #E3E7EE', borderRadius: '8px', background: '#fff', fontSize: '12px', color: '#7D8597', cursor: 'pointer' }}>
                    Clear
                  </button>
                )}
                <button style={s.exportBtn} onClick={exportLeavesPDF}>
                  <FiDownload size={14} color="#ffffff" stroke="#ffffff" /> Export PDF
                </button>
              </div>
            ) : (
              <div style={s.filterBar}>
                <select value={pFStatus} onChange={e => setPFStatus(e.target.value)} style={s.filterInput}>
                  <option value="ALL">All Statuses</option>
                  {['PENDING','APPROVED','REJECTED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {pFStatus !== 'ALL' && (
                  <button onClick={() => setPFStatus('ALL')}
                    style={{ padding: '6px 12px', border: '1px solid #E3E7EE', borderRadius: '8px', background: '#fff', fontSize: '12px', color: '#7D8597', cursor: 'pointer' }}>
                    Clear
                  </button>
                )}
                <button style={s.exportBtn} onClick={exportPermPDF}>
                  <FiDownload size={14} color="#ffffff" stroke="#ffffff" /> Export PDF
                </button>
              </div>
            )}

            {/* Leave Table */}
            {histTab === 'leave' && (
              <>
                {loading ? (
                  <div style={s.emptyCell}>Loading…</div>
                ) : pagedLeave.length === 0 ? (
                  <div style={s.emptyCell}>{filteredLeave.length === 0 && requests.length > 0 ? 'No requests match the current filters.' : 'No leave requests filed yet.'}</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr>
                        {['Leave Type', 'Duration', 'Days', 'Session', 'Status', ''].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedLeave.map(r => (
                        <tr key={r.leave_request_id}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={s.td}>
                            <div style={{ fontWeight: '600', color: '#001233' }}>{r.leave_type_name}</div>
                            {r.leave_reason && <div style={{ fontSize: '11px', color: '#7D8597', marginTop: '2px' }}>{r.leave_reason}</div>}
                          </td>
                          <td style={s.td}>
                            <div>{fmt(r.start_date)}</div>
                            {r.start_date !== r.end_date && <div style={{ color: '#94a3b8', fontSize: '11px' }}>→ {fmt(r.end_date)}</div>}
                          </td>
                          <td style={{ ...s.td, fontWeight: '700', color: '#001233' }}>{parseFloat(r.total_leave_days)}</td>
                          <td style={s.td}>
                            <span style={{ fontSize: '11px', color: '#0466C8', fontWeight: '600' }}>
                              {r.session_type === 'FULL_DAY' ? 'Full Day' : r.session_type === 'FIRST_HALF' ? 'First Half' : r.session_type === 'SECOND_HALF' ? 'Second Half' : r.session_type}
                            </span>
                          </td>
                          <td style={s.td}><span style={s.badge(r.current_status)}>{r.current_status}</span></td>
                          <td style={s.td}>
                            {r.current_status === 'PENDING' && (
                              <button style={s.cancelBtn} onClick={() => cancelLeave(r.leave_request_id)}>Cancel</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <Pagination page={leavePage} totalPages={leaveTotalPages} onChange={setLeavePage} />
              </>
            )}

            {/* Permission Table */}
            {histTab === 'permission' && (
              <>
                {pagedPerm.length === 0 ? (
                  <div style={s.emptyCell}>{filteredPerm.length === 0 && permRequests.length > 0 ? 'No requests match the current filters.' : 'No permission requests filed yet.'}</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr>
                        {['Date', 'Start Time', 'End Time', 'Duration', 'Reason', 'Status', ''].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedPerm.map(r => {
                        const st = r.status || 'PENDING'
                        return (
                          <tr key={r.permission_request_id}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ ...s.td, fontWeight: '600', color: '#001233' }}>{fmt(r.permission_date)}</td>
                            <td style={s.td}>{fmtTime(r.start_time)}</td>
                            <td style={s.td}>{fmtTime(r.end_time)}</td>
                            <td style={{ ...s.td, fontWeight: '700', color: '#001233' }}>{r.duration_hours ? `${r.duration_hours}h` : '-'}</td>
                            <td style={{ ...s.td, color: '#7D8597', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason || '-'}</td>
                            <td style={s.td}><span style={s.badge(st)}>{st}</span></td>
                            <td style={s.td}>
                              {st === 'PENDING' && (
                                <button style={s.cancelBtn} onClick={() => cancelPerm(r.permission_request_id)}>Cancel</button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
                <Pagination page={permPage} totalPages={permTotalPages} onChange={setPermPage} />
              </>
            )}
          </div>

        </main>

        {toast && (
          <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', borderRadius: '12px', padding: '12px 18px', fontSize: '13px', fontWeight: '600', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {toast.type === 'error' ? <FiAlertCircle size={16} color="#ffffff" /> : <FiCheck size={16} color="#ffffff" />} {toast.msg}
            <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, marginLeft: '4px', fontSize: '16px', opacity: 0.7 }}><FiX size={16} color="#ffffff" /></button>
          </div>
        )}
      </div>
    </div>
  )
}
