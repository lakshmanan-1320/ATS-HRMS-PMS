import React from 'react'
import { FiSun } from 'react-icons/fi'
import { PmsCard, CardHeader, HeaderChip, BigStat, EmptyBox, ListRow, daysUntil, dayLabel } from '../shared/PmsUI'

export default function HolidaysWidget({ holidays, onViewAll }) {
  const n = holidays.length
  const next = holidays[0]
  return (
    <PmsCard>
      <CardHeader title="Upcoming Holidays" chip={<HeaderChip onClick={onViewAll} title="Open holiday calendar" />} />
      <BigStat
        value={n}
        pill="Next in calendar"
        caption={n === 0 ? 'Enjoy your working days!' : `Next: ${next.name || next.holiday_name}`}
      />
      <div style={{ marginTop: 'auto', paddingTop: '14px' }}>
        {n === 0 ? (
          <EmptyBox icon={<FiSun size={14} />} title="No upcoming holidays" />
        ) : holidays.slice(0, 3).map((h, i, arr) => {
          const date = new Date(h.date || h.holiday_date)
          const d = daysUntil(date)
          return (
            <ListRow
              key={h.id || i}
              title={h.name || h.holiday_name}
              sub={date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              right={dayLabel(d)}
              rightTone={d != null && d <= 7 ? 'blue' : 'grey'}
              last={i === arr.length - 1}
            />
          )
        })}
      </div>
    </PmsCard>
  )
}
