import React from 'react'
import { FiCheckCircle, FiTarget } from 'react-icons/fi'
import { CalIcon } from '../shared/Icons'
import { WidgetCard, ViewAllLink } from '../shared/UI'
import { COLORS } from '../../theme'

export default function UpcomingDeadlinesCard({ goals, onViewAll }) {
  return (
    <WidgetCard
      icon={<FiTarget size={14} />}
      iconBg="rgba(194,7,26,0.1)"
      iconColor={COLORS.primary}
      title="Upcoming Deadlines"
      subtitle="Next 30 days"
      action={onViewAll && <ViewAllLink onClick={onViewAll} />}
    >
      {goals.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: COLORS.green, fontSize: '12px', padding: '12px 0', fontWeight: '600' }}><FiCheckCircle size={13} /> No upcoming deadlines</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {goals.map((goal, idx) => {
            const now = new Date()
            const dLeft = Math.ceil((new Date(goal.due_date) - now) / 864e5)
            const urg = dLeft <= 3 ? COLORS.red : dLeft <= 7 ? COLORS.amber : COLORS.textSub
            return (
              <div key={goal.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: idx < goals.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.title}</div>
                  <div style={{ fontSize: '9px', color: COLORS.textMuted, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CalIcon />{new Date(goal.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: urg, whiteSpace: 'nowrap', marginLeft: '8px', background: `${urg}12`, padding: '2px 7px', borderRadius: '10px' }}>
                  {dLeft === 0 ? 'Today' : dLeft === 1 ? 'Tmrw' : `${dLeft}d`}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}
