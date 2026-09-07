import React from 'react'
import { SunIcon, CalIcon } from '../shared/Icons'
import { WidgetCard, EmptyState, ViewAllLink } from '../shared/UI'
import { COLORS } from '../../theme'

export default function HolidaysWidget({ holidays, onViewAll }) {
  const now = new Date()
  return (
    <WidgetCard
      icon={<SunIcon />}
      iconBg="rgba(16,185,129,0.1)"
      iconColor={COLORS.green}
      title="Upcoming Holidays"
      subtitle="Next in calendar"
      action={onViewAll && <ViewAllLink onClick={onViewAll} />}
    >
      {holidays.length === 0 ? (
        <EmptyState message="No upcoming holidays" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {holidays.map((h, idx) => {
            const hDate = new Date(h.date || h.holiday_date)
            const dLeft = Math.ceil((hDate - now) / 864e5)
            const color = dLeft === 0 ? COLORS.green : dLeft <= 7 ? COLORS.amber : COLORS.primary
            const bg    = dLeft === 0 ? 'rgba(16,185,129,0.1)' : dLeft <= 7 ? 'rgba(245,158,11,0.1)' : 'rgba(194,7,26,0.1)'
            return (
              <div key={h.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < holidays.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name || h.holiday_name}</div>
                  <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CalIcon />{hDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '700', color, background: bg, padding: '2px 7px', borderRadius: '10px', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                  {dLeft === 0 ? 'Today' : dLeft === 1 ? 'Tmrw' : `${dLeft}d`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}
