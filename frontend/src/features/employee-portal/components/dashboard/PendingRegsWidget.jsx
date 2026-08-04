import React from 'react'
import { EditReqIcon, CalIcon } from '../shared/Icons'
import { WidgetCard, EmptyState } from '../shared/UI'
import { COLORS } from '../../theme'

export default function PendingRegsWidget({ regs }) {
  return (
    <WidgetCard
      icon={<EditReqIcon />}
      iconBg="rgba(99,102,241,0.1)"
      iconColor={COLORS.primary}
      title="Regularization Requests"
      subtitle="Attendance corrections"
    >
      {regs.length === 0 ? (
        <EmptyState message="No pending regularizations" positive />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {regs.map((r, idx) => {
            const rDate = new Date(r.date || r.attendance_date)
            return (
              <div key={r.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < regs.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reason || r.regularization_type || 'Regularization'}</div>
                  <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CalIcon />{rDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '700', color: COLORS.primary, background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: '10px', whiteSpace: 'nowrap', marginLeft: '8px' }}>Pending</span>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}
