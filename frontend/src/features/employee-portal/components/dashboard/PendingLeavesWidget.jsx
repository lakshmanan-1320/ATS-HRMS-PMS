import React from 'react'
import { ClipboardIcon, CalIcon } from '../shared/Icons'
import { WidgetCard, EmptyState, ViewAllLink } from '../shared/UI'
import { COLORS } from '../../theme'

export default function PendingLeavesWidget({ leaves, onViewAll }) {
  return (
    <WidgetCard
      icon={<ClipboardIcon />}
      iconBg="rgba(245,158,11,0.1)"
      iconColor={COLORS.amber}
      title="Pending Leave Requests"
      subtitle="Awaiting approval"
      action={onViewAll && <ViewAllLink onClick={onViewAll} />}
    >
      {leaves.length === 0 ? (
        <EmptyState message="No pending leave requests" positive />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {leaves.map((l, idx) => {
            const from = new Date(l.from_date || l.start_date)
            const to   = new Date(l.to_date   || l.end_date)
            const days = l.no_of_days || l.days || Math.ceil((to - from) / 864e5) + 1
            return (
              <div key={l.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < leaves.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.leave_type_name || l.leave_type || 'Leave'}</div>
                  <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CalIcon />
                    {from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – {to.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '700', color: COLORS.amber, background: 'rgba(245,158,11,0.1)', padding: '2px 7px', borderRadius: '10px', whiteSpace: 'nowrap', marginLeft: '8px' }}>{days}d</span>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}
