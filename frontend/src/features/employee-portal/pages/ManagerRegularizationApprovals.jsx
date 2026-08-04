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
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiCheckSquare style={{ color: '#6366f1' }} /> Regularization Approvals
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
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            
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
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '14px 18px' }}>Employee</th>
                      <th style={{ padding: '14px 18px' }}>Date</th>
                      <th style={{ padding: '14px 18px' }}>Category</th>
                      <th style={{ padding: '14px 18px' }}>Type</th>
                      <th style={{ padding: '14px 18px' }}>Requested Times</th>
                      <th style={{ padding: '14px 18px' }}>Reason</th>
                      <th style={{ padding: '14px 18px' }}>Submitted On</th>
                      <th style={{ padding: '14px 18px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 18px', color: '#1e293b', fontWeight: 700 }}>
                          {row.first_name} {row.last_name} ({row.employee_code})
                        </td>
                        <td style={{ padding: '12px 18px', color: '#6366f1', fontWeight: 700 }}>
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
                              style={{ padding: '6px 12px', background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleActionOpen(row, 'reject')}
                              style={{ padding: '6px 12px', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
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
                <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '420px', maxWidth: '90%', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                      {actionType === 'approve' ? 'Approve Regularization' : 'Reject Regularization'}
                    </h3>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}
                    >
                      <FiX size={16} />
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
                        style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(null)}
                        style={{ flex: 1, padding: '9px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        style={{
                          flex: 1, padding: '9px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#fff',
                          background: actionType === 'approve' ? '#16a34a' : '#dc2626', cursor: 'pointer'
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
