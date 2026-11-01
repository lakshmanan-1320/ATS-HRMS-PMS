import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  FiFolder,
  FiPlus,
  FiEdit2,
  FiChevronRight,
  FiChevronDown,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiCheck,
  FiSlash,
  FiAlertTriangle,
  FiInfo,
  FiTrendingUp,
  FiMinus,
  FiLayers,
  FiUser,
  FiArchive
} from 'react-icons/fi'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import AddIcon from '../../../components/common/AddIcon.jsx'

const STATUS_META = {
  active:   { color: '#0fa958', bg: '#e8fbf0', dot: '#10b981', label: 'Active' },
  inactive: { color: '#7D8597', bg: '#F1F4F8', dot: '#94a3b8', label: 'Inactive' },
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
          background: t.type === 'error' ? '#EEF8FF' : '#e8fbf0',
          border: `1.5px solid ${t.type === 'error' ? '#C9DDF3' : '#a7f3d0'}`,
          color: t.type === 'error' ? '#dc2626' : '#0fa958',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          fontFamily: "'Inter', sans-serif",
        }}>
          {t.type === 'error' ? <FiXCircle size={18} color="#dc2626" /> : <FiCheckCircle size={18} color="#0fa958" />}
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── Form fields ───────────────────────────────────────────────────────────────

function Field({ label, name, placeholder, required, value, error, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: "'Inter', sans-serif" }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', letterSpacing: '0.02em' }}>
        {label}{required && <span style={{ color: 'var(--primary-color, #0466C8)', marginLeft: 2 }}>*</span>}
      </label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(name, e.target.value)}
        style={{
          padding: '10px 14px', background: '#ffffff',
          border: `1.5px solid ${error ? '#ef4444' : '#E3E7EE'}`,
          borderRadius: 10, color: '#111827', fontSize: 13,
          outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--primary-color, #0466C8)'}
        onBlur={e => e.target.style.borderColor = error ? '#ef4444' : '#E3E7EE'}
      />
      {error && <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>{error}</span>}
    </div>
  )
}

function TextareaField({ label, name, placeholder, value, error, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: "'Inter', sans-serif" }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', letterSpacing: '0.02em' }}>
        {label}
      </label>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={e => onChange(name, e.target.value)}
        style={{
          padding: '10px 14px', background: '#ffffff',
          border: `1.5px solid ${error ? '#ef4444' : '#E3E7EE'}`,
          borderRadius: 10, color: '#111827', fontSize: 13,
          outline: 'none', width: '100%', boxSizing: 'border-box',
          fontFamily: 'inherit', resize: 'vertical', minHeight: 80,
          transition: 'border-color 0.15s ease',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--primary-color, #0466C8)'}
        onBlur={e => e.target.style.borderColor = error ? '#ef4444' : '#E3E7EE'}
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
      <div style={{ position: 'relative', fontFamily: "'Inter', sans-serif" }}>
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
          <FiChevronDown size={11} style={{ opacity: 0.7 }} />
        </button>
        {statusPopup === popupKey && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 34, left: 0, zIndex: 100,
              background: '#fff', border: '1px solid #E3E7EE',
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
                  background: item.status === s ? 'var(--card-active-bg, #EEF8FF)' : 'none',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, color: m.color, fontFamily: 'inherit', textAlign: 'left',
                  fontWeight: item.status === s ? 700 : 500,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
                  {m.label}
                  {item.status === s && <FiCheck size={13} color="var(--primary-color, #0466C8)" style={{ marginLeft: 'auto' }} />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Stat cards matching exact Org Chart replica layout
  const STAT_CARDS = [
    {
      label: 'Total Departments',
      value: total,
      icon: FiFolder,
      badgeText: '0%',
      badgeType: 'neutral',
      badgeBg: '#EEF1F5',
      badgeColor: '#7D8597',
      subtext: 'Organizational units',
      subtext2: 'Active structures'
    },
    {
      label: 'Active Departments',
      value: active,
      icon: FiCheckCircle,
      badgeText: 'Active',
      badgeType: 'up',
      badgeBg: '#e6f7ed',
      badgeColor: '#10b981',
      subtext: 'Operational units',
      subtext2: `${active} active departments`
    },
    {
      label: 'Inactive Departments',
      value: inactive,
      icon: FiArchive,
      badgeText: 'Inactive',
      badgeType: 'neutral',
      badgeBg: '#F1F4F8',
      badgeColor: '#7D8597',
      subtext: 'Archived units',
      subtext2: 'Pending review'
    },
  ]

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <ClientAdminSidebar active="departments" />
      <Toast toasts={toasts} />
      <style>{`@keyframes dept-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar title="Departments" />
        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', background: '#FFFFFF' }}>

        {/* ── Header ── */}
        <PageHeader
          icon={FiFolder}
          title="Departments"
          subtitle="Manage departments and sub-departments in your organisation"
          actions={
            <button
              onClick={openCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px',
                background: 'var(--primary-color, #0466C8)',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 700, color: '#ffffff', fontFamily: 'inherit',
                boxShadow: '0 4px 14px rgba(4, 102, 200, 0.25)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(4, 102, 200, 0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(4, 102, 200, 0.25)' }}
            >
              <AddIcon size={20} />
              <span style={{ color: '#ffffff', fontWeight: 700 }}>Add Department</span>
            </button>
          }
        />

        {/* ── Stats matching Org Chart cards replica ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {STAT_CARDS.map(card => {
            const CardIcon = card.icon
            return (
              <div
                key={card.label}
                style={{
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.06)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.03)'
                }}
              >
                {/* Top Row: Icon Container + Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                  }}>
                    <CardIcon size={24} color="#0466C8" stroke="#0466C8" strokeWidth={2.2} style={{ color: '#0466C8', stroke: '#0466C8' }} />
                  </div>
                  <span style={{
                    background: card.badgeBg,
                    color: card.badgeColor,
                    fontSize: '11.5px',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    {card.badgeType === 'up' && <FiTrendingUp size={12} />}
                    {card.badgeType === 'neutral' && <FiMinus size={12} />}
                    {card.badgeText}
                  </span>
                </div>

                {/* Metric Value */}
                <div style={{ fontSize: 30, fontWeight: 800, color: '#111827', lineHeight: 1.1, marginBottom: 4 }}>
                  {card.value}
                </div>

                {/* Title */}
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
                  {card.label}
                </div>

                {/* Subtexts */}
                <div style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 500, lineHeight: 1.4 }}>
                  <div>{card.subtext}</div>
                  {card.subtext2 && <div style={{ marginTop: 2 }}>{card.subtext2}</div>}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Department List Panel ── */}
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #E3E7EE', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', overflow: 'hidden' }}>

          {/* Column headers */}
          {depts.length > 0 && !loading && (
            <div style={{
              display: 'grid', gridTemplateColumns: COLS,
              padding: '12px 24px',
              background: '#f8fafc',
              borderBottom: '1px solid #E3E7EE',
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
                  width: 40, height: 40, borderRadius: '50%',
                  border: '3px solid #E3E7EE', borderTopColor: 'var(--primary-color, #0466C8)',
                  animation: 'dept-spin 0.75s linear infinite',
                  margin: '0 auto 16px',
                }} />
                <div style={{ fontSize: 13.5, color: '#7D8597', fontWeight: 500 }}>Loading departments…</div>
              </div>

            ) : depts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <FiFolder size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No departments yet</div>
                <div style={{ fontSize: 13, color: '#7D8597', marginBottom: 20 }}>Click "Add Department" to create your first department.</div>
                <button onClick={openCreate} style={{
                  padding: '10px 22px', background: 'var(--primary-color, #0466C8)',
                  border: 'none', borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(4, 102, 200, 0.25)',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                  <AddIcon size={20} />
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>Add Department</span>
                </button>
              </div>

            ) : (
              depts.map(dept => {
                const isExpanded   = expandedDepts.has(dept.department_id)
                const isLoadingSub = loadingSubs.has(dept.department_id)
                const subs         = subDepts[dept.department_id] || []

                return (
                  <React.Fragment key={dept.department_id}>
                    {/* ── Department row matching Org Chart node styling ── */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: COLS,
                      padding: '13px 16px', alignItems: 'center',
                      background: '#ffffff',
                      border: '1px solid #E3E7EE',
                      borderLeft: '4px solid var(--primary-color, #0466C8)',
                      borderRadius: 12,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease',
                    }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--primary-color, #0466C8)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#E3E7EE'
                        e.currentTarget.style.borderLeftColor = 'var(--primary-color, #0466C8)'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)'
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
                            cursor: 'pointer',
                            background: isExpanded ? 'var(--primary-color, #0466C8)' : 'var(--card-active-bg, #EEF8FF)',
                            color: isExpanded ? '#ffffff' : 'var(--primary-color, #0466C8)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isExpanded ? <FiChevronDown size={14} color="#fff" /> : <FiChevronRight size={14} color="var(--primary-color, #0466C8)" />}
                        </button>
                      </div>

                      {/* Name + sub count + Brand Red Circle Avatar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: '#fff',
                          boxShadow: '0 2px 8px rgba(4, 102, 200, 0.2)',
                        }}>
                          {initials(dept.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{dept.name}</div>
                          {dept.sub_count > 0 && (
                            <div style={{
                              fontSize: 10, color: 'var(--primary-color, #0466C8)',
                              background: 'var(--card-active-bg, #EEF8FF)',
                              border: '1px solid var(--card-active-border, #C9DDF3)',
                              padding: '1px 7px', borderRadius: 6, fontWeight: 700,
                              width: 'fit-content', marginTop: 3,
                            }}>
                              {dept.sub_count} sub-dept{dept.sub_count !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div style={{ fontSize: 12.5, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                        {dept.description || <span style={{ color: '#cbd5e1' }}>—</span>}
                      </div>

                      {/* Status */}
                      <StatusCell item={dept} />

                      {/* Created */}
                      <div style={{ fontSize: 12, color: '#7D8597', fontWeight: 600 }}>
                        {new Date(dept.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEdit(dept)}
                          title="Edit department"
                          style={{
                            width: 32, height: 32, border: '1px solid var(--card-active-border, #C9DDF3)',
                            borderRadius: 9, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--card-active-bg, #EEF8FF)', color: 'var(--primary-color, #0466C8)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-color, #0466C8)'; e.currentTarget.style.color = '#fff' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--card-active-bg, #EEF8FF)'; e.currentTarget.style.color = 'var(--primary-color, #0466C8)' }}
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => openAddSub(dept)}
                          title="Add sub-department"
                          style={{
                            width: 32, height: 32, border: '1px solid #a7f3d0',
                            borderRadius: 9, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: '#e8fbf0', color: '#10b981',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#e8fbf0'; e.currentTarget.style.color = '#10b981' }}
                        >
                          <FiPlus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* ── Sub-department rows ── */}
                    {isExpanded && (
                      isLoadingSub ? (
                        <div style={{ padding: '10px 20px 10px 60px', fontSize: 12, color: '#7D8597', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #E3E7EE', borderTopColor: 'var(--primary-color, #0466C8)', animation: 'dept-spin 0.75s linear infinite', flexShrink: 0 }} />
                          Loading sub-departments…
                        </div>
                      ) : subs.length === 0 ? (
                        <div style={{
                          padding: '12px 20px 12px 60px',
                          fontSize: 12, color: '#7D8597',
                          display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500,
                        }}>
                          <span style={{ color: '#cbd5e1', fontSize: 14 }}>└</span>
                          No sub-departments yet.
                          <button onClick={() => openAddSub(dept)} style={{
                            background: 'none', border: 'none', color: 'var(--primary-color, #0466C8)',
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
                              width: 2, background: 'linear-gradient(to bottom,#fed7aa,#EEF1F5)', borderRadius: 1,
                            }} />
                            <div style={{
                              position: 'absolute', left: -20, top: '50%',
                              width: 16, height: 2,
                              background: 'linear-gradient(to right,#fca5a5,#0466C8)', borderRadius: 1,
                            }} />
                            <div style={{
                              position: 'absolute', left: -5, top: 'calc(50% - 4px)',
                              width: 8, height: 8, borderRadius: '50%',
                              background: '#fff', border: '2px solid var(--primary-color, #0466C8)',
                            }} />

                            <div style={{
                              display: 'grid', gridTemplateColumns: COLS,
                              padding: '12px 16px', alignItems: 'center',
                              background: '#ffffff',
                              border: '1px solid #E3E7EE',
                              borderLeft: '4px solid #0ea5e9',
                              borderRadius: 12,
                              marginBottom: si === subs.length - 1 ? 0 : 6,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                              transition: 'all 0.2s ease',
                            }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = '#0ea5e9'
                                e.currentTarget.style.transform = 'translateY(-1px)'
                                e.currentTarget.style.boxShadow = '0 6px 14px rgba(14,165,233,0.08)'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = '#E3E7EE'
                                e.currentTarget.style.borderLeftColor = '#0ea5e9'
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)'
                              }}
                            >
                              <div /> {/* spacer for toggle column */}

                              {/* Sub-dept name + Brand Red Circle Avatar */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                  background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: 700, color: '#fff',
                                  boxShadow: '0 2px 6px rgba(4, 102, 200, 0.2)',
                                }}>
                                  {initials(sub.name)}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{sub.name}</span>
                              </div>

                              {/* Description */}
                              <div style={{ fontSize: 12.5, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                                {sub.description || <span style={{ color: '#cbd5e1' }}>—</span>}
                              </div>

                              {/* Status */}
                              <StatusCell item={sub} parentId={dept.department_id} />

                              {/* Created */}
                              <div style={{ fontSize: 12, color: '#7D8597', fontWeight: 600 }}>
                                {new Date(sub.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>

                              {/* Actions */}
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => openEdit(sub)}
                                  title="Edit sub-department"
                                  style={{
                                    width: 32, height: 32, border: '1px solid var(--card-active-border, #C9DDF3)',
                                    borderRadius: 9, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--card-active-bg, #EEF8FF)', color: 'var(--primary-color, #0466C8)',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-color, #0466C8)'; e.currentTarget.style.color = '#fff' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--card-active-bg, #EEF8FF)'; e.currentTarget.style.color = 'var(--primary-color, #0466C8)' }}
                                >
                                  <FiEdit2 size={14} />
                                </button>
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
            fontFamily: "'Inter', sans-serif",
          }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div style={{
            background: '#ffffff', border: '1px solid #E3E7EE',
            borderRadius: 20, width: '100%', maxWidth: 480,
            boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}>
            {/* Modal header strip with brand red gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)',
              padding: '20px 28px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>
                  {modal === 'edit'
                    ? (editTarget?.parent_id ? 'Edit Sub-Department' : 'Edit Department')
                    : parentDept ? 'Add Sub-Department' : 'Add Department'}
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: '4px 0 0' }}>
                  {modal === 'edit'
                    ? `Editing: ${editTarget?.name}`
                    : parentDept ? `Under: ${parentDept.name}` : 'Create a new department'}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                style={{
                  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8,
                  cursor: 'pointer', color: '#fff',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              >
                <FiX size={16} color="#fff" />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '24px 28px' }}>
              {/* Parent badge */}
              {modal === 'create' && parentDept && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', marginBottom: 20,
                  background: 'var(--card-active-bg, #EEF8FF)',
                  border: '1px solid var(--card-active-border, #C9DDF3)',
                  borderRadius: 10,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff',
                  }}>
                    {initials(parentDept.name)}
                  </div>
                  <span style={{ fontSize: 12, color: '#7D8597' }}>Parent department:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-color, #0466C8)' }}>{parentDept.name}</span>
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
                    border: '1px solid #E3E7EE', borderRadius: 10,
                    cursor: 'pointer', fontSize: 13, color: '#7D8597',
                    fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F1F4F8'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#E3E7EE' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 2, padding: 11,
                    background: saving ? 'rgba(4, 102, 200,0.6)' : 'var(--primary-color, #0466C8)',
                    border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
                    boxShadow: saving ? 'none' : '0 4px 14px rgba(4, 102, 200, 0.25)',
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

