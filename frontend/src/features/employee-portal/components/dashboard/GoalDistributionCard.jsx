import React from 'react'
import { FiPieChart } from 'react-icons/fi'
import { DonutChart } from '../shared/Charts'
import { WidgetCard, ViewAllLink } from '../shared/UI'
import { COLORS } from '../../theme'

const BANDS = [
  { key: 'notStarted', label: 'Not Started', range: [0, 0],     color: COLORS.slate  },
  { key: 'inProgress', label: 'In Progress', range: [1, 99],    color: COLORS.amber  },
  { key: 'completed',  label: 'Completed',   range: [100, 100], color: COLORS.green  },
]

export default function GoalDistributionCard({ goals, completionPct, onViewAll }) {
  const segments = BANDS.map(band => ({
    ...band,
    count: goals.filter(g => {
      const p = Number(g.progress) || 0
      return p >= band.range[0] && p <= band.range[1]
    }).length,
  }))

  return (
    <WidgetCard
      icon={<FiPieChart size={14} />}
      iconBg="rgba(194,7,26,0.1)"
      iconColor={COLORS.primary}
      title="Progress Distribution"
      subtitle="Goals by completion level"
      action={onViewAll && <ViewAllLink onClick={onViewAll} />}
    >
      {goals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '18px 0 4px' }}>
          <div style={{ width: 110, height: 110, borderRadius: '50%', border: `10px solid #f1f5f9`, margin: '0 auto 14px' }} />
          <div style={{ fontSize: '12px', color: COLORS.textMuted, fontWeight: '600' }}>No goals yet</div>
          <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '2px' }}>Set your goals to see progress here</div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
            <DonutChart
              size={110}
              strokeWidth={13}
              segments={segments.map(s => ({ value: s.count, color: s.color }))}
            />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.text, lineHeight: 1 }}>{completionPct}%</div>
              <div style={{ fontSize: '9px', color: COLORS.textMuted, marginTop: '3px', textAlign: 'center' }}>Completion<br />Rate</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: 0 }}>
            {segments.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: COLORS.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: s.color, flexShrink: 0 }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  )
}
