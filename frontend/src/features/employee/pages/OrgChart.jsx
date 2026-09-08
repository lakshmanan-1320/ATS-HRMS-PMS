import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import {
  FiUser,
  FiUsers,
  FiUserCheck,
  FiShare2,
  FiMap,
  FiFolder,
  FiSearch,
  FiFilter,
  FiInfo,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronRight,
  FiGrid,
  FiCheckCircle,
  FiX,
  FiClock,
  FiTrendingUp,
  FiMinus,
  FiLayers,
  FiBriefcase,
  FiMoreHorizontal
} from 'react-icons/fi'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import PageHeader from '../../../components/common/PageHeader.jsx'

const STATUS_META = {
  active:     { label: 'Active',     color: '#0fa958', bg: '#e8fbf0', dot: '#10b981' },
  inactive:   { label: 'Inactive',   color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
  on_leave:   { label: 'On Leave',   color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  terminated: { label: 'Terminated', color: '#dc2626', bg: '#feecee', dot: '#ef4444' },
}

const LEVEL_META = {
  L1: { color: '#C2071A', bg: '#FEECEE', gradient: 'linear-gradient(135deg, #D01021 0%, #B40619 100%)' },
  L2: { color: '#7c3aed', bg: '#f5f3ff', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
  L3: { color: '#059669', bg: '#ecfdf5', gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)' },
  L4: { color: '#d97706', bg: '#fef3c7', gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' },
  L5: { color: '#475569', bg: '#f8fafc', gradient: 'linear-gradient(135deg, #64748b 0%, #334155 100%)' },
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

function Avatar({ first, last, size = 42 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #D01021 0%, #B40619 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff',
      flexShrink: 0, letterSpacing: '0.02em',
      boxShadow: '0 2px 8px rgba(194, 7, 26, 0.2)',
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
      fontSize: 10.5, fontWeight: 700, color: s.color, background: s.bg,
      padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.04em',
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
      fontSize: 10.5, fontWeight: 800, color: lm.color, background: lm.bg,
      padding: '2px 8px', borderRadius: 6, letterSpacing: '0.04em',
      border: `1px solid ${lm.color}30`, flexShrink: 0,
    }}>
      {level}
    </span>
  )
}

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
            width: 2, background: 'linear-gradient(to bottom,#fed7aa,#EFF3F8)', borderRadius: 1,
          }} />
          <div style={{
            position: 'absolute', left: -24, top: 22,
            width: 20, height: 2,
            background: 'linear-gradient(to right,#fca5a5,#C2071A)', borderRadius: 1,
          }} />
          <div style={{
            position: 'absolute', left: -7, top: 18,
            width: 8, height: 8, borderRadius: '50%',
            background: '#fff', border: `2px solid ${lm.color}`,
          }} />
        </>
      )}

      {/* Card matching Figma specs: background #FFFFFF, crisp border, radius 12 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '12px 16px',
          marginBottom: hasChildren && !collapsed ? 10 : 6,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderLeft: `4px solid ${lm.color}`,
          borderRadius: 12,
          cursor: hasChildren ? 'pointer' : 'default',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.2s ease',
          maxWidth: 480, position: 'relative', overflow: 'hidden',
        }}
        onClick={() => hasChildren && setCollapsed(c => !c)}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = lm.color
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.06), 0 0 0 3px ${lm.color}15`
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#e2e8f0'
          e.currentTarget.style.borderLeftColor = lm.color
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)'
        }}
      >
        <Avatar first={node.first_name} last={node.last_name} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {node.first_name} {node.last_name}
            </span>
            <LevelBadge level={node.level_code} />
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.designation || '—'}
            {node.department_name && <span style={{ color: '#94a3b8' }}> · {node.department_name}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
            {node.employee_code}
          </span>
          <StatusBadge status={node.status} />
          {node.secondary_manager_name && (
            <span style={{
              fontSize: 10, color: '#d97706', background: '#fef3c7',
              border: '1px solid #fcd34d', padding: '2px 7px', borderRadius: 8, fontWeight: 700,
            }}>
              Dotted line
            </span>
          )}
        </div>

        {hasChildren && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, marginLeft: 4 }}>
            <span style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {node.children.length} direct
            </span>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: collapsed ? 'var(--primary-color, #C2071A)' : `${lm.color}15`,
              border: `1px solid ${lm.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}>
              {collapsed ? (
                <FiChevronRight size={14} color="#fff" />
              ) : (
                <FiChevronDown size={14} color={lm.color} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && !collapsed && (
        <div style={{ position: 'relative', marginTop: 2 }}>
          <div style={{
            position: 'absolute', left: 8, top: 0, bottom: 10,
            width: 2, background: 'linear-gradient(to bottom,#fca5a5,#EFF3F8)', borderRadius: 1,
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

function MatrixRow({ emp, index }) {
  const lm = getLevelMeta(emp.level_code)
  const base = index % 2 === 0 ? '#ffffff' : '#f8fafc'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '110px 1fr 130px 58px 150px 160px 160px',
      gap: 12, padding: '12px 18px', alignItems: 'center',
      background: base,
      border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${lm.color}`,
      borderRadius: 12, marginBottom: 6,
      transition: 'all 0.15s ease',
      fontFamily: "'Inter', sans-serif",
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#fef0f2'
        e.currentTarget.style.borderColor = 'var(--primary-color, #C2071A)'
        e.currentTarget.style.transform = 'translateX(2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = base
        e.currentTarget.style.borderColor = '#e2e8f0'
        e.currentTarget.style.borderLeftColor = lm.color
        e.currentTarget.style.transform = 'translateX(0)'
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)'
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
        {emp.employee_code}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar first={emp.first_name} last={emp.last_name} size={32} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
          {emp.first_name} {emp.last_name}
        </span>
      </div>
      <span style={{ fontSize: 12.5, color: '#4b5563' }}>{emp.department_name || '—'}</span>
      <div><LevelBadge level={emp.level_code} /></div>
      <span style={{ fontSize: 12.5, color: '#4b5563' }}>{emp.designation || '—'}</span>
      {emp.manager_name?.trim() ? (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#C2071A' }}>{emp.manager_name}</div>
          <div style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>{emp.manager_code}</div>
        </div>
      ) : <span style={{ fontSize: 12.5, color: '#cbd5e1' }}>— None —</span>}
      {emp.secondary_manager_name?.trim() ? (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#d97706' }}>{emp.secondary_manager_name}</div>
          <div style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>{emp.secondary_manager_code} · dotted</div>
        </div>
      ) : <span style={{ fontSize: 12.5, color: '#cbd5e1' }}>— None —</span>}
    </div>
  )
}

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

  // Metric Cards exact replica of reference image:
  // Icon container matches exact Figma rounded square container with soft grey fill #f4f5f7 and FiUser grey icon
  const STAT_CARDS = [
    {
      title: 'Total Employees',
      value: employees.length,
      icon: FiUser,
      badgeText: '12%',
      badgeType: 'up',
      badgeBg: '#e6f7ed',
      badgeColor: '#10b981',
      subtext: `0 Inactive · ${departments.length} depts`,
      subtext2: '0 goals/employee avg'
    },
    {
      title: 'Reporting Managers',
      value: totalManagers,
      icon: FiUser,
      badgeText: '0%',
      badgeType: 'neutral',
      badgeBg: '#eff3f8',
      badgeColor: '#64748b',
      subtext: 'Primary hierarchy leaders',
      subtext2: 'Active managers'
    },
    {
      title: 'Dotted-line Matrix',
      value: withDotted,
      icon: FiShare2,
      badgeText: '0%',
      badgeType: 'neutral',
      badgeBg: '#eff3f8',
      badgeColor: '#64748b',
      subtext: 'Secondary assignments',
      subtext2: 'Cross-functional teams'
    },
    {
      title: 'Active Departments',
      value: departments.length,
      icon: FiFolder,
      badgeText: '0%',
      badgeType: 'neutral',
      badgeBg: '#eff3f8',
      badgeColor: '#64748b',
      subtext: 'Organizational units',
      subtext2: 'Mapped levels'
    },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f7fa', fontFamily: "'Inter', sans-serif" }}>
      <ClientAdminSidebar active="org-chart" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ClientAdminTopBar title="Org Chart & Hierarchy" />
        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', background: '#f3f7fa' }}>

        {/* ── Page Header Banner ── */}
        <PageHeader
          icon={FiMap}
          title="Org Chart & Manager Matrix"
          subtitle="Visualize reporting hierarchy and cross-functional manager assignments"
        />

        {/* ── Exact Replica Cards Matching User Image ── */}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {STAT_CARDS.map(card => {
              const CardIcon = card.icon
              return (
                <div
                  key={card.title}
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
                  {/* Top Row: Icon + Trend Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{
                      width: 28, height: 28,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#C2071A',
                    }}>
                      <CardIcon size={24} style={{ color: '#C2071A', stroke: '#C2071A' }} strokeWidth={1.75} />
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
                    {card.title}
                  </div>

                  {/* Footer Subtexts matching attached image */}
                  <div style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 500, lineHeight: 1.4 }}>
                    <div>{card.subtext}</div>
                    {card.subtext2 && <div style={{ marginTop: 2 }}>{card.subtext2}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Main Container (Tabs + Filters + Content) ── */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #EFF3F8', padding: '0 24px', background: '#ffffff' }}>
            {[
              { id: 'tree',   label: 'Tree View',   icon: FiShare2 },
              { id: 'matrix', label: 'Matrix View', icon: FiGrid },
            ].map(t => {
              const TabIcon = t.icon
              const isActive = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '14px 20px', background: 'none', border: 'none',
                    borderBottom: isActive ? '3px solid var(--primary-color, #C2071A)' : '3px solid transparent',
                    cursor: 'pointer', fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--primary-color, #C2071A)' : '#64748b',
                    fontFamily: 'inherit', marginBottom: -1,
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <TabIcon size={15} color={isActive ? 'var(--primary-color, #C2071A)' : '#64748b'} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Filters */}
          <div style={{
            display: 'flex', gap: 12, padding: '14px 24px',
            alignItems: 'center', flexWrap: 'wrap',
            borderBottom: '1px solid #f1f5f9', background: '#f8fafc'
          }}>
            <div style={{ position: 'relative' }}>
              <FiSearch size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                placeholder="Search name, code, designation…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  paddingLeft: 34, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
                  background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 9,
                  color: '#111827', fontSize: 13, outline: 'none', width: 260,
                  fontFamily: 'inherit', transition: 'border-color 0.15s ease',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary-color, #C2071A)'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              style={{
                padding: '8px 14px', background: '#ffffff',
                border: '1px solid #e2e8f0', borderRadius: 9,
                color: '#111827', fontSize: 13, outline: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary-color, #C2071A)'}
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
                  padding: '8px 14px', background: 'none',
                  border: '1px solid #e2e8f0', borderRadius: 9,
                  cursor: 'pointer', fontSize: 12, color: '#64748b',
                  fontFamily: 'inherit', transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#fee2e2'
                  e.currentTarget.style.borderColor = '#fca5a5'
                  e.currentTarget.style.color = '#dc2626'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.color = '#64748b'
                }}
              >
                <FiX size={13} /> Clear
              </button>
            )}
            <span style={{
              marginLeft: 'auto', fontSize: 11.5, color: '#4b5563', fontWeight: 600,
              background: '#ffffff', padding: '5px 12px', borderRadius: 20,
              border: '1px solid #e2e8f0',
            }}>
              {filtered.length} / {employees.length} employees
            </span>
          </div>

          {/* Content Area */}
          <div style={{ padding: '24px' }}>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <style>{`@keyframes oc-spin{to{transform:rotate(360deg)}}`}</style>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: '3px solid #e2e8f0', borderTopColor: 'var(--primary-color, #C2071A)',
                  animation: 'oc-spin 0.75s linear infinite',
                  margin: '0 auto 16px',
                }} />
                <div style={{ fontSize: 13.5, color: '#64748b', fontWeight: 500 }}>Loading organizational hierarchy…</div>
              </div>

            ) : error ? (
              <div style={{
                textAlign: 'center', padding: '36px 20px', background: '#feecee',
                borderRadius: 12, border: '1px solid #f7a6af',
              }}>
                <FiAlertTriangle size={32} color="#dc2626" style={{ marginBottom: 8 }} />
                <div style={{ color: '#dc2626', fontSize: 14, fontWeight: 700 }}>{error}</div>
              </div>

            ) : employees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <FiUsers size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No employees found</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Add employees and assign managers to populate the org chart.</div>
              </div>

            ) : tab === 'tree' ? (

              /* ── Tree View ── */
              <div>
                {!hasMatrix && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px', marginBottom: 20,
                    background: '#fffbeb', border: '1px solid #fcd34d',
                    borderRadius: 10, fontSize: 12.5, color: '#92400e', fontWeight: 600,
                  }}>
                    <FiInfo size={16} color="#d97706" style={{ flexShrink: 0 }} />
                    No dotted-line (secondary) managers assigned yet. Edit employees to configure matrix relationships.
                  </div>
                )}

                {roots.length === 0 ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: 40, fontSize: 13.5 }}>
                    No employees match your search criteria.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {roots.map(root => <TreeNode key={root.employee_id} node={root} depth={0} />)}
                  </div>
                )}

                {/* Legend */}
                <div style={{
                  marginTop: 28, display: 'flex', gap: 20, flexWrap: 'wrap',
                  padding: '12px 16px', background: '#f8fafc', borderRadius: 10,
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#4b5563', fontWeight: 600 }}>
                    <div style={{ width: 16, height: 2.5, background: 'linear-gradient(to right,#fca5a5,#C2071A)', borderRadius: 2 }} />
                    Primary reporting line (solid)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#4b5563', fontWeight: 600 }}>
                    <FiMoreHorizontal size={14} color="#d97706" />
                    Secondary / dotted-line manager
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#4b5563', fontWeight: 600 }}>
                    <FiChevronRight size={14} color="var(--primary-color, #C2071A)" />
                    Click arrow to expand / collapse direct reports
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
                    fontSize: 10.5, fontWeight: 800, letterSpacing: '0.07em',
                    textTransform: 'uppercase', color: '#94a3b8',
                    borderBottom: '2px solid #e2e8f0', marginBottom: 12,
                  }}>
                    <span>Code</span>
                    <span>Employee</span>
                    <span>Department</span>
                    <span>Lvl</span>
                    <span>Designation</span>
                    <span style={{ color: '#C2071A' }}>Primary Mgr</span>
                    <span style={{ color: '#d97706' }}>Secondary (Dotted)</span>
                  </div>
                )}

                {filtered.length === 0 ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: 40, fontSize: 13.5 }}>
                    No employees match your search criteria.
                  </div>
                ) : (
                  filtered.map((emp, i) => <MatrixRow key={emp.employee_id} emp={emp} index={i} />)
                )}

                {/* Legend */}
                <div style={{
                  marginTop: 20, display: 'flex', gap: 20, padding: '12px 16px',
                  background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#4b5563', fontWeight: 600 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: '#FEECEE', border: '1px solid #C2071A' }} />
                    Primary / solid-line manager
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#4b5563', fontWeight: 600 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: '#fef3c7', border: '1px solid #d97706' }} />
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

