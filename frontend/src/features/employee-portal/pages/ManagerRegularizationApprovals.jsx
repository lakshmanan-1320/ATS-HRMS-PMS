import React, { useState, useEffect } from 'react'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar.jsx'
import {
  FiCheckSquare, FiAlertCircle, FiCheck, FiX,
  FiFileText, FiClock, FiCheckCircle, FiXCircle
} from 'react-icons/fi'

/* ─── API Setup ─── */
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function ManagerRegularizationApprovals() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Modal / Comments State
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [actionType, setActionType] = useState('') // 'approve' | 'reject'
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadPending = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/attendance/regularization/pending')
      setRequests(res.data?.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch pending regularization requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
  }, [])

  const handleActionOpen = (request, type) => {
    setSelectedRequest(request)
    setActionType(type)
    setRemarks('')
  }

  const handleActionSubmit = async (e) => {
    e.preventDefault()
    if (actionType === 'reject' && !remarks.trim()) {
      alert('Remarks are required for rejecting a request.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const url = `/attendance/regularization/${selectedRequest.regularization_request_id}/${actionType}`
      await api.post(url, { remarks })
      setSuccess(`Request successfully ${actionType}d.`)
      setSelectedRequest(null)
      loadPending()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete approval action.')
    } finally {
      setSubmitting(false)
    }
  }

  // Style Tokens
  const pageStyle = { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }
  const mainStyle = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
  const containerStyle = { flex: 1, padding: '24px 32px', overflowY: 'auto' }

  return (
    <div style={pageStyle}>
      <EmployeeSidebar active="regularization-approvals" />

      <div style={mainStyle}>
        <EmployeeTopBar />

        <div style={containerStyle}>
          
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FEECEE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiCheckSquare size={20} color="#C2071A" strokeWidth={2.5} />
              </div>
              Regularization Approvals
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 500 }}>
              Review and act on attendance correction and permission requests submitted by your team.
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 600 }}>
              <FiAlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 600 }}>
              <FiCheck size={16} /> {success}
            </div>
          )}

          {/* Queue Container */}
          <div style={{ background: '#fff', border: 'none', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)' }}>
            
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>Pending adjustment approvals</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Awaiting manager review.</p>
            </div>

            {loading ? (
              <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
                Loading pending queue...
              </div>
            ) : requests.length === 0 ? (
              <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
                You have no pending regularization approvals in your queue.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '14px 18px', color: '#ffffff' }}>Employee</th>
                      <th style={{ padding: '14px 18px', color: '#ffffff' }}>Date</th>
                      <th style={{ padding: '14px 18px', color: '#ffffff' }}>Category</th>
                      <th style={{ padding: '14px 18px', color: '#ffffff' }}>Type</th>
                      <th style={{ padding: '14px 18px', color: '#ffffff' }}>Requested Times</th>
                      <th style={{ padding: '14px 18px', color: '#ffffff' }}>Reason</th>
                      <th style={{ padding: '14px 18px', color: '#ffffff' }}>Submitted On</th>
                      <th style={{ padding: '14px 18px', textAlign: 'center', color: '#ffffff' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 18px', color: '#1e293b', fontWeight: 700 }}>
                          {row.first_name} {row.last_name} ({row.employee_code})
                        </td>
                        <td style={{ padding: '12px 18px', color: '#C2071A', fontWeight: 700 }}>
                          {new Date(row.attendance_date).toISOString().slice(0, 10)}
                        </td>
                        <td style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>{row.request_category}</td>
                        <td style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>{row.request_type.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '12px 18px', color: '#1e293b', fontFamily: 'monospace' }}>
                          In: {row.requested_check_in ? new Date(row.requested_check_in).toISOString().slice(11, 16) : '—'} |
                          Out: {row.requested_check_out ? new Date(row.requested_check_out).toISOString().slice(11, 16) : '—'}
                        </td>
                        <td style={{ padding: '12px 18px', color: '#64748b', fontSize: '12px', fontStyle: 'italic', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.reason}
                        </td>
                        <td style={{ padding: '12px 18px', color: '#64748b' }}>
                          {new Date(row.created_at).toLocaleDateString('en-US')}
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleActionOpen(row, 'approve')}
                              style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleActionOpen(row, 'reject')}
                              style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

            {/* Approval / Rejection remarks modal */}
            {selectedRequest && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '420px', maxWidth: '90%', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                      {actionType === 'approve' ? 'Approve Regularization' : 'Reject Regularization'}
                    </h3>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}
                    >
                      <FiX size={18} color="#64748b" />
                    </button>
                  </div>

                  <form onSubmit={handleActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>EMPLOYEE</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{selectedRequest.first_name} {selectedRequest.last_name}</strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>REASON</span>
                      <p style={{ margin: 0, fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>"{selectedRequest.reason}"</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                        Remarks {actionType === 'reject' && <span style={{ color: '#ef4444' }}>*</span>}
                      </label>
                      <textarea
                        rows={3}
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        required={actionType === 'reject'}
                        placeholder={actionType === 'approve' ? 'Optional approval comments...' : 'Provide comments explaining the rejection...'}
                        style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(null)}
                        style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        style={{
                          flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#fff',
                          background: actionType === 'approve' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #C2071A 0%, #900513 100%)', cursor: 'pointer'
                        }}
                      >
                        {submitting ? 'Processing...' : 'Confirm'}
                      </button>
                    </div>
                  </form>

                </div>
              </div>
            )}

        </div>
      </div>
    </div>
  )
}
