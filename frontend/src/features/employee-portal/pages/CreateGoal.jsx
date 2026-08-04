import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import EmployeeSidebar from '../../../components/layout/EmployeeSidebar'
import EmployeeTopBar from '../../../components/layout/EmployeeTopBar'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const inputSt = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  background: '#ffffff', border: '1px solid #e2e8f0',
  borderRadius: '8px', color: '#1e293b', fontSize: '13px', fontFamily: 'inherit',
  colorScheme: 'light', outline: 'none',
}

const labelSt = {
  fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px',
}

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    if (msg) { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }
  }, [msg])
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
      background: type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
      border: `1px solid ${type === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
      color: type === 'error' ? '#ef4444' : '#059669',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>{msg}</div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onChange() }}
      style={{
        width: '42px', height: '24px', borderRadius: '12px', flexShrink: 0,
        background: checked ? '#6366f1' : '#e2e8f0',
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: '4px',
        left: checked ? '22px' : '4px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </div>
  )
}

const BLANK_SUB = { title: '', weight: '' }

export default function CreateGoal() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetMetric, setTargetMetric] = useState('')
  const [parentGoalId, setParentGoalId] = useState('')
  const [isTimeSpecific, setIsTimeSpecific] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [subGoals, setSubGoals] = useState([{ ...BLANK_SUB }])

  const [parentGoals, setParentGoals] = useState([])
  const [goalConfig, setGoalConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success' })

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    Promise.all([
      api.get('/employee/goals/goal-config'),
      api.get('/employee/goals/created'),
    ])
      .then(([cfgRes, goalsRes]) => {
        setGoalConfig(cfgRes.data)
        setParentGoals((goalsRes.data || []).filter(g => !g.parent_goal_id))
      })
      .catch(() => showToast('Failed to load data', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const filledSubGoals = subGoals.filter(sg => sg.title.trim())
  const totalWeight = subGoals.reduce((sum, sg) => sum + (Number(sg.weight) || 0), 0)
  const hasSubGoals = filledSubGoals.length > 0

  function addSubGoal() {
    setSubGoals(prev => [...prev, { ...BLANK_SUB }])
  }

  function removeSubGoal(idx) {
    setSubGoals(prev => prev.filter((_, i) => i !== idx))
  }

  function updateSubGoal(idx, field, value) {
    if (field === 'weight') {
      const otherTotal = subGoals.reduce((sum, sg, i) => sum + (i !== idx ? (Number(sg.weight) || 0) : 0), 0)
      const maxAllowed = 100 - otherTotal
      const capped = Math.min(Number(value) || 0, maxAllowed)
      setSubGoals(prev => prev.map((sg, i) => i === idx ? { ...sg, weight: value === '' ? '' : capped } : sg))
      return
    }
    setSubGoals(prev => prev.map((sg, i) => i === idx ? { ...sg, [field]: value } : sg))
  }

  async function handleSave() {
    if (!title.trim()) { showToast('Title is required.', 'error'); return }

    if (hasSubGoals) {
      const missingWeight = filledSubGoals.some(sg => !sg.weight)
      if (missingWeight) { showToast('All sub-goals must have a weight.', 'error'); return }
      if (totalWeight !== 100) {
        showToast(`Sub-goal weights must total 100%. Current total: ${totalWeight}%.`, 'error')
        return
      }
    }

    setSaving(true)
    try {
      const res = await api.post('/employee/goals', {
        title: title.trim(),
        description: description.trim() || undefined,
        target_metric: targetMetric.trim() || undefined,
        parent_goal_id: parentGoalId || undefined,
        start_date: isTimeSpecific && startDate ? startDate : undefined,
        due_date: isTimeSpecific && dueDate ? dueDate : undefined,
      })

      const newGoalId = res.data.data.id
      for (const sg of filledSubGoals) {
        await api.post('/employee/goals', {
          title: sg.title.trim(),
          weight: Number(sg.weight),
          parent_goal_id: newGoalId,
        })
      }

      showToast('Goal created successfully.')
      setTimeout(() => navigate('/employee/goals'), 1200)
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, sans-serif' }}>
        <EmployeeSidebar active="goals" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <EmployeeTopBar title="Create Goal" />
          <main style={{ flex: 1, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>Loading...</div>
        </main>
      </div>
    </div>
    )
  }

  if (goalConfig && !goalConfig.allow_employee_goal) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, sans-serif' }}>
        <EmployeeSidebar active="goals" />
        <main style={{ flex: 1, padding: '32px' }}>
          <div style={{ color: '#ef4444', fontSize: '14px', padding: '24px', background: 'rgba(239,68,68,0.06)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)' }}>
            Goal creation is currently disabled by your administrator.
          </div>
        </main>
      </div>
    )
  }

  const weightColor = totalWeight === 100 ? '#10b981' : totalWeight > 100 ? '#ef4444' : '#6366f1'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, sans-serif' }}>
      <EmployeeSidebar active="goals" />
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <button
            onClick={() => navigate('/employee/goals')}
            style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
          >
            ← Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Create Goal</h1>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>Define your goal and optionally add sub-goals</p>
          </div>
        </div>

        <div style={{ maxWidth: '700px' }}>

          {/* Goal Details */}
          <div style={{ background: '#ffffff', border: '1px solid #e8eaf0', borderRadius: '16px', padding: '24px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderTop: '3px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🎯</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Goal Details</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>Define the main goal information</div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelSt}>
                Parent Goal <span style={{ color: '#94a3b8', fontWeight: 400 }}>(leave blank for a top-level goal)</span>
              </label>
              <select value={parentGoalId} onChange={e => setParentGoalId(e.target.value)} style={inputSt}>
                <option value="">— None (top-level goal) —</option>
                {parentGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelSt}>Title *</label>
              <input
                type="text" value={title} onChange={e => setTitle(e.target.value)}
                style={inputSt} placeholder="e.g. Achieve Q3 sales target"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelSt}>Target Metric</label>
              <input
                type="text" value={targetMetric} onChange={e => setTargetMetric(e.target.value)}
                style={inputSt} placeholder="e.g. 30% growth"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelSt}>Description</label>
              <textarea
                rows={3} value={description} onChange={e => setDescription(e.target.value)}
                style={{ ...inputSt, resize: 'vertical' }}
                placeholder="Describe the goal in detail..."
              />
            </div>

            {/* Time-Specific Toggle */}
            <div style={{ padding: '16px', background: isTimeSpecific ? 'rgba(99,102,241,0.06)' : '#f8fafc', border: `1px solid ${isTimeSpecific ? 'rgba(99,102,241,0.2)' : '#e2e8f0'}`, borderRadius: '10px', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }} onClick={() => setIsTimeSpecific(v => !v)}>
                <Toggle checked={isTimeSpecific} onChange={() => setIsTimeSpecific(v => !v)} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: isTimeSpecific ? '#1e293b' : '#94a3b8' }}>Time-Specific Goal</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {isTimeSpecific ? 'Start and end dates are set for this goal' : 'Toggle on to set start and end dates'}
                  </div>
                </div>
              </div>

              {isTimeSpecific && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px' }}>
                  <div>
                    <label style={labelSt}>Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>End Date</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputSt} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sub-Goals */}
          <div style={{ background: '#ffffff', border: '1px solid #e8eaf0', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderTop: '3px solid #818cf8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(129,140,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🔗</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                    Sub-Goals <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '12px' }}>— optional</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>Break this goal into measurable sub-goals</div>
                </div>
              </div>
              {hasSubGoals && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '90px', height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
                    <div style={{
                      height: '100%', width: `${Math.min(100, totalWeight)}%`,
                      background: weightColor, borderRadius: '3px', transition: 'width 0.2s',
                    }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: weightColor, minWidth: '72px', textAlign: 'right' }}>
                    {totalWeight}% / 100%
                  </span>
                </div>
              )}
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 18px', paddingLeft: '38px' }}>
              If added, total weightage must equal 100%.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {subGoals.map((sg, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 130px auto',
                  gap: '10px', alignItems: 'center',
                  padding: '12px 14px', borderRadius: '10px',
                  background: '#f8fafc', border: '1px solid #e8eaf0',
                }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: sg.title.trim() ? 'rgba(99,102,241,0.12)' : '#f1f5f9',
                    color: sg.title.trim() ? '#6366f1' : '#94a3b8',
                    fontSize: '11px', fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <input
                    type="text" value={sg.title}
                    onChange={e => updateSubGoal(i, 'title', e.target.value)}
                    style={{ ...inputSt, background: '#ffffff' }} placeholder={`Sub-goal ${i + 1} title`}
                  />
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min={1}
                      max={100 - subGoals.reduce((s, sg2, j) => s + (j !== i ? (Number(sg2.weight) || 0) : 0), 0)}
                      value={sg.weight}
                      onChange={e => updateSubGoal(i, 'weight', e.target.value)}
                      style={{ ...inputSt, paddingRight: '28px', background: '#ffffff' }}
                      placeholder="Weight"
                    />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94a3b8', pointerEvents: 'none' }}>%</span>
                  </div>
                  {subGoals.length > 1 ? (
                    <button
                      onClick={() => removeSubGoal(i)}
                      title="Remove"
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >×</button>
                  ) : <div style={{ width: '32px' }} />}
                </div>
              ))}
            </div>

            <button
              onClick={addSubGoal}
              style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: '1px dashed rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.05)', color: '#6366f1', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
            >
              + Add Sub-Goal
            </button>

            {hasSubGoals && totalWeight !== 100 && (
              <div style={{ marginTop: '12px', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', color: totalWeight > 100 ? '#ef4444' : '#d97706', background: totalWeight > 100 ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${totalWeight > 100 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                {totalWeight > 100
                  ? `Weight exceeds 100% by ${totalWeight - 100}%. Please reduce some weights.`
                  : `${100 - totalWeight}% weight remaining — sub-goals must total 100% to save.`}
              </div>
            )}

            {hasSubGoals && totalWeight === 100 && (
              <div style={{ marginTop: '12px', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', color: '#059669', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                Sub-goal weights total 100% — ready to save.
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button
              onClick={() => navigate('/employee/goals')}
              disabled={saving}
              style={{ padding: '11px 24px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: '500' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '11px 28px', borderRadius: '10px', border: 'none',
                background: saving ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff', cursor: saving ? 'default' : 'pointer',
                fontSize: '13px', fontWeight: '700', fontFamily: 'inherit',
                boxShadow: saving ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {saving ? 'Creating...' : '✓ Create Goal'}
            </button>
          </div>
        </div>

        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '' })} />
      </main>
    </div>
  )
}
