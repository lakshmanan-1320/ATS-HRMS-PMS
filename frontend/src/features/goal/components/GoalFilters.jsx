import React from 'react'

const selSt = {
  padding: '9px 12px', borderRadius: 8, fontSize: 13,
  background: '#ffffff', border: '1px solid #e2e8f0',
  color: '#1e293b', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 0.15s ease',
}

const STATUSES = [
  { value: 'DRAFT',             label: 'Draft' },
  { value: 'PENDING_APPROVAL',  label: 'Pending Approval' },
  { value: 'CHANGES_REQUESTED', label: 'Changes Requested' },
  { value: 'ACTIVE',            label: 'Active' },
  { value: 'IN_PROGRESS',       label: 'In Progress' },
  { value: 'COMPLETED',         label: 'Completed' },
  { value: 'REJECTED',          label: 'Rejected' },
]



export default function GoalFilters({ filters, onFilterChange, onReset, employees = [], departments = [], resultCount = 0, priorities = [], categories = [] }) {
  const hasFilters = filters.search || filters.status || filters.priority || filters.category ||
    filters.goal_type || filters.employee_id || filters.department_id

  return (
    <div style={{
      background: '#ffffff', borderRadius: 12, padding: '14px 18px',
      border: '1px solid #e2e8f0', marginBottom: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
    }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: '1 1 200px' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#94a3b8', fontSize: 14, pointerEvents: 'none',
        }}>🔍</span>
        <input
          value={filters.search}
          onChange={e => onFilterChange({ search: e.target.value })}
          placeholder="Search goals…"
          style={{ ...selSt, paddingLeft: 36, width: '100%' }}
        />
      </div>

      {/* Status */}
      <select value={filters.status} onChange={e => onFilterChange({ status: e.target.value })} style={{ ...selSt, width: 155 }}>
        <option value="">All Statuses</option>
        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      {/* Priority */}
      <select value={filters.priority} onChange={e => onFilterChange({ priority: e.target.value })} style={{ ...selSt, width: 130 }}>
        <option value="">All Priorities</option>
        {priorities.map(p => <option key={p.priority_id || p.code} value={p.code}>{p.name}</option>)}
      </select>

      {/* Category */}
      <select value={filters.category} onChange={e => onFilterChange({ category: e.target.value })} style={{ ...selSt, width: 165 }}>
        <option value="">All Categories</option>
        {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
      </select>

      {/* Clear */}
      {hasFilters && (
        <button onClick={onReset} style={{
          padding: '9px 14px', borderRadius: 8, border: '1px solid #fca5a5',
          background: '#fff5f5', color: '#dc2626', fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
          transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff5f5'}
        >✕ Clear</button>
      )}

      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {resultCount} result{resultCount !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
