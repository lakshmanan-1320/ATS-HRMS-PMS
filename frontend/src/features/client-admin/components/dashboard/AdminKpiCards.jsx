import React from 'react'
import { FiUsers, FiActivity, FiTarget, FiUserCheck } from 'react-icons/fi'
import { PMS } from '../../../employee-portal/theme'
import { PmsCard, CardHeader, HeaderChip, BigStat, LegendDot, T } from '../../../employee-portal/components/shared/PmsUI'
import { MiniLine } from './AdminCharts'

// Department colours, in the order they appear in the Figma "Total Employees" bar
export const DEPT_COLORS = ['#0466C8', '#407BA7', '#979DAC', '#33415C', '#001233']
const AVATAR_BGS = ['#001233', '#0466C8', '#33415C', '#0466C8']

export function initials(text = '') {
  const w = String(text).trim().split(/[\s&]+/).filter(Boolean)
  if (!w.length) return '—'
  return (w[0][0] + (w[1] ? w[1][0] : (w[0][1] || ''))).toUpperCase()
}

function shortDept(name = '') {
  return name.replace('Operations', 'Ops').replace('Marketing', 'Mktg').replace(' & Accounts', '').replace('Recruitment', 'Recruitment')
}

export function TotalEmployeesCard({ employees, departments, breakdown = [] }) {
  const total = employees?.total || 0
  const active = employees?.active || 0
  const inactive = employees?.inactive || 0
  const rows = breakdown.map((d, i) => ({ name: d.department, count: Number(d.employee_count) || 0, color: DEPT_COLORS[i % DEPT_COLORS.length] }))
  const shown = rows.slice(0, 4)
  const listed = rows.reduce((s, r) => s + r.count, 0)
  const rest = Math.max(0, total - shown.reduce((s, r) => s + r.count, 0))

  return (
    <PmsCard>
      <CardHeader title="Total Employees" chip={<HeaderChip icon={<FiUsers size={14} />} />} />
      <BigStat
        value={total}
        caption={<><strong style={{ color: PMS.blue, fontWeight: 700 }}>{departments || 0}</strong> departments · {active} active</>}
      />
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'flex' }}>
            {shown.map((d, i) => (
              <span key={d.name} title={`${d.name}: ${d.count}`} style={{
                width: 26, height: 26, borderRadius: '50%', marginLeft: i ? -7 : 0, border: '1.5px solid #fff',
                background: AVATAR_BGS[i % AVATAR_BGS.length], color: PMS.white, fontSize: 8.5, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: PMS.fontHead,
              }}>{initials(d.name)}</span>
            ))}
            {rest > 0 && (
              <span style={{ height: 26, minWidth: 26, padding: '0 6px', borderRadius: 13, marginLeft: -7, border: '1.5px solid #fff', background: PMS.pillGrey, color: PMS.slate, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>+{rest}</span>
            )}
          </span>
          <span style={{ ...T.small, whiteSpace: 'nowrap' }}>{active} active · {inactive} inactive</span>
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 10 }} aria-label="Employees by department">
          {rows.length === 0
            ? <span style={{ flex: 1, height: 8, borderRadius: 4, background: PMS.border }} />
            : rows.map(r => <span key={r.name} style={{ flex: Math.max(r.count, 0.5), height: 8, borderRadius: 4, background: r.color }} />)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 10 }}>
          {rows.map(r => <LegendDot key={r.name} color={r.color} label={shortDept(r.name)} value={r.count} />)}
          {rows.length === 0 && <span style={T.small}>No departments yet</span>}
          {listed < total && rows.length > 0 && <span style={T.small}>+ others</span>}
        </div>
      </div>
    </PmsCard>
  )
}

function scoreLabel(v) {
  if (v >= 70) return 'Excellent'
  if (v >= 40) return 'On track'
  return 'Needs focus'
}

export function OverallPerformanceCard({ score, trend = [], onOpen }) {
  const last7 = trend.slice(-7)
  const bars = last7.map(t => {
    const total = Number(t.total) || 0
    return { month: t.month, pct: total ? Math.round(((Number(t.completed) || 0) / total) * 100) : 0 }
  })
  return (
    <PmsCard>
      <CardHeader title="Overall Performance" chip={<HeaderChip icon={<FiActivity size={14} />} onClick={onOpen} title="Open performance hub" />} />
      <BigStat value={`${score}%`} pill={scoreLabel(score)} pillTone="blue" caption="Goals + KPI completion composite" />
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        {bars.length === 0 ? (
          <div style={{ ...T.small, textAlign: 'center', padding: '22px 0 10px' }}>No monthly goal activity yet</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 66 }}>
              {bars.map((b, i) => (
                <span key={b.month + i} title={`${b.month}: ${b.pct}% completed`} style={{
                  width: 22, height: Math.max(8, Math.round((b.pct / 100) * 66)), borderRadius: 6,
                  background: i === bars.length - 1 ? PMS.gradBlueVert : PMS.gradBarSoft,
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              {bars.map((b, i) => (
                <span key={b.month + i} style={{ width: 22, textAlign: 'center', fontFamily: PMS.fontHead, fontSize: 10, color: i === bars.length - 1 ? PMS.navy : PMS.muted, fontWeight: i === bars.length - 1 ? 700 : 400 }}>{b.month}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </PmsCard>
  )
}

export function GoalCompletionCard({ rate, completed, total, trend = [], onOpen }) {
  const pts = trend.slice(-8).map(t => {
    const tt = Number(t.total) || 0
    return tt ? Math.round(((Number(t.completed) || 0) / tt) * 100) : 0
  })
  return (
    <PmsCard>
      <CardHeader title="Goal Completion" chip={<HeaderChip icon={<FiTarget size={14} />} onClick={onOpen} title="Open goals" />} />
      <BigStat value={`${rate}%`} caption={<><strong style={{ color: PMS.blue, fontWeight: 700 }}>{completed}</strong> of {total} goals completed</>} />
      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        {pts.length === 0
          ? <div style={{ ...T.small, textAlign: 'center', padding: '22px 0 10px' }}>No goals created in the last 6 months</div>
          : <MiniLine points={pts} labels={trend.slice(-8).map(t => t.month)} />}
      </div>
    </PmsCard>
  )
}

/** Shown instead of the performance cards when the PMS module is off. */
export function TodayAttendanceCard({ attendance, onOpen, className }) {
  const total = attendance?.total || 0
  const present = attendance?.present || 0
  const absent = attendance?.absent ?? Math.max(0, total - present)
  const rate = total ? Math.round((present / total) * 100) : 0
  return (
    <PmsCard className={className}>
      <CardHeader title="Today's Attendance" chip={<HeaderChip icon={<FiUserCheck size={14} />} onClick={onOpen} title="Open attendance" />} />
      <BigStat value={`${rate}%`} pill="Attendance rate" pillTone="blue" caption={attendance ? `${present} present · ${absent} absent of ${total}` : 'Attendance module not enabled'} />
      <div style={{ marginTop: 'auto', paddingTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
        {[['Total', total], ['Present', present], ['Absent', absent]].map(([l, v]) => (
          <div key={l} style={{ background: PMS.surfaceAlt, border: `1px solid ${PMS.border}`, borderRadius: 14, padding: '10px 12px' }}>
            <div style={{ fontFamily: PMS.fontHead, fontSize: 16.5, color: PMS.navy }}>{v}</div>
            <div style={{ fontFamily: PMS.fontHead, fontSize: 9.5, color: PMS.muted }}>{l}</div>
          </div>
        ))}
      </div>
    </PmsCard>
  )
}
