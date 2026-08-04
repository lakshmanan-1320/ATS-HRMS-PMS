import React from 'react'
import { FiTarget, FiEdit3, FiClock, FiRefreshCw, FiZap, FiLoader, FiCheckCircle, FiXCircle } from 'react-icons/fi'

const STATUS_CARDS = [
  { key: 'total',             label: 'Total Goals',        color: '#6366f1', icon: FiTarget,       bg: 'rgba(99,102,241,0.07)' },
  { key: 'draft',             label: 'Draft',              color: '#64748b', icon: FiEdit3,        bg: 'rgba(100,116,139,0.07)' },
  { key: 'pending_approval',  label: 'Pending Approval',   color: '#ea580c', icon: FiClock,        bg: 'rgba(234,88,12,0.07)' },
  { key: 'changes_requested', label: 'Changes Requested',  color: '#7c3aed', icon: FiRefreshCw,   bg: 'rgba(124,58,237,0.07)' },
  { key: 'active',            label: 'Active',             color: '#2563eb', icon: FiZap,          bg: 'rgba(37,99,235,0.07)' },
  { key: 'in_progress',       label: 'In Progress',        color: '#0891b2', icon: FiLoader,       bg: 'rgba(8,145,178,0.07)' },
  { key: 'completed',         label: 'Completed',          color: '#16a34a', icon: FiCheckCircle,  bg: 'rgba(22,163,74,0.07)' },
  { key: 'rejected',          label: 'Rejected',           color: '#dc2626', icon: FiXCircle,      bg: 'rgba(220,38,38,0.07)' },
]

export default function GoalDashboardCards({ summary = {}, role }) {
  const total = summary.total || 0

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 1fr)',
      gap: 12,
      marginBottom: 24,
    }}>
      {STATUS_CARDS.map(s => {
        const count = summary[s.key] || 0
        const IconComp = s.icon
        return (
          <div key={s.key} style={{
            background: '#ffffff', borderRadius: 12, padding: '16px 14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
            cursor: 'pointer',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.07)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: 40, height: 40, background: s.bg,
              borderRadius: '0 12px 0 40px',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
              padding: '6px 8px', fontSize: 14,
            }}><IconComp size={15} color={s.color} /></div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{count}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{s.label}</div>
            {total > 0 && (
              <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round((count / total) * 100)}%`,
                  background: s.color, borderRadius: 2,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
