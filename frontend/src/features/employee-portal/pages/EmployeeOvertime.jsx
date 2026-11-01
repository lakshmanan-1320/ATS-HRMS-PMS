import React, { useState, useEffect } from 'react'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar.jsx'
import {
  FiClock, FiList, FiAlertCircle, FiCheckCircle, FiFileText, FiCalendar, FiArrowRight
} from 'react-icons/fi'

/* ─── API Setup ─── */
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function EmployeeOvertime() {
  const [activeTab, setActiveTab] = useState('apply') // 'apply' | 'history'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Data states
  const [eligibleDates, setEligibleDates] = useState([])
  const [history, setHistory] = useState([])
  const [selectedDateObj, setSelectedDateObj] = useState(null)
  const [reason, setReason] = useState('')

  const loadEligibleDates = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/v1/payroll/overtime/eligible-dates')
      setEligibleDates(res.data?.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch eligible overtime dates.')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    setError(null)
    try {
      const res = await api.get('/v1/payroll/overtime/my-requests')
      setHistory(res.data?.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch overtime requests history.')
    }
  }

  useEffect(() => {
    loadEligibleDates()
    loadHistory()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    } else {
      loadEligibleDates()
    }
  }, [activeTab])

  const handleDateChange = (dateStr) => {
    const selected = eligibleDates.find(d => d.attendance_date === dateStr)
    setSelectedDateObj(selected || null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedDateObj) {
      setError('Please select a valid attendance date.')
      return
    }
    if (!reason.trim()) {
      setError('Reason for overtime is required.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await api.post('/v1/payroll/overtime/request', {
        attendance_date: selectedDateObj.attendance_date,
        reason: reason.trim()
      })
      setSuccess('Overtime request submitted successfully!')
      setReason('')
      setSelectedDateObj(null)
      loadEligibleDates()
      loadHistory()
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit overtime request.')
    } finally {
      setSaving(false)
    }
  }

  // --- Inline CSS Palette matching the app ---
  const s = {
    layout: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
    main: { flex: 1, padding: '28px 32px', overflowY: 'auto' },
    h1: { fontSize: '24px', fontWeight: '800', color: '#001233', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' },
    subtitle: { fontSize: '13px', color: '#7D8597', margin: '0 0 28px 0', fontWeight: '500' },
    tabs: { display: 'flex', gap: '8px', borderBottom: '1px solid #E3E7EE', marginBottom: '24px', paddingBottom: '2px' },
    tabBtn: (active) => ({
      padding: '10px 18px', background: 'none',
      border: 'none', color: active ? '#0466C8' : '#7D8597', fontSize: '13px', fontWeight: '700',
      cursor: 'pointer', transition: 'all 0.2s', borderBottom: active ? '2.5px solid #0466C8' : '2.5px solid transparent',
      display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit'
    }),
    card: { background: '#ffffff', border: 'none', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)' },
    title: { margin: '0 0 16px 0', color: '#001233', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' },
    label: { fontSize: '11px', fontWeight: '700', color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.05em' },
    input: { padding: '10px 14px', background: '#ffffff', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', color: '#001233', outline: 'none', fontFamily: 'inherit' },
    select: { padding: '10px 14px', background: '#ffffff', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', color: '#001233', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' },
    btn: { padding: '10px 20px', background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(4, 102, 200, 0.25)' },
    alert: (isError) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${isError ? '#fca5a5' : '#86efac'}`, background: isError ? '#fee2e2' : '#dcfce7', color: isError ? '#b91c1c' : '#15803d', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }),
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
    th: { padding: '14px 16px', color: '#ffffff', fontWeight: '700', borderBottom: 'none', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.06em', background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)' },
    tr: { borderBottom: '1px solid #edf2f7', transition: 'background 0.2s' },
    td: { padding: '14px 16px', color: '#001233', fontWeight: '500' },
    badge: (status) => {
      let bg = '#F1F4F8'; let color = '#33415C'; let border = 'rgba(71,85,105,0.2)';
      if (status === 'APPROVED') { bg = 'rgba(16,185,129,0.12)'; color = '#059669'; border = 'rgba(16,185,129,0.25)'; }
      else if (status === 'REJECTED' || status === 'CANCELLED') { bg = 'rgba(239,68,68,0.12)'; color = '#ef4444'; border = 'rgba(239,68,68,0.25)'; }
      else if (status === 'PENDING') { bg = 'rgba(245,158,11,0.12)'; color = '#d97706'; border = 'rgba(245,158,11,0.25)'; }
      return { display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px', textTransform: 'uppercase', background: bg, color: color, border: `1px solid ${border}` }
    }
  }

  return (
    <div className="pms-page" style={s.layout}>
      <EmployeeSidebar active="overtime" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar />
        <main style={s.main}>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={s.h1}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiClock size={20} color="#0466C8" strokeWidth={2.5} />
              </div>
              Overtime (OT) Management
            </h1>
            <p style={s.subtitle}>Apply for overtime calculated from attendance logs, and track historical requests approvals.</p>
          </div>

          <div style={s.tabs}>
            <button style={s.tabBtn(activeTab === 'apply')} onClick={() => setActiveTab('apply')}>
              <FiClock size={15} color={activeTab === 'apply' ? '#0466C8' : '#7D8597'} /> Apply Overtime
            </button>
            <button style={s.tabBtn(activeTab === 'history')} onClick={() => setActiveTab('history')}>
              <FiList size={15} color={activeTab === 'history' ? '#0466C8' : '#7D8597'} /> History & Status
            </button>
          </div>

          {error && <div style={s.alert(true)}><FiAlertCircle size={16} /> {error}</div>}
          {success && <div style={s.alert(false)}><FiCheckCircle size={16} /> {success}</div>}

          {activeTab === 'apply' && (
            <div style={{ display: 'grid', gridTemplateColumns: '4fr 3fr', gap: '24px' }}>
              {/* Application Form */}
              <div style={s.card}>
                <h3 style={s.title}><FiFileText color="#0466C8" /> Apply for Overtime Earning</h3>
                {loading ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: '#7D8597', fontWeight: '600' }}>Loading eligible dates...</div>
                ) : eligibleDates.length === 0 ? (
                  <div style={{
                    background: 'rgba(4, 102, 200,0.04)', border: '1px dashed #0466C8',
                    padding: '32px', borderRadius: '12px', textAlign: 'center', color: '#0466C8', fontWeight: '600'
                  }}>
                    <FiCalendar size={28} style={{ marginBottom: '8px' }} color="#0466C8" />
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700' }}>No Eligible Dates Found</p>
                    <span style={{ fontSize: '12px', color: '#7D8597', fontWeight: '500' }}>
                      Overtime eligibility relies on checking out after shift requirements. No extra hours punches were found in the current cycle.
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div style={s.formGroup}>
                      <label style={s.label}>Attendance Date</label>
                      <select
                        onChange={e => handleDateChange(e.target.value)}
                        value={selectedDateObj?.attendance_date || ''}
                        style={s.select}
                        required
                      >
                        <option value="">-- Select Date --</option>
                        {eligibleDates.map(d => (
                          <option key={d.attendance_date} value={d.attendance_date}>
                            {d.attendance_date} ({d.day_type} · worked { (d.worked_minutes / 60).toFixed(1) } hrs)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={s.formGroup}>
                      <label style={s.label}>Reason for Overtime</label>
                      <input
                        type="text"
                        placeholder="e.g. Critical deployment, month-end billing, etc."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        style={s.input}
                        required
                      />
                    </div>

                    <button type="submit" disabled={saving} style={{ ...s.btn, width: '100%', marginTop: '8px', opacity: saving ? 0.7 : 1 }}>
                      <FiClock size={16} color="#ffffff" stroke="#ffffff" />
                      {saving ? 'Submitting...' : 'Apply Overtime Request'}
                    </button>
                  </form>
                )}
              </div>

              {/* Attendance Details Preview Card */}
              <div style={s.card}>
                <h3 style={s.title}><FiClock color="#0466C8" /> Selected Date Calculations</h3>
                {selectedDateObj ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F4F8', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#7D8597' }}>Attendance Date</span>
                      <strong style={{ fontSize: '13px', color: '#001233' }}>{selectedDateObj.attendance_date}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F4F8', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#7D8597' }}>Day Type</span>
                      <span style={{
                        fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px',
                        background: selectedDateObj.day_type === 'HOLIDAY' ? '#fef3c7' : selectedDateObj.day_type === 'WEEKEND' ? '#dbeafe' : '#F1F4F8',
                        color: selectedDateObj.day_type === 'HOLIDAY' ? '#b45309' : selectedDateObj.day_type === 'WEEKEND' ? '#1d4ed8' : '#33415C'
                      }}>{selectedDateObj.day_type}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F4F8', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#7D8597' }}>Shift Standard Duration</span>
                      <strong style={{ fontSize: '13px', color: '#001233' }}>{(selectedDateObj.shift_minutes / 60).toFixed(1)} hrs</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F4F8', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#7D8597' }}>Actual Worked Duration</span>
                      <strong style={{ fontSize: '13px', color: '#001233' }}>{(selectedDateObj.worked_minutes / 60).toFixed(1)} hrs</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(4, 102, 200,0.06)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(4, 102, 200,0.15)' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#0466C8' }}>Extra Hours (OT) Claimed</span>
                      <strong style={{ fontSize: '14px', color: '#0466C8', fontWeight: '800' }}>{(selectedDateObj.extra_minutes / 60).toFixed(1)} hrs</strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#7D8597', fontSize: '13px', padding: '40px 0', textAlign: 'center', fontWeight: '500' }}>
                    Select an eligible date to view standard shift and calculated punches extra hours breakdowns.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div style={s.card}>
              <h3 style={{ ...s.title, marginBottom: '20px' }}><FiList color="#0466C8" /> Overtime Requests History</h3>
              <div style={{ overflowX: 'auto', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Date</th>
                      <th style={s.th}>Day Type</th>
                      <th style={s.th}>Requested (OT)</th>
                      <th style={s.th}>Approved (OT)</th>
                      <th style={s.th}>Reason</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th}>Approver Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ ...s.td, textAlign: 'center', padding: '32px', color: '#7D8597', fontWeight: 600 }}>
                          No overtime requests history found.
                        </td>
                      </tr>
                    ) : (
                      history.map(req => {
                        const reqHrs = (req.requested_ot_minutes / 60).toFixed(1)
                        const appHrs = req.approved_ot_minutes !== null ? (req.approved_ot_minutes / 60).toFixed(1) : '—'
                        return (
                          <tr key={req.overtime_request_id} style={s.tr}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ ...s.td, fontWeight: '700', color: '#0466C8' }}>{req.attendance_date.split('T')[0]}</td>
                            <td style={s.td}>
                              <span style={{
                                fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px',
                                background: req.day_type === 'HOLIDAY' ? '#fef3c7' : req.day_type === 'WEEKEND' ? '#dbeafe' : '#F1F4F8',
                                color: req.day_type === 'HOLIDAY' ? '#b45309' : req.day_type === 'WEEKEND' ? '#1d4ed8' : '#33415C'
                              }}>{req.day_type}</span>
                            </td>
                            <td style={s.td}>{reqHrs} hrs</td>
                            <td style={{ ...s.td, fontWeight: '700', color: req.approval_status === 'APPROVED' ? '#059669' : '#001233' }}>
                              {appHrs} hrs
                            </td>
                            <td style={s.td}>{req.reason}</td>
                            <td style={s.td}>
                              <span style={s.badge(req.approval_status)}>{req.approval_status}</span>
                            </td>
                            <td style={{ ...s.td, fontStyle: 'italic', color: '#7D8597' }}>{req.remarks || '—'}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
