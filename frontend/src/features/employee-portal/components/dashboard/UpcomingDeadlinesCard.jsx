import React from 'react'
import { CalIcon } from '../shared/Icons'
import { COLORS } from '../../theme'

export default function UpcomingDeadlinesCard({ goals }) {
  return (
    <div style={{ background: COLORS.surface, borderRadius: '18px', padding: '20px 22px', border: `1px solid ${COLORS.borderLight}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', flex: 1 }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text, marginBottom: '2px' }}>Upcoming Deadlines</div>
      <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '12px' }}>Next 30 days</div>

      {goals.length === 0 ? (
        <div style={{ textAlign: 'center', color: COLORS.green, fontSize: '12px', padding: '12px 0', fontWeight: '600' }}>✅ No upcoming deadlines</div>
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
    </div>
  )
}
