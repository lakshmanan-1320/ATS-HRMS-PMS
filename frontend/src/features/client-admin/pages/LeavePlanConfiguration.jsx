import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FiEdit2, FiInfo, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function LeavePlanConfiguration({ planId }) {
  const [loading, setLoading] = useState(true)
  const [leaveTypes, setLeaveTypes] = useState([])
  const [planConfigs, setPlanConfigs] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [configuringType, setConfiguringType] = useState(null)

  // Form Fields
  const [quota, setQuota] = useState('0')
  const [accrualType, setAccrualType] = useState('ANNUAL')
  const [carryRule, setCarryRule] = useState('LAPSE')
  const [maxCarry, setMaxCarry] = useState('0')
  const [encashRule, setEncashRule] = useState('NONE')
  const [maxEncash, setMaxEncash] = useState('0')
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [typesRes, configRes] = await Promise.all([
        api.get('/v1/leave/leave-types?active=true'),
        api.get(`/v1/leave/plans/${planId}/types`)
      ])
      setLeaveTypes(typesRes.data || [])
      setPlanConfigs(configRes.data || [])
    } catch (err) {
      console.error('Error loading config data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (planId) {
      loadData()
    }
  }, [planId])

  const getConfigForType = (typeId) => {
    return planConfigs.find(c => c.leave_type_id === typeId) || null
  }

  const openConfigModal = (type) => {
    setConfiguringType(type)
    const conf = getConfigForType(type.leave_type_id)
    if (conf) {
      setQuota(conf.quota_days.toString())
      setAccrualType(conf.accrual_type)
      setCarryRule(conf.carry_forward_rule)
      setMaxCarry(conf.max_carry_forward_days.toString())
      setEncashRule(conf.encashment_rule)
      setMaxEncash(conf.max_encash_days.toString())
    } else {
      setQuota('0')
      setAccrualType('ANNUAL')
      setCarryRule('LAPSE')
      setMaxCarry('0')
      setEncashRule('NONE')
      setMaxEncash('0')
    }
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const payload = {
      leave_type_id: configuringType.leave_type_id,
      quota_days: parseFloat(quota) || 0.0,
      accrual_type: accrualType,
      carry_forward_rule: carryRule,
      max_carry_forward_days: carryRule === 'LAPSE' ? 0.00 : parseFloat(maxCarry) || 0.00,
      encashment_rule: encashRule,
      max_encash_days: encashRule === 'NONE' ? 0.00 : parseFloat(maxEncash) || 0.00
    }

    api.post(`/v1/leave/plans/${planId}/types`, payload)
      .then(() => {
        setModalOpen(false)
        loadData()
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to save configuration.')
      })
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: '#f8fafc',
    border: '1px solid #e2e8f0', borderRadius: '10px',
    fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit'
  }

  return (
    <div>
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ width: 30, height: 30, border: '3px solid #e2e8f0', borderTopColor: '#C2071A', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: '#64748b', fontSize: '13px' }}>Loading configurations…</div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, background: '#fafbff' }}>
            <FiInfo size={14} color="#C2071A" />
            <span style={{ fontSize: '12px', color: '#941018', fontWeight: '700' }}>
              Assign quota, carry forward rules, and cashout criteria for each active leave policy in this plan.
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>Policy Type</th>
                  <th style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>Assigned Status</th>
                  <th style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>Annual Quota</th>
                  <th style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>Accrual Basis</th>
                  <th style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>Carry Forward Rule</th>
                  <th style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>Encashment Rule</th>
                  <th style={{ padding: '13px 18px', color: '#64748b', fontWeight: '700', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((type, idx) => {
                  const conf = getConfigForType(type.leave_type_id)
                  return (
                    <tr key={type.leave_type_id} style={{ borderBottom: idx < leaveTypes.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{type.leave_type_name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{type.leave_type_code}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {conf ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d' }}>
                            <FiCheck size={11} /> Configured
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b' }}>
                            Not Configured
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: '700', color: '#334155' }}>
                        {conf ? conf.quota_days + ' days' : '—'}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: '600', color: '#475569' }}>
                        {conf ? conf.accrual_type : '—'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {conf ? (
                          <div>
                            <span style={{ fontWeight: '600', color: '#475569' }}>{conf.carry_forward_rule.replace(/_/g, ' ')}</span>
                            {conf.carry_forward_rule === 'CARRY_FORWARD_LIMIT' && (
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Max CF: {conf.max_carry_forward_days} days</div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {conf ? (
                          <div>
                            <span style={{ fontWeight: '600', color: '#475569' }}>{conf.encashment_rule.replace(/_/g, ' ')}</span>
                            {conf.encashment_rule === 'ENCASH_LIMIT' && (
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Max Encash: {conf.max_encash_days} days</div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <button
                          onClick={() => openConfigModal(type)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#f8fafc', color: '#C2071A', border: '1px solid #f7a6af', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}
                        >
                          <FiEdit2 size={11} /> {conf ? 'Configure' : 'Setup'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '500px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                Setup {configuringType?.leave_type_name}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <FiX size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quota Days</label>
                  <input style={inputStyle} type="number" step="0.5" value={quota} onChange={e => setQuota(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accrual Basis</label>
                  <select style={inputStyle} value={accrualType} onChange={e => setAccrualType(e.target.value)}>
                    <option value="ANNUAL">Annual (Lump Sum)</option>
                    <option value="MONTHLY">Monthly Accrual</option>
                    <option value="QUARTERLY">Quarterly Accrual</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Carry Forward Rule</label>
                  <select style={inputStyle} value={carryRule} onChange={e => setCarryRule(e.target.value)}>
                    <option value="LAPSE">Lapse (Reset to 0)</option>
                    <option value="CARRY_FORWARD_ALL">Carry Forward All</option>
                    <option value="CARRY_FORWARD_LIMIT">Carry Forward Limit</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max Carry Forward Days</label>
                  <input style={inputStyle} type="number" step="0.5" value={maxCarry} onChange={e => setMaxCarry(e.target.value)} disabled={carryRule !== 'CARRY_FORWARD_LIMIT'} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Encashment Rule</label>
                  <select style={inputStyle} value={encashRule} onChange={e => setEncashRule(e.target.value)}>
                    <option value="NONE">No Encashment (Lapse remaining)</option>
                    <option value="ENCASH_ALL">Encash All Remaining</option>
                    <option value="ENCASH_LIMIT">Encash Limit</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max Encash Days</label>
                  <input style={inputStyle} type="number" step="0.5" value={maxEncash} onChange={e => setMaxEncash(e.target.value)} disabled={encashRule !== 'ENCASH_LIMIT'} />
                </div>
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
                <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#C2071A,#941018)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(194,7,26,0.35)' }}>
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
