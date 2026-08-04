import React from 'react'
import { FiBarChart2, FiPieChart, FiTarget, FiEdit3, FiCheckCircle } from 'react-icons/fi'

export default function GoalProgressSummary({
  totalWeight, remainingWeight,
  goalCount, maxGoals, draftCount
}) {
  const cards = [
    {
      label: 'Goal Weight',
      value: `${totalWeight}%`,
      sub: `of 100%`,
      color: totalWeight > 100 ? '#dc2626' : totalWeight === 100 ? '#16a34a' : '#2563eb',
      bg: totalWeight > 100 ? 'rgba(220,38,38,0.06)' : 'rgba(37,99,235,0.06)',
      icon: FiBarChart2,
    },
    {
      label: 'Remaining',
      value: `${remainingWeight}%`,
      sub: remainingWeight === 0 ? 'Fully allocated' : 'Available',
      color: remainingWeight === 0 ? '#16a34a' : '#ea580c',
      bg: remainingWeight === 0 ? 'rgba(22,163,74,0.06)' : 'rgba(234,88,12,0.06)',
      icon: FiPieChart,
    },
    {
      label: 'Goals',
      value: `${goalCount} / ${maxGoals}`,
      sub: goalCount >= maxGoals ? 'Limit reached' : 'Available',
      color: goalCount >= maxGoals ? '#dc2626' : '#0891b2',
      bg: goalCount >= maxGoals ? 'rgba(220,38,38,0.06)' : 'rgba(8,145,178,0.06)',
      icon: FiTarget,
    },
    {
      label: 'Status',
      value: draftCount > 0 ? 'Draft' : 'Submitted',
      sub: draftCount > 0 ? `${draftCount} draft goal${draftCount > 1 ? 's' : ''}` : 'All submitted',
      color: draftCount > 0 ? '#64748b' : '#16a34a',
      bg: draftCount > 0 ? 'rgba(100,116,139,0.06)' : 'rgba(22,163,74,0.06)',
      icon: draftCount > 0 ? FiEdit3 : FiCheckCircle,
    },
  ]

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14,
      marginBottom: 24,
    }}>
      {cards.map((c, i) => {
        const IconComp = c.icon
        return (
          <div key={i} style={{
            background: '#ffffff', borderRadius: 12, padding: '16px 18px',
            border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{
              position: 'absolute', top: -8, right: -8,
              width: 48, height: 48, borderRadius: '50%',
              background: c.bg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', opacity: 0.7,
            }}><IconComp size={18} color={c.color} /></div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.color, lineHeight: 1.2 }}>{c.value}</div>
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{c.sub}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
