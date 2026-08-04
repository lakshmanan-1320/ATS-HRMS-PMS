import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
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

const STATUS_META = {
  draft:       { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Draft' },
  active:      { bg: 'rgba(99,102,241,0.1)',  color: '#6366f1', label: 'Active' },
  in_progress: { bg: 'rgba(14,165,233,0.1)',  color: '#0284c7', label: 'In Progress' },
  submitted:   { bg: 'rgba(234,179,8,0.1)',   color: '#d97706', label: 'Submitted' },
  approved:    { bg: 'rgba(16,185,129,0.1)',  color: '#059669', label: 'Approved' },
  completed:   { bg: 'rgba(16,185,129,0.12)', color: '#059669', label: 'Completed' },
  rejected:    { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', label: 'Rejected' },
}

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    if (msg) { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }
  }, [msg])
  if (!msg) return null
  const isErr = type === 'error'
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
      display: 'flex', alignItems: 'center', gap: '10px',
      background: isErr ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
      border: `1px solid ${isErr ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
      color: isErr ? '#ef4444' : '#059669',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      <span>{isErr ? '✕' : '✓'}</span>
      {msg}
    </div>
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

function Badge({ status }) {
  const s = STATUS_META[status] || STATUS_META.draft
  return (
    <span style={{
      fontSize: '10px', fontWeight: '700', padding: '2px 8px',
      borderRadius: '20px', background: s.bg, color: s.color, letterSpacing: '0.02em',
    }}>
      {s.label}
    </span>
  )
}

const EDITABLE_STATUSES = ['draft', 'in_progress']

export default function EditGoal() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetMetric, setTargetMetric] = useState('')
  const [isTimeSpecific, setIsTimeSpecific] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')

  const [existingSubGoals, setExistingSubGoals] = useState([])
  const [newSubGoals, setNewSubGoals] = useState([])

  const [originalGoal, setOriginalGoal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    api.get('/employee/goals/created')
      .then(res => {
        const found = (res.data || []).find(g => String(g.id) === String(id))
        if (!found) {
          showToast('Goal not found.', 'error')
          setTimeout(() => navigate('/employee/goals'), 1500)
          return
        }
        setOriginalGoal(found)
        setTitle(found.title || '')
        setDescription(found.description || '')
        setTargetMetric(found.target_metric || '')
        const hasDate = !!(found.start_date || found.due_date)
        setIsTimeSpecific(hasDate)
        setStartDate(found.start_date ? found.start_date.slice(0, 10) : '')
        setDueDate(found.due_date ? found.due_date.slice(0, 10) : '')
        setExistingSubGoals((found.subGoals || []).map(sg => ({
          id: sg.id,
          title: sg.title || '',
          weight: String(sg.weight || ''),
          status: sg.status,
        })))
      })
      .catch(() => showToast('Failed to load goal.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  const allSubGoals = [...existingSubGoals, ...newSubGoals]
  const totalWeight = allSubGoals.reduce((s, sg) => s + (Number(sg.weight) || 0), 0)
  const hasAnySubGoals = allSubGoals.some(sg => sg.title?.trim())
  const weightColor = totalWeight === 100 ? '#10b981' : totalWeight > 100 ? '#ef4444' : '#6366f1'

  function updateExisting(idx, field, val) {
    if (field === 'weight') {
      const otherExisting = existingSubGoals.reduce((s, sg, i) => i !== idx ? s + (Number(sg.weight) || 0) : s, 0)
      const otherNew = newSubGoals.reduce((s, sg) => s + (Number(sg.weight) || 0), 0)
      const cap = 100 - otherExisting - otherNew
      const capped = Math.min(Number(val) || 0, cap)
      setExistingSubGoals(prev => prev.map((sg, i) => i === idx ? { ...sg, weight: val === '' ? '' : capped } : sg))
      return
    }
    setExistingSubGoals(prev => prev.map((sg, i) => i === idx ? { ...sg, [field]: val } : sg))
  }

  function addNew() {
    setNewSubGoals(prev => [...prev, { title: '', weight: '' }])
  }

  function updateNew(idx, field, val) {
    if (field === 'weight') {
      const otherExisting = existingSubGoals.reduce((s, sg) => s + (Number(sg.weight) || 0), 0)
      const otherNew = newSubGoals.reduce((s, sg, i) => i !== idx ? s + (Number(sg.weight) || 0) : s, 0)
      const cap = 100 - otherExisting - otherNew
      const capped = Math.min(Number(val) || 0, cap)
      setNewSubGoals(prev => prev.map((sg, i) => i === idx ? { ...sg, weight: val === '' ? '' : capped } : sg))
      return
    }
    setNewSubGoals(prev => prev.map((sg, i) => i === idx ? { ...sg, [field]: val } : sg))
  }

  function removeNew(idx) {
    setNewSubGoals(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!title.trim()) { showToast('Title is required.', 'error'); return }

    const filledNew = newSubGoals.filter(sg => sg.title.trim())
    if (hasAnySubGoals && totalWeight !== 100) {
      showToast(`Sub-goal weights must total 100%. Current: ${totalWeight}%.`, 'error')
      return
    }
    if (filledNew.some(sg => !sg.weight)) {
      showToast('All new sub-goals must have a weight.', 'error')
      return
    }

    setSaving(true)
    try {
      await api.put(`/employee/goals/created/${id}`, {
        title: title.trim(),
        description: description.trim() || undefined,
        target_metric: targetMetric.trim() || undefined,
        start_date: isTimeSpecific && startDate ? startDate : undefined,
        due_date: isTimeSpecific && dueDate ? dueDate : undefined,
      })

      for (const sg of existingSubGoals) {
        if (!EDITABLE_STATUSES.includes(sg.status)) continue
        const orig = originalGoal.subGoals?.find(o => o.id === sg.id)
        if (!orig) continue
        const titleChanged = sg.title.trim() !== orig.title
        const weightChanged = String(sg.weight) !== String(orig.weight)
        if (titleChanged || weightChanged) {
          await api.put(`/employee/goals/created/${sg.id}`, {
            title: sg.title.trim() || orig.title,
            weight: Number(sg.weight) || orig.weight,
          })
        }
      }

      for (const sg of filledNew) {
        await api.post('/employee/goals', {
          title: sg.title.trim(),
          weight: Number(sg.weight),
          parent_goal_id: Number(id),
        })
      }

      showToast('Goal updated successfully.')
      setTimeout(() => navigate('/employee/goals'), 1200)
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, sans-serif' }}>
        <EmployeeSidebar active="goals" />
        <main style={{ flex: 1, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>Loading...</div>
        </main>
      </div>
    )
  }

  if (originalGoal && !EDITABLE_STATUSES.includes(originalGoal.status)) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Inter, sans-serif' }}>
        <EmployeeSidebar active="goals" />
        <main style={{ flex: 1, padding: '32px' }}>
          <div style={{ color: '#ef4444', padding: '24px', background: 'rgba(239,68,68,0.06)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)', fontSize: '14px' }}>
            This goal cannot be edited — its current status is <strong>{originalGoal.status}</strong>.
          </div>
          <button
            onClick={() => navigate('/employee/goals')}
            style={{ marginTop: '16px', padding: '9px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
          >
            ← Back to Goals
          </button>
        </main>
      </div>
    )
  }

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
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Edit Goal</h1>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>Update goal details, timelines, and sub-goals</p>
          </div>
        </div>

        <div style={{ maxWidth: '700px' }}>

          {/* Goal Details */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
              Goal Details
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelSt}>Title *</label>
              <input
                type="text" value={title} onChange={e => setTitle(e.target.value)}
                style={inputSt} placeholder="e.g. Achieve Q3 sales target" autoFocus
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
            <div style={{
              padding: '16px',
              background: isTimeSpecific ? 'rgba(99,102,241,0.06)' : '#f8fafc',
              border: `1px solid ${isTimeSpecific ? 'rgba(99,102,241,0.2)' : '#e2e8f0'}`,
              borderRadius: '10px', transition: 'all 0.2s',
            }}>
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
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Sub-Goals
              </div>
              {hasAnySubGoals && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '80px', height: '5px', background: '#f1f5f9', borderRadius: '3px' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, totalWeight)}%`, background: weightColor, borderRadius: '3px', transition: 'width 0.2s' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: weightColor, minWidth: '72px', textAlign: 'right' }}>
                    {totalWeight}% / 100%
                  </span>
                </div>
              )}
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 18px' }}>
              Edit sub-goal titles and weightages, or add new ones. Locked sub-goals cannot be changed.
            </p>

            {/* Existing sub-goals */}
            {existingSubGoals.length > 0 && (
              <div style={{ marginBottom: newSubGoals.length > 0 ? '16px' : '12px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Existing Sub-Goals
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {existingSubGoals.map((sg, i) => {
                    const isEditable = EDITABLE_STATUSES.includes(sg.status)
                    return isEditable ? (
                      <div key={sg.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 34px', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text" value={sg.title}
                          onChange={e => updateExisting(i, 'title', e.target.value)}
                          style={inputSt}
                        />
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number" min={1}
                            max={100 - existingSubGoals.reduce((s, sg2, j) => j !== i ? s + (Number(sg2.weight) || 0) : s, 0) - newSubGoals.reduce((s, sg2) => s + (Number(sg2.weight) || 0), 0)}
                            value={sg.weight}
                            onChange={e => updateExisting(i, 'weight', e.target.value)}
                            style={{ ...inputSt, paddingRight: '28px' }}
                          />
                          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94a3b8', pointerEvents: 'none' }}>%</span>
                        </div>
                        <div style={{ width: '34px' }} />
                      </div>
                    ) : (
                      <div key={sg.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: '8px',
                        background: '#f8fafc', border: '1px solid #e8eaf0',
                      }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sg.title}</span>
                          <Badge status={sg.status} />
                        </div>
                        <span style={{ fontSize: '13px', color: '#94a3b8', flexShrink: 0 }}>{sg.weight}%</span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', flexShrink: 0 }}>locked</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* New sub-goals */}
            {newSubGoals.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  New Sub-Goals
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {newSubGoals.map((sg, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text" value={sg.title}
                        onChange={e => updateNew(i, 'title', e.target.value)}
                        style={inputSt} placeholder={`New sub-goal ${i + 1} title`}
                      />
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number" min={1}
                          max={100 - existingSubGoals.reduce((s, sg2) => s + (Number(sg2.weight) || 0), 0) - newSubGoals.reduce((s, sg2, j) => j !== i ? s + (Number(sg2.weight) || 0) : s, 0)}
                          value={sg.weight}
                          onChange={e => updateNew(i, 'weight', e.target.value)}
                          style={{ ...inputSt, paddingRight: '28px' }}
                          placeholder="Weight"
                        />
                        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94a3b8', pointerEvents: 'none' }}>%</span>
                      </div>
                      <button
                        onClick={() => removeNew(i)}
                        style={{ width: '34px', height: '38px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontSize: '18px', lineHeight: 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={addNew}
              style={{ marginTop: '4px', padding: '8px 16px', borderRadius: '8px', border: '1px dashed rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.05)', color: '#6366f1', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
            >
              + Add Sub-Goal
            </button>

            {hasAnySubGoals && totalWeight !== 100 && (
              <div style={{ marginTop: '12px', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', color: totalWeight > 100 ? '#ef4444' : '#d97706', background: totalWeight > 100 ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${totalWeight > 100 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                {totalWeight > 100
                  ? `Weight exceeds 100% by ${totalWeight - 100}%. Please reduce some weights.`
                  : `${100 - totalWeight}% weight remaining — sub-goals must total 100% to save.`}
              </div>
            )}
            {hasAnySubGoals && totalWeight === 100 && (
              <div style={{ marginTop: '12px', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', color: '#059669', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                Sub-goal weights total 100% — ready to save.
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => navigate('/employee/goals')}
              disabled={saving}
              style={{ padding: '10px 22px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 26px', borderRadius: '8px', border: 'none', background: saving ? 'rgba(99,102,241,0.5)' : '#6366f1', color: '#fff', cursor: saving ? 'default' : 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '' })} />
      </main>
    </div>
  )
}
