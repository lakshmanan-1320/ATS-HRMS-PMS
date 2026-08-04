import React from 'react'
import { CakeIcon } from '../shared/Icons'
import { WidgetCard, EmptyState } from '../shared/UI'
import { COLORS } from '../../theme'

export default function BirthdaysWidget({ birthdays }) {
  const now = new Date()
  return (
    <WidgetCard
      icon={<CakeIcon />}
      iconBg="rgba(236,72,153,0.1)"
      iconColor={COLORS.pink}
      title="Upcoming Birthdays"
      subtitle="Next 30 days"
    >
      {birthdays.length === 0 ? (
        <EmptyState message="No birthdays this month" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {birthdays.map((m, idx) => {
            const dob  = new Date(m.date_of_birth)
            const bday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
            if (bday < now) bday.setFullYear(now.getFullYear() + 1)
            const dLeft = Math.ceil((bday - now) / 864e5)
            return (
              <div key={m.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < birthdays.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(236,72,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>👤</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.first_name} {m.last_name}</div>
                    <div style={{ fontSize: '10px', color: COLORS.textMuted }}>{bday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '700', color: dLeft === 0 ? COLORS.pink : COLORS.textMuted, background: dLeft === 0 ? 'rgba(236,72,153,0.1)' : '#f8fafc', padding: '2px 7px', borderRadius: '10px', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                  {dLeft === 0 ? '🎂 Today' : `${dLeft}d`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}
