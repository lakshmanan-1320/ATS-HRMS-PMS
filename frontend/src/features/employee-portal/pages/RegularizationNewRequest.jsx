import React, { useState } from 'react'
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

const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: '700', color: '#7D8597',
  marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em',
}

const inputStyle = {
  width: '100%', padding: '10px 14px', background: '#ffffff',
  border: '1px solid #E3E7EE', borderRadius: '10px',
  fontSize: '13px', color: '#001233', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

const TYPE_INFO = {
  MISSED_CHECKIN:   { label: 'Missed Check-In Only',    desc: 'You arrived but forgot to scan in',        needsIn: true,  needsOut: false },
  MISSED_CHECKOUT:  { label: 'Missed Check-Out Only',   desc: 'You left but forgot to scan out',          needsIn: false, needsOut: true  },
  WRONG_PUNCH_TIME: { label: 'Correct Punch Timing',    desc: 'Both check-in and check-out need fixing',  needsIn: true,  needsOut: true  },
  MARK_AS_PRESENT:  { label: 'Mark Day as Present',     desc: 'Full-day attendance with correct timings', needsIn: true,  needsOut: true  },
  MARK_AS_ABSENT:   { label: 'Mark Day as Absent',      desc: 'Mark the day as absent in records',        needsIn: false, needsOut: false },
}

export default function RegularizationNewRequest() {
  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const [type, setType] = useState('MISSED_CHECKIN')
  const [checkInTime, setCheckInTime] = useState('')
  const [checkOutTime, setCheckOutTime] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const currentType = TYPE_INFO[type] || TYPE_INFO.MISSED_CHECKIN

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!date) return setFormError('Attendance date is required.')
    if (!reason.trim()) return setFormError('Reason / remarks is required.')

    let requested_checkin_time = null
    let requested_checkout_time = null

    if (currentType.needsIn) {
      if (!checkInTime) return setFormError('Check-in time is required for this correction type.')
      requested_checkin_time = `${date}T${checkInTime}:00Z`
    }
    if (currentType.needsOut) {
      if (!checkOutTime) return setFormError('Check-out time is required for this correction type.')
      requested_checkout_time = `${date}T${checkOutTime}:00Z`
    }

    setSubmitting(true)
    try {
      await api.post('/v1/regularizations', {
        attendance_date: date,
        regularization_type: type,
        requested_checkin_time,
        requested_checkout_time,
        reason: reason.trim(),
      })
      setFormSuccess('Request submitted successfully! Redirecting...')
      setTimeout(() => navigate('/employee/regularization'), 1500)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter,sans-serif' }}>
      <EmployeeSidebar active="regularization" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="Regularizations" />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <button
              onClick={() => navigate('/employee/regularization')}
              style={{
                padding: '8px 16px', background: '#ffffff', border: '1px solid #E3E7EE',
                borderRadius: '10px', fontSize: '13px', color: '#33415C', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0,
              }}
            >
              ← Back
            </button>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#001233', margin: 0 }}>
                New Regularization Request
              </h1>
              <p style={{ fontSize: '13px', color: '#7D8597', margin: '4px 0 0' }}>
                Submit an adjustment for a missed punch or wrong attendance record
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start', maxWidth: '900px' }}>

            {/* Form Card */}
            <div style={{
              background: '#ffffff', border: '1px solid #E3E7EE',
              borderRadius: '20px', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <h3 style={{ margin: '0 0 24px', fontSize: '15px', fontWeight: '700', color: '#001233' }}>
                Request Details
              </h3>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Attendance Date</label>
                  <input
                    type="date"
                    value={date}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => setDate(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Correction Type</label>
                  <select
                    value={type}
                    onChange={e => { setType(e.target.value); setCheckInTime(''); setCheckOutTime('') }}
                    style={inputStyle}
                  >
                    {Object.entries(TYPE_INFO).map(([val, info]) => (
                      <option key={val} value={val}>{info.label}</option>
                    ))}
                  </select>
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    {currentType.desc}
                  </p>
                </div>

                {currentType.needsIn && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Requested Check-In Time</label>
                    <input
                      type="time"
                      value={checkInTime}
                      onChange={e => setCheckInTime(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>
                )}

                {currentType.needsOut && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Requested Check-Out Time</label>
                    <input
                      type="time"
                      value={checkOutTime}
                      onChange={e => setCheckOutTime(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Reason / Remarks</label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="e.g. Forgot scanner card, checked out on client site, etc."
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }}
                    required
                  />
                </div>

                {formError && (
                  <div style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '10px', padding: '12px 16px',
                    color: '#ef4444', fontSize: '13px', marginBottom: '20px',
                  }}>
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div style={{
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: '10px', padding: '12px 16px',
                    color: '#059669', fontSize: '13px', marginBottom: '20px',
                  }}>
                    {formSuccess}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/employee/regularization')}
                    style={{
                      flex: 1, padding: '11px 0', background: '#F1F4F8',
                      border: '1px solid #E3E7EE', borderRadius: '10px',
                      fontSize: '13px', fontWeight: '600', color: '#33415C', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      flex: 2, padding: '11px 0',
                      background: submitting
                        ? '#a7f3d0'
                        : 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
                      border: 'none', borderRadius: '10px',
                      fontSize: '13px', fontWeight: '600', color: '#ffffff',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      boxShadow: submitting ? 'none' : '0 4px 12px rgba(16,185,129,0.25)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>

            {/* Guide Card */}
            <div style={{
              background: '#ffffff', border: '1px solid #E3E7EE',
              borderRadius: '20px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: '700', color: '#001233' }}>
                Correction Types
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(TYPE_INFO).map(([val, info]) => (
                  <div
                    key={val}
                    onClick={() => { setType(val); setCheckInTime(''); setCheckOutTime('') }}
                    style={{
                      padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                      border: `1px solid ${type === val ? '#10b981' : '#F1F4F8'}`,
                      background: type === val ? 'rgba(16,185,129,0.06)' : '#f8fafc',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '600', color: type === val ? '#059669' : '#374151', marginBottom: '2px' }}>
                      {info.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{info.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: '20px', padding: '14px', borderRadius: '10px',
                background: 'rgba(4, 102, 200,0.06)', border: '1px solid rgba(4, 102, 200,0.15)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0466C8', marginBottom: '6px' }}>
                  Policy Reminder
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#7D8597', lineHeight: '1.7' }}>
                  <li>Requests must be within the allowed window (typically 7 days)</li>
                  <li>Only one pending request allowed per date</li>
                  <li>Cannot regularize on approved leave dates</li>
                  <li>Monthly limit applies per company policy</li>
                </ul>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
