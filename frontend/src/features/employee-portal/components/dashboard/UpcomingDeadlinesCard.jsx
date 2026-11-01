import React from 'react'
import { FiFlag } from 'react-icons/fi'
import { PmsCard, CardHeader, HeaderChip, BigStat, EmptyBox, ListRow, daysUntil, dayLabel } from '../shared/PmsUI'

export default function UpcomingDeadlinesCard({ goals, onViewAll }) {
  const n = goals.length
  return (
    <PmsCard>
      <CardHeader title="Upcoming Deadlines" chip={<HeaderChip onClick={onViewAll} title="Open performance hub" />} />
      <BigStat value={n} pill="Next 30 days" caption={n === 0 ? "You're all caught up!" : `${n} goal${n === 1 ? '' : 's'} due soon`} />
      <div style={{ marginTop: 'auto', paddingTop: '14px' }}>
        {n === 0 ? (
          <EmptyBox icon={<FiFlag size={14} />} title="No upcoming deadlines" />
        ) : goals.slice(0, 3).map((g, i, arr) => {
          const d = daysUntil(g.due_date)
          return (
            <ListRow
              key={g.goal_id || g.id || i}
              title={g.title}
              sub={new Date(g.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              right={dayLabel(d)}
              rightTone={d != null && d <= 3 ? 'blue' : 'grey'}
              last={i === arr.length - 1}
              onClick={onViewAll}
            />
          )
        })}
      </div>
    </PmsCard>
  )
}
