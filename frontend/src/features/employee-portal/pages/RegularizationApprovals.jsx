import React, { useState, useEffect } from 'react'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, sans-serif' },
  main: { flex: 1, padding: '40px', overflowY: 'auto' },
  header: { marginBottom: '32px' },
  h1: { fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px', margin: 0 },
  sub: { fontSize: '13px', color: '#64748b', margin: 0 },
  tableCard: {
    background: '#ffffff', border: '1px solid #e8eaf0',
    borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '32px'
  },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  th: {
    padding: '16px 20px', color: '#64748b', fontWeight: '600',
    borderBottom: '1px solid #e8eaf0', background: '#f8fafc',
    textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em'
  },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' },
  td: { padding: '16px 20px', color: '#1e293b' },
  actionBtn: {
    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
    borderRadius: '8px', padding: '6px 12px', color: '#059669', fontSize: '12px',
    fontWeight: '600', cursor: 'pointer', marginRight: '8px', transition: 'all 0.2s'
  },
  actionBtnDanger: {
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px', padding: '6px 12px', color: '#ef4444', fontSize: '12px',
    fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modal: {
    background: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: '20px', padding: '32px', width: '450px', maxWidth: '90%',
    boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '20px', borderBottom: '1px solid #e8eaf0', paddingBottom: '12px'
  },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' },
  textarea: {
    width: '100%', padding: '10px 14px', background: '#ffffff',
    border: '1px solid #e2e8f0', borderRadius: '10px',
    fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box',
    resize: 'vertical', minHeight: '100px', marginBottom: '16px', fontFamily: 'inherit',
  },
  submitRejectBtn: {
    padding: '11px 24px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', color: '#ffffff',
    cursor: 'pointer', width: '100%'
  },
  error: { color: '#ef4444', fontSize: '12px', marginBottom: '12px' }
}

export default function RegularizationApprovals() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [activeRequest, setActiveRequest] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  function loadPendingRequests() {
    setLoading(true)
    api.get('/v1/manager/regularizations')
      .then(res => {
        setRequests(res.data?.data || [])
      })
      .catch(err => console.error('Failed to load pending requests', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPendingRequests()
  }, [])

  async function handleApprove(id) {
    if (!window.confirm('Are you sure you want to approve this request? This will overwrite existing attendance timings.')) return
    try {
      await api.post(`/v1/manager/regularizations/${id}/approve`)
      loadPendingRequests()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve request.')
    }
  }

  function handleOpenReject(h) {
    setActiveRequest(h)
    setRejectionReason('')
    setErrorMsg('')
    setRejectModalOpen(true)
  }

  async function handleRejectSubmit(e) {
    e.preventDefault()
    setErrorMsg('')
    if (!rejectionReason.trim()) return setErrorMsg('Reason is required for rejections.')

    try {
      await api.post(`/v1/manager/regularizations/${activeRequest.regularization_id}/reject`, {
        rejection_reason: rejectionReason
      })
      setRejectModalOpen(false)
      loadPendingRequests()
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to reject request.')
    }
  }

  function formatTimeStr(isoString) {
    if (!isoString) return '—'
    const parts = isoString.split('T')
    if (parts.length < 2) return isoString
    return parts[1].slice(0, 5)
  }

  return (
    <div style={s.page}>
      <EmployeeSidebar active="regularization-approvals" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar title="Regularization Approvals" />
        <main style={s.main}>
        <div style={s.header}>
          <h1 style={s.h1}>Regularization Approvals</h1>
          <p style={s.sub}>Review and action attendance correction requests from your team members</p>
        </div>

        <div style={s.tableCard}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading team requests...</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No pending regularization requests in your queue.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Employee</th>
                  <th style={s.th}>Code</th>
                  <th style={s.th}>Date</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Corrected In</th>
                  <th style={s.th}>Corrected Out</th>
                  <th style={s.th}>Reason</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.regularization_id} style={s.tr}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...s.td, fontWeight: '700' }}>{r.first_name} {r.last_name}</td>
                    <td style={{ ...s.td, color: '#64748b' }}>{r.employee_code}</td>
                    <td style={{ ...s.td, fontWeight: '600' }}>{r.attendance_date.split('T')[0]}</td>
                    <td style={s.td}>{r.regularization_type.replace(/_/g, ' ')}</td>
                    <td style={s.td}>{formatTimeStr(r.requested_checkin_time)}</td>
                    <td style={s.td}>{formatTimeStr(r.requested_checkout_time)}</td>
                    <td style={{ ...s.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>
                      {r.reason}
                    </td>
                    <td style={s.td}>
                      <button style={s.actionBtn} onClick={() => handleApprove(r.regularization_id)}>
                        Approve
                      </button>
                      <button style={s.actionBtnDanger} onClick={() => handleOpenReject(r)}>
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rejectModalOpen && (
          <div style={s.modalOverlay}>
            <div style={s.modal}>
              <div style={s.modalHeader}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>
                  Reject Request
                </h3>
                <button style={s.closeBtn} onClick={() => setRejectModalOpen(false)}>×</button>
              </div>

              <form onSubmit={handleRejectSubmit}>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
                  Provide comments to let the employee know why their request is rejected:
                </p>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Please specify the correct punch times."
                  style={s.textarea}
                  required
                />

                {errorMsg && <div style={s.error}>{errorMsg}</div>}

                <button type="submit" style={s.submitRejectBtn}>
                  Submit Rejection
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  </div>
  )
}
