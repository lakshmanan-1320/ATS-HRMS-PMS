import React from 'react'
import { FiTarget } from 'react-icons/fi'
import { PMS } from '../../theme'
import { PmsCard, CardHeader, HeaderChip, BigStat, LegendDot, ListRow, EmptyBox, T } from '../shared/PmsUI'
import { FiUsers, FiSun } from 'react-icons/fi'

// ── Total Goals ──────────────────────────────────────────────────────────────
export function TotalGoalsCard({ total, completionPct, active, completed, pending, onTrack, behind }) {
  const filled = Math.round(completionPct / 20)
  return (
    <PmsCard>
      <CardHeader title="Total Goals" chip={<HeaderChip icon={<FiTarget size={14} />} />} />
      <BigStat
        value={total}
        caption={<><strong style={{ color: PMS.blue, fontWeight: 700 }}>{completionPct}%</strong> complete</>}
      />
      <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', ...T.small }}>
          <span>{total === 0 ? 'No goals set yet' : `${total} goal${total === 1 ? '' : 's'} set`}</span>
          <span style={{ whiteSpace: 'nowrap' }}>{active} active · {completed} completed</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', marginTop: '10px' }} aria-label={`${completionPct}% complete`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ height: '10px', borderRadius: '5px', background: i < filled ? PMS.gradBlue : PMS.border }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: '10px' }}>
          <LegendDot color="#0466C8" label="Active" value={active} />
          <LegendDot color="#0353A4" label="Completed" value={completed} />
          <LegendDot color="#979DAC" label="Pending" value={pending} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: '6px' }}>
          <LegendDot color="#33415C" label="On track" value={onTrack} />
          <LegendDot color="#001233" label="Behind" value={behind} />
        </div>
      </div>
    </PmsCard>
  )
}

// ── Pending Approval (leave / regularization / goals) ────────────────────────
function ApprovalTile({ value, label, highlight, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`View ${label.toLowerCase()} requests`}
      className="pms-hover-lift pms-focus"
      style={{
        height: highlight ? '112px' : '88px', alignSelf: 'end', minWidth: 0,
        borderRadius: '16px', padding: '0 12px 12px 14px', boxSizing: 'border-box',
        background: highlight ? PMS.gradBlue : PMS.surfaceAlt,
        border: highlight ? 'none' : `1px solid ${PMS.border}`,
        boxShadow: highlight ? PMS.shadowTile : 'none',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{ fontFamily: PMS.fontHead, fontSize: highlight ? '18.5px' : '16.5px', fontWeight: highlight ? 700 : 400, color: highlight ? PMS.white : PMS.navy, lineHeight: '28px' }}>{value}</span>
      <span style={{ fontFamily: PMS.fontHead, fontSize: '9.5px', color: highlight ? 'rgba(255,255,255,0.85)' : PMS.muted, lineHeight: '14px' }}>{label}</span>
    </button>
  )
}

export function PendingApprovalCard({
  leaves, regs, goals, showGoals, onOpen, onLeaves, onRegs, onGoals,
  title = 'Pending Approval', pill = 'Awaiting review',
  emptyCaption = 'Nothing waiting on your manager', captionSuffix = 'waiting on your manager',
}) {
  const total = leaves + regs + (showGoals ? goals : 0)
  return (
    <PmsCard>
      <CardHeader title={title} chip={<HeaderChip onClick={onOpen} title="View pending requests" />} />
      <BigStat
        value={total}
        pill={pill}
        caption={total === 0 ? emptyCaption : `${total} item${total === 1 ? '' : 's'} ${captionSuffix}`}
      />
      <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'grid', gridTemplateColumns: `repeat(${showGoals ? 3 : 2}, minmax(0, 1fr))`, gap: '7px', alignItems: 'end' }}>
        <ApprovalTile value={leaves} label="Leave" onClick={onLeaves} />
        <ApprovalTile value={regs} label="Regularize" highlight onClick={onRegs} />
        {showGoals && <ApprovalTile value={goals} label="Goals" onClick={onGoals} />}
      </div>
    </PmsCard>
  )
}

// ── Leave balance (shown in the KPI row when PMS is off) ────────────────────
export function LeaveBalanceCard({ balances, total, onOpen, className }) {
  const rows = balances.slice(0, 5).map(b => {
    const avail = Number(b.available_days ?? b.balance ?? b.remaining ?? 0)
    const cap = Number(b.total_days ?? b.allocated_days ?? b.entitled_days ?? b.opening_balance ?? 0)
    return { name: b.leave_type_name || b.leave_type || b.name || 'Leave', avail, cap }
  })
  const maxAvail = Math.max(1, ...rows.map(r => r.cap || r.avail))
  return (
    <PmsCard className={className}>
      <CardHeader title="Leave Balance" chip={<HeaderChip onClick={onOpen} title="Open leave overview" />} />
      <BigStat value={total > 0 ? total : 0} pill="Available days" pillTone="blue" caption="Across all leave types" />
      <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {rows.length === 0 ? (
          <EmptyBox icon={<FiSun size={14} />} title="No leave balances yet" />
        ) : rows.map(r => {
          const pct = Math.min(100, Math.round((r.avail / (r.cap || maxAvail)) * 100))
          return (
            <div key={r.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr) 44px', alignItems: 'center', gap: '12px' }}>
              <span style={{ ...T.small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
              <span style={{ height: '8px', borderRadius: '4px', background: PMS.surfaceAlt, overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: PMS.gradBlue, borderRadius: '4px' }} />
              </span>
              <span style={{ ...T.small, color: PMS.navy, fontWeight: 700, textAlign: 'right' }}>{r.avail}{r.cap ? `/${r.cap}` : 'd'}</span>
            </div>
          )
        })}
      </div>
    </PmsCard>
  )
}

// ── Team members (manager, PMS off) ─────────────────────────────────────────
export function TeamMembersCard({ team, onOpen }) {
  return (
    <PmsCard>
      <CardHeader title="Team Members" chip={<HeaderChip onClick={onOpen} title="Open my team" />} />
      <BigStat value={team.length} pill="Direct reports" caption={team.length ? 'People reporting to you' : 'No direct reports yet'} />
      <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
        {team.length === 0 ? (
          <EmptyBox icon={<FiUsers size={14} />} title="No team members" />
        ) : team.slice(0, 3).map((m, i, arr) => (
          <ListRow key={m.id || i} title={`${m.first_name || ''} ${m.last_name || ''}`.trim()} sub={m.designation || m.department_name} last={i === arr.length - 1} />
        ))}
      </div>
    </PmsCard>
  )
}
