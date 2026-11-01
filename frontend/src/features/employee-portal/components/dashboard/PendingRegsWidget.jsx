import React from 'react'
import { FiEdit2 } from 'react-icons/fi'
import { PmsCard, CardHeader, HeaderChip, BigStat, EmptyBox, ListRow } from '../shared/PmsUI'

export default function PendingRegsWidget({ regs, total, onViewAll }) {
  const n = total ?? regs.length
  return (
    <PmsCard>
      <CardHeader title="Regularization Requests" chip={<HeaderChip onClick={onViewAll} title="Open regularization requests" />} />
      <BigStat value={n} pill="Corrections" caption={n === 0 ? 'All clear!' : `${n} correction${n === 1 ? '' : 's'} pending`} />
      <div style={{ marginTop: 'auto', paddingTop: '14px' }}>
        {regs.length === 0 ? (
          <EmptyBox icon={<FiEdit2 size={13} />} title="No pending regularizations" />
        ) : regs.slice(0, 3).map((r, i, arr) => (
          <ListRow
            key={r.id || i}
            title={r.reason || r.regularization_type || 'Regularization'}
            sub={new Date(r.date || r.attendance_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            right="Pending"
            last={i === arr.length - 1}
          />
        ))}
      </div>
    </PmsCard>
  )
}
