import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'
import { FiArrowLeft, FiCalendar, FiClock, FiAlertCircle, FiCheck, FiSend } from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

function fmt(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Styles ────────────────────────────────────────────────────────
const s = {
  page:      { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  main:      { flex: 1, padding: '28px 32px', overflowY: 'auto', maxWidth: '900px' },
  backBtn:   { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#374151', cursor: 'pointer', marginBottom: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  tabBar:    { display: 'flex', gap: '6px', background: '#e2e8f0', borderRadius: '12px', padding: '4px', marginBottom: '24px', width: 'fit-content' },
  tab: (a)  => ({ padding: '10px 22px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: a ? '700' : '600', cursor: 'pointer', transition: 'all 0.2s', background: a ? 'linear-gradient(135deg, #C2071A 0%, #900513 100%)' : 'transparent', color: a ? '#fff' : '#64748b', boxShadow: a ? '0 2px 8px rgba(194,7,26,0.25)' : 'none' }),
  card:      { background: '#fff', border: 'none', borderRadius: '16px', padding: '28px 32px', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)', marginBottom: '20px' },
  cardTitle: { fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' },
  cardSub:   { fontSize: '13px', color: '#64748b', margin: '0 0 24px' },
  grid2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  fGroup:    { marginBottom: '16px' },
  fLabel:    { display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  fInput:    { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', colorScheme: 'light', background: '#fff' },
  fSelect:   { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', color: '#1e293b', outline: 'none', cursor: 'pointer', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' },
  submitBtn: { width: '100%', padding: '12px', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', color: '#fff', cursor: 'pointer', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)' },
  permBtn:   { width: '100%', padding: '12px', background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', color: '#fff', cursor: 'pointer', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 3px 10px rgba(194, 7, 26, 0.25)' },
  msgError:  { color: '#ef4444', fontSize: '12px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px' },
  msgSuccess:{ color: '#059669', fontSize: '12px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '10px 14px' },
  policyBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', marginTop: '16px' },
  policyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' },
  balGrid:   { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' },
  balCell:   (col) => ({ background: '#f8fafc', border: `1px solid ${col}22`, borderRadius: '12px', padding: '14px', textAlign: 'center' }),
  balVal:    (col) => ({ fontSize: '28px', fontWeight: '800', color: col, lineHeight: 1, marginBottom: '2px' }),
  balLbl:    { fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
  smallBalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '12px', marginBottom: '24px' },
  smallBal:  (accent) => ({ background: '#fff', border: `1px solid ${accent}33`, borderRadius: '12px', padding: '14px 16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }),
}

// ── Leave Request Tab ─────────────────────────────────────────────
function LeaveTab({ balances, onSuccess }) {
  const [leaveTypeId,   setLeaveTypeId]   = useState(balances[0]?.leave_type_id || '')
  const [startDate,     setStartDate]     = useState('')
  const [endDate,       setEndDate]       = useState('')
  const [sessionType,   setSessionType]   = useState('FULL_DAY')
  const [reason,        setReason]        = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState('')
  const [submitting,    setSubmitting]    = useState(false)

  const selectedBalance = balances.find(b => String(b.leave_type_id) === String(leaveTypeId))
  const isHalfDay = sessionType !== 'FULL_DAY'

  const [preview, setPreview] = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (balances.length && !leaveTypeId) setLeaveTypeId(balances[0].leave_type_id)
  }, [balances])

  // When switching to half-day, lock end date to start date
  useEffect(() => {
    if (isHalfDay && startDate) setEndDate(startDate)
  }, [sessionType])

  // Fetch paid/LOP preview from the backend whenever relevant fields change
  useEffect(() => {
    if (!leaveTypeId || !startDate || !endDate || endDate < startDate) {
      setPreview(null)
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      api.post('/v1/leave/calculate-preview', {
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        session_type: sessionType,
      }).then(res => setPreview(res.data))
        .catch(() => setPreview(null))
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [leaveTypeId, startDate, endDate, sessionType])

  function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!leaveTypeId) return setError('Please select a leave type.')
    if (!startDate || !endDate) return setError('Start date and end date are required.')
    if (endDate < startDate) return setError('End date cannot be before start date.')
    if (!reason.trim()) return setError('Reason is required.')
    setSubmitting(true)
    api.post('/v1/leave/leaves', {
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      session_type: sessionType,
      leave_reason: reason.trim(),
      attachment_url: attachmentUrl.trim() || undefined,
    }).then(() => {
      setSuccess('Leave request submitted successfully!')
      setStartDate(''); setEndDate(''); setReason(''); setAttachmentUrl('')
      setSessionType('FULL_DAY'); setPreview(null)
      onSuccess && onSuccess()
    }).catch(err => setError(err.response?.data?.message || 'Failed to submit leave request.'))
     .finally(() => setSubmitting(false))
  }

  return (
    <div>
      {/* Balance summary */}
      {balances.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Your Leave Balances</div>
          <div style={s.smallBalGrid}>
            {balances.map(b => {
              const accent = b.is_paid_leave ? '#C2071A' : '#10b981'
              const avail  = parseFloat(b.available_days)
              return (
                <div key={b.leave_type_id}
                  style={{ ...s.smallBal(accent), cursor: 'pointer', outline: String(b.leave_type_id) === String(leaveTypeId) ? `2px solid ${accent}` : 'none' }}
                  onClick={() => setLeaveTypeId(b.leave_type_id)}
                >
                  <div style={{ fontSize: '10px', fontWeight: '700', color: accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{b.leave_type_name}</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: avail > 0 ? '#0f172a' : '#ef4444', lineHeight: 1 }}>{avail}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>days available</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={s.fGroup}>
          <label style={s.fLabel}>Leave Type</label>
          <select style={s.fSelect} value={leaveTypeId} onChange={e => setLeaveTypeId(e.target.value)}>
            {balances.map(b => (
              <option key={b.leave_type_id} value={b.leave_type_id}>
                {b.leave_type_name} — {b.available_days} days available
              </option>
            ))}
          </select>
        </div>

        {/* Duration — always visible; half-day locks end date to start date */}
        <div style={s.fGroup}>
          <label style={s.fLabel}>Duration</label>
          <select style={s.fSelect} value={sessionType} onChange={e => setSessionType(e.target.value)}>
            <option value="FULL_DAY">Full Day</option>
            <option value="FIRST_HALF">Half Day — First Half (Morning)</option>
            <option value="SECOND_HALF">Half Day — Second Half (Afternoon)</option>
          </select>
        </div>

        <div style={s.grid2}>
          <div style={s.fGroup}>
            <label style={s.fLabel}>Start Date</label>
            <input
              style={s.fInput} type="date" value={startDate}
              onChange={e => { setStartDate(e.target.value); if (isHalfDay) setEndDate(e.target.value) }}
            />
          </div>
          <div style={s.fGroup}>
            <label style={s.fLabel}>
              End Date{isHalfDay && <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: '#94a3b8' }}> (same as start)</span>}
            </label>
            <input
              style={{ ...s.fInput, background: isHalfDay ? '#f8fafc' : '#fff', color: isHalfDay ? '#94a3b8' : '#1e293b' }}
              type="date" value={endDate}
              onChange={e => setEndDate(e.target.value)}
              min={startDate}
              disabled={isHalfDay}
            />
          </div>
        </div>

        {/* Leave days summary — driven by backend preview */}
        {preview && preview.total_days > 0 && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '90px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{preview.total_days}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Total Days</div>
            </div>
            <div style={{ flex: 1, minWidth: '90px', background: 'rgba(194,7,26,0.05)', border: '1px solid rgba(194,7,26,0.2)', borderRadius: '10px', padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#C2071A', lineHeight: 1 }}>{preview.paid_days}</div>
              <div style={{ fontSize: '10px', color: '#C2071A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Paid Leave</div>
            </div>
            <div style={{ flex: 1, minWidth: '90px', background: preview.lop_days > 0 ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)', border: `1px solid ${preview.lop_days > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: '10px', padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: preview.lop_days > 0 ? '#ef4444' : '#059669', lineHeight: 1 }}>{preview.lop_days}</div>
              <div style={{ fontSize: '10px', color: preview.lop_days > 0 ? '#ef4444' : '#059669', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>LOP Days</div>
            </div>
          </div>
        )}

        <div style={s.fGroup}>
          <label style={s.fLabel}>Reason *</label>
          <textarea style={{ ...s.fInput, minHeight: '80px', resize: 'vertical' }} placeholder="Briefly describe the reason for your leave…" value={reason} onChange={e => setReason(e.target.value)} />
        </div>

        <div style={s.fGroup}>
          <label style={s.fLabel}>Attachment Link <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: '#94a3b8' }}>(optional)</span></label>
          <input style={s.fInput} placeholder="https://… (medical certificate, supporting document)" value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} />
        </div>

        {error   && <div style={s.msgError}><FiAlertCircle size={15} color="#ef4444" /> {error}</div>}
        {success && <div style={s.msgSuccess}><FiCheck size={15} color="#059669" /> {success}</div>}
        <button type="submit" style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
          <FiSend size={16} color="#ffffff" stroke="#ffffff" />
          {submitting ? 'Submitting…' : 'Submit Leave Request'}
        </button>
      </form>
    </div>
  )
}

// ── Permission Request Tab ────────────────────────────────────────
function PermissionTab({ onSuccess }) {
  const [settings,    setSettings]    = useState(null)
  const [balance,     setBalance]     = useState(null)
  const [permDate,    setPermDate]    = useState('')
  const [startTime,   setStartTime]   = useState('')
  const [endTime,     setEndTime]     = useState('')
  const [reason,      setReason]      = useState('')
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [loading,     setLoading]     = useState(true)

  function loadData() {
    setLoading(true)
    Promise.all([
      api.get('/v1/permissions/settings'),
      api.get('/v1/permissions/balances/my'),
    ]).then(([sRes, bRes]) => {
      setSettings(sRes.data)
      setBalance(bRes.data)
    }).catch(err => console.error('Permission data load error', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const remaining = balance ? (balance.allocated_count - balance.used_count) : 0
  const usedPct   = balance && balance.allocated_count > 0 ? (balance.used_count / balance.allocated_count) * 100 : 0

  function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!permDate)  return setError('Permission date is required.')
    if (!startTime) return setError('Start time is required.')
    if (!endTime)   return setError('End time is required.')
    if (startTime >= endTime) return setError('End time must be after start time.')
    if (!reason.trim()) return setError('Reason is required.')
    if (remaining <= 0) return setError('You have no permission balance remaining for this month.')
    setSubmitting(true)
    api.post('/v1/permissions/requests', {
      permission_date: permDate,
      start_time: startTime,
      end_time: endTime,
      reason: reason.trim(),
    }).then(() => {
      setSuccess('Permission request submitted successfully!')
      setPermDate(''); setStartTime(''); setEndTime(''); setReason('')
      loadData()
      onSuccess && onSuccess()
    }).catch(err => setError(err.response?.data?.message || 'Failed to submit permission request.'))
     .finally(() => setSubmitting(false))
  }

  if (loading) {
    return <div style={{ color: '#94a3b8', fontSize: '13px', padding: '40px', textAlign: 'center' }}>Loading permission settings…</div>
  }

  const now = new Date()
  const monthName = now.toLocaleString('en-IN', { month: 'long' })

  return (
    <div>
      {/* Balance summary */}
      {balance && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Your Permission Balance — {monthName} {now.getFullYear()}
          </div>
          <div style={s.balGrid}>
            {[['Allocated', balance.allocated_count, '#C2071A'], ['Used', balance.used_count, '#d97706'], ['Remaining', remaining, remaining > 0 ? '#059669' : '#ef4444']].map(([lbl, val, col]) => (
              <div key={lbl} style={s.balCell(col)}>
                <div style={s.balVal(col)}>{val}</div>
                <div style={s.balLbl}>{lbl}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: '#64748b' }}>
              <span>Monthly usage ({balance.used_count} of {balance.allocated_count} used)</span>
              <span>{Math.round(usedPct)}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '4px', background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '4px', width: `${Math.min(100, usedPct)}%`, background: usedPct >= 100 ? '#ef4444' : 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', transition: 'width 0.4s' }} />
            </div>
          </div>
        </div>
      )}

      {/* Policy info */}
      {settings && (
        <div style={{ ...s.policyBox, marginBottom: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>Monthly Allowance</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{settings.monthly_count} permission{settings.monthly_count !== 1 ? 's' : ''}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>Duration Per Permission</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{settings.hours_per_permission} hour{settings.hours_per_permission !== 1 ? 's' : ''}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>Pro-Rata on Join</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{settings.pro_rata_on_join ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}

      {remaining <= 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', fontSize: '13px', color: '#dc2626', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiAlertCircle size={16} color="#dc2626" />
          <span>You have exhausted your permission quota for this month. Quota resets on the 1st of next month.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={s.fGroup}>
          <label style={s.fLabel}>Permission Date</label>
          <input style={s.fInput} type="date" value={permDate} onChange={e => setPermDate(e.target.value)} />
        </div>

        <div style={s.grid2}>
          <div style={s.fGroup}>
            <label style={s.fLabel}>Start Time</label>
            <input style={s.fInput} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div style={s.fGroup}>
            <label style={s.fLabel}>End Time</label>
            <input style={s.fInput} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} min={startTime} />
          </div>
        </div>

        {startTime && endTime && endTime > startTime && (
          <div style={{ background: 'rgba(194,7,26,0.05)', border: '1px solid rgba(194,7,26,0.15)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#C2071A', fontWeight: '600' }}>
            Duration: {(() => {
              const [sh, sm] = startTime.split(':').map(Number)
              const [eh, em] = endTime.split(':').map(Number)
              const diffMin = (eh * 60 + em) - (sh * 60 + sm)
              const h = Math.floor(diffMin / 60)
              const m = diffMin % 60
              return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`
            })()}
          </div>
        )}

        <div style={s.fGroup}>
          <label style={s.fLabel}>Reason *</label>
          <textarea style={{ ...s.fInput, minHeight: '80px', resize: 'vertical' }} placeholder="Briefly describe the reason for your permission request…" value={reason} onChange={e => setReason(e.target.value)} />
        </div>

        {error   && <div style={s.msgError}><FiAlertCircle size={15} color="#ef4444" /> {error}</div>}
        {success && <div style={s.msgSuccess}><FiCheck size={15} color="#059669" /> {success}</div>}
        <button type="submit" style={{ ...s.permBtn, opacity: (submitting || remaining <= 0) ? 0.7 : 1 }} disabled={submitting || remaining <= 0}>
          <FiSend size={16} color="#ffffff" stroke="#ffffff" />
          {submitting ? 'Submitting…' : 'Submit Permission Request'}
        </button>
      </form>
    </div>
  )
}

// ── Main Page Component ───────────────────────────────────────────
export default function LeaveRequest() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('leave')
  const [balances,  setBalances]  = useState([])
  const [balLoading, setBalLoading] = useState(true)

  useEffect(() => {
    api.get('/v1/leave/balances/my')
      .then(res => setBalances(res.data || []))
      .catch(err => console.error('Balance load error', err))
      .finally(() => setBalLoading(false))
  }, [])

  return (
    <div style={s.page}>
      <EmployeeSidebar active="leave-request" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="Apply Leave / Permission" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <div style={{ maxWidth: '860px' }}>

            {/* Back button */}
            <button style={s.backBtn} onClick={() => navigate('/employee/leave')}>
              <FiArrowLeft size={14} color="#374151" /> Back to Leave Dashboard
            </button>

            {/* Page title */}
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FEECEE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiCalendar size={20} color="#C2071A" strokeWidth={2.5} />
                </div>
                Apply Leave / Permission
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: 500 }}>Submit a leave request based on your leave balance or request a short permission to be away.</p>
            </div>

            {/* Tab switcher */}
            <div style={s.tabBar}>
              <button style={s.tab(activeTab === 'leave')} onClick={() => setActiveTab('leave')}>
                Leave Request
              </button>
              <button style={s.tab(activeTab === 'permission')} onClick={() => setActiveTab('permission')}>
                Permission Request
              </button>
            </div>

            {/* Tab content */}
            <div style={s.card}>
              {activeTab === 'leave' && (
                <>
                  <h2 style={s.cardTitle}>Leave Request</h2>
                  <p style={s.cardSub}>Submit a leave request. Days will be deducted from your balance based on your leave policy.</p>
                  {balLoading ? (
                    <div style={{ color: '#94a3b8', fontSize: '13px', padding: '32px', textAlign: 'center' }}>Loading leave balances…</div>
                  ) : (
                    <LeaveTab balances={balances} onSuccess={() => {}} />
                  )}
                </>
              )}
              {activeTab === 'permission' && (
                <>
                  <h2 style={s.cardTitle}>Permission Request</h2>
                  <p style={s.cardSub}>Request permission to be away for a few hours. Managed by your monthly permission quota.</p>
                  <PermissionTab onSuccess={() => {}} />
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
