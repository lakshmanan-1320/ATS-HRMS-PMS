import React from 'react'
import { FiUsers } from 'react-icons/fi'
import { PmsCard, CardHeader, HeaderChip, BigStat, EmptyBox, ListRow } from '../shared/PmsUI'

function fmtTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d) ? v : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const STATUS_LABEL = { present: 'Present', absent: 'Absent', on_leave: 'On Leave' }

export default function TeamAttendanceWidget({ members, onViewAll, className }) {
  const statusOf = m => m.today_status || m.attendance_status || 'unknown'
  const present = members.filter(m => statusOf(m) === 'present').length
  const absent = members.filter(m => statusOf(m) === 'absent').length
  return (
    <PmsCard className={className}>
      <CardHeader title="Team Attendance" chip={<HeaderChip onClick={onViewAll} title="Open team attendance" />} />
      <BigStat value={present} pill="Today's status" caption={members.length ? `${present} present · ${absent} absent of ${members.length}` : 'No team data available'} />
      <div style={{ marginTop: 'auto', paddingTop: '14px' }}>
        {members.length === 0 ? (
          <EmptyBox icon={<FiUsers size={14} />} title="No team data available" />
        ) : members.map((m, i, arr) => {
          const key = statusOf(m)
          return (
            <ListRow
              key={m.id || i}
              title={`${m.first_name || ''} ${m.last_name || ''}`.trim()}
              sub={`In ${fmtTime(m.check_in_time || m.checkInTime || m.today_check_in)} · Out ${fmtTime(m.check_out_time || m.checkOutTime || m.today_check_out)}`}
              right={STATUS_LABEL[key] || 'Unknown'}
              rightTone={key === 'present' ? 'blue' : 'grey'}
              last={i === arr.length - 1}
            />
          )
        })}
      </div>
    </PmsCard>
  )
}
