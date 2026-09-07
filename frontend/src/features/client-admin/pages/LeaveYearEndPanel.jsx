import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FiPlay, FiAlertTriangle, FiCheckCircle, FiLoader, FiAlertOctagon } from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function LeaveYearEndPanel({ planId }) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [statusLog, setStatusLog] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState('')

  const loadStatus = () => {
    setLoadingStatus(true)
    api.get(`/v1/leave/plans/${planId}/year-end/status/${selectedYear}`)
      .then(res => setStatusLog(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoadingStatus(false))
  }

  useEffect(() => {
    if (planId && selectedYear) {
      loadStatus()
    }
  }, [planId, selectedYear])

  const handleRun = () => {
    if (!window.confirm(`Are you absolutely sure you want to run Year-End Processing for year ${selectedYear}? This is a critical payroll-affecting batch transaction.`)) return
    
    setExecuting(true)
    setError('')
    api.post(`/v1/leave/plans/${planId}/year-end/process`, { year: selectedYear })
      .then(() => {
        loadStatus()
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Execution failed.')
        loadStatus()
      })
      .finally(() => setExecuting(false))
  }

  return (
    <div style={{ maxWidth: '650px' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Year-End Processing</h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>
          Transition employee leave balances to the next calendar/financial cycle.
        </p>

        {/* Year Selector */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Processing Year</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              style={{ width: '100%', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', color: '#1e293b', outline: 'none', fontWeight: '600' }}
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, paddingTop: '18px' }}>
            <button
              onClick={loadStatus}
              style={{ padding: '10px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
            >
              Check Log Status
            </button>
          </div>
        </div>

        {/* Processing Order Details */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Strict Processing Order</div>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#475569', lineHeight: '20px' }}>
            <li><strong>Used Deduction</strong>: Compute remaining balance.</li>
            <li><strong>Carry Forward</strong>: Transfer remaining leaves to next year up to CF plan limits.</li>
            <li><strong>Encashment</strong>: Payout cashouts on remaining pool up to Encash plan limits. Daily rate: <code>gross / 30</code>.</li>
            <li><strong>Lapse</strong>: Lapses any remaining allocation to zero.</li>
          </ol>
        </div>

        {/* Status Area */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Current Execution Status</div>
          
          {loadingStatus ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '13px' }}>
              <FiLoader className="spin" size={14} /> Loading status...
            </div>
          ) : !statusLog || statusLog.status === 'NOT_STARTED' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '13px' }}>
              <FiInfo size={14} /> Year-end processing has not been executed for this plan in {selectedYear}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {statusLog.status === 'RUNNING' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: '#fffbeb', color: '#b45309' }}>
                    <FiLoader className="spin" size={12} /> Running
                  </span>
                )}
                {statusLog.status === 'COMPLETED' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: '#dcfce7', color: '#15803d' }}>
                    <FiCheckCircle size={12} /> Completed
                  </span>
                )}
                {statusLog.status === 'FAILED' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: '#fef2f2', color: '#b91c1c' }}>
                    <FiAlertOctagon size={12} /> Failed
                  </span>
                )}
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Last Checked: {new Date(statusLog.updated_at).toLocaleString()}
                </span>
              </div>
              {statusLog.remarks && (
                <div style={{ fontSize: '12px', color: '#475569', background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', marginTop: 4, fontFamily: 'monospace' }}>
                  {statusLog.remarks}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Warning Banner */}
        <div style={{ display: 'flex', gap: 12, padding: '14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', marginBottom: '24px' }}>
          <FiAlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#b45309', marginBottom: 2 }}>Important Batch Operation Details</div>
            <p style={{ margin: 0, fontSize: '12px', color: '#78350f', lineHeight: '18px' }}>
              Running year-end processing processes employees in batches of 50 using transactional locks to prevent database timeout.
              This operation is final. Once completed, it cannot be run again for the same plan-year to prevent duplicate transactions.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', fontSize: '12px', fontWeight: '600', marginBottom: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #b91c1c 0%, #b91c1c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FiAlertTriangle size={11} color="#ffffff" />
            </div>
            {error}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleRun}
          disabled={executing || (statusLog && statusLog.status === 'COMPLETED')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
            padding: '12px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff',
            cursor: executing || (statusLog && statusLog.status === 'COMPLETED') ? 'not-allowed' : 'pointer',
            background: executing || (statusLog && statusLog.status === 'COMPLETED') ? '#e2e8f0' : 'linear-gradient(135deg,#C2071A,#941018)',
            boxShadow: executing || (statusLog && statusLog.status === 'COMPLETED') ? 'none' : '0 4px 14px rgba(194,7,26,0.35)',
            transition: 'all 0.2s'
          }}
        >
          <FiPlay size={13} /> {executing ? 'Processing Batches…' : (statusLog && statusLog.status === 'COMPLETED' ? 'Processed' : `Run Year-End Processing for ${selectedYear}`)}
        </button>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
