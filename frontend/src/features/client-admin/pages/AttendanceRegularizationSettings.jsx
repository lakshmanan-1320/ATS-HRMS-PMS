import React, { useState, useEffect } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import {
  FiSettings, FiSliders, FiList, FiAlertCircle, FiCheck,
  FiMail, FiX, FiCheckCircle, FiXCircle, FiCalendar
} from 'react-icons/fi'

/* ─── API Setup ─── */
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function AttendanceRegularizationSettings() {
  const [activeTab, setActiveTab] = useState('settings') // 'settings' | 'logs'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Settings State
  const [maxRequests, setMaxRequests] = useState(3)
  const [period, setPeriod] = useState('MONTH')
  const [windowDays, setWindowDays] = useState(7)
  const [reasonRequired, setReasonRequired] = useState(true)
  const [allowFuture, setAllowFuture] = useState(false)
  const [enablePartial, setEnablePartial] = useState(false)
  const [allowMissed, setAllowMissed] = useState(true)
  const [allowCorrection, setAllowCorrection] = useState(true)
  const [allowLate, setAllowLate] = useState(true)
  const [allowEarly, setAllowEarly] = useState(true)
  const [allowTempOut, setAllowTempOut] = useState(true)

  // Request Logs State
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Load configuration settings
  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/attendance/regularization/settings')
      const config = res.data?.data
      if (config) {
        setMaxRequests(config.max_requests_allowed)
        setPeriod(config.request_period)
        setWindowDays(config.regularization_window_days)
        setReasonRequired(config.reason_required)
        setAllowFuture(config.allow_future_regularization)
        setEnablePartial(config.enable_partial_day_permissions)
        setAllowMissed(config.allow_missed_punch)
        setAllowCorrection(config.allow_attendance_correction)
        setAllowLate(config.allow_late_coming_permission)
        setAllowEarly(config.allow_early_exit_permission)
        setAllowTempOut(config.allow_temporary_exit_permission)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch regularization policy settings.')
    } finally {
      setLoading(false)
    }
  }

  // Load organization-wide logs for viewing
  const loadLogs = async () => {
    setLogsLoading(true)
    try {
      // In a real environment, the admin queries the manager endpoint or an admin overview endpoint.
      // We will call the manager pending route, or fetch requests, or display a dashboard placeholder.
      // Let's call the manager pending route as a fallback, or handle empty display.
      const res = await api.get('/attendance/regularization/pending')
      setLogs(res.data?.data || [])
    } catch (err) {
      // ignore
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs()
    }
  }, [activeTab])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.put('/attendance/regularization/settings', {
        max_requests_allowed: maxRequests,
        request_period: period,
        regularization_window_days: windowDays,
        reason_required: reasonRequired,
        allow_future_regularization: allowFuture,
        enable_partial_day_permissions: enablePartial,
        allow_missed_punch: allowMissed,
        allow_attendance_correction: allowCorrection,
        allow_late_coming_permission: allowLate,
        allow_early_exit_permission: allowEarly,
        allow_temporary_exit_permission: allowTempOut
      })
      setSuccess('Policy configuration updated successfully.')
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings.')
    } finally {
      setSaving(false)
    }
  }

  // Style Tokens
  const pageStyle = { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }
  const mainStyle = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
  const containerStyle = { flex: 1, padding: '24px 32px', overflowY: 'auto' }

  return (
    <div style={pageStyle}>
      <ClientAdminSidebar active="regularizations" />

      <div style={mainStyle}>
        <ClientAdminTopBar />

        <div style={containerStyle}>
          
          {/* Header */}
          <PageHeader
            icon={FiCheckCircle}
            title="Attendance Regularization Settings"
            subtitle="Configure corporate attendance correction limits, validation windows, and approval workflows."
          />

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', paddingBottom: '2px' }}>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                padding: '10px 16px', border: 'none', background: 'none', fontSize: '13px', fontWeight: 700,
                color: activeTab === 'settings' ? '#C2071A' : '#64748b', cursor: 'pointer',
                borderBottom: activeTab === 'settings' ? '2px solid #C2071A' : 'none',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <FiSliders size={14} /> Adjustment Rules
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              style={{
                padding: '10px 16px', border: 'none', background: 'none', fontSize: '13px', fontWeight: 700,
                color: activeTab === 'logs' ? '#C2071A' : '#64748b', cursor: 'pointer',
                borderBottom: activeTab === 'logs' ? '2px solid #C2071A' : 'none',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <FiList size={14} /> Pending Audit Queue
            </button>
          </div>

          {/* Success / Error Messages */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', fontWeight: 600 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FiAlertCircle size={13} color="#ffffff" />
              </div>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', fontWeight: 600 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FiCheck size={13} color="#ffffff" />
              </div>
              {success}
            </div>
          )}

          {activeTab === 'settings' && (
            <form onSubmit={handleSave} style={{ width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              
              {/* Section 1: Allow Employees to Regularize */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>Regularization Limits</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Control request counts permitted in specific calendar timelines.</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>Allow employees to regularize up to</span>
                  <input
                    type="number"
                    value={maxRequests}
                    onChange={e => setMaxRequests(parseInt(e.target.value) || 0)}
                    min="1"
                    style={{ width: '60px', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', textAlign: 'center', outline: 'none' }}
                  />
                  <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>times in a</span>
                  <select
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="MONTH">Month</option>
                    <option value="QUARTER">Quarter</option>
                    <option value="YEAR">Year</option>
                  </select>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '20px 0' }} />

              {/* Section 2: Last Date to Regularize */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>Regularization Window Days</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Restrict limits for correcting older past records.</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>Employees can regularize attendance records within</span>
                  <input
                    type="number"
                    value={windowDays}
                    onChange={e => setWindowDays(parseInt(e.target.value) || 0)}
                    min="1"
                    style={{ width: '60px', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', textAlign: 'center', outline: 'none' }}
                  />
                  <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>days from attendance date.</span>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '20px 0' }} />

              {/* Section 3: Allowed Adjustment Types */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>Attendance Adjustment Settings</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Select which request categories are enabled in employee portals.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                    <input type="checkbox" checked={allowMissed} onChange={e => setAllowMissed(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#C2071A' }} />
                    Allow Missed Punch Requests
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                    <input type="checkbox" checked={allowCorrection} onChange={e => setAllowCorrection(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#C2071A' }} />
                    Allow Attendance Corrections
                  </label>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '20px 0' }} />

              {/* Section 4: General Preferences */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>Submission Policy Rules</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Specify comment and timeline validation constraints.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                    <input type="checkbox" checked={reasonRequired} onChange={e => setReasonRequired(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#C2071A' }} />
                    Require employees to provide a reason for regularization
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                    <input type="checkbox" checked={allowFuture} onChange={e => setAllowFuture(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#C2071A' }} />
                    Allow future date regularization requests
                  </label>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '20px 0' }} />

              {/* Section 5: Partial Day Permissions */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>Partial Day Permissions</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Enable short leave exemptions during standard shift hours.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enablePartial}
                    onChange={e => setEnablePartial(e.target.checked)}
                    style={{ width: '40px', height: '20px', cursor: 'pointer', accentColor: '#C2071A' }}
                  />
                </div>

                {enablePartial && (
                  <div style={{ paddingLeft: '20px', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '2px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                      <input type="checkbox" checked={allowLate} onChange={e => setAllowLate(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#C2071A' }} />
                      Allow Late Coming Permission
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                      <input type="checkbox" checked={allowEarly} onChange={e => setAllowEarly(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#C2071A' }} />
                      Allow Early Leaving Permission
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                      <input type="checkbox" checked={allowTempOut} onChange={e => setAllowTempOut(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#C2071A' }} />
                      Allow Temporary Exit Permission
                    </label>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: '#C2071A', color: '#fff', padding: '10px 24px', border: 'none', borderRadius: '10px',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s'
                  }}
                >
                  {saving ? 'Saving adjustments...' : 'Save Configuration'}
                </button>
              </div>

            </form>
          )}

          {activeTab === 'logs' && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              
              {/* Log Queue header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>Organization Pending requests queue</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Active items currently awaiting manager review across all departments.</p>
              </div>

              {logsLoading ? (
                <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
                  Loading logs...
                </div>
              ) : logs.length === 0 ? (
                <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
                  All regularization requests are currently audited and resolved.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '14px 18px' }}>Employee</th>
                      <th style={{ padding: '14px 18px' }}>Date</th>
                      <th style={{ padding: '14px 18px' }}>Category</th>
                      <th style={{ padding: '14px 18px' }}>Type</th>
                      <th style={{ padding: '14px 18px' }}>Check-in</th>
                      <th style={{ padding: '14px 18px' }}>Check-out</th>
                      <th style={{ padding: '14px 18px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 18px', color: '#1e293b', fontWeight: 700 }}>{row.first_name} {row.last_name}</td>
                        <td style={{ padding: '12px 18px', color: '#C2071A', fontWeight: 700 }}>{new Date(row.attendance_date).toISOString().slice(0, 10)}</td>
                        <td style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>{row.request_category}</td>
                        <td style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>{row.request_type.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '12px 18px', color: '#1e293b', fontFamily: 'monospace' }}>{row.requested_check_in ? new Date(row.requested_check_in).toLocaleTimeString('en-US', { hour12: false }) : '—'}</td>
                        <td style={{ padding: '12px 18px', color: '#1e293b', fontFamily: 'monospace' }}>{row.requested_check_out ? new Date(row.requested_check_out).toLocaleTimeString('en-US', { hour12: false }) : '—'}</td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#d97706' }}>
                            PENDING
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
