import React from 'react'
import { FiGift } from 'react-icons/fi'
import { PmsCard, CardHeader, HeaderChip, BigStat, EmptyBox, ListRow, dayLabel } from '../shared/PmsUI'

function nextBirthday(dobStr, now) {
  const dob = new Date(dobStr)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const bday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
  if (bday < today) bday.setFullYear(now.getFullYear() + 1)
  return { date: bday, days: Math.round((bday - today) / 864e5) }
}

export default function BirthdaysWidget({ birthdays }) {
  const now = new Date()
  const n = birthdays.length
  const first = n ? nextBirthday(birthdays[0].date_of_birth, now) : null
  return (
    <PmsCard>
      <CardHeader title="Upcoming Birthdays" chip={<HeaderChip icon={<FiGift size={14} />} />} />
      <BigStat
        value={n}
        pill="Next 30 days"
        caption={n === 0 ? "Let's celebrate soon!" : `${birthdays[0].first_name} · ${dayLabel(first.days)}`}
      />
      <div style={{ marginTop: 'auto', paddingTop: '14px' }}>
        {n === 0 ? (
          <EmptyBox icon={<FiGift size={14} />} title="No birthdays this month" />
        ) : birthdays.slice(0, 3).map((m, i, arr) => {
          const { date, days } = nextBirthday(m.date_of_birth, now)
          return (
            <ListRow
              key={m.id || i}
              title={`${m.first_name || ''} ${m.last_name || ''}`.trim()}
              sub={date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              right={dayLabel(days)}
              rightTone={days === 0 ? 'blue' : 'grey'}
              last={i === arr.length - 1}
            />
          )
        })}
      </div>
    </PmsCard>
  )
}
