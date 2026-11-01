import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  FiGitMerge,
  FiLayers,
  FiUsers,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiX,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
  FiAlertTriangle,
  FiAward,
  FiShield
} from 'react-icons/fi'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import AddIcon from '../../../components/common/AddIcon.jsx'

const STATUS_META = {
  active:     { label: 'Active',   color: '#0fa958', bg: '#e8fbf0', dot: '#10b981' },
  inactive:   { label: 'Inactive', color: '#7D8597', bg: '#F1F4F8', dot: '#94a3b8' },
  on_leave:   { label: 'On Leave', color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  terminated: { label: 'Terminated', color: '#dc2626', bg: '#EEF8FF', dot: '#ef4444' },
}

const LEVELS_PER_PAGE = 5
const EMP_PER_PAGE = 6

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

function Field({ label, name, placeholder, required, value, error, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: "'Inter', sans-serif" }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', letterSpacing: '0.02em' }}>
        {label}{required && <span style={{ color: 'var(--primary-color, #0466C8)', marginLeft: 2 }}>*</span>}
      </label>
      <input
        type="text"
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

function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, fontFamily: "'Inter', sans-serif" }}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        style={{
          width: 34, height: 34, borderRadius: 9, border: '1.5px solid #E3E7EE',
          background: page === 1 ? '#f8fafc' : '#ffffff', cursor: page === 1 ? 'default' : 'pointer',
          color: page === 1 ? '#cbd5e1' : '#33415C', fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { if (page !== 1) { e.currentTarget.style.background = '#F1F4F8'; e.currentTarget.style.borderColor = 'var(--primary-color, #0466C8)'; e.currentTarget.style.color = 'var(--primary-color, #0466C8)' } }}
        onMouseLeave={e => { e.currentTarget.style.background = page === 1 ? '#f8fafc' : '#ffffff'; e.currentTarget.style.borderColor = '#E3E7EE'; e.currentTarget.style.color = page === 1 ? '#cbd5e1' : '#33415C' }}
      >
        <FiChevronLeft size={16} />
      </button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            width: 34, height: 34, borderRadius: 9,
            border: `1.5px solid ${page === p ? 'var(--primary-color, #0466C8)' : '#E3E7EE'}`,
            background: page === p ? 'var(--primary-color, #0466C8)' : '#ffffff',
            color: page === p ? '#ffffff' : '#33415C',
            cursor: 'pointer', fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s ease',
            boxShadow: page === p ? '0 4px 12px rgba(4, 102, 200,0.25)' : 'none',
          }}
          onMouseEnter={e => { if (page !== p) { e.currentTarget.style.background = '#F1F4F8'; e.currentTarget.style.borderColor = 'var(--primary-color, #0466C8)'; e.currentTarget.style.color = 'var(--primary-color, #0466C8)' } }}
          onMouseLeave={e => { if (page !== p) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#E3E7EE'; e.currentTarget.style.color = '#33415C' } }}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        style={{
          width: 34, height: 34, borderRadius: 9, border: '1.5px solid #E3E7EE',
          background: page === totalPages ? '#f8fafc' : '#ffffff', cursor: page === totalPages ? 'default' : 'pointer',
          color: page === totalPages ? '#cbd5e1' : '#33415C', fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { if (page !== totalPages) { e.currentTarget.style.background = '#F1F4F8'; e.currentTarget.style.borderColor = 'var(--primary-color, #0466C8)'; e.currentTarget.style.color = 'var(--primary-color, #0466C8)' } }}
        onMouseLeave={e => { e.currentTarget.style.background = page === totalPages ? '#f8fafc' : '#ffffff'; e.currentTarget.style.borderColor = '#E3E7EE'; e.currentTarget.style.color = page === totalPages ? '#cbd5e1' : '#33415C' }}
      >
        <FiChevronRight size={16} />
      </button>
      <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
        Page {page} of {totalPages}
      </span>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_META[status] || STATUS_META.active
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, color: s.color, background: s.bg,
      padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em',
      fontFamily: "'Inter', sans-serif"
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  )
}

function EmployeeAvatar({ first, last, size = 34 }) {
  const f = first?.[0] || ''
  const l = last?.[0] || ''
  const initials = (f + l).toUpperCase() || '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#ffffff', flexShrink: 0,
      boxShadow: '0 2px 6px rgba(4, 102, 200, 0.25)',
      fontFamily: "'Inter', sans-serif"
    }}>
      {initials}
    </div>
  )
}

const BLANK = { level_code: '', designation: '', description: '' }
const Backdrop = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }

export default function HierarchyLevels() {
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editLevel, setEditLevel] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Pagination for levels list
  const [levelsPage, setLevelsPage] = useState(1)

  // View Employees modal
  const [viewLevel, setViewLevel] = useState(null)
  const [levelEmps, setLevelEmps] = useState([])
  const [empLoading, setEmpLoading] = useState(false)
  const [empPage, setEmpPage] = useState(1)
  const [empSearch, setEmpSearch] = useState('')

  const toastId = useRef(0)

  const token = sessionStorage.getItem('sa_token')
  const api = axios.create({
    baseURL: '/api/client-admin',
    headers: { Authorization: `Bearer ${token}` },
  })

  function addToast(msg, type = 'success') {
    const id = ++toastId.current
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }

  async function fetchLevels() {
    try {
      const { data } = await api.get('/hierarchy-levels')
      setLevels(data)
    } catch (err) {
      addToast('Failed to load hierarchy levels.', 'error')
      if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLevels() }, [])

  async function openViewEmployees(level) {
    setViewLevel(level)
    setEmpPage(1)
    setEmpSearch('')
    setEmpLoading(true)
    setLevelEmps([])
    try {
      const { data } = await api.get('/employees', { params: { hierarchy_level_id: level.hierarchy_level_id } })
      setLevelEmps(data)
    } catch {
      addToast('Failed to load employees for this level.', 'error')
    } finally {
      setEmpLoading(false)
    }
  }

  function openAdd() { setEditLevel(null); setForm(BLANK); setErrors({}); setShowModal(true) }
  function openEdit(level) {
    setEditLevel(level)
    setForm({ level_code: level.level_code, designation: level.designation, description: level.description || '' })
    setErrors({})
    setShowModal(true)
  }
  function handleField(name, val) { setForm(p => ({ ...p, [name]: val })); if (errors[name]) setErrors(p => ({ ...p, [name]: '' })) }

  function validate() {
    const e = {}
    if (!form.level_code.trim()) e.level_code = 'Level code is required.'
    if (!form.designation.trim()) e.designation = 'Designation is required.'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      if (editLevel) {
        const { data } = await api.put(`/hierarchy-levels/${editLevel.hierarchy_level_id}`, form)
        setLevels(p => p.map(l => l.hierarchy_level_id === editLevel.hierarchy_level_id ? { ...data.data, employee_count: l.employee_count } : l))
        addToast('Level updated successfully.')
      } else {
        const { data } = await api.post('/hierarchy-levels', form)
        setLevels(p => [...p, { ...data.data, employee_count: 0 }])
        addToast('Level added successfully.')
      }
      setShowModal(false)
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(level) {
    try {
      await api.delete(`/hierarchy-levels/${level.hierarchy_level_id}`)
      setLevels(p => p.filter(l => l.hierarchy_level_id !== level.hierarchy_level_id))
      addToast('Level deleted successfully.')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete.', 'error')
    } finally {
      setDeleteConfirm(null)
    }
  }

  async function handleReorder(index, dir) {
    const globalIdx = (levelsPage - 1) * LEVELS_PER_PAGE + index
    if (dir === 'up' && globalIdx === 0) return
    if (dir === 'down' && globalIdx === levels.length - 1) return
    const newLevels = [...levels]
    const swapWith = dir === 'up' ? globalIdx - 1 : globalIdx + 1;
    [newLevels[globalIdx], newLevels[swapWith]] = [newLevels[swapWith], newLevels[globalIdx]]
    setLevels(newLevels)
    try {
      await api.patch('/hierarchy-levels/reorder', { levels: newLevels.map((l, i) => ({ hierarchy_level_id: l.hierarchy_level_id, sort_order: i + 1 })) })
      addToast('Order updated.')
    } catch {
      addToast('Failed to save new order.', 'error')
      fetchLevels()
    }
  }

  // Paginate levels
  const totalLevels = levels.length
  const pagedLevels = levels.slice((levelsPage - 1) * LEVELS_PER_PAGE, levelsPage * LEVELS_PER_PAGE)

  // Filter employees in view modal
  const filteredEmps = empSearch
    ? levelEmps.filter(e => {
        const q = empSearch.toLowerCase()
        return (
          (e.first_name || '').toLowerCase().includes(q) ||
          (e.last_name || '').toLowerCase().includes(q) ||
          (e.employee_code || '').toLowerCase().includes(q) ||
          (e.designation || '').toLowerCase().includes(q)
        )
      })
    : levelEmps
  const pagedEmps = filteredEmps.slice((empPage - 1) * EMP_PER_PAGE, empPage * EMP_PER_PAGE)

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
      <ClientAdminSidebar active="hierarchy" />
      <Toast toasts={toasts} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>

        {/* ── Page Header ── */}
        <PageHeader
          icon={FiGitMerge}
          title="Reporting Hierarchy"
          subtitle="Define authority levels from highest to lowest. Use arrows to reorder."
          actions={
            <button
              onClick={openAdd}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', background: 'var(--primary-color, #0466C8)',
                color: '#ffffff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(4, 102, 200, 0.25)',
                transition: 'all 0.15s ease', fontFamily: "'Inter', sans-serif"
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <AddIcon size={20} />
              <span style={{ color: '#ffffff', fontWeight: 700 }}>Add Level</span>
            </button>
          }
        />

        {/* ── Stat Cards Row ── */}
        {!loading && levels.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Levels', value: levels.length, icon: <FiLayers size={24} style={{ color: 'var(--primary-color, #0466C8)', stroke: 'var(--primary-color, #0466C8)' }} strokeWidth={1.75} /> },
              { label: 'Top Authority', value: levels[0]?.designation || '—', icon: <FiAward size={24} style={{ color: 'var(--primary-color, #0466C8)', stroke: 'var(--primary-color, #0466C8)' }} strokeWidth={1.75} /> },
              { label: 'Entry Level', value: levels[levels.length - 1]?.designation || '—', icon: <FiShield size={24} style={{ color: 'var(--primary-color, #0466C8)', stroke: 'var(--primary-color, #0466C8)' }} strokeWidth={1.75} /> },
              { label: 'Total Employees', value: levels.reduce((a, l) => a + (l.employee_count || 0), 0), icon: <FiUsers size={24} style={{ color: 'var(--primary-color, #0466C8)', stroke: 'var(--primary-color, #0466C8)' }} strokeWidth={1.75} /> },
            ].map((s, idx) => (
              <div key={idx} style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '16px 18px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                fontFamily: "'Inter', sans-serif"
              }}>
                <div style={{
                  width: 40, height: 40,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {s.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Info Strip ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 18px', marginBottom: 24,
          background: '#ffffff',
          border: '1px solid #E3E7EE', borderRadius: 12,
          fontSize: 13, color: '#4b5563', fontWeight: 500,
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--card-active-bg, #EEF8FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <FiInfo size={16} color="var(--primary-color, #0466C8)" />
          </div>
          <span>
            Levels are fully customizable. Use the arrows to set authority order.&nbsp;
            <strong style={{ color: '#111827' }}>Higher in the list = higher authority.</strong>
          </span>
        </div>

        {/* ── Level Cards ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 84, background: '#ffffff', borderRadius: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : levels.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 20px',
            background: '#ffffff', borderRadius: 16,
            border: '2px dashed #E3E7EE',
            fontFamily: "'Inter', sans-serif"
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: 'var(--card-active-bg, #EEF8FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <FiLayers size={32} color="var(--primary-color, #0466C8)" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No levels defined yet</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
              Start by adding your top authority level (e.g., L1 – CEO).
            </div>
            <button
              onClick={openAdd}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', background: 'var(--primary-color, #0466C8)',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#ffffff', fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(4, 102, 200, 0.25)',
              }}
            >
              <AddIcon size={20} />
              <span style={{ color: '#ffffff', fontWeight: 700 }}>Add First Level</span>
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {pagedLevels.map((level, idx) => {
                const globalIdx = (levelsPage - 1) * LEVELS_PER_PAGE + idx
                const isFirst = globalIdx === 0
                const isLast = globalIdx === levels.length - 1
                return (
                  <div key={level.hierarchy_level_id} style={{ display: 'flex', alignItems: 'stretch', gap: 0, animation: 'fadeIn 0.2s ease' }}>
                    {/* Timeline Node */}
                    <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      {!isFirst && <div style={{ width: 2, height: 16, background: '#E3E7EE' }} />}
                      {isFirst && <div style={{ height: 16 }} />}
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0466C8 0%, #023E7D 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ffffff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(4, 102, 200, 0.25)',
                      }}>{globalIdx + 1}</div>
                      {!isLast && <div style={{ width: 2, flex: 1, minHeight: 16, background: '#E3E7EE' }} />}
                    </div>

                    {/* Level Card */}
                    <div style={{ flex: 1, marginBottom: isLast ? 0 : 12, marginLeft: 12 }}>
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #E3E7EE',
                          borderLeft: '4px solid var(--primary-color, #0466C8)',
                          borderRadius: 14,
                          padding: '16px 20px',
                          display: 'grid',
                          gridTemplateColumns: '100px 1fr auto',
                          alignItems: 'center',
                          gap: 16,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateX(2px)' }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; e.currentTarget.style.transform = 'none' }}
                      >
                        {/* Code Badge + Reorder */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            display: 'inline-block', padding: '5px 12px',
                            background: 'var(--card-active-bg, #EEF8FF)',
                            border: '1px solid var(--card-active-border, #C9DDF3)',
                            borderRadius: 20, fontSize: 12, fontWeight: 700,
                            color: 'var(--primary-color, #0466C8)', letterSpacing: '0.04em', textAlign: 'center',
                          }}>
                            {level.level_code}
                          </span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => handleReorder(idx, 'up')}
                              disabled={isFirst}
                              title="Move up"
                              style={{
                                width: 26, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isFirst ? '#f8fafc' : '#F1F4F8', border: '1px solid #E3E7EE',
                                borderRadius: 6, cursor: isFirst ? 'default' : 'pointer',
                                color: isFirst ? '#cbd5e1' : '#33415C', padding: 0,
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => { if (!isFirst) { e.currentTarget.style.background = 'var(--card-active-bg, #EEF8FF)'; e.currentTarget.style.color = 'var(--primary-color, #0466C8)' } }}
                              onMouseLeave={e => { if (!isFirst) { e.currentTarget.style.background = '#F1F4F8'; e.currentTarget.style.color = '#33415C' } }}
                            >
                              <FiChevronUp size={14} />
                            </button>
                            <button
                              onClick={() => handleReorder(idx, 'down')}
                              disabled={isLast}
                              title="Move down"
                              style={{
                                width: 26, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isLast ? '#f8fafc' : '#F1F4F8', border: '1px solid #E3E7EE',
                                borderRadius: 6, cursor: isLast ? 'default' : 'pointer',
                                color: isLast ? '#cbd5e1' : '#33415C', padding: 0,
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => { if (!isLast) { e.currentTarget.style.background = 'var(--card-active-bg, #EEF8FF)'; e.currentTarget.style.color = 'var(--primary-color, #0466C8)' } }}
                              onMouseLeave={e => { if (!isLast) { e.currentTarget.style.background = '#F1F4F8'; e.currentTarget.style.color = '#33415C' } }}
                            >
                              <FiChevronDown size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Designation + Description + employee count */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{level.designation}</div>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              fontSize: 11, fontWeight: 600, color: 'var(--primary-color, #0466C8)',
                              background: 'var(--card-active-bg, #EEF8FF)',
                              padding: '3px 10px', borderRadius: 20, border: '1px solid var(--card-active-border, #C9DDF3)',
                            }}>
                              <FiUsers size={12} color="var(--primary-color, #0466C8)" />
                              {level.employee_count ?? 0} employees
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                            {level.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No description provided</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                          <button
                            onClick={() => openViewEmployees(level)}
                            title="View employees"
                            style={{
                              height: 36, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6,
                              background: '#ffffff', border: '1.5px solid #E3E7EE',
                              borderRadius: 8, cursor: 'pointer', color: '#374151',
                              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                              transition: 'all 0.15s ease', flexShrink: 0,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = 'var(--primary-color, #0466C8)'
                              e.currentTarget.style.color = 'var(--primary-color, #0466C8)'
                              e.currentTarget.style.background = 'var(--card-active-bg, #EEF8FF)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = '#E3E7EE'
                              e.currentTarget.style.color = '#374151'
                              e.currentTarget.style.background = '#ffffff'
                            }}
                          >
                            <FiUsers size={14} />
                            View
                          </button>
                          <button
                            onClick={() => openEdit(level)}
                            title="Edit level"
                            style={{
                              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: '#ffffff', border: '1.5px solid #E3E7EE',
                              borderRadius: 8, cursor: 'pointer', color: '#7D8597',
                              transition: 'all 0.15s ease', flexShrink: 0,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = 'var(--primary-color, #0466C8)'
                              e.currentTarget.style.color = 'var(--primary-color, #0466C8)'
                              e.currentTarget.style.background = 'var(--card-active-bg, #EEF8FF)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = '#E3E7EE'
                              e.currentTarget.style.color = '#7D8597'
                              e.currentTarget.style.background = '#ffffff'
                            }}
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(level)}
                            title="Delete level"
                            style={{
                              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: '#ffffff', border: '1.5px solid #E3E7EE',
                              borderRadius: 8, cursor: 'pointer', color: '#dc2626',
                              transition: 'all 0.15s ease', flexShrink: 0,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = '#dc2626'
                              e.currentTarget.style.background = '#EEF8FF'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = '#E3E7EE'
                              e.currentTarget.style.background = '#ffffff'
                            }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            <Pagination page={levelsPage} total={totalLevels} perPage={LEVELS_PER_PAGE} onChange={p => setLevelsPage(p)} />

            {totalLevels > 0 && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                Showing {Math.min((levelsPage - 1) * LEVELS_PER_PAGE + 1, totalLevels)}–{Math.min(levelsPage * LEVELS_PER_PAGE, totalLevels)} of {totalLevels} levels
              </div>
            )}
          </>
        )}
      </main>

      {/* ── View Employees Modal ── */}
      {viewLevel && (
        <div style={Backdrop} onClick={() => setViewLevel(null)}>
          <div
            style={{
              background: '#ffffff', borderRadius: 16,
              width: 780, maxWidth: '96vw', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.20)',
              animation: 'fadeIn 0.2s ease',
              fontFamily: "'Inter', sans-serif",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: 'var(--primary-color, #0466C8)', padding: '20px 24px', borderRadius: '16px 16px 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, color: '#ffffff',
                }}>{viewLevel.level_code}</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#ffffff', marginBottom: 2 }}>
                    {viewLevel.designation}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 400 }}>
                    {viewLevel.employee_count ?? 0} employees at this level
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewLevel(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none',
                  color: '#ffffff', width: 32, height: 32, borderRadius: 8,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s ease', flexShrink: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <FiX size={18} color="#ffffff" />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #F1F4F8', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <FiSearch size={15} color="#94a3b8" />
                </span>
                <input
                  placeholder="Search by name, code, or designation…"
                  value={empSearch}
                  onChange={e => { setEmpSearch(e.target.value); setEmpPage(1) }}
                  style={{
                    paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                    background: '#f8fafc', border: '1.5px solid #E3E7EE', borderRadius: 10,
                    color: '#111827', fontSize: 13, outline: 'none', width: '100%',
                    boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s ease',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary-color, #0466C8)'}
                  onBlur={e => e.target.style.borderColor = '#E3E7EE'}
                />
              </div>
            </div>

            {/* Employee list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {empLoading ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ fontSize: 13, color: '#7D8597' }}>Loading employees…</div>
                </div>
              ) : filteredEmps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', background: '#F1F4F8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
                  }}>
                    <FiUsers size={28} color="#94a3b8" />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                    {empSearch ? 'No results found' : 'No employees at this level'}
                  </div>
                  <div style={{ fontSize: 13, color: '#7D8597' }}>
                    {empSearch ? 'Try a different search term.' : 'Assign employees to this hierarchy level to see them here.'}
                  </div>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '40px 1.4fr 110px 130px 110px 90px',
                    gap: 12, padding: '8px 14px 10px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                    textTransform: 'uppercase', color: '#94a3b8',
                    borderBottom: '2px solid #F1F4F8', marginBottom: 8,
                  }}>
                    <span>#</span>
                    <span>Employee</span>
                    <span>Code</span>
                    <span>Department</span>
                    <span>Designation</span>
                    <span>Status</span>
                  </div>

                  {pagedEmps.map((emp, i) => (
                    <div
                      key={emp.employee_id}
                      style={{
                        display: 'grid', gridTemplateColumns: '40px 1.4fr 110px 130px 110px 90px',
                        gap: 12, padding: '10px 14px', alignItems: 'center',
                        background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                        border: '1px solid #F1F4F8',
                        borderRadius: 10, marginBottom: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                        {(empPage - 1) * EMP_PER_PAGE + i + 1}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <EmployeeAvatar first={emp.first_name} last={emp.last_name} size={34} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {emp.email || '—'}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#7D8597', fontFamily: 'monospace' }}>
                        {emp.employee_code}
                      </span>
                      <span style={{ fontSize: 12, color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {emp.department_name || '—'}
                      </span>
                      <span style={{ fontSize: 12, color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {emp.designation || '—'}
                      </span>
                      <StatusBadge status={emp.status} />
                    </div>
                  ))}

                  <Pagination
                    page={empPage}
                    total={filteredEmps.length}
                    perPage={EMP_PER_PAGE}
                    onChange={p => setEmpPage(p)}
                  />
                  {filteredEmps.length > EMP_PER_PAGE && (
                    <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                      Showing {Math.min((empPage - 1) * EMP_PER_PAGE + 1, filteredEmps.length)}–{Math.min(empPage * EMP_PER_PAGE, filteredEmps.length)} of {filteredEmps.length} employees
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 24px', borderTop: '1px solid #F1F4F8',
              display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
            }}>
              <button
                onClick={() => setViewLevel(null)}
                style={{
                  padding: '9px 20px', background: '#f8fafc',
                  border: '1.5px solid #E3E7EE', borderRadius: 8,
                  cursor: 'pointer', fontSize: 13, color: '#374151',
                  fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F1F4F8'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div style={Backdrop} onClick={() => setShowModal(false)}>
          <div
            style={{
              background: '#ffffff', borderRadius: 16,
              width: 500, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              animation: 'fadeIn 0.2s ease',
              fontFamily: "'Inter', sans-serif",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{
              background: 'var(--primary-color, #0466C8)',
              padding: '20px 24px', borderRadius: '16px 16px 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 2 }}>
                  {editLevel ? 'Edit Level' : 'Add Hierarchy Level'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 400 }}>
                  {editLevel ? 'Update the level details below.' : 'Define a new level in your reporting structure.'}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none',
                  color: '#ffffff', width: 32, height: 32, borderRadius: 8,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <FiX size={18} color="#ffffff" />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: 24 }}>
              {editLevel && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                  background: 'var(--card-active-bg, #EEF8FF)', border: '1px solid var(--card-active-border, #C9DDF3)',
                  borderRadius: 10, marginBottom: 20,
                }}>
                  <FiEdit2 size={16} color="var(--primary-color, #0466C8)" />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-color, #0466C8)' }}>Editing Level</div>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
                      {editLevel.level_code} — {editLevel.designation} · {editLevel.employee_count ?? 0} employees
                    </div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Level Code" name="level_code" placeholder="e.g. L1, L2, CEO, VP" required value={form.level_code} error={errors.level_code} onChange={handleField} />
                <Field label="Designation" name="designation" placeholder="e.g. President, Vice President, Manager" required value={form.designation} error={errors.designation} onChange={handleField} />
                <TextareaField label="Description (optional)" name="description" placeholder="Brief description of this level's responsibilities..." value={form.description} onChange={handleField} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '9px 18px', background: '#f8fafc',
                    border: '1.5px solid #E3E7EE', borderRadius: 8,
                    cursor: 'pointer', fontSize: 13, color: '#374151',
                    fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F1F4F8'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                >Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '9px 22px',
                    background: 'var(--primary-color, #0466C8)',
                    border: 'none', borderRadius: 8, cursor: saving ? 'default' : 'pointer',
                    fontSize: 13, fontWeight: 600, color: '#ffffff', fontFamily: 'inherit',
                    boxShadow: '0 2px 8px rgba(4, 102, 200, 0.25)',
                    opacity: saving ? 0.7 : 1,
                    transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {saving ? 'Saving…' : (editLevel ? 'Update Level' : 'Add Level')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div style={Backdrop} onClick={() => setDeleteConfirm(null)}>
          <div
            style={{
              background: '#ffffff', borderRadius: 16,
              width: 420, maxWidth: '94vw',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)', overflow: 'hidden',
              animation: 'fadeIn 0.2s ease',
              fontFamily: "'Inter', sans-serif",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ background: '#EEF8FF', padding: '24px', textAlign: 'center', borderBottom: '1px solid #C9DDF3' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.15)'
              }}>
                <FiAlertTriangle size={26} color="#dc2626" />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>Delete Level?</div>
              <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 500 }}>
                Are you sure you want to delete <strong style={{ color: '#7f1d1d' }}>{deleteConfirm.level_code} – {deleteConfirm.designation}</strong>?
                <br />This action cannot be undone.
              </div>
              {(deleteConfirm.employee_count ?? 0) > 0 && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', background: '#fef3c7',
                  border: '1px solid #fcd34d', borderRadius: 8,
                  fontSize: 12, color: '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center'
                }}>
                  <FiAlertTriangle size={14} color="#d97706" />
                  {deleteConfirm.employee_count} employee(s) are assigned to this level and will be unlinked.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '18px 24px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1, padding: '10px', background: '#f8fafc',
                  border: '1.5px solid #E3E7EE', borderRadius: 8,
                  cursor: 'pointer', fontSize: 13, color: '#374151',
                  fontFamily: 'inherit', fontWeight: 600,
                }}
              >Cancel</button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  flex: 1, padding: '10px',
                  background: 'var(--primary-color, #0466C8)',
                  border: 'none', borderRadius: 8,
                  cursor: 'pointer', fontSize: 13,
                  fontWeight: 600, color: '#ffffff', fontFamily: 'inherit',
                  boxShadow: '0 2px 8px rgba(4, 102, 200, 0.25)',
                }}
              >Delete Level</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
