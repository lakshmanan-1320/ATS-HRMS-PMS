import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiArrowRight, FiBookOpen, FiX, FiAlertCircle } from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default function LeavePlansList({ onSelectPlan }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  
  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [yearType, setYearType] = useState('calendar_year')
  const [startMonth, setStartMonth] = useState('1')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')

  const fetchPlans = () => {
    setLoading(true)
    api.get('/v1/leave/plans')
      .then(res => setPlans(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const openCreateModal = () => {
    setEditingPlan(null)
    setName('')
    setDescription('')
    setYearType('calendar_year')
    setStartMonth('1')
    setIsActive(true)
    setError('')
    setModalOpen(true)
  }

  const openEditModal = (e, plan) => {
    e.stopPropagation()
    setEditingPlan(plan)
    setName(plan.name)
    setDescription(plan.description || '')
    setYearType(plan.leave_year_type)
    setStartMonth(plan.start_month.toString())
    setIsActive(plan.is_active)
    setError('')
    setModalOpen(true)
  }

  const handleDelete = (e, planId) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this leave plan? This action cannot be undone.')) return
    
    api.delete(`/v1/leave/plans/${planId}`)
      .then(() => fetchPlans())
      .catch(err => {
        alert(err.response?.data?.message || 'Failed to delete leave plan. Make sure no employees are assigned to this plan.')
      })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Plan name is required.')

    const payload = {
      name: name.trim(),
      description: description.trim(),
      leave_year_type: yearType,
      start_month: parseInt(startMonth, 10),
      is_active: isActive
    }

    const req = editingPlan
      ? api.put(`/v1/leave/plans/${editingPlan.leave_plan_id}`, payload)
      : api.post('/v1/leave/plans', payload)

    req.then(() => {
      setModalOpen(false)
      fetchPlans()
    }).catch(err => {
      setError(err.response?.data?.message || 'Failed to save plan.')
    })
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: '#f8fafc',
    border: '1px solid #e2e8f0', borderRadius: '10px',
    fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.15s'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Leave Plans</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Configure custom leave plans, accruals, rules and assignments</p>
        </div>
        <button
          onClick={openCreateModal}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'linear-gradient(135deg,#C2071A,#941018)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(194,7,26,0.35)', transition: 'all 0.2s' }}
        >
          <FiPlus size={14} /> Create Plan
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#C2071A', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Loading plans…</div>
        </div>
      ) : plans.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
          <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'linear-gradient(135deg, #94a3b8 0%, #94a3b8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <FiBookOpen size={22} color="#ffffff" />
          </div>
          <div style={{ color: '#374151', fontSize: '14px', fontWeight: '700', marginBottom: 6 }}>No Leave Plans Configured</div>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>Create a plan to start associating leave rules with employees.</p>
          <button onClick={openCreateModal} style={{ padding: '9px 20px', background: 'linear-gradient(135deg,#C2071A,#941018)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            + Create First Leave Plan
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {plans.map(plan => (
            <div
              key={plan.leave_plan_id}
              onClick={() => onSelectPlan(plan)}
              style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px',
                cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(194,7,26,0.08)'
                e.currentTarget.style.borderColor = '#f7a6af'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'
                e.currentTarget.style.borderColor = '#e2e8f0'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  background: plan.is_active ? '#feecee' : '#f1f5f9',
                  color: plan.is_active ? '#941018' : '#64748b',
                  fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px',
                  textTransform: 'uppercase', letterSpacing: '0.04em'
                }}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={(e) => openEditModal(e, plan)}
                    style={{ background: '#C2071A', border: '1px solid #C2071A', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ffffff' }}
                  >
                    <FiEdit2 size={12} color="#ffffff" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, plan.leave_plan_id)}
                    style={{ background: '#b91c1c', border: '1px solid #b91c1c', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ffffff' }}
                  >
                    <FiTrash2 size={12} color="#ffffff" />
                  </button>
                </div>
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{plan.name}</h3>
              {plan.description && (
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '36px', lineHeight: '18px' }}>
                  {plan.description}
                </p>
              )}

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                  <FiCalendar size={13} color="#94a3b8" />
                  {plan.leave_year_type === 'calendar_year' ? 'Calendar Year' : 'Financial Year (starts month ' + plan.start_month + ')'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', color: '#941018', fontWeight: '700' }}>
                  Configure <FiArrowRight size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '480px', maxWidth: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {editingPlan ? 'Modify Leave Plan' : 'Create Leave Plan'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <FiX size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plan Name *</label>
                <input style={inputStyle} placeholder="e.g. Standard Leave Plan" value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                <textarea style={{ ...inputStyle, height: '70px', resize: 'none' }} placeholder="Brief description of who this plan is for…" value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave Year Type</label>
                  <select style={inputStyle} value={yearType} onChange={e => {
                    setYearType(e.target.value)
                    if (e.target.value === 'calendar_year') setStartMonth('1')
                  }}>
                    <option value="calendar_year">Calendar Year</option>
                    <option value="financial_year">Financial Year</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Month</label>
                  <select style={inputStyle} value={startMonth} onChange={e => setStartMonth(e.target.value)} disabled={yearType === 'calendar_year'}>
                    <option value="1">January (1)</option>
                    <option value="4">April (4)</option>
                    <option value="7">July (7)</option>
                    <option value="10">October (10)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '600' }}>
                  <input
                    type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#C2071A' }}
                  />
                  Active & Available for Assignment
                </label>
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
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
