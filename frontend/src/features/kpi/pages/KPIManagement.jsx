import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'
import { FiBarChart2 } from 'react-icons/fi'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['financial', 'operational', 'customer', 'people', 'quality']
const UNITS      = ['percentage', 'number', 'currency', 'rating', 'yes_no']
const SOURCES    = ['manual_employee', 'manual_manager', 'auto_attendance', 'auto_leave']
const METHODS    = ['linear', 'threshold', 'custom']
const FREQS      = ['monthly', 'quarterly', 'half_yearly', 'annual']

const CATEGORY_META = {
  financial:   { label: 'Financial',   color: '#0f766e', bg: '#ccfbf1', border: 'rgba(15,118,110,0.25)',  icon: '💰', gradient: 'linear-gradient(135deg,#0f766e,#0d9488)' },
  operational: { label: 'Operational', color: '#4f46e5', bg: '#ede9fe', border: 'rgba(79,70,229,0.25)',   icon: '⚙️', gradient: 'linear-gradient(135deg,#4f46e5,#6366f1)' },
  customer:    { label: 'Customer',    color: '#6d28d9', bg: '#f3e8ff', border: 'rgba(109,40,217,0.25)',  icon: '👥', gradient: 'linear-gradient(135deg,#6d28d9,#7c3aed)' },
  people:      { label: 'People',      color: '#b45309', bg: '#fef3c7', border: 'rgba(180,83,9,0.25)',    icon: '🧑', gradient: 'linear-gradient(135deg,#b45309,#d97706)' },
  quality:     { label: 'Quality',     color: '#b91c1c', bg: '#fee2e2', border: 'rgba(185,28,28,0.25)',   icon: '✅', gradient: 'linear-gradient(135deg,#b91c1c,#dc2626)' },
}

const STATUS_META = {
  pending:   { label: 'Pending',   color: '#475569', bg: '#f1f5f9', border: 'rgba(71,85,105,0.25)',   dot: '#94a3b8' },
  submitted: { label: 'Submitted', color: '#b45309', bg: '#fef3c7', border: 'rgba(180,83,9,0.25)',    dot: '#f59e0b' },
  approved:  { label: 'Approved',  color: '#15803d', bg: '#dcfce7', border: 'rgba(21,128,61,0.25)',   dot: '#22c55e' },
  rejected:  { label: 'Rejected',  color: '#b91c1c', bg: '#fee2e2', border: 'rgba(185,28,28,0.25)',   dot: '#ef4444' },
}

const SOURCE_LABELS = {
  manual_employee: 'Employee Entry',
  manual_manager:  'Manager Entry',
  auto_attendance: 'Auto-Attendance',
  auto_leave:      'Auto-Leave',
}

const UNIT_LABELS = {
  percentage: '%',
  number:     '#',
  currency:   '₹',
  rating:     '★',
  yes_no:     'Y/N',
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

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

function Badge({ value, meta }) {
  const m = meta[value] || { label: value, color: '#475569', bg: '#f1f5f9', border: 'rgba(71,85,105,0.2)', dot: '#94a3b8' }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
      color: m.color, background: m.bg, border: `1px solid ${m.border || m.bg}`,
      display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot || m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  )
}

function StatCard({ label, value, color, gradient, icon }) {
  return (
    <div style={{
      padding: '18px 20px', background: '#fff',
      border: '1.5px solid #e2e8f0', borderRadius: 16,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: 14,
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = color }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#e2e8f0' }}
    >
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, background: gradient, borderRadius: '0 16px 16px 0' }} />
      <div style={{ width: 46, height: 46, borderRadius: 13, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
    </div>
  )
}

function FInput({ ...props }) {
  return (
    <input {...props} style={{
      background: '#f8fafc', border: '1.5px solid #e2e8f0',
      borderRadius: 10, padding: '10px 14px', color: '#1e293b', fontSize: 13,
      width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
      transition: 'border-color 0.15s ease, background 0.15s ease', ...props.style,
    }}
      onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff' }}
      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc' }}
    />
  )
}

function FSelect({ children, ...props }) {
  return (
    <select {...props} style={{
      background: '#f8fafc', border: '1.5px solid #e2e8f0',
      borderRadius: 10, padding: '10px 14px', color: '#1e293b', fontSize: 13,
      width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
      transition: 'border-color 0.15s ease', ...props.style,
    }}
      onFocus={e => e.target.style.borderColor = '#6366f1'}
      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
    >
      {children}
    </select>
  )
}

function IconBtn({ onClick, title, icon, color, hoverFill = true }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 32, height: 32, border: `1.5px solid ${color}40`,
      borderRadius: 9, cursor: 'pointer', fontSize: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `${color}0d`, color,
      transition: 'all 0.15s ease', flexShrink: 0,
    }}
      onMouseEnter={e => { e.currentTarget.style.background = hoverFill ? color : `${color}20`; e.currentTarget.style.color = hoverFill ? '#fff' : color; e.currentTarget.style.borderColor = color }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}0d`; e.currentTarget.style.color = color; e.currentTarget.style.borderColor = `${color}40` }}
    >{icon}</button>
  )
}

function TextBtn({ onClick, children, color = '#6366f1', bg, border }) {
  const _bg = bg || `${color}0d`
  const _border = border || `${color}30`
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', border: `1.5px solid ${_border}`, borderRadius: 8,
      cursor: 'pointer', fontSize: 12, fontWeight: 700, color, background: _bg,
      fontFamily: 'inherit', transition: 'all 0.15s ease', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}1a`; e.currentTarget.style.borderColor = color }}
      onMouseLeave={e => { e.currentTarget.style.background = _bg; e.currentTarget.style.borderColor = _border }}
    >{children}</button>
  )
}

function DrawerHeader({ title, subtitle, onClose, danger }) {
  return (
    <div style={{ margin: '-28px -28px 20px', padding: '20px 24px', background: danger ? 'linear-gradient(135deg,#b91c1c,#dc2626)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', position: 'relative' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>KPI Management</div>
      <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 800 }}>{title}</h3>
      {subtitle && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{subtitle}</p>}
      <button onClick={onClose} style={{
        position: 'absolute', top: 18, right: 18, width: 30, height: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700,
        transition: 'background 0.15s ease',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
      >✕</button>
    </div>
  )
}

function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const start = (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, total)
  let startP = Math.max(1, page - 2)
  let endP   = Math.min(totalPages, startP + 4)
  if (endP - startP < 4) startP = Math.max(1, endP - 4)
  const pages = []
  for (let i = startP; i <= endP; i++) pages.push(i)
  const btn = {
    height: 32, minWidth: 32, padding: '0 8px', borderRadius: 8, fontSize: 12,
    fontWeight: 600, cursor: 'pointer', border: '1.5px solid #e2e8f0',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit', background: '#fff', color: '#475569', transition: 'all 0.15s',
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#f8fafc', borderTop: '1.5px solid #e2e8f0' }}>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
        Showing <strong style={{ color: '#1e293b' }}>{start}–{end}</strong> of <strong style={{ color: '#1e293b' }}>{total}</strong>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => onChange(page - 1)} disabled={page === 1} style={{ ...btn, opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'default' : 'pointer' }}>‹</button>
        {startP > 1 && <><button onClick={() => onChange(1)} style={btn}>1</button>{startP > 2 && <span style={{ padding: '0 4px', color: '#94a3b8', alignSelf: 'center' }}>…</span>}</>}
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)} style={{
            ...btn,
            background: p === page ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#fff',
            color: p === page ? '#fff' : '#475569',
            border: p === page ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0',
            boxShadow: p === page ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
          }}>{p}</button>
        ))}
        {endP < totalPages && <>{endP < totalPages - 1 && <span style={{ padding: '0 4px', color: '#94a3b8', alignSelf: 'center' }}>…</span>}<button onClick={() => onChange(totalPages)} style={btn}>{totalPages}</button></>}
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages} style={{ ...btn, opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'default' : 'pointer' }}>›</button>
      </div>
    </div>
  )
}

function Spinner({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#6366f1', animation: 'kpi-spin 0.75s linear infinite', margin: '0 auto 16px' }} />
      <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>{text}</div>
    </div>
  )
}

function EmptyState({ icon, title, desc, action, onAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#64748b', maxWidth: 300, margin: '0 auto', lineHeight: 1.5 }}>{desc}</div>
      {action && (
        <button onClick={onAction} style={{
          marginTop: 20, padding: '10px 22px',
          background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
          border: 'none', borderRadius: 10, cursor: 'pointer',
          fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
          boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
        }}>{action}</button>
      )}
    </div>
  )
}

// ── KPI Library Tab ───────────────────────────────────────────────────────────

const BLANK_LIB = {
  name: '', code: '', category: 'operational', measurement_unit: 'number',
  data_source: 'manual_manager', scoring_method: 'linear', review_frequency: 'annual',
  over_achievement_allowed: false, description: '', is_active: true,
}
const LIB_PAGE_SIZE = 8
const LIB_COLS = '40px 2fr 140px 130px 140px 90px 100px'

function LibraryTab({ toast }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState(null)
  const [editing, setEditing] = useState(null)
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/client-admin/kpi/library')
      setItems(r.data)
    } catch (err) {
      toast('Failed to load KPI library.', 'error')
      if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    } finally { setLoading(false) }
  }, [toast])

  useEffect(() => { load() }, [load])

  function openCreate() { setForm({ ...BLANK_LIB }); setEditing(null) }
  function openEdit(item) { setForm({ ...item }); setEditing(item.id) }
  function closeForm() { setForm(null); setEditing(null) }

  async function save() {
    try {
      if (editing) {
        await api.put(`/client-admin/kpi/library/${editing}`, form)
        toast('KPI updated.')
      } else {
        await api.post('/client-admin/kpi/library', form)
        toast('KPI created.')
      }
      closeForm(); load()
    } catch (e) {
      toast(e.response?.data?.message || 'Save failed.', 'error')
      if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this KPI from the library?')) return
    try {
      await api.delete(`/client-admin/kpi/library/${id}`)
      toast('KPI deleted.'); load()
    } catch (e) {
      toast(e.response?.data?.message || 'Delete failed.', 'error')
      if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    }
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase())
  )
  const paged       = filtered.slice((page - 1) * LIB_PAGE_SIZE, page * LIB_PAGE_SIZE)
  const activeCount = items.filter(i => i.is_active).length

  return (
    <div>
      {/* Stats */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label="Total KPIs" value={items.length}              color="#6366f1" gradient="linear-gradient(135deg,#6366f1,#8b5cf6)" icon="📋" />
          <StatCard label="Active"     value={activeCount}               color="#10b981" gradient="linear-gradient(135deg,#10b981,#06b6d4)" icon="✅" />
          <StatCard label="Inactive"   value={items.length - activeCount} color="#64748b" gradient="linear-gradient(135deg,#64748b,#94a3b8)" icon="⏸" />
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            placeholder="Search by name or code…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{
              background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10,
              padding: '10px 14px 10px 36px', color: '#1e293b', fontSize: 13,
              width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px',
          background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
          border: 'none', borderRadius: 12, cursor: 'pointer',
          fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
          boxShadow: '0 4px 14px rgba(99,102,241,0.35)', transition: 'all 0.2s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(99,102,241,0.40)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)' }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add KPI
        </button>
      </div>

      {/* List Panel */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {!loading && filtered.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: LIB_COLS,
            padding: '12px 24px', background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0',
            fontSize: 10.5, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase',
          }}>
            <div />
            <div>KPI Name</div>
            <div>Category</div>
            <div>Unit / Source</div>
            <div>Frequency</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>
        )}

        <div style={{ padding: loading || filtered.length === 0 ? 0 : '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading ? (
            <Spinner text="Loading KPI library…" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="📋" title={search ? 'No KPIs Found' : 'No KPIs Yet'}
              desc={search ? `No results for "${search}". Try a different keyword.` : 'Add your first KPI to get started.'}
              action={!search ? '+ Add KPI' : null} onAction={openCreate}
            />
          ) : paged.map(item => {
            const cm = CATEGORY_META[item.category] || CATEGORY_META.operational
            return (
              <div key={item.id} style={{
                display: 'grid', gridTemplateColumns: LIB_COLS,
                padding: '13px 16px', alignItems: 'center',
                background: '#fff', border: '1.5px solid #e2e8f0',
                borderLeft: `4px solid ${cm.color}`, borderRadius: 14,
                opacity: item.is_active ? 1 : 0.65,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = cm.color
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = `0 8px 20px rgba(0,0,0,0.08),0 0 0 3px ${cm.color}12`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.borderLeftColor = cm.color
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                {/* Category icon */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: cm.bg, border: `1px solid ${cm.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {cm.icon}
                  </div>
                </div>

                {/* Name + code */}
                <div style={{ paddingRight: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <code style={{ fontSize: 10, fontWeight: 800, color: cm.color, background: cm.bg, padding: '1px 6px', borderRadius: 4 }}>{item.code}</code>
                    {item.over_achievement_allowed && <span style={{ fontSize: 10, color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>OA✓</span>}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
                      {item.description}
                    </div>
                  )}
                </div>

                {/* Category */}
                <div><Badge value={item.category} meta={CATEGORY_META} /></div>

                {/* Unit / Source */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 5, padding: '2px 7px', color: '#475569', fontWeight: 600, width: 'fit-content' }}>
                    {UNIT_LABELS[item.measurement_unit]} {item.measurement_unit}
                  </span>
                  <span style={{ fontSize: 11, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 5, padding: '2px 7px', color: '#475569', fontWeight: 600, width: 'fit-content' }}>
                    {SOURCE_LABELS[item.data_source]}
                  </span>
                </div>

                {/* Frequency */}
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'capitalize' }}>
                  {item.review_frequency.replace(/_/g, ' ')}
                </div>

                {/* Active/Inactive */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.is_active ? '#22c55e' : '#94a3b8', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: item.is_active ? '#15803d' : '#64748b' }}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <IconBtn onClick={() => openEdit(item)} title="Edit KPI"    icon="✏️" color="#6366f1" />
                  <IconBtn onClick={() => remove(item.id)} title="Delete KPI" icon="🗑" color="#ef4444" />
                </div>
              </div>
            )
          })}
        </div>

        <Pagination page={page} total={filtered.length} pageSize={LIB_PAGE_SIZE} onChange={setPage} />
      </div>

      {/* Form Drawer */}
      {form && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }} onClick={closeForm}>
          <div style={{ width: 500, height: '100vh', overflowY: 'auto', background: '#fff', borderLeft: '1px solid #e2e8f0', padding: 28, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '-16px 0 48px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <DrawerHeader title={editing ? 'Edit KPI' : 'Add KPI to Library'} onClose={closeForm} />

            <Field label="KPI Name *">
              <FInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Revenue Achieved" />
            </Field>
            <Field label="KPI Code *">
              <FInput value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. REV_ACH" style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Category *">
                <FSelect value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_META[c]?.icon} {CATEGORY_META[c]?.label}</option>)}
                </FSelect>
              </Field>
              <Field label="Measurement Unit *">
                <FSelect value={form.measurement_unit} onChange={e => setForm(f => ({ ...f, measurement_unit: e.target.value }))}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </FSelect>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Data Source *">
                <FSelect value={form.data_source} onChange={e => setForm(f => ({ ...f, data_source: e.target.value }))}>
                  {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </FSelect>
              </Field>
              <Field label="Scoring Method">
                <FSelect value={form.scoring_method} onChange={e => setForm(f => ({ ...f, scoring_method: e.target.value }))}>
                  {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </FSelect>
              </Field>
            </div>
            <Field label="Review Frequency">
              <FSelect value={form.review_frequency} onChange={e => setForm(f => ({ ...f, review_frequency: e.target.value }))}>
                {FREQS.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
              </FSelect>
            </Field>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
              <input type="checkbox" checked={form.over_achievement_allowed} onChange={e => setForm(f => ({ ...f, over_achievement_allowed: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#6366f1' }} />
              <div>
                <div style={{ color: '#1e293b', fontSize: 13, fontWeight: 700 }}>Allow Over-Achievement</div>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>Score can exceed 100%</div>
              </div>
            </label>

            <Field label="Description">
              <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Definition and measurement guidance…" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', color: '#1e293b', fontSize: 13, resize: 'vertical', width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
            </Field>

            {editing && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#6366f1' }} />
                <div style={{ color: '#1e293b', fontSize: 13, fontWeight: 700 }}>Active</div>
              </label>
            )}

            <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid #f1f5f9', marginTop: 8 }}>
              <button onClick={save} style={{ flex: 1, padding: '11px 0', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                {editing ? 'Update KPI' : 'Create KPI'}
              </button>
              <button onClick={closeForm} style={{ padding: '11px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#64748b', fontFamily: 'inherit', fontWeight: 600 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── KPI Assignments Tab ───────────────────────────────────────────────────────

const ASSIGN_PAGE_SIZE = 8
const ASSIGN_COLS = '2fr 1.6fr 80px 80px 100px 72px 130px 96px'

function AssignmentsTab({ toast }) {
  const [assignments, setAssignments] = useState([])
  const [library, setLibrary]         = useState([])
  const [goals, setGoals]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [filterGoal, setFilterGoal]   = useState('')
  const [form, setForm]               = useState(null)
  const [editing, setEditing]         = useState(null)
  const [actualModal, setActualModal] = useState(null)
  const [actualVal, setActualVal]     = useState('')
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [page, setPage]               = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, lRes, gRes] = await Promise.all([
        api.get('/client-admin/kpi/assignments'),
        api.get('/client-admin/kpi/library?active_only=true'),
        api.get('/client-admin/kpi/goals'),
      ])
      setAssignments(aRes.data)
      setLibrary(lRes.data)
      setGoals(gRes.data)
    } catch (err) {
      toast('Failed to load assignments.', 'error')
      if (err.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    } finally { setLoading(false) }
  }, [toast])

  useEffect(() => { load() }, [load])

  const BLANK_ASSIGN = { goal_id: '', kpi_library_id: '', name: '', target_value: '', weight: '', over_achievement_allowed: false, data_source: 'manual_manager' }

  function openCreate() { setForm({ ...BLANK_ASSIGN }); setEditing(null) }
  function openEdit(a) {
    setForm({ goal_id: a.goal_id, kpi_library_id: a.kpi_library_id, name: a.name || '', target_value: a.target_value, weight: a.weight, over_achievement_allowed: a.over_achievement_allowed, data_source: a.data_source })
    setEditing(a.id)
  }
  function closeForm() { setForm(null); setEditing(null) }

  function onLibraryChange(libId) {
    const kpi = library.find(l => l.id === parseInt(libId))
    setForm(f => ({ ...f, kpi_library_id: libId, data_source: kpi?.data_source || f.data_source, over_achievement_allowed: kpi?.over_achievement_allowed ?? f.over_achievement_allowed }))
  }

  async function save() {
    try {
      if (editing) {
        await api.put(`/client-admin/kpi/assignments/${editing}`, form); toast('Assignment updated.')
      } else {
        await api.post('/client-admin/kpi/assignments', form); toast('KPI assigned to goal.')
      }
      closeForm(); load()
    } catch (e) {
      toast(e.response?.data?.message || 'Save failed.', 'error')
      if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    }
  }

  async function remove(id) {
    if (!window.confirm('Remove this KPI assignment?')) return
    try { await api.delete(`/client-admin/kpi/assignments/${id}`); toast('Assignment removed.'); load() }
    catch (e) { toast(e.response?.data?.message || 'Failed.', 'error'); if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' } }
  }

  async function saveActual() {
    try { await api.post(`/client-admin/kpi/assignments/${actualModal.id}/actual`, { achieved_value: actualVal }); toast('Actual value entered.'); setActualModal(null); setActualVal(''); load() }
    catch (e) { toast(e.response?.data?.message || 'Failed.', 'error'); if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' } }
  }

  async function approve(id) {
    try { await api.post(`/client-admin/kpi/assignments/${id}/approve-actual`, {}); toast('KPI actual approved.'); load() }
    catch (e) { toast(e.response?.data?.message || 'Failed.', 'error'); if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' } }
  }

  async function saveReject() {
    try { await api.post(`/client-admin/kpi/assignments/${rejectModal.id}/reject-actual`, { reason: rejectReason }); toast('KPI actual rejected.'); setRejectModal(null); setRejectReason(''); load() }
    catch (e) { toast(e.response?.data?.message || 'Failed.', 'error'); if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' } }
  }

  const activeGoals = goals.filter(g => ['active', 'in_progress', 'approved'].includes(g.status))
  const displayed   = filterGoal ? assignments.filter(a => String(a.goal_id) === filterGoal) : assignments
  const paged       = displayed.slice((page - 1) * ASSIGN_PAGE_SIZE, page * ASSIGN_PAGE_SIZE)
  const counts = { pending: 0, submitted: 0, approved: 0, rejected: 0 }
  assignments.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })

  return (
    <div>
      {/* Stats */}
      {!loading && assignments.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label="Total"    value={assignments.length} color="#6366f1" gradient="linear-gradient(135deg,#6366f1,#8b5cf6)" icon="📋" />
          <StatCard label="Pending"  value={counts.pending}     color="#64748b" gradient="linear-gradient(135deg,#64748b,#94a3b8)" icon="⏳" />
          <StatCard label="Submitted" value={counts.submitted}  color="#b45309" gradient="linear-gradient(135deg,#b45309,#d97706)" icon="📤" />
          <StatCard label="Approved" value={counts.approved}    color="#10b981" gradient="linear-gradient(135deg,#10b981,#06b6d4)" icon="✅" />
          <StatCard label="Rejected" value={counts.rejected}    color="#ef4444" gradient="linear-gradient(135deg,#ef4444,#dc2626)" icon="❌" />
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14, pointerEvents: 'none' }}>🎯</span>
          <select value={filterGoal} onChange={e => { setFilterGoal(e.target.value); setPage(1) }} style={{
            width: '100%', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10,
            padding: '10px 14px 10px 36px', color: filterGoal ? '#1e293b' : '#94a3b8',
            fontSize: 13, outline: 'none', fontFamily: 'inherit', appearance: 'none',
          }}>
            <option value="">All Goals</option>
            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px',
          background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
          border: 'none', borderRadius: 12, cursor: 'pointer',
          fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
          boxShadow: '0 4px 14px rgba(99,102,241,0.35)', transition: 'all 0.2s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(99,102,241,0.40)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)' }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Assign KPI
        </button>
      </div>

      {/* List Panel */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {!loading && displayed.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: ASSIGN_COLS,
            padding: '12px 24px', background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0',
            fontSize: 10.5, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase',
          }}>
            <div>KPI Name</div>
            <div>Goal</div>
            <div>Target</div>
            <div>Achieved</div>
            <div>Ach %</div>
            <div>Weight</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>
        )}

        <div style={{ padding: loading || displayed.length === 0 ? 0 : '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading ? (
            <Spinner text="Loading assignments…" />
          ) : displayed.length === 0 ? (
            <EmptyState
              icon="🎯" title="No Assignments Found"
              desc={filterGoal ? 'No KPI assignments for this goal.' : 'Assign a KPI to an active goal to start tracking performance.'}
              action={!filterGoal ? '+ Assign KPI' : null} onAction={openCreate}
            />
          ) : paged.map(a => {
            const sm = STATUS_META[a.status] || STATUS_META.pending
            const achievement = a.target_value > 0 && a.achieved_value !== null
              ? Math.min(a.over_achievement_allowed ? 999 : 100, (parseFloat(a.achieved_value) / parseFloat(a.target_value)) * 100)
              : null
            const achColor = achievement === null ? '#94a3b8' : achievement >= 80 ? '#10b981' : achievement >= 50 ? '#f59e0b' : '#ef4444'

            return (
              <div key={a.id} style={{
                display: 'grid', gridTemplateColumns: ASSIGN_COLS,
                padding: '13px 16px', alignItems: 'center',
                background: '#fff', border: '1.5px solid #e2e8f0',
                borderLeft: `4px solid ${sm.dot}`, borderRadius: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = sm.dot
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.borderLeftColor = sm.dot
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                {/* KPI Name + source */}
                <div style={{ paddingRight: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 6px', marginTop: 4, fontWeight: 600, width: 'fit-content' }}>
                    {SOURCE_LABELS[a.data_source]}
                  </div>
                  {a.rejection_reason && (
                    <div style={{ fontSize: 10, color: '#b91c1c', marginTop: 4, fontWeight: 600 }}>⚠ {a.rejection_reason}</div>
                  )}
                </div>

                {/* Goal */}
                <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.goal_title}
                </div>

                {/* Target */}
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{a.target_value}</div>

                {/* Achieved */}
                <div style={{ fontSize: 14, fontWeight: 700, color: a.achieved_value !== null ? achColor : '#cbd5e1' }}>
                  {a.achieved_value !== null ? a.achieved_value : '—'}
                </div>

                {/* Achievement % */}
                <div>
                  {achievement !== null ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: achColor, lineHeight: 1 }}>{Math.round(achievement)}%</div>
                      <div style={{ marginTop: 5, height: 4, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, achievement)}%`, height: '100%', background: achColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  ) : <span style={{ color: '#cbd5e1', fontSize: 14 }}>—</span>}
                </div>

                {/* Weight */}
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#ede9fe', padding: '3px 8px', borderRadius: 6 }}>{a.weight}%</span>
                </div>

                {/* Status */}
                <div><Badge value={a.status} meta={STATUS_META} /></div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {a.status === 'pending' && (
                    <IconBtn onClick={() => { setActualModal(a); setActualVal(a.achieved_value || '') }} title="Enter Actual" icon="📥" color="#6366f1" />
                  )}
                  {a.status === 'submitted' && (
                    <>
                      <IconBtn onClick={() => approve(a.id)} title="Approve" icon="✓" color="#10b981" />
                      <IconBtn onClick={() => { setRejectModal(a); setRejectReason('') }} title="Reject" icon="✕" color="#ef4444" />
                    </>
                  )}
                  {a.status !== 'approved' && (
                    <IconBtn onClick={() => openEdit(a)} title="Edit" icon="✏️" color="#6366f1" />
                  )}
                  <IconBtn onClick={() => remove(a.id)} title="Remove" icon="🗑" color="#ef4444" />
                </div>
              </div>
            )
          })}
        </div>

        <Pagination page={page} total={displayed.length} pageSize={ASSIGN_PAGE_SIZE} onChange={setPage} />
      </div>

      {/* Assign / Edit Drawer */}
      {form && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }} onClick={closeForm}>
          <div style={{ width: 500, height: '100vh', overflowY: 'auto', background: '#fff', borderLeft: '1px solid #e2e8f0', padding: 28, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '-16px 0 48px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <DrawerHeader title={editing ? 'Edit KPI Assignment' : 'Assign KPI to Goal'} onClose={closeForm} />

            <Field label="Goal *">
              <FSelect value={form.goal_id} onChange={e => setForm(f => ({ ...f, goal_id: e.target.value }))} disabled={!!editing}>
                <option value="">Select goal…</option>
                {activeGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </FSelect>
            </Field>
            <Field label="KPI from Library *">
              <FSelect value={form.kpi_library_id} onChange={e => onLibraryChange(e.target.value)} disabled={!!editing}>
                <option value="">Select KPI…</option>
                {library.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
              </FSelect>
            </Field>
            <Field label="Display Name (optional override)">
              <FInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Leave blank to use library name" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Target Value *">
                <FInput type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))} placeholder="e.g. 100" />
              </Field>
              <Field label="Weight in Goal (%) *">
                <FInput type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="e.g. 40" />
              </Field>
            </div>
            <Field label="Data Source">
              <FSelect value={form.data_source} onChange={e => setForm(f => ({ ...f, data_source: e.target.value }))}>
                {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
              </FSelect>
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
              <input type="checkbox" checked={form.over_achievement_allowed} onChange={e => setForm(f => ({ ...f, over_achievement_allowed: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#6366f1' }} />
              <div>
                <div style={{ color: '#1e293b', fontSize: 13, fontWeight: 700 }}>Allow Over-Achievement</div>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>Score can exceed 100%</div>
              </div>
            </label>
            <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid #f1f5f9', marginTop: 8 }}>
              <button onClick={save} style={{ flex: 1, padding: '11px 0', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                {editing ? 'Update' : 'Assign KPI'}
              </button>
              <button onClick={closeForm} style={{ padding: '11px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#64748b', fontFamily: 'inherit', fontWeight: 600 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enter Actual Modal */}
      {actualModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setActualModal(null)}>
          <div style={{ background: '#fff', borderRadius: 20, width: 420, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 28px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>KPI Update</div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>Enter Actual Value</h2>
              </div>
              <button onClick={() => setActualModal(null)} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700 }}>✕</button>
            </div>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>KPI</div>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{actualModal.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Target: <strong style={{ color: '#6366f1' }}>{actualModal.target_value}</strong></div>
              </div>
              <Field label="Achieved Value">
                <FInput type="number" value={actualVal} onChange={e => setActualVal(e.target.value)} autoFocus placeholder="Enter achieved value…" />
              </Field>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={saveActual} style={{ flex: 1, padding: '11px 0', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit' }}>Submit</button>
                <button onClick={() => setActualModal(null)} style={{ padding: '11px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#64748b', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setRejectModal(null)}>
          <div style={{ background: '#fff', borderRadius: 20, width: 420, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 28px', background: 'linear-gradient(135deg,#b91c1c,#dc2626)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>KPI Review</div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>Reject Actual Value</h2>
              </div>
              <button onClick={() => setRejectModal(null)} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700 }}>✕</button>
            </div>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#fff1f2', borderRadius: 10, padding: '12px 14px', border: '1px solid #fca5a5' }}>
                <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: 13 }}>{rejectModal.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Achieved: <strong>{rejectModal.achieved_value}</strong> / Target: <strong>{rejectModal.target_value}</strong></div>
              </div>
              <Field label="Reason for Rejection *">
                <FInput value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this value is being rejected…" autoFocus />
              </Field>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={saveReject} style={{ flex: 1, padding: '11px 0', background: 'linear-gradient(135deg,#b91c1c,#dc2626)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit' }}>Reject</button>
                <button onClick={() => setRejectModal(null)} style={{ padding: '11px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#64748b', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── KPI Score Tab ─────────────────────────────────────────────────────────────

function ScoreTab({ toast }) {
  const [employees, setEmployees]     = useState([])
  const [selectedEmp, setSelectedEmp] = useState('')
  const [scoreData, setScoreData]     = useState(null)
  const [loading, setLoading]         = useState(false)

  useEffect(() => {
    api.get('/client-admin/employees').then(r => setEmployees(r.data)).catch(() => {})
  }, [])

  async function compute() {
    if (!selectedEmp) return
    setLoading(true)
    try {
      const r = await api.get(`/client-admin/kpi/score/${selectedEmp}`)
      setScoreData(r.data)
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to compute score.', 'error')
      if (e.response?.status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    } finally { setLoading(false) }
  }

  const scoreColor = s => s >= 80 ? '#10b981' : s >= 60 ? '#3b82f6' : s >= 40 ? '#f59e0b' : '#ef4444'
  const scoreLabel = s => s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Average' : 'Needs Improvement'
  const scoreBg    = s => s >= 80 ? 'linear-gradient(135deg,#10b981,#059669)' : s >= 60 ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : s >= 40 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#ef4444,#dc2626)'
  const selectedEmpData = employees.find(e => String(e.employee_id) === String(selectedEmp))

  return (
    <div>
      {/* Employee Picker */}
      <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 20, padding: '20px 24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>👤</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Select Employee to Compute KPI Score</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select value={selectedEmp} onChange={e => { setSelectedEmp(e.target.value); setScoreData(null) }} style={{
              flex: 1, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10,
              padding: '10px 14px', color: selectedEmp ? '#1e293b' : '#94a3b8',
              fontSize: 13, outline: 'none', fontFamily: 'inherit', appearance: 'none',
            }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            >
              <option value="">Select employee…</option>
              {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name} ({e.employee_code})</option>)}
            </select>
            <button onClick={compute} disabled={!selectedEmp} style={{
              padding: '10px 24px', background: selectedEmp ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#e2e8f0',
              border: 'none', borderRadius: 12, cursor: selectedEmp ? 'pointer' : 'default',
              fontSize: 13, fontWeight: 700, color: selectedEmp ? '#fff' : '#94a3b8',
              fontFamily: 'inherit', boxShadow: selectedEmp ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}>
              📊 Compute Score
            </button>
          </div>
        </div>
      </div>

      {loading && <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}><Spinner text="Computing KPI score…" /></div>}

      {scoreData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Overall score hero */}
          <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '28px 32px', background: scoreBg(scoreData.employee_kpi_score), display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
                <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                  <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 46}`}
                    strokeDashoffset={`${2 * Math.PI * 46 * (1 - scoreData.employee_kpi_score / 100)}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{scoreData.employee_kpi_score}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>/ 100</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {selectedEmpData && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginBottom: 4 }}>
                    {selectedEmpData.first_name} {selectedEmpData.last_name} · {selectedEmpData.employee_code}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Overall KPI Score</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 8 }}>
                  {scoreData.employee_kpi_score}<span style={{ fontSize: 18, opacity: 0.7 }}>/100</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.2)', padding: '4px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.3)' }}>
                  {scoreLabel(scoreData.employee_kpi_score)}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Goal Coverage</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{scoreData.total_goal_weight}%</div>
                {scoreData.total_goal_weight !== 100 && <div style={{ fontSize: 11, color: '#fde68a', fontWeight: 600, marginTop: 4 }}>⚠ Not 100%</div>}
              </div>
            </div>
            <div style={{ padding: '14px 32px', background: '#fff', display: 'flex', gap: 4, borderTop: '1.5px solid #e2e8f0' }}>
              {[
                { label: 'Needs Improvement', color: '#ef4444', from: 0,  to: 40  },
                { label: 'Average',           color: '#f59e0b', from: 40, to: 60  },
                { label: 'Good',              color: '#3b82f6', from: 60, to: 80  },
                { label: 'Excellent',         color: '#10b981', from: 80, to: 100 },
              ].map(band => (
                <div key={band.label} style={{ flex: band.to - band.from, textAlign: 'center' }}>
                  <div style={{ height: 6, background: band.color, opacity: scoreData.employee_kpi_score >= band.from && scoreData.employee_kpi_score < band.to ? 1 : 0.2, borderRadius: 4, marginBottom: 5 }} />
                  <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{band.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Goal breakdown */}
          {scoreData.goals.map(goal => {
            const gColor = scoreColor(goal.goal_kpi_score)
            return (
              <div key={goal.goal_id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, marginBottom: 4 }}>{goal.goal_title}</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Goal weight: <strong style={{ color: '#6366f1' }}>{goal.goal_weight}%</strong></span>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>KPI weight used: <strong style={{ color: parseFloat(goal.total_kpi_weight) === 100 ? '#10b981' : '#f59e0b' }}>{goal.total_kpi_weight}%</strong></span>
                      {parseFloat(goal.total_kpi_weight) !== 100 && goal.kpis.length > 0 && (
                        <span style={{ fontSize: 11, color: '#b45309', fontWeight: 700 }}>⚠ Weights don't sum to 100%</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', background: '#fff', border: `2px solid ${gColor}25`, borderRadius: 14, padding: '10px 20px', minWidth: 80, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Score</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: gColor, lineHeight: 1 }}>{goal.goal_kpi_score}</div>
                  </div>
                </div>
                {goal.kpis.length === 0 ? (
                  <div style={{ padding: '24px', color: '#94a3b8', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>No KPIs assigned to this goal.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        {['KPI', 'Target', 'Achieved', 'Achievement %', 'Weight', 'Status'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', color: '#94a3b8', fontWeight: 800, textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {goal.kpis.map((kpi, idx) => {
                        const kc = scoreColor(kpi.achievement_pct || 0)
                        return (
                          <tr key={kpi.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                          >
                            <td style={{ padding: '12px 16px', color: '#1e293b', fontWeight: 700 }}>{kpi.name}</td>
                            <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 500 }}>{kpi.target_value}</td>
                            <td style={{ padding: '12px 16px', color: kpi.achieved_value ? '#1e293b' : '#94a3b8', fontWeight: kpi.achieved_value ? 600 : 400 }}>{kpi.achieved_value ?? '—'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              {kpi.achievement_pct > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 50, height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(100, kpi.achievement_pct)}%`, height: '100%', background: kc, borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontWeight: 800, color: kc, fontSize: 13 }}>{kpi.achievement_pct}%</span>
                                </div>
                              ) : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontWeight: 700, color: '#6366f1', background: '#ede9fe', padding: '3px 9px', borderRadius: 6, fontSize: 12 }}>{kpi.weight}%</span>
                            </td>
                            <td style={{ padding: '12px 16px' }}><Badge value={kpi.status} meta={STATUS_META} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}

          {scoreData.goals.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <EmptyState icon="📭" title="No Active Goals" desc="No active goals found for this employee." />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function KPIManagement() {
  const [tab, setTab]       = useState('library')
  const [toasts, setToasts] = useState([])
  const toastIdRef          = useRef(0)

  const toast = useCallback((msg, type = 'success') => {
    const id = ++toastIdRef.current
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  const TABS = [
    { id: 'library',     label: 'KPI Library',  icon: '📋' },
    { id: 'assignments', label: 'Assignments',   icon: '🎯' },
    { id: 'score',       label: 'KPI Score',     icon: '📊' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
      <ClientAdminSidebar active="kpi" />
      <Toast toasts={toasts} />
      <style>{`@keyframes kpi-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>

        {/* Header */}
        <PageHeader
          icon={FiBarChart2}
          title="KPI Management"
          subtitle="Define KPI templates, assign them to goals, track actuals and compute performance scores"
        />

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '10px 16px', border: 'none', borderRadius: 10,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              fontSize: 13, fontWeight: tab === t.id ? 700 : 600,
              color: tab === t.id ? '#fff' : '#64748b',
              background: tab === t.id ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'transparent',
              boxShadow: tab === t.id ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
              onMouseEnter={e => { if (tab !== t.id) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#1e293b' } }}
              onMouseLeave={e => { if (tab !== t.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' } }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'library'     && <LibraryTab toast={toast} />}
        {tab === 'assignments' && <AssignmentsTab toast={toast} />}
        {tab === 'score'       && <ScoreTab toast={toast} />}
      </main>
      </div>
    </div>
  )
}
