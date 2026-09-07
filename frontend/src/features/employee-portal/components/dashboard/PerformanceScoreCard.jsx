import React from 'react'
import { FiTrendingUp } from 'react-icons/fi'
import { MiniRing } from '../shared/Charts'
import { WidgetCard, ViewAllLink } from '../shared/UI'
import { COLORS } from '../../theme'

export default function PerformanceScoreCard({ avgProgress, completionPct, totalGoals, completedGoals, onTrack, onViewAll }) {
  const behind = Math.max(0, totalGoals - completedGoals - onTrack)
  return (
    <WidgetCard
      icon={<FiTrendingUp size={14} />}
      iconBg="rgba(194,7,26,0.1)"
      iconColor={COLORS.primary}
      title="Performance Score"
      subtitle="Goal progress analytics"
      action={onViewAll && <ViewAllLink onClick={onViewAll} />}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <MiniRing pct={avgProgress} size={60} color={COLORS.primary} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', color: COLORS.textMuted, marginBottom: '4px' }}>Completion Rate</div>
          <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', marginBottom: '5px' }}>
            <div style={{ height: '100%', width: `${completionPct}%`, background: 'linear-gradient(to right, #D01021, #B40619)', borderRadius: '3px', transition: 'width 0.8s' }} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.primary }}>{completionPct}%</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
        <div style={{ flex: 1, background: 'rgba(16,185,129,0.08)', borderRadius: '9px', padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: COLORS.green }}>{onTrack}</div>
          <div style={{ fontSize: '9px', color: COLORS.textSub, marginTop: '2px' }}>On Track</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(245,158,11,0.08)', borderRadius: '9px', padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: COLORS.amber }}>{behind}</div>
          <div style={{ fontSize: '9px', color: COLORS.textSub, marginTop: '2px' }}>Behind</div>
        </div>
      </div>
    </WidgetCard>
  )
}
