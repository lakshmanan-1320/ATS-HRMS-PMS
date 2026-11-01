import React, { useState, useEffect } from 'react'
import axios from 'axios'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar.jsx'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar.jsx'
import {
  FiCheckSquare, FiAlertCircle, FiCheck, FiX, FiClock, FiCheckCircle, FiXCircle, FiList, FiFileText
} from 'react-icons/fi'

/* ─── API Setup ─── */
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function ManagerOvertimeApprovals() {
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'history'
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Actions states
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [actionType, setActionType] = useState('') // 'approve' | 'reject'
  const [approvedMinutes, setApprovedMinutes] = useState(0)
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadRequests = async () => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = activeTab === 'pending' 
        ? '/v1/payroll/overtime/pending' 
        : '/v1/payroll/overtime/history'
      const res = await api.get(endpoint)
      setRequests(res.data?.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch overtime requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [activeTab])

  const handleActionOpen = (req, type) => {
    setSelectedRequest(req)
    setActionType(type)
    setApprovedMinutes(req.requested_ot_minutes)
    setRemarks('')
  }

  const handleActionSubmit = async (e) => {
    e.preventDefault()
    if (actionType === 'reject' && !remarks.trim()) {
      alert('Remarks are required for rejecting an overtime request.')
      return
    }
    if (actionType === 'approve') {
      if (approvedMinutes < 0) {
        alert('Approved hours cannot be negative.')
        return
      }
      if (approvedMinutes > selectedRequest.requested_ot_minutes) {
        alert('Approved hours cannot exceed requested overtime hours.')
        return
      }
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const url = `/v1/payroll/overtime/${selectedRequest.overtime_request_id}/${actionType}`
      const payload = actionType === 'approve' 
        ? { approved_ot_minutes: parseInt(approvedMinutes) }
        : { remarks: remarks.trim() }

      await api.post(url, payload)
      setSuccess(`Overtime request successfully ${actionType}d.`)
      setSelectedRequest(null)
      loadRequests()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete overtime action.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Styling Tokens ---
  const s = {
    layout: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' },
    main: { flex: 1, padding: '32px 40px', overflowY: 'auto' },
    h1: { fontSize: '24px', fontWeight: '800', color: '#001233', margin: '0 0 4px 0' },
    subtitle: { fontSize: '13px', color: '#7D8597', margin: '0 0 28px 0', fontWeight: '500' },
    tabs: { display: 'flex', gap: '8px', borderBottom: '1px solid #E3E7EE', marginBottom: '24px', paddingBottom: '8px' },
    tabBtn: (active) => ({
      padding: '8px 16px', background: active ? 'rgba(4, 102, 200, 0.08)' : 'transparent',
      border: 'none', color: active ? '#0466C8' : '#7D8597', fontSize: '13px', fontWeight: '700',
      cursor: 'pointer', transition: 'all 0.2s', borderBottom: active ? '2px solid #0466C8' : 'none',
      borderRadius: active ? '8px 8px 0 0' : '8px', fontFamily: 'inherit'
    }),
    card: { background: '#ffffff', border: 'none', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
    th: { padding: '14px 16px', color: '#ffffff', fontWeight: '700', borderBottom: 'none', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)' },
    tr: { borderBottom: '1px solid #edf2f7', transition: 'background 0.2s' },
    td: { padding: '12px 16px', color: '#001233', fontWeight: '500' },
    badge: (status) => {
      let bg = '#F1F4F8'; let color = '#33415C'; let border = 'rgba(71,85,105,0.2)';
      if (status === 'APPROVED') { bg = '#dcfce7'; color = '#15803d'; border = 'rgba(21,128,61,0.2)'; }
      else if (status === 'REJECTED' || status === 'CANCELLED') { bg = '#fee2e2'; color = '#b91c1c'; border = 'rgba(185,28,28,0.2)'; }
      else if (status === 'PENDING') { bg = '#fef3c7'; color = '#b45309'; border = 'rgba(180,83,9,0.2)'; }
      return { display: 'inline-block', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', background: bg, color: color, border: `1px solid ${border}` }
    },
    btnApprove: { padding: '6px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#059669', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' },
    btnReject: { padding: '6px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' },
    modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modalContent: { background: '#ffffff', border: 'none', borderRadius: '16px', width: '90%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' },
    label: { fontSize: '11px', fontWeight: '700', color: '#33415C', textTransform: 'uppercase', letterSpacing: '0.05em' },
    input: { padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', color: '#001233', outline: 'none', fontFamily: 'inherit' },
    btn: { padding: '10px 20px', background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontFamily: 'inherit' },
    btnSec: { padding: '10px 20px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#7D8597', cursor: 'pointer', fontFamily: 'inherit' },
    alert: (isError) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${isError ? '#fca5a5' : '#86efac'}`, background: isError ? '#fee2e2' : '#dcfce7', color: isError ? '#b91c1c' : '#15803d', fontSize: '13px', fontWeight: '600', marginBottom: '16px' })
  }

  return (
    <div className="pms-page" style={s.layout}>
      <EmployeeSidebar active="overtime-approvals" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeTopBar />
        <main style={s.main}>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#001233', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiClock size={20} color="#0466C8" strokeWidth={2.5} />
              </div>
              Overtime Approvals Panel
            </h1>
            <p style={s.subtitle}>Review, verify calculated check-ins, adjust approved hours, and approve or reject overtime requests.</p>
          </div>

          <div style={s.tabs}>
            <button style={s.tabBtn(activeTab === 'pending')} onClick={() => setActiveTab('pending')}>
              <FiClock style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Pending Approvals
            </button>
            <button style={s.tabBtn(activeTab === 'history')} onClick={() => setActiveTab('history')}>
              <FiList style={{ marginRight: '6px', verticalAlign: 'middle' }} /> History & Logs
            </button>
          </div>

          {error && <div style={s.alert(true)}><FiAlertCircle /> {error}</div>}
          {success && <div style={s.alert(false)}><FiCheckCircle /> {success}</div>}

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#7D8597', fontWeight: '600' }}>Loading requests...</div>
          ) : (
            <div style={s.card}>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Employee</th>
                      <th style={s.th}>Date / Type</th>
                      <th style={s.th}>Standard Shift</th>
                      <th style={s.th}>Actual Worked</th>
                      <th style={s.th}>OT Requested</th>
                      {activeTab === 'history' && <th style={s.th}>OT Approved</th>}
                      <th style={s.th}>Reason</th>
                      <th style={s.th}>{activeTab === 'pending' ? 'Actions' : 'Status & Remarks'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 ? (
                      <tr>
                        <td colSpan={activeTab === 'pending' ? 7 : 8} style={{ ...s.td, textAlign: 'center', padding: '32px', color: '#7D8597', fontWeight: 600 }}>
                          No overtime requests matching standard filters.
                        </td>
                      </tr>
                    ) : (
                      requests.map(req => {
                        const reqHrs = (req.requested_ot_minutes / 60).toFixed(1)
                        const appHrs = req.approved_ot_minutes !== null ? (req.approved_ot_minutes / 60).toFixed(1) : '—'
                        return (
                          <tr key={req.overtime_request_id} style={s.tr}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ ...s.td, fontWeight: '700' }}>
                              <div>{req.first_name} {req.last_name}</div>
                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>{req.employee_code} · {req.department_name || '—'}</div>
                            </td>
                            <td style={s.td}>
                              <div>{req.attendance_date.split('T')[0]}</div>
                              <span style={{
                                fontSize: '9px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px',
                                background: req.day_type === 'HOLIDAY' ? '#fef3c7' : req.day_type === 'WEEKEND' ? '#dbeafe' : '#F1F4F8',
                                color: req.day_type === 'HOLIDAY' ? '#b45309' : req.day_type === 'WEEKEND' ? '#1d4ed8' : '#33415C'
                              }}>{req.day_type}</span>
                            </td>
                            <td style={s.td}>{(req.shift_min_hours || 8.0).toFixed(1)} hrs</td>
                            <td style={s.td}>{(req.worked_hours || 0.0).toFixed(1)} hrs</td>
                            <td style={{ ...s.td, fontWeight: '700', color: '#0466C8' }}>{reqHrs} hrs</td>
                            {activeTab === 'history' && (
                              <td style={{ ...s.td, fontWeight: '800', color: '#15803d' }}>{appHrs} hrs</td>
                            )}
                            <td style={s.td}>{req.reason}</td>
                            <td style={s.td}>
                              {activeTab === 'pending' ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button style={s.btnApprove} onClick={() => handleActionOpen(req, 'approve')}>
                                    <FiCheck /> Approve
                                  </button>
                                  <button style={s.btnReject} onClick={() => handleActionOpen(req, 'reject')}>
                                    <FiX /> Reject
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <span style={s.badge(req.approval_status)}>{req.approval_status}</span>
                                  {req.remarks && (
                                    <div style={{ fontSize: '11px', color: '#7D8597', marginTop: '4px', fontStyle: 'italic' }}>
                                      {req.remarks}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
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

      {/* Action Modal (Approve / Reject) */}
      {selectedRequest && (
        <div style={s.modalBackdrop} onClick={() => setSelectedRequest(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#001233', fontSize: '16px', fontWeight: '800' }}>
                {actionType === 'approve' ? 'Approve Overtime Request' : 'Reject Overtime Request'}
              </h3>
              <button style={{ background: 'none', border: 'none', color: '#7D8597', fontSize: '20px', cursor: 'pointer' }} onClick={() => setSelectedRequest(null)}>×</button>
            </div>
            
            <form onSubmit={handleActionSubmit}>
              <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #E3E7EE', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
                <div style={{ fontWeight: '700', marginBottom: '4px' }}>{selectedRequest.first_name} {selectedRequest.last_name}</div>
                <div style={{ color: '#7D8597' }}>Date: {selectedRequest.attendance_date.split('T')[0]} ({selectedRequest.day_type})</div>
                <div style={{ color: '#7D8597', marginTop: '2px' }}>Requested OT: <strong>{(selectedRequest.requested_ot_minutes / 60).toFixed(1)} hrs</strong></div>
              </div>

              {actionType === 'approve' ? (
                <div style={s.formGroup}>
                  <label style={s.label}>Approved OT (Minutes)</label>
                  <input
                    type="number"
                    value={approvedMinutes}
                    onChange={e => setApprovedMinutes(e.target.value)}
                    style={s.input}
                    required
                    min="0"
                    max={selectedRequest.requested_ot_minutes}
                  />
                  <span style={{ fontSize: '11px', color: '#7D8597', marginTop: '4px' }}>
                    Calculates to <strong>{(approvedMinutes / 60).toFixed(1)} hours</strong>. You may decrease hours if required but cannot exceed original request.
                  </span>
                </div>
              ) : (
                <div style={s.formGroup}>
                  <label style={s.label}>Rejection Remarks</label>
                  <input
                    type="text"
                    placeholder="Enter reason for rejection"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    style={s.input}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" style={s.btnSec} onClick={() => setSelectedRequest(null)}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ ...s.btn, background: actionType === 'approve' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                  {submitting ? 'Processing...' : actionType === 'approve' ? 'Confirm Approval' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
