import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FiX, FiCheck, FiInfo, FiAlertCircle } from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function LeaveAdjustmentsForm({ employee, onClose, onSave }) {
  const currentYear = new Date().getFullYear()
  const [leaveTypes, setLeaveTypes] = useState([])
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  
  // Current values
  const [currentAllocated, setCurrentAllocated] = useState(0)
  const [currentUsed, setCurrentUsed] = useState(0)
  const [loadingCurrent, setLoadingCurrent] = useState(false)

  // Input Fields
  const [newAllocated, setNewAllocated] = useState('0')
  const [newUsed, setNewUsed] = useState('0')
  const [remarks, setRemarks] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Load leave types
    api.get('/v1/leave/leave-types?active=true')
      .then(res => {
        const types = res.data || []
        setLeaveTypes(types)
        if (types.length > 0) setSelectedTypeId(types[0].leave_type_id)
      })
      .catch(err => console.error(err))
  }, [])

  const loadCurrentBalances = () => {
    if (!employee || !selectedTypeId || !selectedYear) return
    setLoadingCurrent(true)
    api.get(`/v1/leave/admin/employee/${employee.employee_id}/balances`)
      .then(res => {
        const balances = res.data || []
        const match = balances.find(b => b.leave_type_id === selectedTypeId)
        if (match) {
          setCurrentAllocated(parseFloat(match.allocated_days) || 0)
          setCurrentUsed(parseFloat(match.used_days) || 0)
          setNewAllocated(match.allocated_days.toString())
          setNewUsed(match.used_days.toString())
        } else {
          setCurrentAllocated(0)
          setCurrentUsed(0)
          setNewAllocated('0')
          setNewUsed('0')
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingCurrent(false))
  }

  useEffect(() => {
    loadCurrentBalances()
  }, [employee, selectedTypeId, selectedYear])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!remarks.trim()) return setError('Remarks are required for audit log trail.')

    setSaving(true)
    const payload = {
      employeeId: employee.employee_id,
      leaveTypeId: selectedTypeId,
      financialYear: parseInt(selectedYear, 10),
      newAllocated: parseFloat(newAllocated) || 0,
      newUsed: parseFloat(newUsed) || 0,
      remarks: remarks.trim()
    }

    api.post('/v1/leave/admin/adjust-balance', payload)
      .then(() => {
        onSave()
        onClose()
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to adjust balance.')
      })
      .finally(() => setSaving(false))
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: '#f8fafc',
    border: '1px solid #e2e8f0', borderRadius: '10px',
    fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit'
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '500px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Adjust Leave Balance</h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>For {employee?.first_name} {employee?.last_name} ({employee?.employee_code})</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
          >
            <FiX size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave Type</label>
              <select style={inputStyle} value={selectedTypeId} onChange={e => setSelectedTypeId(e.target.value)}>
                {leaveTypes.map(t => (
                  <option key={t.leave_type_id} value={t.leave_type_id}>{t.leave_type_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financial Year</label>
              <select style={inputStyle} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Info Panel */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {loadingCurrent ? (
              <span style={{ fontSize: '12px', color: '#64748b' }}>Loading current balance...</span>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Current Allocated</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{currentAllocated} days</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Current Used</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{currentUsed} days</div>
                </div>
              </>
            )}
          </div>

          {/* Adjust Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Allocated Days</label>
              <input style={inputStyle} type="number" step="0.5" value={newAllocated} onChange={e => setNewAllocated(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Used Days</label>
              <input style={inputStyle} type="number" step="0.5" value={newUsed} onChange={e => setNewUsed(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audit Remarks *</label>
            <textarea style={{ ...inputStyle, height: '70px', resize: 'none' }} placeholder="Explain the reason for adjustment (e.g. balance correction, legacy upload)..." value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>

          {/* Ledger notice */}
          <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: '#feecee', border: '1px solid #f7a6af', borderRadius: '8px', marginBottom: '20px' }}>
            <FiInfo size={13} color="#941018" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: '11px', color: '#7c0a1a', lineHeight: '15px' }}>
              This action creates formal credit/debit double-entry transactions in the employee's Leave Ledger for absolute historical auditing.
            </span>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', fontSize: '12px', fontWeight: '600', marginBottom: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #b91c1c 0%, #b91c1c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FiAlertCircle size={11} color="#ffffff" />
              </div>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#C2071A,#941018)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(194,7,26,0.35)' }}>
              {saving ? 'Saving Adjustment…' : 'Save Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
