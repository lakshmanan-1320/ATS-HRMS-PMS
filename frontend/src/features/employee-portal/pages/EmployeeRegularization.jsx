import React, { useState, useEffect } from 'react'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar.jsx'
import {
  FiFileText, FiPlusCircle, FiList, FiAlertCircle, FiCheckCircle,
  FiTrash2, FiClock, FiCalendar
} from 'react-icons/fi'

/* ─── API Setup ─── */
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function EmployeeRegularization() {
  const [activeTab, setActiveTab] = useState('submit') // 'submit' | 'history'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Policy configuration cached values
  const [settings, setSettings] = useState(null)

  // Request form state
  const [date, setDate] = useState('')
  const [type, setType] = useState('MISSING_PUNCH_IN')
  const [checkInTime, setCheckInTime] = useState('')
  const [checkOutTime, setCheckOutTime] = useState('')
  const [reason, setReason] = useState('')

  // History state
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Fetch configuration settings and limits
  const loadPolicy = async () => {
    try {
      const res = await api.get('/attendance/regularization/settings')
      const data = res.data?.data
      setSettings(data)
      if (data) {
        if (data.allow_missed_punch) {
          setType('MISSING_PUNCH_IN')
        } else if (data.allow_attendance_correction) {
          setType('ATTENDANCE_CORRECTION')
        } else if (data.enable_partial_day_permissions) {
          if (data.allow_late_coming_permission) setType('LATE_COMING_PERMISSION')
          else if (data.allow_early_exit_permission) setType('EARLY_EXIT_PERMISSION')
          else if (data.allow_temporary_exit_permission) setType('TEMPORARY_EXIT_PERMISSION')
        }
      }
    } catch (err) {
      // ignore
    }
  }

  // Fetch employee history list
  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await api.get('/attendance/regularization/my-requests')
      setHistory(res.data?.data || [])
    } catch (err) {
      // ignore
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadPolicy()
    loadHistory()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    // Deduce request category based on selected request type
    const isPermission = ['LATE_COMING_PERMISSION', 'EARLY_EXIT_PERMISSION', 'TEMPORARY_EXIT_PERMISSION'].includes(type)
    const category = isPermission ? 'PERMISSION' : 'REGULARIZATION'

    // Form absolute TIMESTAMPTZ strings
    const checkInDateTime = checkInTime ? `${date}T${checkInTime}:00Z` : null
    const checkOutDateTime = checkOutTime ? `${date}T${checkOutTime}:00Z` : null

    try {
      await api.post('/attendance/regularization/request', {
        attendance_date: date,
        request_category: category,
        request_type: type,
        requested_check_in: checkInDateTime,
        requested_check_out: checkOutDateTime,
        reason: reason
      })

      setSuccess('Your attendance regularization request was submitted successfully for approval.')
      setDate('')
      setCheckInTime('')
      setCheckOutTime('')
      setReason('')
      loadHistory()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit regularization request.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this pending regularization request?')) return
    try {
      await api.delete(`/attendance/regularization/request/${id}`)
      loadHistory()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel request.')
    }
  }

  // Style Tokens
  const pageStyle = { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }
  const mainStyle = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
  const containerStyle = { flex: 1, padding: '24px 32px', overflowY: 'auto' }

  return (
    <div className="pms-page" style={pageStyle}>
      <EmployeeSidebar active="regularization" />

      <div style={mainStyle}>
        <EmployeeTopBar />

        <div className="pms-content" style={containerStyle}>
          
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#001233', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiFileText size={20} color="#0466C8" strokeWidth={2.5} />
              </div>
              Attendance Regularization
            </h1>
            <p style={{ fontSize: '13px', color: '#7D8597', margin: 0, fontWeight: 500 }}>
              Correct missed punch clock ins/outs, update shift times, or submit partial day permissions.
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E3E7EE', marginBottom: '24px', paddingBottom: '2px' }}>
            <button
              onClick={() => setActiveTab('submit')}
              style={{
                padding: '10px 18px', border: 'none', background: 'none', fontSize: '13px', fontWeight: 700,
                color: activeTab === 'submit' ? '#0466C8' : '#7D8597', cursor: 'pointer',
                borderBottom: activeTab === 'submit' ? '2.5px solid #0466C8' : '2.5px solid transparent',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <FiPlusCircle size={15} color={activeTab === 'submit' ? '#0466C8' : '#7D8597'} /> Create Request
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: '10px 18px', border: 'none', background: 'none', fontSize: '13px', fontWeight: 700,
                color: activeTab === 'history' ? '#0466C8' : '#7D8597', cursor: 'pointer',
                borderBottom: activeTab === 'history' ? '2.5px solid #0466C8' : '2.5px solid transparent',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <FiList size={15} color={activeTab === 'history' ? '#0466C8' : '#7D8597'} /> My Request History
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 600 }}>
              <FiAlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 600 }}>
              <FiCheckCircle size={16} /> {success}
            </div>
          )}

          {activeTab === 'submit' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'start' }}>
              <form onSubmit={handleSubmit} style={{ background: '#fff', border: 'none', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  
                  {/* Request Date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      required
                      style={{ padding: '9px 12px', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', outline: 'none', colorScheme: 'light' }}
                    />
                  </div>

                  {/* Request Type */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adjustment Request Type</label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value)}
                      style={{ padding: '9px 12px', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', outline: 'none', cursor: 'pointer', background: '#fff' }}
                    >
                      {settings?.allow_missed_punch && (
                        <>
                          <option value="MISSING_PUNCH_IN">Missed Punch In</option>
                          <option value="MISSING_PUNCH_OUT">Missed Punch Out</option>
                        </>
                      )}
                      {settings?.allow_attendance_correction && (
                        <option value="ATTENDANCE_CORRECTION">Attendance Correction</option>
                      )}
                      {settings?.enable_partial_day_permissions && (
                        <>
                          {settings.allow_late_coming_permission && (
                            <option value="LATE_COMING_PERMISSION">Late Coming Permission</option>
                          )}
                          {settings.allow_early_exit_permission && (
                            <option value="EARLY_EXIT_PERMISSION">Early Leaving Permission</option>
                          )}
                          {settings.allow_temporary_exit_permission && (
                            <option value="TEMPORARY_EXIT_PERMISSION">Temporary Exit Permission</option>
                          )}
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Timing overrides */}
                {['MISSING_PUNCH_IN', 'ATTENDANCE_CORRECTION', 'LATE_COMING_PERMISSION', 'TEMPORARY_EXIT_PERMISSION'].includes(type) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {type === 'LATE_COMING_PERMISSION' ? 'Expected Check-in Time' : 'Corrected Check-in Time'}
                    </label>
                    <input
                      type="time"
                      value={checkInTime}
                      onChange={e => setCheckInTime(e.target.value)}
                      required={['MISSING_PUNCH_IN', 'ATTENDANCE_CORRECTION', 'LATE_COMING_PERMISSION'].includes(type)}
                      style={{ padding: '9px 12px', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', outline: 'none', maxWidth: '200px' }}
                    />
                  </div>
                )}

                {['MISSING_PUNCH_OUT', 'ATTENDANCE_CORRECTION', 'EARLY_EXIT_PERMISSION', 'TEMPORARY_EXIT_PERMISSION'].includes(type) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {type === 'EARLY_EXIT_PERMISSION' ? 'Expected Check-out Time' : 'Corrected Check-out Time'}
                    </label>
                    <input
                      type="time"
                      value={checkOutTime}
                      onChange={e => setCheckOutTime(e.target.value)}
                      required={['MISSING_PUNCH_OUT', 'ATTENDANCE_CORRECTION', 'EARLY_EXIT_PERMISSION'].includes(type)}
                      style={{ padding: '9px 12px', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', outline: 'none', maxWidth: '200px' }}
                    />
                  </div>
                )}

                {/* Reason description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#7D8597', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason / Remarks {settings?.reason_required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    required={settings?.reason_required}
                    placeholder="Describe why this correction or exception is needed..."
                    style={{ padding: '10px 12px', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)', color: '#fff', padding: '10px 24px', border: 'none',
                      borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 3px 10px rgba(4, 102, 200, 0.25)', opacity: saving ? 0.7 : 1
                    }}
                  >
                    <FiPlusCircle size={16} color="#ffffff" stroke="#ffffff" />
                    {saving ? 'Submitting request...' : 'Submit Request'}
                  </button>
                </div>

              </form>

              {/* Side limits cards */}
              {settings && (
                <div style={{ background: '#fff', border: 'none', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: '#001233', fontWeight: 700 }}>Adjustment Allowance</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#7D8597', fontWeight: 600 }}>MAX ALLOWED PER PERIOD</span>
                    <strong style={{ fontSize: '16px', color: '#001233' }}>{settings.max_requests_allowed} per {settings.request_period.toLowerCase()}</strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#7D8597', fontWeight: 600 }}>REGULARIZATION WINDOW</span>
                    <strong style={{ fontSize: '16px', color: '#001233' }}>{settings.regularization_window_days} past days</strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#7D8597', fontWeight: 600 }}>FUTURE PUNCH RULES</span>
                    <strong style={{ fontSize: '13px', color: settings.allow_future_regularization ? '#15803d' : '#7D8597' }}>
                      {settings.allow_future_regularization ? 'Future Dates Allowed' : 'Past Dates Only'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ background: '#fff', border: 'none', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)' }}>
              
              {historyLoading ? (
                <div style={{ padding: '60px 40px', textAlign: 'center', color: '#7D8597' }}>
                  Loading history logs...
                </div>
              ) : history.length === 0 ? (
                <div style={{ padding: '60px 40px', textAlign: 'center', color: '#7D8597' }}>
                  No regularization history logs submitted yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)' }}>
                        {['Date', 'Type', 'Requested checkin', 'Requested checkout', 'Reason', 'Status', 'Remarks', 'Action'].map(h => (
                          <th key={h} style={{ padding: '14px 18px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.06em', borderBottom: 'none' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((row, idx) => {
                        const status = row.approval_status
                        const isPending = status === 'PENDING'
                        const isApproved = status === 'APPROVED'
                        const isRejected = status === 'REJECTED'
                        
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '14px 18px', color: '#0466C8', fontWeight: 700 }}>
                              {new Date(row.attendance_date).toISOString().slice(0, 10)}
                            </td>
                            <td style={{ padding: '14px 18px', color: '#33415C', fontWeight: 600 }}>
                              {row.request_type.replace(/_/g, ' ')}
                            </td>
                            <td style={{ padding: '14px 18px', color: '#001233', fontFamily: 'monospace' }}>
                              {row.requested_check_in ? new Date(row.requested_check_in).toISOString().slice(11, 16) : '—'}
                            </td>
                            <td style={{ padding: '14px 18px', color: '#001233', fontFamily: 'monospace' }}>
                              {row.requested_check_out ? new Date(row.requested_check_out).toISOString().slice(11, 16) : '—'}
                            </td>
                            <td style={{ padding: '14px 18px', color: '#7D8597', fontSize: '12px', fontStyle: 'italic', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.reason || '—'}
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{
                                fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                                background: isApproved ? 'rgba(16,185,129,0.12)' : isPending ? 'rgba(245,158,11,0.12)' : isRejected ? 'rgba(239,68,68,0.12)' : '#F1F4F8',
                                color: isApproved ? '#059669' : isPending ? '#d97706' : isRejected ? '#ef4444' : '#33415C'
                              }}>
                                {status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', color: '#33415C', fontSize: '12px' }}>
                              {isApproved ? row.manager_comments : isRejected ? row.rejection_reason : '—'}
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              {isPending ? (
                                <button
                                  onClick={() => handleCancel(row.regularization_request_id)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                                    color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: '4px 10px', borderRadius: '8px'
                                  }}
                                >
                                  <FiTrash2 size={13} color="#ef4444" /> Cancel
                                </button>
                              ) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
