import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const STATUS_STYLE = {
  PENDING:   { bg: 'rgba(234,179,8,0.1)',    color: '#d97706' },
  APPROVED:  { bg: 'rgba(16,185,129,0.1)',   color: '#059669' },
  REJECTED:  { bg: 'rgba(239,68,68,0.1)',    color: '#ef4444' },
  CANCELLED: { bg: 'rgba(100,116,139,0.1)', color: '#64748b' }
}

const PAGE_SIZE = 10

function fmt(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Pagination({ page, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: '12px', color: '#64748b' }}>
        Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          style={{ padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#cbd5e1' : '#374151', cursor: page === 1 ? 'default' : 'pointer', fontSize: '12px', fontWeight: '600' }}>
          ← Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onChange(p)}
            style={{ width: '30px', height: '30px', border: '1px solid', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', borderColor: p === page ? '#6366f1' : '#e2e8f0', background: p === page ? '#6366f1' : '#fff', color: p === page ? '#fff' : '#374151' }}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
          style={{ padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#cbd5e1' : '#374151', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '12px', fontWeight: '600' }}>
          Next →
        </button>
      </div>
    </div>
  )
}

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, sans-serif' },
  main: { flex: 1, padding: '32px 40px', overflowY: 'auto' },
  card: { background: '#ffffff', border: '1px solid #e8eaf0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  th: { padding: '13px 18px', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e8eaf0', background: '#f8fafc', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' },
  td: { padding: '14px 18px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', fontSize: '13px' },
  statusBadge: { display: 'inline-block', fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '20px', textTransform: 'capitalize' },
  approveBtn: { padding: '6px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#059669', cursor: 'pointer', marginRight: '8px' },
  rejectBtn:  { padding: '6px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',  borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#ef4444', cursor: 'pointer', marginRight: '8px' },
  overrideBtn:{ padding: '6px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',  borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#6366f1', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '32px', width: '450px', maxWidth: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e8eaf0', paddingBottom: '12px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  submitBtn: { padding: '11px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', color: '#ffffff', cursor: 'pointer', width: '100%', marginTop: '10px' },
  error: { color: '#ef4444', fontSize: '12px', marginTop: '6px' },
  filterBar: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', borderBottom: '1px solid #e8eaf0', flexWrap: 'wrap', background: '#fcfcfd' },
  filterInput: { padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#374151', background: '#fff', outline: 'none', height: '34px', boxSizing: 'border-box' },
  tab: (active) => ({ padding: '13px 20px', fontSize: '13px', fontWeight: active ? '700' : '500', color: active ? '#6366f1' : '#64748b', border: 'none', borderBottom: active ? '2px solid #6366f1' : '2px solid transparent', background: 'none', cursor: 'pointer', marginBottom: '-1px', transition: 'all 0.15s' }),
}

export default function LeaveApprovals() {
  const [activeTab, setActiveTab]   = useState('requests')

  // Leave requests state
  const [leaves,    setLeaves]      = useState([])
  const [loading,   setLoading]     = useState(true)
  const [leavePage, setLeavePage]   = useState(1)
  const [fStatus,   setFStatus]     = useState('ALL')
  const [fEmployee, setFEmployee]   = useState('')

  // Modal state
  const [selectedReq, setSelectedReq] = useState(null)
  const [actionType,  setActionType]  = useState('')
  const [remarks,     setRemarks]     = useState('')
  const [formError,   setFormError]   = useState('')
  const [modalOpen,   setModalOpen]   = useState(false)

  // Team optional holidays state
  const [teamOH,       setTeamOH]       = useState([])
  const [ohLoading,    setOhLoading]    = useState(false)
  const [ohPage,       setOhPage]       = useState(1)
  const [ohEmployee,   setOhEmployee]   = useState('')
  const [ohHoliday,    setOhHoliday]    = useState('')

  function loadLeaves() {
    setLoading(true)
    api.get('/v1/leave/manager/leaves')
      .then(res => setLeaves(res.data || []))
      .catch(err => console.error('Failed to load manager approvals', err))
      .finally(() => setLoading(false))
  }

  function loadTeamOH() {
    setOhLoading(true)
    api.get('/v1/leave/manager/optional-holidays')
      .then(res => setTeamOH(res.data || []))
      .catch(err => console.error('Failed to load team optional holidays', err))
      .finally(() => setOhLoading(false))
  }

  useEffect(() => { loadLeaves() }, [])

  useEffect(() => {
    if (activeTab === 'optional-holidays' && teamOH.length === 0 && !ohLoading) {
      loadTeamOH()
    }
  }, [activeTab])

  // Filtered leave requests
  const filteredLeaves = useMemo(() => leaves.filter(r => {
    if (fStatus !== 'ALL' && r.current_status !== fStatus) return false
    if (fEmployee && !(r.employee_name || '').toLowerCase().includes(fEmployee.toLowerCase())) return false
    return true
  }), [leaves, fStatus, fEmployee])

  const pagedLeaves = filteredLeaves.slice((leavePage - 1) * PAGE_SIZE, leavePage * PAGE_SIZE)
  useEffect(() => setLeavePage(1), [fStatus, fEmployee])

  // Filtered team optional holidays
  const filteredOH = useMemo(() => teamOH.filter(r => {
    if (ohEmployee && !(r.employee_name || '').toLowerCase().includes(ohEmployee.toLowerCase())) return false
    if (ohHoliday  && !(r.holiday_name  || '').toLowerCase().includes(ohHoliday.toLowerCase()))  return false
    return true
  }), [teamOH, ohEmployee, ohHoliday])

  const pagedOH = filteredOH.slice((ohPage - 1) * PAGE_SIZE, ohPage * PAGE_SIZE)
  useEffect(() => setOhPage(1), [ohEmployee, ohHoliday])

  // Derived stats for KPI strip
  const pendingCount  = leaves.filter(l => l.current_status === 'PENDING').length
  const approvedCount = leaves.filter(l => l.current_status === 'APPROVED').length
  const rejectedCount = leaves.filter(l => l.current_status === 'REJECTED').length

  // Unique employees in team OH for quick count
  const teamOHUniqueEmpCount = useMemo(() => new Set(teamOH.map(r => r.employee_id)).size, [teamOH])

  function openActionModal(req, type) {
    setSelectedReq(req)
    setActionType(type)
    setRemarks('')
    setFormError('')
    setModalOpen(true)
  }

  function handleActionSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (actionType === 'reject' && !remarks.trim()) return setFormError('Remarks are required when rejecting a leave request.')
    if (actionType === 'cancel' && !remarks.trim()) return setFormError('Remarks are required when cancelling an approved leave.')

    let endpoint = ''
    if (actionType === 'approve') endpoint = `/v1/leave/manager/leaves/${selectedReq.leave_request_id}/approve`
    else if (actionType === 'reject') endpoint = `/v1/leave/manager/leaves/${selectedReq.leave_request_id}/reject`
    else if (actionType === 'cancel') endpoint = `/v1/leave/manager/leaves/${selectedReq.leave_request_id}/cancel-approved`

    api.post(endpoint, { remarks: remarks.trim() })
      .then(() => { setModalOpen(false); loadLeaves() })
      .catch(err => setFormError(err.response?.data?.message || 'Action execution failed.'))
  }

  return (
    <div style={s.page}>
      <EmployeeSidebar active="leave-approvals" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="Leave Approvals" />
        <main style={s.main}>

          {/* Header */}
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>Leave Approval Board</h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Review, approve, or override leave requests from your direct reports</p>
            </div>
          </div>

          {/* KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Pending',   value: pendingCount,  accent: '#d97706', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)',  icon: '⏳' },
              { label: 'Approved',  value: approvedCount, accent: '#059669', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.22)',  icon: '✅' },
              { label: 'Rejected',  value: rejectedCount, accent: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.22)',   icon: '❌' },
              { label: 'Optional Holiday Avails', value: teamOH.length || '—', accent: '#9333ea', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.22)', icon: '✨' },
            ].map(({ label, value, accent, bg, border, icon }) => (
              <div key={label} style={{ background: '#fff', borderRadius: '16px', padding: '18px 20px', border: `1px solid ${border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: accent, lineHeight: 1, marginBottom: '3px' }}>{value}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tab Bar */}
          <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', gap: 0, padding: '0 18px', borderBottom: '1px solid #e8eaf0' }}>
              <button style={s.tab(activeTab === 'requests')} onClick={() => setActiveTab('requests')}>
                Leave Requests ({leaves.length})
              </button>
              <button style={s.tab(activeTab === 'optional-holidays')} onClick={() => setActiveTab('optional-holidays')}>
                Team Optional Holidays {teamOH.length > 0 ? `(${teamOH.length})` : ''}
              </button>
            </div>

            {/* ── Leave Requests Tab ── */}
            {activeTab === 'requests' && (
              <>
                {/* Filter bar */}
                <div style={s.filterBar}>
                  <input
                    type="text"
                    placeholder="Search employee name…"
                    value={fEmployee}
                    onChange={e => setFEmployee(e.target.value)}
                    style={{ ...s.filterInput, flex: 1, minWidth: '160px' }}
                  />
                  <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={s.filterInput}>
                    <option value="ALL">All Statuses</option>
                    {['PENDING','APPROVED','REJECTED','CANCELLED'].map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  {(fStatus !== 'ALL' || fEmployee) && (
                    <button onClick={() => { setFStatus('ALL'); setFEmployee('') }}
                      style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
                      Clear
                    </button>
                  )}
                  <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {filteredLeaves.length} record{filteredLeaves.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {loading ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading leaves…</div>
                ) : pagedLeaves.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                    {filteredLeaves.length === 0 && leaves.length > 0 ? 'No requests match the current filters.' : 'No leave requests submitted for your review.'}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {['Employee', 'Leave Type', 'Duration', 'Days', 'Reason', 'Status', 'Actions'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedLeaves.map(r => {
                        const st = STATUS_STYLE[r.current_status] || { bg: '#f1f5f9', color: '#64748b' }
                        return (
                          <tr key={r.leave_request_id}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            style={{ transition: 'background 0.15s' }}
                          >
                            <td style={s.td}>
                              <div style={{ fontWeight: '700', color: '#0f172a' }}>{r.employee_name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{r.employee_code}</div>
                            </td>
                            <td style={s.td}>
                              <div style={{ fontWeight: '600' }}>{r.leave_type_name}</div>
                              {r.session_type !== 'FULL_DAY' && <div style={{ fontSize: '11px', color: '#6366f1' }}>{r.session_type}</div>}
                            </td>
                            <td style={s.td}>
                              <div>{fmt(r.start_date)}</div>
                              {r.start_date !== r.end_date && <div style={{ fontSize: '11px', color: '#94a3b8' }}>→ {fmt(r.end_date)}</div>}
                            </td>
                            <td style={{ ...s.td, fontWeight: '700', color: '#0f172a' }}>{parseFloat(r.total_leave_days)}</td>
                            <td style={s.td}>
                              <div style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.leave_reason || '—'}</div>
                              {r.attachment_url && (
                                <a href={r.attachment_url} target="_blank" rel="noopener noreferrer"
                                  style={{ color: '#6366f1', textDecoration: 'none', fontSize: '11px', fontWeight: '600', marginTop: '2px', display: 'block' }}>
                                  🔗 Attachment
                                </a>
                              )}
                            </td>
                            <td style={s.td}>
                              <span style={{ ...s.statusBadge, background: st.bg, color: st.color }}>{r.current_status}</span>
                            </td>
                            <td style={s.td}>
                              {r.current_status === 'PENDING' && (
                                <div style={{ display: 'flex' }}>
                                  <button style={s.approveBtn} onClick={() => openActionModal(r, 'approve')}>Approve</button>
                                  <button style={s.rejectBtn}  onClick={() => openActionModal(r, 'reject')}>Reject</button>
                                </div>
                              )}
                              {r.current_status === 'APPROVED' && (
                                <button style={s.overrideBtn} onClick={() => openActionModal(r, 'cancel')}>Override / Cancel</button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
                <Pagination page={leavePage} total={filteredLeaves.length} onChange={setLeavePage} />
              </>
            )}

            {/* ── Team Optional Holidays Tab ── */}
            {activeTab === 'optional-holidays' && (
              <>
                {/* Filter bar */}
                <div style={s.filterBar}>
                  <input
                    type="text"
                    placeholder="Search employee name…"
                    value={ohEmployee}
                    onChange={e => setOhEmployee(e.target.value)}
                    style={{ ...s.filterInput, minWidth: '160px' }}
                  />
                  <input
                    type="text"
                    placeholder="Search holiday name…"
                    value={ohHoliday}
                    onChange={e => setOhHoliday(e.target.value)}
                    style={{ ...s.filterInput, minWidth: '160px' }}
                  />
                  {(ohEmployee || ohHoliday) && (
                    <button onClick={() => { setOhEmployee(''); setOhHoliday('') }}
                      style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
                      Clear
                    </button>
                  )}
                  <button onClick={loadTeamOH}
                    style={{ padding: '6px 14px', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', fontSize: '12px', fontWeight: '600', color: '#6366f1', cursor: 'pointer' }}>
                    ↻ Refresh
                  </button>
                  <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {teamOHUniqueEmpCount} employee{teamOHUniqueEmpCount !== 1 ? 's' : ''} · {teamOH.length} avail{teamOH.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Summary info banner */}
                {teamOH.length > 0 && (
                  <div style={{ margin: '14px 18px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.18)', fontSize: '12px', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✨</span>
                    <span>
                      <strong>{teamOHUniqueEmpCount}</strong> team member{teamOHUniqueEmpCount !== 1 ? 's have' : ' has'} availed a total of <strong>{teamOH.length}</strong> optional holiday{teamOH.length !== 1 ? 's' : ''} this year.
                    </span>
                  </div>
                )}

                {ohLoading ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading team optional holidays…</div>
                ) : pagedOH.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                    {filteredOH.length === 0 && teamOH.length > 0
                      ? 'No records match the current filters.'
                      : 'No team members have availed optional holidays yet.'}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {['Employee', 'Holiday Name', 'Holiday Date', 'Day of Week', 'Leave Year', 'Availed On'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedOH.map((r, idx) => (
                        <tr key={`${r.employee_id}-${r.holiday_id}-${idx}`}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          style={{ transition: 'background 0.15s' }}
                        >
                          <td style={s.td}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{r.employee_name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{r.employee_code}</div>
                          </td>
                          <td style={{ ...s.td, fontWeight: '600' }}>
                            <div>{r.holiday_name}</div>
                            {r.description && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{r.description}</div>}
                          </td>
                          <td style={s.td}>{r.holiday_date ? r.holiday_date.split('T')[0] : '—'}</td>
                          <td style={{ ...s.td, color: '#64748b' }}>
                            {r.holiday_date ? new Date(r.holiday_date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : '—'}
                          </td>
                          <td style={s.td}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontSize: '12px', fontWeight: '700', border: '1px solid rgba(99,102,241,0.2)' }}>
                              FY {r.leave_year}
                            </span>
                          </td>
                          <td style={{ ...s.td, color: '#64748b' }}>{fmt(r.availed_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <Pagination page={ohPage} total={filteredOH.length} onChange={setOhPage} />
              </>
            )}
          </div>

        </main>

        {/* Action Modal */}
        {modalOpen && (
          <div style={s.modalOverlay} onClick={() => setModalOpen(false)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <div style={s.modalHeader}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '17px', fontWeight: '700', textTransform: 'capitalize' }}>
                  {actionType} Request — {selectedReq?.employee_name}
                </h3>
                <button style={s.closeBtn} onClick={() => setModalOpen(false)}>&times;</button>
              </div>
              <form onSubmit={handleActionSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={s.label}>
                    Remarks {actionType !== 'approve' && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <textarea
                    style={{ ...s.input, height: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                    placeholder={
                      actionType === 'approve' ? 'Add remarks (optional)…'
                      : actionType === 'reject'  ? 'Reason for rejection (required)…'
                      : 'Reason for cancellation override (required)…'
                    }
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                  />
                </div>
                {formError && <div style={s.error}>⚠️ {formError}</div>}
                <button style={{
                  ...s.submitBtn,
                  background: actionType === 'reject' ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                    : actionType === 'cancel' ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
                    : 'linear-gradient(135deg,#10b981,#059669)'
                }} type="submit">
                  Confirm {actionType}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
