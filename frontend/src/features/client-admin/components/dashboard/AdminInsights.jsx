import React, { useState } from 'react'
import {
  FiArrowUpRight, FiFlag, FiBarChart2, FiRefreshCw, FiCalendar, FiClock, FiAlertCircle, FiInfo,
  FiUsers, FiFileText,
} from 'react-icons/fi'
import { PMS } from '../../../employee-portal/theme'
import { PmsCard, CardHeader, HeaderChip, BigStat, Pill, EmptyBox, ListRow, T } from '../../../employee-portal/components/shared/PmsUI'
import { Ring, StatusDonut, TrendChart } from './AdminCharts'
import { DEPT_COLORS } from './AdminKpiCards'
import { timeAgo, humanize } from '../../../../components/layout/ClientAdminTopBar'

// ── shared section heading ────────────────────────────────────────────────────
export function SectionHeading({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
      <div>
        <div style={{ fontFamily: PMS.fontHead, fontSize: 'clamp(19px, 1.6vw, 23px)', fontWeight: 700, color: PMS.navy, lineHeight: 1.3 }}>{title}</div>
        {sub && <div style={{ fontFamily: PMS.fontHead, fontSize: 12.5, color: PMS.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

export function SegmentTabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="pms-tabs-scroll" style={{ display: 'flex', alignItems: 'center', height: 44, padding: '0 5px', gap: 2, minWidth: 0, background: PMS.surfaceAlt, border: `1px solid ${PMS.border}`, borderRadius: 22, boxSizing: 'border-box', maxWidth: '100%' }}>
      {tabs.map(t => {
        const active = t.key === value
        return (
          <button key={t.key} type="button" role="tab" aria-selected={active} onClick={() => onChange(t.key)} className="pms-focus" style={{
            height: 34, padding: '0 18px', borderRadius: 17, border: 'none', background: active ? PMS.white : 'transparent',
            boxShadow: active ? '0 4px 12px rgba(0,18,51,0.08)' : 'none', color: active ? PMS.navy : PMS.muted,
            fontFamily: PMS.fontHead, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        )
      })}
    </div>
  )
}

// ── Quick access ──────────────────────────────────────────────────────────────
export function QuickAccessGrid({ links, onOpen }) {
  return (
    <div className="pms-quick-grid">
      {links.map((l, i) => {
        const Icon = l.icon
        const hi = i === 0
        return (
          <button key={l.path} type="button" onClick={() => onOpen(l.path)} className="pms-hover-lift pms-focus" style={{
            position: 'relative', minHeight: 104, minWidth: 0, padding: '16px 14px 14px', boxSizing: 'border-box', textAlign: 'left',
            borderRadius: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14,
            background: hi ? PMS.gradBlue : PMS.white, border: hi ? 'none' : `1px solid ${PMS.border}`,
            boxShadow: hi ? PMS.shadowTile : 'none', color: hi ? PMS.white : PMS.navy,
          }}>
            <FiArrowUpRight size={12} style={{ position: 'absolute', top: 14, right: 14, color: hi ? PMS.white : PMS.muted }} />
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: hi ? 'rgba(255,255,255,0.18)' : PMS.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: hi ? PMS.white : PMS.navy }}>
              <Icon size={15} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: 13, fontWeight: hi ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.label}</span>
              <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: 10, color: hi ? 'rgba(255,255,255,0.8)' : PMS.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.desc}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── KPI status mapping (goal_kpis.status is UPPERCASE) ───────────────────────
export function kpiBuckets(by = {}) {
  const g = k => Number(by[k] || by[k?.toLowerCase?.()] || 0)
  return {
    approved: g('ACTIVE') + g('IN_PROGRESS') + g('COMPLETED'),
    submitted: g('PENDING_APPROVAL'),
    pending: g('DRAFT') + g('CHANGES_REQUESTED'),
    rejected: g('REJECTED'),
  }
}

export function goalBuckets(by = {}) {
  return {
    approved: (by.active || 0) + (by.completed || 0),
    submitted: by.pending_approval || 0,
    pending: by.draft || 0,
    rejected: by.rejected || 0,
  }
}

function StatChip({ color, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '7px 10px', background: PMS.surfaceAlt, borderRadius: 10, minWidth: 0 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, ...T.small, color: PMS.slate, whiteSpace: 'nowrap' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />{label}
      </span>
      <strong style={{ fontFamily: PMS.fontHead, fontSize: 10.5, color: PMS.navy }}>{value}</strong>
    </div>
  )
}

const CHIP_COLORS = { approved: PMS.blue, submitted: '#979DAC', pending: '#979DAC', rejected: PMS.navy }

export function StatusDonutCard({ title, pillText, buckets, total, onOpen }) {
  const pct = total ? Math.round((buckets.approved / total) * 100) : 0
  return (
    <PmsCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: PMS.fontHead, fontSize: 13, fontWeight: 700, color: PMS.navy }}>{title}</span>
        <Pill style={{ height: 22, fontSize: 10, padding: '0 10px' }}>{pillText}</Pill>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 12px', cursor: onOpen ? 'pointer' : 'default' }} onClick={onOpen}>
        <StatusDonut pct={pct} label={`${pct}%`} sub="approved" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 6, marginTop: 'auto' }}>
        <StatChip color={CHIP_COLORS.approved} label="Approved" value={buckets.approved} />
        <StatChip color={CHIP_COLORS.submitted} label="Submitted" value={buckets.submitted} />
        <StatChip color={CHIP_COLORS.pending} label="Pending" value={buckets.pending} />
        <StatChip color={CHIP_COLORS.rejected} label="Rejected" value={buckets.rejected} />
      </div>
    </PmsCard>
  )
}

// ── Insight stat cards ────────────────────────────────────────────────────────
export function InsightCard({ title, icon, value, pill, caption, footer, onOpen, children }) {
  return (
    <PmsCard style={{ minHeight: 0 }}>
      <CardHeader title={title} chip={<HeaderChip icon={icon} onClick={onOpen} title={`Open ${title.toLowerCase()}`} />} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <BigStat value={value} pill={pill} pillTone="blue" caption={caption} />
        {children}
      </div>
      {footer && <div style={{ ...T.small, marginTop: 14 }}>{footer}</div>}
    </PmsCard>
  )
}

// ── Employees by department ───────────────────────────────────────────────────
export function DepartmentBarsCard({ breakdown = [], total = 0, className, onOpen }) {
  const max = Math.max(1, ...breakdown.map(d => Number(d.employee_count) || 0))
  return (
    <PmsCard className={className}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: PMS.fontHead, fontSize: 13, fontWeight: 700, color: PMS.navy }}>Employees by Department</div>
          <div style={{ ...T.small, marginTop: 2 }}>Active headcount across the top {breakdown.length || 0} departments</div>
        </div>
        {onOpen && <HeaderChip onClick={onOpen} title="Open departments" />}
      </div>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {breakdown.length === 0 ? (
          <EmptyBox icon={<FiUsers size={14} />} title="No departments yet" />
        ) : breakdown.map((d, i) => {
          const n = Number(d.employee_count) || 0
          const filled = Math.round((n / max) * 10)
          const share = total ? Math.round((n / total) * 100) : 0
          return (
            <div key={d.department} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1.1fr) minmax(0, 1.6fr) 26px 72px', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: PMS.fontHead, fontSize: 11.5, color: PMS.navy, minWidth: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: DEPT_COLORS[i % DEPT_COLORS.length], flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.department}</span>
              </span>
              <span style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0,1fr))', gap: 3 }} aria-label={`${n} employees`}>
                {Array.from({ length: 10 }).map((_, k) => (
                  <span key={k} style={{ height: 8, borderRadius: 4, background: k < filled ? PMS.gradBlue : PMS.barSoft }} />
                ))}
              </span>
              <strong style={{ fontFamily: PMS.fontHead, fontSize: 11, color: PMS.navy, textAlign: 'right' }}>{n}</strong>
              <span style={{ ...T.small, whiteSpace: 'nowrap' }}>{share}% of staff</span>
            </div>
          )
        })}
      </div>
    </PmsCard>
  )
}

// ── Pending actions bar chart ─────────────────────────────────────────────────
export function PendingActionsChart({ items, total, className }) {
  const max = Math.max(4, ...items.map(i => i.value))
  const top = Math.ceil(max / 5) * 5
  const peak = Math.max(...items.map(i => i.value))
  return (
    <PmsCard className={className}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: PMS.fontHead, fontSize: 13, fontWeight: 700, color: PMS.navy }}>Pending Actions</div>
          <div style={{ ...T.small, marginTop: 2 }}>Everything waiting on an admin decision</div>
        </div>
        <Pill tone="blue" style={{ height: 22, fontSize: 10, padding: '0 10px' }}>{total} items</Pill>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr)', gap: 8, marginTop: 18, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 150, paddingBottom: 0 }}>
          {[top, Math.round(top * 2 / 3), Math.round(top / 3), 0].map(t => <span key={t} style={{ ...T.small, fontSize: 9 }}>{t}</span>)}
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', inset: '0 0 auto 0', height: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
            {[0, 1, 2, 3].map(k => <span key={k} style={{ borderTop: `1px dashed ${PMS.pillGrey}` }} />)}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 150, position: 'relative', gap: 6 }}>
            {items.map(i => {
              const h = Math.max(4, Math.round((i.value / top) * 140))
              const isPeak = i.value === peak && peak > 0
              return (
                <button key={i.label} type="button" onClick={i.onClick} title={`${i.label}: ${i.value}`} className="pms-focus" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: i.onClick ? 'pointer' : 'default', flex: 1, maxWidth: 56 }}>
                  <span style={{ fontFamily: PMS.fontHead, fontSize: 10, fontWeight: 700, color: PMS.navy }}>{i.value}</span>
                  <span style={{ width: '100%', height: h, borderRadius: 8, background: isPeak ? PMS.gradBlueVert : PMS.gradBarSoft }} />
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: 6, marginTop: 8 }}>
            {items.map(i => (
              <span key={i.label} style={{ flex: 1, minWidth: 0, maxWidth: 70, overflowWrap: 'anywhere', hyphens: 'auto', textAlign: 'center', fontFamily: PMS.fontHead, fontSize: 9.5, lineHeight: 1.3, color: i.value === peak && peak > 0 ? PMS.navy : PMS.muted, fontWeight: i.value === peak && peak > 0 ? 700 : 400 }}>{i.label}</span>
            ))}
          </div>
        </div>
      </div>
    </PmsCard>
  )
}

// ── Latest alerts ─────────────────────────────────────────────────────────────
const ALERT_ICON = { leave_pending: FiCalendar, regularization_pending: FiClock, goal_pending: FiFlag, goal_rejected: FiAlertCircle, kpi_submitted: FiBarChart2 }

export function LatestAlertsCard({ alerts = [], onOpen }) {
  return (
    <PmsCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: PMS.fontHead, fontSize: 13, fontWeight: 700, color: PMS.navy }}>Latest Alerts</span>
        <Pill tone="blue" style={{ height: 22, fontSize: 10, padding: '0 10px' }}>{alerts.length} open</Pill>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {alerts.length === 0 ? (
          <EmptyBox icon={<FiInfo size={14} />} title="No alerts" sub="You're all caught up" />
        ) : alerts.slice(0, 4).map((a, i) => {
          const Icon = ALERT_ICON[a.type] || FiInfo
          return (
            <button key={i} type="button" onClick={onOpen} className="pms-focus" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: PMS.surfaceAlt, border: 'none', borderRadius: 12, textAlign: 'left', cursor: 'pointer', width: '100%' }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: PMS.white, color: PMS.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={13} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: 11.5, color: PMS.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{humanize(a.title)}</span>
                <span style={{ display: 'block', ...T.small, fontSize: 9.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[a.actor, timeAgo(a.created_at)].filter(Boolean).join(' · ')}</span>
              </span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: PMS.blue, flexShrink: 0 }} />
            </button>
          )
        })}
      </div>
    </PmsCard>
  )
}

// ── Performance overview ──────────────────────────────────────────────────────
export function PerformanceOverviewCard({ buckets, total, appraisals, onOpen }) {
  const pct = total ? Math.round((buckets.approved / total) * 100) : 0
  return (
    <PmsCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: PMS.fontHead, fontSize: 13, fontWeight: 700, color: PMS.navy }}>Performance Overview</span>
        <Pill style={{ height: 22, fontSize: 10, padding: '0 10px' }}>{total} goals</Pill>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          {[['Approved', buckets.approved, PMS.blue], ['Submitted', buckets.submitted, '#979DAC'], ['Pending', buckets.pending, PMS.navy]].map(([l, v, c]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, ...T.small, color: PMS.slate }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
              <span style={{ width: 70 }}>{l}</span>
              <strong style={{ color: PMS.navy, fontSize: 11 }}>{v}</strong>
            </span>
          ))}
        </div>
        <Ring pct={pct} size={78} stroke={8} label={`${pct}%`} sub="approved" />
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <div style={{ background: PMS.surfaceAlt, border: `1px solid ${PMS.border}`, borderRadius: 16, padding: '10px 12px' }}>
          <button type="button" onClick={onOpen} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: PMS.fontHead, fontSize: 11, color: PMS.blue }}>
            <FiRefreshCw size={12} /> Appraisal Cycles
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6, marginTop: 8 }}>
            {[['Active', appraisals.active_cycles], ['Draft', appraisals.draft_cycles], ['Closed', appraisals.closed_cycles]].map(([l, v]) => (
              <div key={l} style={{ background: PMS.white, borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontFamily: PMS.fontHead, fontSize: 16, fontWeight: 700, color: l === 'Active' ? PMS.blue : PMS.navy }}>{v || 0}</div>
                <div style={{ ...T.small, fontSize: 9.5 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PmsCard>
  )
}

// ── Trend (goals created vs completed per month) ─────────────────────────────
export function PerformanceTrendCard({ trend = [] }) {
  const [range, setRange] = useState('6m')
  const months = { '3m': 3, '6m': 6, '9m': 9 }[range]
  const data = trend.slice(-months)
  const series = [
    { key: 'total', label: 'Goals created', color: PMS.blue, values: data.map(d => Number(d.total) || 0) },
    { key: 'completed', label: 'Goals completed', color: PMS.navy, values: data.map(d => Number(d.completed) || 0) },
  ]
  return (
    <PmsCard style={{ minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: PMS.fontHead, fontSize: 13, fontWeight: 700, color: PMS.navy }}>Performance Trend</div>
          <div style={{ ...T.small, marginTop: 2 }}>Goals created and completed per month</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          {series.map(s => (
            <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, ...T.small, color: PMS.slate }}>
              <span style={{ width: 14, height: 2, background: s.color, borderRadius: 1 }} />{s.label}
            </span>
          ))}
          <div style={{ display: 'flex', gap: 2, background: PMS.surfaceAlt, border: `1px solid ${PMS.border}`, borderRadius: 18, padding: 3 }}>
            {['3m', '6m', '9m'].map(r => (
              <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r} className="pms-focus" style={{ height: 26, padding: '0 12px', borderRadius: 13, border: 'none', background: range === r ? PMS.white : 'transparent', boxShadow: range === r ? '0 2px 8px rgba(0,18,51,0.08)' : 'none', fontFamily: PMS.fontHead, fontSize: 10.5, color: range === r ? PMS.navy : PMS.muted, cursor: 'pointer' }}>{r.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        {data.length === 0
          ? <EmptyBox icon={<FiBarChart2 size={14} />} title="No goal activity yet" sub="The trend appears once goals are created" style={{ minHeight: 180 }} />
          : <TrendChart series={series} labels={data.map(d => d.month)} height={220} />}
      </div>
      {data.length > 0 && data.length < months && (
        <div style={{ ...T.small, marginTop: 8 }}>Showing the {data.length} month{data.length === 1 ? '' : 's'} with goal activity (the trend covers up to 6 months).</div>
      )}
    </PmsCard>
  )
}

// ── Existing sections kept (restyled) ────────────────────────────────────────
export function RecentGoalsCard({ goals = [], onOpen, className }) {
  return (
    <PmsCard className={className}>
      <CardHeader title="Recent Goals" chip={<HeaderChip onClick={onOpen} title="Open goals" />} />
      <BigStat value={goals.length} pill="Latest" caption={goals.length ? 'Most recently created goals' : 'No goals created yet'} />
      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        {goals.length === 0
          ? <EmptyBox icon={<FiFileText size={14} />} title="No goals yet" sub="Goals appear here once employees create them" />
          : goals.slice(0, 4).map((g, i, arr) => (
            <ListRow key={g.goal_id || i} title={g.title} sub={[g.assigned_to, g.due_date ? `Due ${new Date(g.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : null].filter(Boolean).join(' · ')} right={humanize(g.status)} rightTone={String(g.status).toUpperCase() === 'COMPLETED' ? 'blue' : 'grey'} last={i === arr.length - 1} onClick={onOpen} />
          ))}
      </div>
    </PmsCard>
  )
}
