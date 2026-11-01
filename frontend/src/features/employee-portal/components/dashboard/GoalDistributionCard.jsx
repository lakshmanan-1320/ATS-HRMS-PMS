import React from 'react'
import { FiPieChart } from 'react-icons/fi'
import { PMS } from '../../theme'
import { PmsCard, CardHeader, HeaderChip, BigStat, T } from '../shared/PmsUI'

const TICKS = 20

/** "Progress Distribution" card: average goal progress plus completion-rate ticks. */
export default function GoalDistributionCard({ goals, avgProgress, completionPct, onViewAll }) {
  const total = goals.length
  const notStarted = goals.filter(g => ['draft', 'not_started'].includes(g.status) || (Number(g.progress) || 0) === 0).length
  const inProgress = goals.filter(g => ['active', 'in_progress'].includes(g.status) && (Number(g.progress) || 0) > 0).length
  const filled = Math.round(completionPct / (100 / TICKS))

  return (
    <PmsCard>
      <CardHeader
        title="Progress Distribution"
        chip={<HeaderChip icon={<FiPieChart size={14} />} onClick={onViewAll} title="Open performance hub" />}
      />
      <BigStat
        value={`${avgProgress}%`}
        pill={total === 0 ? 'No goals yet' : `${total} goal${total === 1 ? '' : 's'}`}
        caption={total === 0 ? 'Set your goals to see progress here.' : `${inProgress} in progress · ${notStarted} not started`}
      />
      <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...T.small }}>
          <span>Completion rate</span>
          <strong style={{ color: PMS.blue, fontWeight: 700 }}>{completionPct}% of target</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '3px', marginTop: '9px' }} aria-label={`Completion ${completionPct}%`}>
          {Array.from({ length: TICKS }).map((_, i) => (
            <span key={i} style={{ flex: 1, maxWidth: '10.65px', height: '22px', borderRadius: '4px', background: i < filled ? PMS.gradBlueVert : PMS.border }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '9px', ...T.small }}>
          <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
        </div>
      </div>
    </PmsCard>
  )
}
