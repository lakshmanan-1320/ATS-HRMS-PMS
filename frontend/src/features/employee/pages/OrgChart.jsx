import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'

const STATUS_META = {
  active:     { label: 'Active',     color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
  inactive:   { label: 'Inactive',   color: '#475569', bg: '#f1f5f9', dot: '#94a3b8' },
  on_leave:   { label: 'On Leave',   color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  terminated: { label: 'Terminated', color: '#b91c1c', bg: '#fee2e2', dot: '#ef4444' },
}

const LEVEL_META = {
  L1: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)',   gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  L2: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   gradient: 'linear-gradient(135deg,#3b82f6,#6366f1)' },
  L3: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',    gradient: 'linear-gradient(135deg,#06b6d4,#3b82f6)' },
  L4: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',   gradient: 'linear-gradient(135deg,#0ea5e9,#06b6d4)' },
  L5: { color: '#64748b', bg: 'rgba(100,116,139,0.1)',  gradient: 'linear-gradient(135deg,#64748b,#94a3b8)' },
}

const getLevelMeta = (level) => {
  if (!level) return LEVEL_META.L5
  const key = level.toUpperCase().slice(0, 2)
  return LEVEL_META[key] || LEVEL_META.L5
}

function buildTree(employees) {
  const map = {}
  employees.forEach(e => { map[e.employee_id] = { ...e, children: [] } })
  const roots = []
  employees.forEach(e => {
    if (e.manager_id && map[e.manager_id]) map[e.manager_id].children.push(map[e.employee_id])
    else roots.push(map[e.employee_id])
  })
  return roots
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Avatar({ first, last, gradient, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: gradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700, color: '#fff',
      flexShrink: 0, letterSpacing: '0.02em',
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    }}>
      {first?.[0]}{last?.[0]}
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
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

function LevelBadge({ level }) {
  if (!level) return null
  const lm = getLevelMeta(level)
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, color: lm.color, background: lm.bg,
      padding: '2px 7px', borderRadius: 6, letterSpacing: '0.04em',
      border: `1px solid ${lm.color}30`, flexShrink: 0,
    }}>
      {level}
    </span>
  )
}

// ── Tree Node ─────────────────────────────────────────────────────────────────

function TreeNode({ node, depth = 0, isLast = false }) {
  const [collapsed, setCollapsed] = useState(false)
  const hasChildren = node.children.length > 0
  const lm = getLevelMeta(node.level_code)

  return (
    <div style={{ position: 'relative', marginLeft: depth === 0 ? 0 : 32 }}>
      {/* Connecting lines */}
      {depth > 0 && (
        <>
          <div style={{
            position: 'absolute', left: -24, top: 0,
            bottom: isLast ? 24 : 0,
            width: 2, background: 'linear-gradient(to bottom,#c7d2fe,#e2e8f0)', borderRadius: 1,
          }} />
          <div style={{
            position: 'absolute', left: -24, top: 22,
            width: 20, height: 2,
            background: 'linear-gradient(to right,#c7d2fe,#6366f1)', borderRadius: 1,
          }} />
          <div style={{
            position: 'absolute', left: -7, top: 18,
            width: 8, height: 8, borderRadius: '50%',
            background: '#fff', border: `2px solid ${lm.color}`,
          }} />
        </>
      )}

      {/* Card */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 13,
          padding: '11px 15px',
          marginBottom: hasChildren && !collapsed ? 8 : 4,
          background: '#ffffff',
          border: `1.5px solid #e2e8f0`,
          borderLeft: `4px solid ${lm.color}`,
          borderRadius: 14,
          cursor: hasChildren ? 'pointer' : 'default',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04),0 4px 10px rgba(0,0,0,0.04)',
          transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
          maxWidth: 450, position: 'relative', overflow: 'hidden',
        }}
        onClick={() => hasChildren && setCollapsed(c => !c)}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = lm.color
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.09),0 0 0 3px ${lm.color}18`
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#e2e8f0'
          e.currentTarget.style.borderLeftColor = lm.color
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04),0 4px 10px rgba(0,0,0,0.04)'
        }}
      >
        {/* Subtle bg glow */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 80, height: '100%',
          background: `linear-gradient(to left,${lm.color}07,transparent)`, pointerEvents: 'none',
        }} />

        <Avatar first={node.first_name} last={node.last_name} gradient={lm.gradient} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {node.first_name} {node.last_name}
            </span>
            <LevelBadge level={node.level_code} />
          </div>
          <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.designation || '—'}
            {node.department_name && <span style={{ color: '#94a3b8' }}> · {node.department_name}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
            {node.employee_code}
          </span>
          <StatusBadge status={node.status} />
          {node.secondary_manager_name && (
            <span style={{
              fontSize: 10, color: '#d97706', background: '#fef3c7',
              border: '1px solid #fcd34d', padding: '2px 7px', borderRadius: 8, fontWeight: 700,
            }}>
              ⋯ Dotted line
            </span>
          )}
        </div>

        {hasChildren && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, marginLeft: 4 }}>
            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {node.children.length} direct
            </span>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: collapsed ? lm.gradient : `${lm.color}14`,
              border: `1.5px solid ${lm.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}>
              <span style={{ fontSize: 8, color: collapsed ? '#fff' : lm.color, fontWeight: 900 }}>
                {collapsed ? '▶' : '▼'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && !collapsed && (
        <div style={{ position: 'relative', marginTop: 2 }}>
          <div style={{
            position: 'absolute', left: 8, top: 0, bottom: 10,
            width: 2, background: 'linear-gradient(to bottom,#c7d2fe,#e2e8f0)', borderRadius: 1,
          }} />
          {node.children.map((child, idx) => (
            <TreeNode
              key={child.employee_id}
              node={child}
              depth={depth + 1}
              isLast={idx === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Matrix Row ────────────────────────────────────────────────────────────────

function MatrixRow({ emp, index }) {
  const lm = getLevelMeta(emp.level_code)
  const base = index % 2 === 0 ? '#ffffff' : '#f8fafc'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '110px 1fr 130px 58px 150px 160px 160px',
      gap: 12, padding: '12px 18px', alignItems: 'center',
      background: base,
      border: '1.5px solid #e2e8f0',
      borderLeft: `4px solid ${lm.color}`,
      borderRadius: 12, marginBottom: 6,
      transition: 'all 0.15s ease',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `${lm.color}09`
        e.currentTarget.style.borderColor = lm.color
        e.currentTarget.style.transform = 'translateX(2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = base
        e.currentTarget.style.borderColor = '#e2e8f0'
        e.currentTarget.style.borderLeftColor = lm.color
        e.currentTarget.style.transform = 'translateX(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
        {emp.employee_code}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar first={emp.first_name} last={emp.last_name} gradient={lm.gradient} size={30} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
          {emp.first_name} {emp.last_name}
        </span>
      </div>
      <span style={{ fontSize: 12, color: '#475569' }}>{emp.department_name || '—'}</span>
      <div><LevelBadge level={emp.level_code} /></div>
      <span style={{ fontSize: 12, color: '#475569' }}>{emp.designation || '—'}</span>
      {emp.manager_name?.trim() ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{emp.manager_name}</div>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{emp.manager_code}</div>
        </div>
      ) : <span style={{ fontSize: 12, color: '#cbd5e1' }}>— None —</span>}
      {emp.secondary_manager_name?.trim() ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>{emp.secondary_manager_name}</div>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{emp.secondary_manager_code} · dotted</div>
        </div>
      ) : <span style={{ fontSize: 12, color: '#cbd5e1' }}>— None —</span>}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OrgChart() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [tab, setTab]             = useState('tree')
  const [search, setSearch]       = useState('')
  const [filterDept, setFilterDept] = useState('')

  const token = sessionStorage.getItem('sa_token')
  const api = axios.create({
    baseURL: '/api/client-admin',
    headers: { Authorization: `Bearer ${token}` },
  })

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/employees/org-chart')
      setEmployees(data)
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load org chart data.'
      const status = err.response?.status || 0
      setError(`[${status}] ${msg}`)
      if (status === 401) { sessionStorage.clear(); window.location.href = '/login' }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [])

  const departments = [...new Map(
    employees.filter(e => e.department_name).map(e => [e.department_id, e.department_name])
  ).entries()].map(([id, name]) => ({ department_id: id, name }))

  const filtered = employees.filter(e => {
    if (filterDept && String(e.department_id) !== filterDept) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        e.first_name.toLowerCase().includes(q) ||
        e.last_name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q) ||
        (e.designation || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const roots = buildTree(filtered)
  const hasMatrix    = employees.some(e => e.secondary_manager_id)
  const totalManagers = new Set(employees.map(e => e.manager_id).filter(Boolean)).size
  const withDotted   = employees.filter(e => e.secondary_manager_id).length

  const STATS = [
    { label: 'Total Employees',       value: employees.length, color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', icon: '👥' },
    { label: 'Reporting Managers',    value: totalManagers,    color: '#10b981', gradient: 'linear-gradient(135deg,#10b981,#06b6d4)', icon: '🏢' },
    { label: 'Dotted-line Assignments', value: withDotted,    color: '#f59e0b', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)', icon: '⋯' },
    { label: 'Departments',           value: departments.length, color: '#0ea5e9', gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)', icon: '🏬' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}>
      <ClientAdminSidebar active="org-chart" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar />
        <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}>🌳</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>
              Org Chart / Manager Matrix
            </h1>
            <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 13 }}>
              Visualize reporting hierarchy and cross-functional manager assignments
            </p>
          </div>
        </div>

        {/* ── Stats ── */}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
            {STATS.map(s => (
              <div key={s.label} style={{
                padding: '18px 20px', background: '#fff',
                border: '1.5px solid #e2e8f0', borderRadius: 16,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', gap: 14,
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = `0 12px 28px rgba(0,0,0,0.08)`
                  e.currentTarget.style.borderColor = s.color
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                }}
              >
                {/* Right gradient accent */}
                <div style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0, width: 4,
                  background: s.gradient, borderRadius: '0 16px 16px 0',
                }} />
                {/* Icon */}
                <div style={{
                  width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                  background: `${s.color}14`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Panel (tabs + filters + content) ── */}
        <div style={{
          background: '#fff', borderRadius: 20,
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid #e2e8f0', padding: '0 24px', background: '#f8fafc' }}>
            {[
              { id: 'tree',   label: 'Tree View',  icon: '🌳' },
              { id: 'matrix', label: 'Matrix View', icon: '⊞' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '13px 20px', background: 'none', border: 'none',
                borderBottom: tab === t.id ? '3px solid #6366f1' : '3px solid transparent',
                cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? '#6366f1' : '#64748b',
                fontFamily: 'inherit', marginBottom: -1.5,
                transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div style={{
            display: 'flex', gap: 10, padding: '14px 24px',
            alignItems: 'center', flexWrap: 'wrap',
            borderBottom: '1px solid #f1f5f9',
          }}>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, color: '#94a3b8', pointerEvents: 'none',
              }}>🔍</span>
              <input
                placeholder="Search name, code, designation…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  paddingLeft: 34, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                  background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10,
                  color: '#1e293b', fontSize: 13, outline: 'none', width: 260,
                  fontFamily: 'inherit', transition: 'border-color 0.15s ease',
                }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              style={{
                padding: '9px 14px', background: '#f8fafc',
                border: '1.5px solid #e2e8f0', borderRadius: 10,
                color: '#1e293b', fontSize: 13, outline: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.department_id} value={String(d.department_id)}>{d.name}</option>
              ))}
            </select>
            {(search || filterDept) && (
              <button
                onClick={() => { setSearch(''); setFilterDept('') }}
                style={{
                  padding: '9px 14px', background: 'none',
                  border: '1.5px solid #e2e8f0', borderRadius: 10,
                  cursor: 'pointer', fontSize: 12, color: '#64748b',
                  fontFamily: 'inherit', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#fee2e2'
                  e.currentTarget.style.borderColor = '#fca5a5'
                  e.currentTarget.style.color = '#ef4444'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.color = '#64748b'
                }}
              >✕ Clear</button>
            )}
            <span style={{
              marginLeft: 'auto', fontSize: 11.5, color: '#64748b', fontWeight: 700,
              background: '#f1f5f9', padding: '5px 12px', borderRadius: 20,
              border: '1px solid #e2e8f0',
            }}>
              {filtered.length} / {employees.length} employees
            </span>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <style>{`@keyframes oc-spin{to{transform:rotate(360deg)}}`}</style>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: '4px solid #e2e8f0', borderTopColor: '#6366f1',
                  animation: 'oc-spin 0.75s linear infinite',
                  margin: '0 auto 16px',
                }} />
                <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Loading org chart…</div>
              </div>

            ) : error ? (
              <div style={{
                textAlign: 'center', padding: '40px 20px', background: '#fff1f2',
                borderRadius: 14, border: '1.5px solid #fecaca',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
                <div style={{ color: '#b91c1c', fontSize: 14, fontWeight: 700 }}>{error}</div>
              </div>

            ) : employees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🌳</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>No employees yet</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Add employees and assign managers to see the org chart.</div>
              </div>

            ) : tab === 'tree' ? (

              /* ── Tree View ── */
              <div>
                {!hasMatrix && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px', marginBottom: 20,
                    background: '#fffbeb', border: '1.5px solid #fcd34d',
                    borderRadius: 12, fontSize: 12, color: '#92400e', fontWeight: 600,
                  }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>ℹ️</span>
                    No dotted-line (secondary) managers assigned yet. Edit employees to add matrix relationships.
                  </div>
                )}

                {roots.length === 0 ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: 40, fontSize: 14 }}>
                    No results match your filters.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {roots.map(root => <TreeNode key={root.employee_id} node={root} depth={0} />)}
                  </div>
                )}

                {/* Legend */}
                <div style={{
                  marginTop: 28, display: 'flex', gap: 18, flexWrap: 'wrap',
                  padding: '12px 16px', background: '#f8fafc', borderRadius: 12,
                  border: '1.5px solid #e2e8f0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                    <div style={{ width: 16, height: 2.5, background: 'linear-gradient(to right,#c7d2fe,#6366f1)', borderRadius: 2 }} />
                    Primary reporting line (solid)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                    <span style={{ fontSize: 14, color: '#d97706', fontWeight: 900 }}>⋯</span>
                    Secondary / dotted-line manager
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'rgba(99,102,241,0.1)', border: '1.5px solid #6366f1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7, color: '#6366f1', fontWeight: 900,
                    }}>▼</div>
                    Click to expand / collapse direct reports
                  </div>
                </div>
              </div>

            ) : (

              /* ── Matrix View ── */
              <div>
                {filtered.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr 130px 58px 150px 160px 160px',
                    gap: 12, padding: '8px 18px 12px',
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.07em',
                    textTransform: 'uppercase', color: '#94a3b8',
                    borderBottom: '2px solid #e2e8f0', marginBottom: 12,
                  }}>
                    <span>Code</span>
                    <span>Employee</span>
                    <span>Department</span>
                    <span>Lvl</span>
                    <span>Designation</span>
                    <span style={{ color: '#6366f1' }}>Primary Mgr</span>
                    <span style={{ color: '#d97706' }}>Secondary (Dotted)</span>
                  </div>
                )}

                {filtered.length === 0 ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: 40, fontSize: 14 }}>
                    No results match your filters.
                  </div>
                ) : (
                  filtered.map((emp, i) => <MatrixRow key={emp.employee_id} emp={emp} index={i} />)
                )}

                {/* Legend */}
                <div style={{
                  marginTop: 16, display: 'flex', gap: 18, padding: '12px 16px',
                  background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e2e8f0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(99,102,241,0.1)', border: '1.5px solid #6366f1' }} />
                    Primary / solid-line manager
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: '#fef3c7', border: '1.5px solid #d97706' }} />
                    Secondary / dotted-line manager
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </div>
  )
}
