import React from 'react'
import { FiCalendar } from 'react-icons/fi'
import { PmsCard, CardHeader, HeaderChip, BigStat, EmptyBox, ListRow } from '../shared/PmsUI'

const fmt = d => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

export default function PendingLeavesWidget({ leaves, total, onViewAll }) {
  const n = total ?? leaves.length
  return (
    <PmsCard>
      <CardHeader title="Pending Leave Requests" chip={<HeaderChip onClick={onViewAll} title="Open leave requests" />} />
      <BigStat value={n} pill="Awaiting approval" caption={n === 0 ? 'All clear!' : `${n} request${n === 1 ? '' : 's'} in review`} />
      <div style={{ marginTop: 'auto', paddingTop: '14px' }}>
        {leaves.length === 0 ? (
          <EmptyBox icon={<FiCalendar size={14} />} title="No pending leave requests" />
        ) : leaves.slice(0, 3).map((l, i, arr) => {
          const from = new Date(l.from_date || l.start_date)
          const to = new Date(l.to_date || l.end_date)
          const days = l.no_of_days || l.days || (Math.ceil((to - from) / 864e5) + 1)
          return (
            <ListRow
              key={l.id || i}
              title={l.leave_type_name || l.leave_type || 'Leave'}
              sub={`${fmt(from)} – ${fmt(to)}`}
              right={`${days}d`}
              last={i === arr.length - 1}
            />
          )
        })}
      </div>
    </PmsCard>
  )
}
