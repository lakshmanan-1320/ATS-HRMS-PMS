import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'

const STATUS_META = {
  active:   { color: '#15803d', bg: '#dcfce7', dot: '#22c55e', label: 'Active' },
  inactive: { color: '#475569', bg: '#f1f5f9', dot: '#94a3b8', label: 'Inactive' },
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          minWidth: 280, maxWidth: 360,
          background: t.type === 'error' ? '#fff1f2' : '#f0fdf4',
          border: `1.5px solid ${t.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: t.type === 'error' ? '#b91c1c' : '#15803d',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{t.type === 'error' ? '✗' : '✓'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── Form fields ───────────────────────────────────────────────────────────────

function Field({ label, name, placeholder, required, value, error, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
        {label}{required && <span style={{ color: '#6366f1', marginLeft: 2 }}>*</span>}
      </label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(name, e.target.value)}
        style={{
          padding: '10px 14px', background: '#f8fafc',
          border: `1.5px solid ${error ? '#ef4444' : '#e2e8f0'}`,
          borderRadius: 10, color: '#1e293b', fontSize: 13,
          outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0'}
      />
      {error && <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>{error}</span>}
    </div>
  )
}

function TextareaField({ label, name, placeholder, value, error, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={e => onChange(name, e.target.value)}
        style={{
          padding: '10px 14px', background: '#f8fafc',
          border: `1.5px solid ${error ? '#ef4444' : '#e2e8f0'}`,
          borderRadius: 10, color: '#1e293b', fontSize: 13,
          outline: 'none', width: '100%', boxSizing: 'border-box',
          fontFamily: 'inherit', resize: 'vertical', minHeight: 80,
          transition: 'border-color 0.15s ease',
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0'}
      />
      {error && <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>{error}</span>}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const emptyForm = { name: '', description: '' }
const initials  = name => (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Departments() {
  const [depts, setDepts]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState(null)
  const [editTarget, setEditTarget]     = useState(null)
  const [parentDept, setParentDept]     = useState(null)
  const [form, setForm]                 = useState(emptyForm)
  const [formErrors, setFormErrors]     = useState({})
  const [saving, setSaving]             = useState(false)
  const [statusPopup, setStatusPopup]   = useState(null)
  const [toasts, setToasts]             = useState([])
  const [expandedDepts, setExpandedDepts] = useState(new Set())
  const [subDepts, setSubDepts]         = useState({})
  const [loadingSubs, setLoadingSubs]   = useState(new Set())
  const toastIdRef = useRef(0)

  const token   = sessionStorage.getItem('sa_token')
  const headers = { Authorization: `Bearer ${token}` }

  function toast(msg, type = 'success') {
    const id = ++toastIdRef.current
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }

  async function fetchDepts() {
    try {
      const res = await axios.get('/api/client-admin/departments', { headers })
      setDepts(res.data)
    } catch (err) {
      toast('Failed to load departments.', 'error')
      if ((err.response?.status || 0) === 401) { sessionStorage.clear(); window.location.href = '/login' }
    } finally {
      setLoading(false)
    }
  }

  async function fetchSubDepts(deptId) {
    setLoadingSubs(prev => new Set([...prev, deptId]))
    try {
      const res = await axios.get(`/api/client-admin/departments/${deptId}/sub-departments`, { headers })
      setSubDepts(prev => ({ ...prev, [deptId]: res.data }))
    } catch (err) {
      toast('Failed to load sub-departments.', 'error')
      if ((err.response?.status || 0) === 401) { sessionStorage.clear(); window.location.href = '/login' }
    } finally {
      setLoadingSubs(prev => { const s = new Set(prev); s.delete(deptId); return s })
    }
  }

  useEffect(() => { fetchDepts() }, [])
  useEffect(() => {
    function handleClick() { setStatusPopup(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  function toggleExpand(dept) {
    const isExpanded = expandedDepts.has(dept.department_id)
    if (isExpanded) {
      setExpandedDepts(prev => { const s = new Set(prev); s.delete(dept.department_id); return s })
    } else {
      setExpandedDepts(prev => new Set([...prev, dept.department_id]))
      fetchSubDepts(dept.department_id)
    }
  }

  function openCreate() { setForm(emptyForm); setFormErrors({}); setEditTarget(null); setParentDept(null); setModal('create') }
  function openEdit(item) { setForm({ name: item.name || '', description: item.description || '' }); setFormErrors({}); setEditTarget(item); setParentDept(null); setModal('edit') }
  function openAddSub(dept) { setForm(emptyForm); setFormErrors({}); setEditTarget(null); setParentDept(dept); setModal('create') }

  function validateForm() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Required'
    return errs
  }

  async function handleSave() {
    const errs = validateForm()
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setSaving(true)
    try {
      if (modal === 'create') {
        if (parentDept) {
          await axios.post(`/api/client-admin/departments/${parentDept.department_id}/sub-departments`, form, { headers })
          toast('Sub-department created.')
          setDepts(prev => prev.map(d => d.department_id === parentDept.department_id ? { ...d, sub_count: (d.sub_count || 0) + 1 } : d))
          setExpandedDepts(prev => new Set([...prev, parentDept.department_id]))
          fetchSubDepts(parentDept.department_id)
        } else {
          await axios.post('/api/client-admin/departments', form, { headers })
          toast('Department created successfully.')
          fetchDepts()
        }
      } else {
        await axios.put(`/api/client-admin/departments/${editTarget.department_id}`, form, { headers })
        toast('Updated successfully.')
        if (editTarget.parent_id) fetchSubDepts(editTarget.parent_id)
        else fetchDepts()
      }
      setModal(null)
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(item, status, parentId = null) {
    try {
      await axios.patch(`/api/client-admin/departments/${item.department_id}/status`, { status }, { headers })
      if (parentId !== null) {
        setSubDepts(prev => ({ ...prev, [parentId]: (prev[parentId] || []).map(s => s.department_id === item.department_id ? { ...s, status } : s) }))
      } else {
        setDepts(p => p.map(d => d.department_id === item.department_id ? { ...d, status } : d))
      }
      toast(`Status changed to ${status}.`)
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update status.', 'error')
    }
    setStatusPopup(null)
  }

  function handleFieldChange(name, value) {
    setForm(p => ({ ...p, [name]: value }))
    setFormErrors(p => ({ ...p, [name]: '' }))
  }

  const total    = depts.length
  const active   = depts.filter(d => d.status === 'active').length
  const inactive = depts.filter(d => d.status === 'inactive').length

  const COLS = '44px 1.6fr 2.4fr 150px 140px 110px'

  function StatusCell({ item, parentId = null }) {
    const sm = STATUS_META[item.status] || STATUS_META.inactive
    const popupKey = `${parentId ?? 'top'}-${item.department_id}`
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={e => { e.stopPropagation(); setStatusPopup(statusPopup === popupKey ? null : popupKey) }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', color: sm.color, background: sm.bg,
            border: `1px solid ${sm.color}30`, transition: 'all 0.15s ease',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot, flexShrink: 0 }} />
          {sm.label}
          <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
        </button>
        {statusPopup === popupKey && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 34, left: 0, zIndex: 100,
              background: '#fff', border: '1.5px solid #e2e8f0',
              borderRadius: 12, padding: 6, minWidth: 138,
              boxShadow: '0 12px 28px rgba(0,0,0,0.10)',
            }}
          >
            {['active', 'inactive'].map(s => {
              const m = STATUS_META[s]
              return (
                <button key={s} onClick={() => handleStatusChange(item, s, parentId)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 10px',
                  background: item.status === s ? 'rgba(99,102,241,0.07)' : 'none',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, color: m.color, fontFamily: 'inherit', textAlign: 'left',
                  fontWeight: item.status === s ? 700 : 500,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
                  {m.label}
                  {item.status === s && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#6366f1' }}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
      <ClientAdminSidebar active="departments" />
      <Toast toasts={toasts} />
      <style>{`@keyframes dept-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}>🏢</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>Departments</h1>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 13 }}>
                Manage departments and sub-departments in your organisation
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 22px',
              background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
              border: 'none', borderRadius: 12, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(99,102,241,0.40)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)' }}
          >
            <span style={{ fontSize: 16, lineHeight: 1, color: '#fff' }}>+</span> Add Department
          </button>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Departments', value: total,    color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', icon: '🏢' },
            { label: 'Active',            value: active,   color: '#10b981', gradient: 'linear-gradient(135deg,#10b981,#06b6d4)', icon: '✅' },
            { label: 'Inactive',          value: inactive, color: '#64748b', gradient: 'linear-gradient(135deg,#64748b,#94a3b8)', icon: '⏸' },
          ].map(s => (
            <div key={s.label} style={{
              padding: '18px 20px', background: '#fff',
              border: '1.5px solid #e2e8f0', borderRadius: 16,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', gap: 14,
              position: 'relative', overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = s.color }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#e2e8f0' }}
            >
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, background: s.gradient, borderRadius: '0 16px 16px 0' }} />
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `${s.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Department List Panel ── */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

          {/* Column headers */}
          {depts.length > 0 && !loading && (
            <div style={{
              display: 'grid', gridTemplateColumns: COLS,
              padding: '12px 24px',
              background: '#f8fafc',
              borderBottom: '1.5px solid #e2e8f0',
              fontSize: 10.5, fontWeight: 800, color: '#94a3b8',
              letterSpacing: '0.07em', textTransform: 'uppercase',
            }}>
              <div />
              <div>Department</div>
              <div>Description</div>
              <div>Status</div>
              <div>Created</div>
              <div style={{ textAlign: 'right' }}>Actions</div>
            </div>
          )}

          <div style={{ padding: loading || depts.length === 0 ? 0 : '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: '4px solid #e2e8f0', borderTopColor: '#6366f1',
                  animation: 'dept-spin 0.75s linear infinite',
                  margin: '0 auto 16px',
                }} />
                <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Loading departments…</div>
              </div>

            ) : depts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>No departments yet</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Click "Add Department" to create your first department.</div>
                <button onClick={openCreate} style={{
                  padding: '10px 22px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  border: 'none', borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                }}>+ Add Department</button>
              </div>

            ) : (
              depts.map(dept => {
                const isExpanded   = expandedDepts.has(dept.department_id)
                const isLoadingSub = loadingSubs.has(dept.department_id)
                const subs         = subDepts[dept.department_id] || []

                return (
                  <React.Fragment key={dept.department_id}>
                    {/* ── Department row ── */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: COLS,
                      padding: '13px 16px', alignItems: 'center',
                      background: '#fff',
                      border: '1.5px solid #e2e8f0',
                      borderLeft: '4px solid #6366f1',
                      borderRadius: 14,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
                    }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#6366f1'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(99,102,241,0.08),0 0 0 3px rgba(99,102,241,0.06)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#e2e8f0'
                        e.currentTarget.style.borderLeftColor = '#6366f1'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                    >
                      {/* Expand toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button
                          onClick={() => toggleExpand(dept)}
                          title={isExpanded ? 'Collapse' : 'Show sub-departments'}
                          style={{
                            width: 28, height: 28, borderRadius: 8, border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: 10, fontWeight: 900,
                            background: isExpanded ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(99,102,241,0.08)',
                            color: isExpanded ? '#fff' : '#6366f1',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </div>

                      {/* Name + sub count */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: '#fff',
                          boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                        }}>
                          {initials(dept.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{dept.name}</div>
                          {dept.sub_count > 0 && (
                            <div style={{
                              fontSize: 10, color: '#6366f1', background: 'rgba(99,102,241,0.08)',
                              border: '1px solid rgba(99,102,241,0.2)',
                              padding: '1px 7px', borderRadius: 6, fontWeight: 700,
                              width: 'fit-content', marginTop: 3,
                            }}>
                              {dept.sub_count} sub-dept{dept.sub_count !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                        {dept.description || <span style={{ color: '#cbd5e1' }}>—</span>}
                      </div>

                      {/* Status */}
                      <StatusCell item={dept} />

                      {/* Created */}
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        {new Date(dept.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEdit(dept)}
                          title="Edit department"
                          style={{
                            width: 32, height: 32, border: '1.5px solid rgba(99,102,241,0.25)',
                            borderRadius: 9, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(99,102,241,0.07)', color: '#6366f1',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#6366f1' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)' }}
                        >✏️</button>
                        <button
                          onClick={() => openAddSub(dept)}
                          title="Add sub-department"
                          style={{
                            width: 32, height: 32, border: '1.5px solid rgba(16,185,129,0.25)',
                            borderRadius: 9, cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(16,185,129,0.07)', color: '#10b981',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#10b981' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.07)'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)' }}
                        >+</button>
                      </div>
                    </div>

                    {/* ── Sub-department rows ── */}
                    {isExpanded && (
                      isLoadingSub ? (
                        <div style={{ padding: '10px 20px 10px 60px', fontSize: 12, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #e2e8f0', borderTopColor: '#6366f1', animation: 'dept-spin 0.75s linear infinite', flexShrink: 0 }} />
                          Loading sub-departments…
                        </div>
                      ) : subs.length === 0 ? (
                        <div style={{
                          padding: '12px 20px 12px 60px',
                          fontSize: 12, color: '#64748b',
                          display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500,
                        }}>
                          <span style={{ color: '#cbd5e1', fontSize: 14 }}>└</span>
                          No sub-departments yet.
                          <button onClick={() => openAddSub(dept)} style={{
                            background: 'none', border: 'none', color: '#6366f1',
                            cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
                            padding: 0, fontWeight: 700, textDecoration: 'underline',
                          }}>Add one</button>
                        </div>
                      ) : (
                        subs.map((sub, si) => (
                          <div key={sub.department_id} style={{ marginLeft: 32, position: 'relative' }}>
                            {/* Connector lines */}
                            <div style={{
                              position: 'absolute', left: -20, top: 0,
                              bottom: si === subs.length - 1 ? '50%' : 0,
                              width: 2, background: 'linear-gradient(to bottom,#c7d2fe,#e2e8f0)', borderRadius: 1,
                            }} />
                            <div style={{
                              position: 'absolute', left: -20, top: '50%',
                              width: 16, height: 2,
                              background: 'linear-gradient(to right,#c7d2fe,#0ea5e9)', borderRadius: 1,
                            }} />
                            <div style={{
                              position: 'absolute', left: -5, top: 'calc(50% - 4px)',
                              width: 8, height: 8, borderRadius: '50%',
                              background: '#fff', border: '2px solid #0ea5e9',
                            }} />

                            <div style={{
                              display: 'grid', gridTemplateColumns: COLS,
                              padding: '12px 16px', alignItems: 'center',
                              background: '#f8faff',
                              border: '1.5px solid #e0e7ff',
                              borderLeft: '4px solid #0ea5e9',
                              borderRadius: 12,
                              marginBottom: si === subs.length - 1 ? 0 : 6,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                              transition: 'all 0.2s ease',
                            }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = '#0ea5e9'
                                e.currentTarget.style.transform = 'translateY(-1px)'
                                e.currentTarget.style.boxShadow = '0 6px 14px rgba(14,165,233,0.08)'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = '#e0e7ff'
                                e.currentTarget.style.borderLeftColor = '#0ea5e9'
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'
                              }}
                            >
                              <div /> {/* spacer for toggle column */}

                              {/* Sub-dept name */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                  background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: 700, color: '#fff',
                                  boxShadow: '0 2px 6px rgba(14,165,233,0.3)',
                                }}>
                                  {initials(sub.name)}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{sub.name}</span>
                              </div>

                              {/* Description */}
                              <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                                {sub.description || <span style={{ color: '#cbd5e1' }}>—</span>}
                              </div>

                              {/* Status */}
                              <StatusCell item={sub} parentId={dept.department_id} />

                              {/* Created */}
                              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                {new Date(sub.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>

                              {/* Actions */}
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => openEdit(sub)}
                                  title="Edit sub-department"
                                  style={{
                                    width: 32, height: 32, border: '1.5px solid rgba(99,102,241,0.25)',
                                    borderRadius: 9, cursor: 'pointer', fontSize: 13,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(99,102,241,0.07)', color: '#6366f1',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#6366f1' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)' }}
                                >✏️</button>
                              </div>
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </React.Fragment>
                )
              })
            )}
          </div>
        </div>
      </main>

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div style={{
            background: '#fff', border: '1.5px solid #e2e8f0',
            borderRadius: 22, width: '100%', maxWidth: 480,
            boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}>
            {/* Modal header strip */}
            <div style={{
              background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
              padding: '20px 28px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>
                  {modal === 'edit'
                    ? (editTarget?.parent_id ? 'Edit Sub-Department' : 'Edit Department')
                    : parentDept ? 'Add Sub-Department' : 'Add Department'}
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: '4px 0 0' }}>
                  {modal === 'edit'
                    ? `Editing: ${editTarget?.name}`
                    : parentDept ? `Under: ${parentDept.name}` : 'Create a new department'}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                style={{
                  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                  cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >✕</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '24px 28px' }}>
              {/* Parent badge */}
              {modal === 'create' && parentDept && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', marginBottom: 20,
                  background: 'rgba(99,102,241,0.06)',
                  border: '1.5px solid rgba(99,102,241,0.18)',
                  borderRadius: 10,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff',
                  }}>
                    {initials(parentDept.name)}
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Parent department:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1' }}>{parentDept.name}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field
                  label={parentDept ? 'Sub-Department Name' : 'Department Name'}
                  name="name" required
                  placeholder={parentDept ? 'e.g. Frontend, Backend, QA' : 'e.g. Engineering, HR, Sales'}
                  value={form.name} error={formErrors.name}
                  onChange={handleFieldChange}
                />
                <TextareaField
                  label="Description" name="description"
                  placeholder="Brief description (optional)"
                  value={form.description} error={formErrors.description}
                  onChange={handleFieldChange}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                  onClick={() => setModal(null)}
                  style={{
                    flex: 1, padding: 11, background: '#f8fafc',
                    border: '1.5px solid #e2e8f0', borderRadius: 10,
                    cursor: 'pointer', fontSize: 13, color: '#64748b',
                    fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 2, padding: 11,
                    background: saving ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                    border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
                    boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.3)',
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {saving && (
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'dept-spin 0.75s linear infinite' }} />
                  )}
                  {saving ? 'Saving…'
                    : modal === 'edit' ? 'Save Changes'
                    : parentDept ? 'Create Sub-Department'
                    : 'Create Department'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
