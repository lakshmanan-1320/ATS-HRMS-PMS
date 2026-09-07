import React from 'react'
import { TeamAttIcon } from '../shared/Icons'
import { WidgetCard, EmptyState } from '../shared/UI'
import { COLORS } from '../../theme'

function fmtTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d) ? v : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const STATUS_MAP = {
  present:  { color: COLORS.green,  label: 'Present'  },
  absent:   { color: COLORS.red,    label: 'Absent'   },
  on_leave: { color: COLORS.amber,  label: 'On Leave' },
}

export default function TeamAttendanceWidget({ members }) {
  return (
    <WidgetCard
      icon={<TeamAttIcon />}
      iconBg="rgba(15,118,110,0.1)"
      iconColor={COLORS.blue}
      title="Team Attendance"
      subtitle="Today's status"
    >
      {members.length === 0 ? (
        <EmptyState message="No team data available" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {members.map((m, idx) => {
            const statusKey    = m.today_status || m.attendance_status || 'unknown'
            const { color, label } = STATUS_MAP[statusKey] || { color: COLORS.textMuted, label: 'Unknown' }
            const checkIn  = fmtTime(m.check_in_time  || m.checkInTime  || m.today_check_in)
            const checkOut = fmtTime(m.check_out_time || m.checkOutTime || m.today_check_out)
            return (
              <div key={m.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < members.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.first_name} {m.last_name}</div>
                    <div style={{ fontSize: '10px', color: COLORS.textMuted, display: 'flex', gap: '6px', marginTop: '1px', flexWrap: 'wrap' }}>
                      <span>In: <span style={{ fontWeight: '600', color: COLORS.green }}>{checkIn}</span></span>
                      <span>Out: <span style={{ fontWeight: '600', color: COLORS.red }}>{checkOut}</span></span>
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '600', color, background: `${color}15`, padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap', marginLeft: '8px' }}>{label}</span>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}
