import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'

const LEVEL_PALETTE = [
  { bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', soft: '#ede9fe', text: '#4f46e5', border: '#a5b4fc' },
  { bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', soft: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' },
  { bg: 'linear-gradient(135deg,#06b6d4,#0891b2)', soft: '#cffafe', text: '#0891b2', border: '#67e8f9' },
  { bg: 'linear-gradient(135deg,#10b981,#059669)', soft: '#d1fae5', text: '#059669', border: '#6ee7b7' },
  { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', soft: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  { bg: 'linear-gradient(135deg,#ec4899,#db2777)', soft: '#fce7f3', text: '#be185d', border: '#f9a8d4' },
  { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', soft: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  { bg: 'linear-gradient(135deg,#64748b,#475569)', soft: '#f1f5f9', text: '#475569', border: '#94a3b8' },
]
const STATUS_META = {
  active:     { label: 'Active',   color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
  inactive:   { label: 'Inactive', color: '#475569', bg: '#f1f5f9', dot: '#94a3b8' },
  on_leave:   { label: 'On Leave', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  terminated: { label: 'Terminated', color: '#b91c1c', bg: '#fee2e2', dot: '#ef4444' },
}

const LEVELS_PER_PAGE = 5
const EMP_PER_PAGE = 6

function getPalette(idx) { return LEVEL_PALETTE[idx % LEVEL_PALETTE.length] }

function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '13px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
          minWidth: '280px', maxWidth: '380px', display: 'flex', alignItems: 'center', gap: '10px',
          background: t.type === 'error' ? '#fee2e2' : '#dcfce7',
          border: `1px solid ${t.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: t.type === 'error' ? '#b91c1c' : '#15803d',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          animation: 'slideIn 0.25s ease',
        }}>
          <span style={{ fontSize: '16px' }}>{t.type === 'error' ? '✕' : '✓'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

function Field({ label, name, placeholder, required, value, error, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', letterSpacing: '0.04em' }}>
        {label}{required && <span style={{ color: '#6366f1', marginLeft: '2px' }}>*</span>}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(name, e.target.value)}
        style={{
          padding: '11px 14px', background: '#f8fafc',
          border: `1.5px solid ${error ? '#ef4444' : '#e2e8f0'}`,
          borderRadius: '10px', color: '#0f172a', fontSize: '14px',
          outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
          transition: 'all 0.15s ease',
        }}
        onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
        onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}
      />
      {error && <span style={{ color: '#dc2626', fontSize: '11px', fontWeight: '600' }}>{error}</span>}
    </div>
  )
}

function TextareaField({ label, name, placeholder, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', letterSpacing: '0.04em' }}>{label}</label>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={e => onChange(name, e.target.value)}
        style={{
          padding: '11px 14px', background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '10px', color: '#0f172a', fontSize: '14px',
          outline: 'none', width: '100%', boxSizing: 'border-box',
          fontFamily: 'inherit', resize: 'vertical', transition: 'all 0.15s ease',
        }}
        onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )
}

function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '20px' }}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        style={{
          width: '34px', height: '34px', borderRadius: '9px', border: '1.5px solid #e2e8f0',
          background: page === 1 ? '#f8fafc' : '#fff', cursor: page === 1 ? 'default' : 'pointer',
          color: page === 1 ? '#cbd5e1' : '#475569', fontSize: '14px', fontWeight: '700',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (page !== 1) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' } }}
        onMouseLeave={e => { e.currentTarget.style.background = page === 1 ? '#f8fafc' : '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = page === 1 ? '#cbd5e1' : '#475569' }}
      >‹</button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            width: '34px', height: '34px', borderRadius: '9px',
            border: `1.5px solid ${page === p ? '#6366f1' : '#e2e8f0'}`,
            background: page === p ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#fff',
            color: page === p ? '#fff' : '#475569',
            cursor: 'pointer', fontSize: '13px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
            boxShadow: page === p ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
          }}
          onMouseEnter={e => { if (page !== p) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' } }}
          onMouseLeave={e => { if (page !== p) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' } }}
        >{p}</button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        style={{
          width: '34px', height: '34px', borderRadius: '9px', border: '1.5px solid #e2e8f0',
          background: page === totalPages ? '#f8fafc' : '#fff', cursor: page === totalPages ? 'default' : 'pointer',
          color: page === totalPages ? '#cbd5e1' : '#475569', fontSize: '14px', fontWeight: '700',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (page !== totalPages) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' } }}
        onMouseLeave={e => { e.currentTarget.style.background = page === totalPages ? '#f8fafc' : '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = page === totalPages ? '#cbd5e1' : '#475569' }}
      >›</button>
      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
        Page {page} of {totalPages}
      </span>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_META[status] || STATUS_META.active
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '10px', fontWeight: '700', color: s.color, background: s.bg,
      padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  )
}

function EmployeeAvatar({ first, last, gradient, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: gradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 700, color: '#fff', flexShrink: 0,
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    }}>
      {first?.[0]}{last?.[0]}
    </div>
  )
}

const BLANK = { level_code: '', designation: '', description: '' }
const Backdrop = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }

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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
      <ClientAdminSidebar active="hierarchy" />
      <Toast toasts={toasts} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
              Organization Structure
            </div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: '#0f172a', lineHeight: 1.15 }}>Reporting Hierarchy</h1>
            <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '14px' }}>
              Define authority levels from highest to lowest. Use arrows to reorder.
            </p>
          </div>
          <button
            onClick={openAdd}
            style={{
              padding: '12px 22px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
              border: 'none', borderRadius: '12px', cursor: 'pointer',
              fontSize: '14px', fontWeight: '700', color: '#fff', fontFamily: 'inherit',
              boxShadow: '0 4px 18px rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.45)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(99,102,241,0.35)' }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>＋</span> Add Level
          </button>
        </div>

        {/* ── Stats Row ── */}
        {!loading && levels.length > 0 && (
          <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[
              { label: 'Total Levels', value: levels.length, color: '#6366f1', bg: '#ede9fe' },
              { label: 'Top Authority', value: levels[0]?.designation || '—', color: '#0891b2', bg: '#cffafe' },
              { label: 'Entry Level', value: levels[levels.length - 1]?.designation || '—', color: '#059669', bg: '#d1fae5' },
              { label: 'Total Employees', value: levels.reduce((a, l) => a + (l.employee_count || 0), 0), color: '#d97706', bg: '#fef3c7' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px',
                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flex: '1 1 160px', minWidth: '140px',
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.bg, border: `2px solid ${s.color}`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: s.color, marginTop: '2px' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Info Strip ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '13px 20px', marginBottom: '24px',
          background: 'linear-gradient(135deg,#e0e7ff,#ede9fe)',
          border: '1px solid #a5b4fc', borderRadius: '12px',
          fontSize: '13px', color: '#3730a3', fontWeight: '600',
        }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: '14px' }}>ℹ</span>
          </div>
          Levels are fully customizable. Use the ▲ ▼ arrows to set authority order.&nbsp;<strong style={{ color: '#4f46e5' }}>Higher in the list = higher authority.</strong>
        </div>

        {/* ── Level Cards ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: '90px', background: '#e2e8f0', borderRadius: '16px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : levels.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '72px 20px',
            background: '#ffffff', borderRadius: '20px',
            border: '2px dashed #c7d2fe',
            boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>🏗️</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>No levels defined yet</div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', maxWidth: '360px', margin: '0 auto 24px' }}>
              Start by adding your top authority level (e.g., L1 – CEO).
            </div>
            <button
              onClick={openAdd}
              style={{
                padding: '12px 24px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                border: 'none', borderRadius: '12px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '700', color: '#fff', fontFamily: 'inherit',
                boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
              }}
            >+ Add First Level</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {pagedLevels.map((level, idx) => {
                const globalIdx = (levelsPage - 1) * LEVELS_PER_PAGE + idx
                const pal = getPalette(globalIdx)
                const isFirst = globalIdx === 0
                const isLast = globalIdx === levels.length - 1
                return (
                  <div key={level.hierarchy_level_id} style={{ display: 'flex', alignItems: 'stretch', gap: '0', animation: 'fadeIn 0.25s ease' }}>
                    {/* Timeline */}
                    <div style={{ width: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      {!isFirst && <div style={{ width: '2px', height: '16px', background: '#e2e8f0' }} />}
                      {isFirst && <div style={{ height: '16px' }} />}
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: pal.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '12px', fontWeight: '900', flexShrink: 0,
                        boxShadow: `0 3px 10px ${pal.text}40`,
                      }}>{globalIdx + 1}</div>
                      {!isLast && <div style={{ width: '2px', flex: 1, minHeight: '16px', background: '#e2e8f0' }} />}
                    </div>

                    {/* Card */}
                    <div style={{ flex: 1, marginBottom: isLast ? '0' : '10px', marginLeft: '12px' }}>
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderLeft: `5px solid ${pal.text}`,
                          borderRadius: '16px',
                          padding: '16px 20px',
                          display: 'grid',
                          gridTemplateColumns: '108px 1fr auto',
                          alignItems: 'center',
                          gap: '16px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s ease',
                          cursor: 'default',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 24px ${pal.text}20`; e.currentTarget.style.transform = 'translateX(4px)' }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none' }}
                      >
                        {/* Code + Reorder */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            display: 'inline-block', padding: '6px 14px',
                            background: pal.soft, border: `1.5px solid ${pal.border}`,
                            borderRadius: '20px', fontSize: '13px', fontWeight: '800',
                            color: pal.text, letterSpacing: '0.06em', textAlign: 'center',
                          }}>
                            {level.level_code}
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleReorder(idx, 'up')}
                              disabled={isFirst}
                              title="Move up"
                              style={{
                                width: '26px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isFirst ? '#f8fafc' : pal.soft, border: `1px solid ${isFirst ? '#e2e8f0' : pal.border}`,
                                borderRadius: '6px', cursor: isFirst ? 'default' : 'pointer',
                                color: isFirst ? '#cbd5e1' : pal.text, fontSize: '10px', padding: 0,
                                fontWeight: '700', transition: 'all 0.15s',
                              }}
                            >▲</button>
                            <button
                              onClick={() => handleReorder(idx, 'down')}
                              disabled={isLast}
                              title="Move down"
                              style={{
                                width: '26px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isLast ? '#f8fafc' : pal.soft, border: `1px solid ${isLast ? '#e2e8f0' : pal.border}`,
                                borderRadius: '6px', cursor: isLast ? 'default' : 'pointer',
                                color: isLast ? '#cbd5e1' : pal.text, fontSize: '10px', padding: 0,
                                fontWeight: '700', transition: 'all 0.15s',
                              }}
                            >▼</button>
                          </div>
                        </div>

                        {/* Designation + Description + employee count */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{level.designation}</div>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              fontSize: '11px', fontWeight: '700', color: pal.text, background: pal.soft,
                              padding: '3px 10px', borderRadius: '20px', border: `1px solid ${pal.border}`,
                            }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                              {level.employee_count ?? 0} employees
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>
                            {level.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No description provided</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                          {/* View Employees */}
                          <button
                            onClick={() => openViewEmployees(level)}
                            title="View employees"
                            style={{
                              height: '38px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px',
                              background: `${pal.soft}`, border: `1.5px solid ${pal.border}`,
                              borderRadius: '10px', cursor: 'pointer', color: pal.text,
                              fontSize: '12px', fontWeight: '700', fontFamily: 'inherit',
                              transition: 'all 0.18s ease', flexShrink: 0,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = pal.bg.replace('linear-gradient', 'linear-gradient')
                              e.currentTarget.style.background = pal.text
                              e.currentTarget.style.background = pal.bg
                              e.currentTarget.style.color = '#fff'
                              e.currentTarget.style.transform = 'translateY(-2px)'
                              e.currentTarget.style.boxShadow = `0 4px 12px ${pal.text}40`
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = pal.soft
                              e.currentTarget.style.color = pal.text
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            View
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => openEdit(level)}
                            title="Edit level"
                            style={{
                              width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.25)',
                              borderRadius: '10px', cursor: 'pointer', color: '#6366f1',
                              transition: 'all 0.18s ease', flexShrink: 0,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#6366f1,#4f46e5)'; e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.35)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirm(level)}
                            title="Delete level"
                            style={{
                              width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)',
                              borderRadius: '10px', cursor: 'pointer', color: '#ef4444',
                              transition: 'all 0.18s ease', flexShrink: 0,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(239,68,68,0.35)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
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
              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
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
              background: '#ffffff', borderRadius: '22px',
              width: '780px', maxWidth: '96vw', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.20)',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            {(() => {
              const pi = levels.findIndex(l => l.hierarchy_level_id === viewLevel.hierarchy_level_id)
              const pal = getPalette(pi >= 0 ? pi : 0)
              return (
                <>
                  <div style={{
                    background: pal.bg, padding: '22px 28px', borderRadius: '22px 22px 0 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px', fontWeight: '900', color: '#fff',
                      }}>{viewLevel.level_code}</div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff', marginBottom: '2px' }}>
                          {viewLevel.designation}
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                          {viewLevel.employee_count ?? 0} employees at this level
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setViewLevel(null)}
                      style={{
                        background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                        color: '#fff', width: '36px', height: '36px', borderRadius: '10px',
                        cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '700', transition: 'background 0.15s', flexShrink: 0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    >✕</button>
                  </div>

                  {/* Search */}
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94a3b8', pointerEvents: 'none' }}>🔍</span>
                      <input
                        placeholder="Search by name, code, or designation…"
                        value={empSearch}
                        onChange={e => { setEmpSearch(e.target.value); setEmpPage(1) }}
                        style={{
                          paddingLeft: '36px', paddingRight: '14px', paddingTop: '9px', paddingBottom: '9px',
                          background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px',
                          color: '#1e293b', fontSize: '13px', outline: 'none', width: '100%',
                          boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s',
                        }}
                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                  </div>

                  {/* Employee list */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                    {empLoading ? (
                      <div style={{ textAlign: 'center', padding: '48px 0' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%', margin: '0 auto 12px',
                          border: `3px solid ${pal.soft}`, borderTopColor: pal.text,
                          animation: 'spin 0.7s linear infinite',
                        }} />
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>Loading employees…</div>
                      </div>
                    ) : filteredEmps.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>👥</div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                          {empSearch ? 'No results found' : 'No employees at this level'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {empSearch ? 'Try a different search term.' : 'Assign employees to this hierarchy level to see them here.'}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Table header */}
                        <div style={{
                          display: 'grid', gridTemplateColumns: '40px 1fr 110px 130px 110px 90px',
                          gap: '12px', padding: '8px 14px 10px',
                          fontSize: '10px', fontWeight: '800', letterSpacing: '0.07em',
                          textTransform: 'uppercase', color: '#94a3b8',
                          borderBottom: '2px solid #e2e8f0', marginBottom: '8px',
                        }}>
                          <span>#</span>
                          <span>Employee</span>
                          <span>Code</span>
                          <span>Department</span>
                          <span>Designation</span>
                          <span>Status</span>
                        </div>

                        {pagedEmps.map((emp, i) => {
                          const rowPal = getPalette(pi >= 0 ? pi : 0)
                          return (
                            <div
                              key={emp.employee_id}
                              style={{
                                display: 'grid', gridTemplateColumns: '40px 1fr 110px 130px 110px 90px',
                                gap: '12px', padding: '10px 14px', alignItems: 'center',
                                background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                                border: '1.5px solid #f1f5f9',
                                borderLeft: `3px solid ${rowPal.text}`,
                                borderRadius: '10px', marginBottom: '6px',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = `${rowPal.text}08`; e.currentTarget.style.borderColor = `${rowPal.text}40`; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#ffffff' : '#f8fafc'; e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.borderLeftColor = rowPal.text; e.currentTarget.style.boxShadow = 'none' }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>
                                {(empPage - 1) * EMP_PER_PAGE + i + 1}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <EmployeeAvatar first={emp.first_name} last={emp.last_name} gradient={rowPal.bg} />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {emp.first_name} {emp.last_name}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {emp.email || '—'}
                                  </div>
                                </div>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                                {emp.employee_code}
                              </span>
                              <span style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {emp.department_name || '—'}
                              </span>
                              <span style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {emp.designation || '—'}
                              </span>
                              <StatusBadge status={emp.status} />
                            </div>
                          )
                        })}

                        <Pagination
                          page={empPage}
                          total={filteredEmps.length}
                          perPage={EMP_PER_PAGE}
                          onChange={p => setEmpPage(p)}
                        />
                        {filteredEmps.length > EMP_PER_PAGE && (
                          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                            Showing {Math.min((empPage - 1) * EMP_PER_PAGE + 1, filteredEmps.length)}–{Math.min(empPage * EMP_PER_PAGE, filteredEmps.length)} of {filteredEmps.length} employees
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{
                    padding: '14px 24px', borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
                  }}>
                    <button
                      onClick={() => setViewLevel(null)}
                      style={{
                        padding: '10px 24px', background: '#f8fafc',
                        border: '1.5px solid #e2e8f0', borderRadius: '10px',
                        cursor: 'pointer', fontSize: '14px', color: '#374151',
                        fontFamily: 'inherit', fontWeight: '600', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                    >Close</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div style={Backdrop} onClick={() => setShowModal(false)}>
          <div
            style={{
              background: '#ffffff', borderRadius: '22px',
              width: '500px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{
              background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
              padding: '24px 28px', borderRadius: '22px 22px 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff', marginBottom: '3px' }}>
                  {editLevel ? 'Edit Level' : 'Add Hierarchy Level'}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                  {editLevel ? 'Update the level details below.' : 'Define a new level in your reporting structure.'}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff', width: '34px', height: '34px', borderRadius: '10px',
                  cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >✕</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '28px' }}>
              {editLevel && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                  background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', marginBottom: '20px',
                }}>
                  <span style={{ fontSize: '16px' }}>✏️</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8' }}>Editing Level</div>
                    <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600' }}>
                      {editLevel.level_code} — {editLevel.designation} · {editLevel.employee_count ?? 0} employees
                    </div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <Field label="Level Code" name="level_code" placeholder="e.g. L1, L2, CEO, VP" required value={form.level_code} error={errors.level_code} onChange={handleField} />
                <Field label="Designation" name="designation" placeholder="e.g. President, Vice President, Manager" required value={form.designation} error={errors.designation} onChange={handleField} />
                <TextareaField label="Description (optional)" name="description" placeholder="Brief description of this level's responsibilities..." value={form.description} onChange={handleField} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '28px' }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 22px', background: '#f8fafc',
                    border: '1.5px solid #e2e8f0', borderRadius: '10px',
                    cursor: 'pointer', fontSize: '14px', color: '#374151',
                    fontFamily: 'inherit', fontWeight: '600', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                >Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '10px 26px',
                    background: saving ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                    border: 'none', borderRadius: '10px', cursor: saving ? 'default' : 'pointer',
                    fontSize: '14px', fontWeight: '700', color: '#fff', fontFamily: 'inherit',
                    boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.3)',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  {saving && (
                    <span style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                      display: 'inline-block', animation: 'spin 0.7s linear infinite',
                    }} />
                  )}
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
              background: '#ffffff', borderRadius: '20px',
              width: '420px', maxWidth: '94vw',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)', overflow: 'hidden',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ background: 'linear-gradient(135deg,#fee2e2,#fecaca)', padding: '28px', textAlign: 'center', borderBottom: '1px solid #fca5a5' }}>
              <div style={{ fontSize: '44px', marginBottom: '10px' }}>⚠️</div>
              <div style={{ fontSize: '17px', fontWeight: '900', color: '#7f1d1d', marginBottom: '6px' }}>Delete Level?</div>
              <div style={{ fontSize: '13px', color: '#991b1b', fontWeight: '500' }}>
                Delete <strong style={{ color: '#7f1d1d' }}>{deleteConfirm.level_code} – {deleteConfirm.designation}</strong>?
                <br />This action cannot be undone.
              </div>
              {(deleteConfirm.employee_count ?? 0) > 0 && (
                <div style={{
                  marginTop: '12px', padding: '10px 16px', background: '#fef3c7',
                  border: '1px solid #fcd34d', borderRadius: '10px',
                  fontSize: '12px', color: '#92400e', fontWeight: '700',
                }}>
                  ⚠️ {deleteConfirm.employee_count} employee(s) are assigned to this level and will be unlinked.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', padding: '20px 24px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1, padding: '11px', background: '#f8fafc',
                  border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  cursor: 'pointer', fontSize: '14px', color: '#374151',
                  fontFamily: 'inherit', fontWeight: '600',
                }}
              >Cancel</button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  flex: 1, padding: '11px',
                  background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                  border: 'none', borderRadius: '10px',
                  cursor: 'pointer', fontSize: '14px',
                  fontWeight: '700', color: '#fff', fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
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
