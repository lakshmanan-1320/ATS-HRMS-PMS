import React, { useState, useEffect, useMemo } from 'react'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { useAttendanceStore } from '../../../store/attendance.store.js'
import {
  FiUsers, FiClock, FiAlertTriangle, FiMapPin, FiCalendar, FiRefreshCw, FiLogIn, FiLogOut,
  FiCheckCircle, FiActivity, FiInbox, FiShield, FiTarget,
} from 'react-icons/fi'
import { PMS } from '../../employee-portal/theme'
import { PmsCard, CardHeader, HeaderChip, BigStat, Pill, EmptyBox, T } from '../../employee-portal/components/shared/PmsUI'
import { Ring, TrendChart } from '../components/dashboard/AdminCharts'
import { SectionHeading, SegmentTabs } from '../components/dashboard/AdminInsights'
import { initials } from '../components/dashboard/AdminKpiCards'

/* ─── Helpers ─── */
function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
const fmtTime = v => (v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—')
const fmtShort = d => (d ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7days', label: 'Last 7 Days' },
  { key: 'current_month', label: 'Current Month' },
]

const AVATAR_BGS = ['#0466C8', '#33415C', '#5C677D', '#407BA7']

/* ─── Small presentational pieces (PMS dashboard language) ─── */
function StatTile({ value, label, highlight }) {
  return (
    <div style={{
      height: highlight ? 112 : 88, alignSelf: 'end', minWidth: 0, borderRadius: 16, padding: '0 12px 12px 14px', boxSizing: 'border-box',
      background: highlight ? PMS.gradBlue : PMS.surfaceAlt, border: highlight ? 'none' : `1px solid ${PMS.border}`,
      boxShadow: highlight ? PMS.shadowTile : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      <span style={{ fontFamily: PMS.fontHead, fontSize: highlight ? 18.5 : 16.5, fontWeight: highlight ? 700 : 400, color: highlight ? PMS.white : PMS.navy, lineHeight: '28px' }}>{value}</span>
      <span style={{ fontFamily: PMS.fontHead, fontSize: 9.5, color: highlight ? 'rgba(255,255,255,0.85)' : PMS.muted, lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </div>
  )
}

function DarkTabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" aria-label="Exception type" className="pms-tabs-scroll" style={{ display: 'flex', alignItems: 'center', gap: 4, height: 46, padding: '0 5px', background: PMS.white, borderRadius: 23, boxSizing: 'border-box', maxWidth: '100%' }}>
      {tabs.map(t => {
        const active = t.key === value
        return (
          <button key={t.key} type="button" role="tab" aria-selected={active} onClick={() => onChange(t.key)} className="pms-focus" style={{
            height: 36, padding: '0 15px', borderRadius: 18, border: 'none', background: active ? PMS.gradBlue : 'transparent',
            color: active ? PMS.white : PMS.navy, display: 'inline-flex', alignItems: 'center', gap: 10,
            fontFamily: PMS.fontHead, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {t.label}
            <span style={{ minWidth: 20, height: 20, borderRadius: 10, padding: '0 5px', boxSizing: 'border-box', background: active ? PMS.white : PMS.surfaceAlt, color: active ? PMS.blue : PMS.navy, fontSize: 10.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{t.count}</span>
          </button>
        )
      })}
    </div>
  )
}

function DetailTile({ value, caption, icon }) {
  return (
    <div style={{ position: 'relative', minHeight: 99, minWidth: 0, borderRadius: 18, boxSizing: 'border-box', color: PMS.white, padding: '20px 18px 16px', background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ position: 'absolute', top: 14, right: 16, color: 'rgba(255,255,255,0.9)', display: 'flex' }}>{icon}</span>
      <span style={{ fontFamily: PMS.fontHead, fontSize: 19, fontWeight: 700, lineHeight: '28px', paddingRight: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
      <span style={{ fontFamily: PMS.fontHead, fontSize: 10.5, color: 'rgba(255,255,255,0.8)' }}>{caption}</span>
    </div>
  )
}

const lbl = { fontFamily: PMS.fontHead, fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: '17px' }

export default function ClientAdminAttendanceDashboard() {
  // Quick Filters: 'today' | 'yesterday' | '7days' | 'current_month'
  const [activeFilter, setActiveFilter] = useState('today')
  const [refreshKey, setRefreshKey] = useState(0)

  const {
    dashboardSummary,
    trends,
    departmentsSummary,
    adminOverview,
    loadingDashboard,
    loadingTrends,
    loadingDeptSummary,
    loadingOverview,
    error,
    fetchDashboardSummary,
    fetchTrends,
    fetchDepartmentsSummary,
    fetchAdminOverview
  } = useAttendanceStore()

  // Calculate target dates
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const yesterdayStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }, [])

  const selectedDate = activeFilter === 'yesterday' ? yesterdayStr : todayStr

  // Load data on filter or refresh change
  useEffect(() => {
    fetchDashboardSummary(selectedDate)
    fetchDepartmentsSummary(selectedDate)

    const trendRange = activeFilter === 'current_month' ? 'current_month' : activeFilter === '7days' ? '7days' : '7days'
    fetchTrends(trendRange)
    fetchAdminOverview({ date: selectedDate, limit: 'all' })
  }, [activeFilter, selectedDate, refreshKey, fetchDashboardSummary, fetchDepartmentsSummary, fetchTrends, fetchAdminOverview])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Aggregate stats depending on current tab
  const stats = useMemo(() => {
    const isPeriodMode = activeFilter === '7days' || activeFilter === 'current_month'

    if (isPeriodMode && trends && trends.length > 0) {
      const totalPoints = trends.length
      const sumTotalEmployees = trends.reduce((sum, p) => sum + (p.totalEmployees || 0), 0)
      const sumPresent = trends.reduce((sum, p) => sum + (p.present || 0), 0)
      const sumAbsent = trends.reduce((sum, p) => sum + (p.absent || 0), 0)
      const sumOnTime = trends.reduce((sum, p) => sum + (p.onTime || 0), 0)
      const sumLate = trends.reduce((sum, p) => sum + (p.lateArrivals || 0), 0)
      const sumEarly = trends.reduce((sum, p) => sum + (p.earlyExits || 0), 0)

      const avgTotal = Math.round(sumTotalEmployees / totalPoints)
      const avgPresent = Math.round(sumPresent / totalPoints)
      const avgAbsent = Math.round(sumAbsent / totalPoints)
      const avgOnTime = Math.round(sumOnTime / totalPoints)
      const avgLate = Math.round(sumLate / totalPoints)
      const avgEarly = Math.round(sumEarly / totalPoints)
      const avgPct = avgTotal > 0 ? Number(((avgPresent / avgTotal) * 100).toFixed(1)) : 0.0

      return {
        totalEmployees: avgTotal,
        present: avgPresent,
        absent: avgAbsent,
        attendancePercentage: avgPct,
        onTime: avgOnTime,
        lateArrivals: avgLate,
        earlyExits: avgEarly,
        labelSuffix: ' (Period Avg)'
      }
    } else {
      return {
        totalEmployees: dashboardSummary?.totalEmployees || 0,
        present: dashboardSummary?.present || 0,
        absent: dashboardSummary?.absent || 0,
        attendancePercentage: dashboardSummary?.attendancePercentage || 0.0,
        onTime: dashboardSummary?.onTime || 0,
        lateArrivals: dashboardSummary?.lateArrivals || 0,
        earlyExits: dashboardSummary?.earlyExits || 0,
        labelSuffix: ''
      }
    }
  }, [activeFilter, trends, dashboardSummary])

  // Extract exceptions from overview records
  const exceptions = useMemo(() => {
    const records = adminOverview?.records || []
    return {
      lateArrivals: records.filter(r => r.attendance_result === 'LATE_ARRIVAL'),
      outsideFence: records.filter(r => r.location_status === 'OUTSIDE_FENCE'),
      earlyExits: records.filter(r => r.attendance_result === 'EARLY_EXIT')
    }
  }, [adminOverview])

  const [activeExceptionTab, setActiveExceptionTab] = useState('late')
  const [selectedId, setSelectedId] = useState(null)
  const loading = loadingDashboard || loadingTrends || loadingDeptSummary || loadingOverview

  const isPeriod = activeFilter === '7days' || activeFilter === 'current_month'
  const periodWord = isPeriod ? 'Daily average' : activeFilter === 'yesterday' ? 'Yesterday' : 'Today'
  const exceptionTotal = exceptions.lateArrivals.length + exceptions.outsideFence.length + exceptions.earlyExits.length
  const excList = activeExceptionTab === 'late' ? exceptions.lateArrivals : activeExceptionTab === 'geofence' ? exceptions.outsideFence : exceptions.earlyExits
  const selected = excList.find(r => r.employee_id === selectedId) || excList[0] || null
  const rows = excList.slice(0, 5)

  const trendLabels = trends.map(t => fmtShort(t.date))
  const rateSeries = trends.map(t => (t.totalEmployees > 0 ? Math.round((t.present / t.totalEmployees) * 100) : 0))
  const lateMax = Math.max(4, ...trends.map(t => t.lateArrivals || 0))

  const now = new Date()
  const dateChip = `${now.toLocaleDateString('en-US', { weekday: 'short' })}, ${now.getDate()} ${now.toLocaleDateString('en-US', { month: 'short' })} ${now.getFullYear()}`

  // Detail content for the selected exception
  let detailTiles = []
  let detailNote = ''
  if (selected) {
    if (activeExceptionTab === 'late') {
      detailTiles = [
        { value: fmtTime(selected.check_in_time), caption: 'Checked in', icon: <FiLogIn size={13} /> },
        { value: selected.shift_start_time || '—', caption: 'Shift starts', icon: <FiClock size={13} /> },
        { value: selected.shift_name || '—', caption: 'Shift', icon: <FiCalendar size={13} /> },
        { value: selected.policy_name || 'General Policy', caption: 'Attendance policy', icon: <FiShield size={13} /> },
      ]
      detailNote = 'Checked in after the shift start time allowed by the attendance policy.'
    } else if (activeExceptionTab === 'geofence') {
      detailTiles = [
        { value: selected.matched_office_name || 'Geofenced area', caption: 'Office zone', icon: <FiMapPin size={13} /> },
        { value: selected.distance_from_office != null ? `${Number(selected.distance_from_office).toFixed(0)}m` : '—', caption: 'Distance outside fence', icon: <FiTarget size={13} /> },
        { value: selected.gps_accuracy != null ? `±${Number(selected.gps_accuracy).toFixed(0)}m` : '—', caption: 'GPS accuracy', icon: <FiActivity size={13} /> },
        { value: fmtTime(selected.check_in_time), caption: 'Checked in', icon: <FiLogIn size={13} /> },
      ]
      detailNote = 'The punch location was outside the office geofence.'
    } else {
      detailTiles = [
        { value: fmtTime(selected.check_out_time), caption: 'Checked out', icon: <FiLogOut size={13} /> },
        { value: selected.work_duration_minutes != null ? `${Math.floor(selected.work_duration_minutes / 60)}h ${selected.work_duration_minutes % 60}m` : '—', caption: 'Worked', icon: <FiClock size={13} /> },
        { value: `${selected.shift_start_time || '—'} – ${selected.shift_end_time || '—'}`, caption: 'Shift target', icon: <FiCalendar size={13} /> },
        { value: fmtTime(selected.check_in_time), caption: 'Checked in', icon: <FiLogIn size={13} /> },
      ]
      detailNote = 'Checked out before the end of the assigned shift.'
    }
  }

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: PMS.white, fontFamily: PMS.fontHead, color: PMS.navy }}>
      <ClientAdminSidebar active="attendance-dashboard" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ClientAdminTopBar title="Attendance" />

        <div role="main" className="pms-main" style={{ flex: 1, overflowY: 'auto', background: PMS.white }}>
          <style>{`.spin-anim { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {/* ── Heading ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px 24px', flexWrap: 'wrap', paddingTop: 19 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, lineHeight: 1.5, color: PMS.navy, letterSpacing: '-0.5px' }}>Attendance Dashboard</div>
              <div style={{ fontSize: 13, color: PMS.muted, lineHeight: '20px', marginTop: -2 }}>
                Real-time tracking, metrics and compliance logs · {formatDisplayDate(selectedDate)}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px 24px', flexWrap: 'wrap', minWidth: 0, maxWidth: '100%' }}>
              <SegmentTabs tabs={PERIODS} value={activeFilter} onChange={setActiveFilter} label="Attendance period" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 18px', background: PMS.white, border: `1px solid ${PMS.border}`, borderRadius: 21, fontSize: 12, color: PMS.navy, whiteSpace: 'nowrap', boxSizing: 'border-box' }}>
                <FiCalendar size={13} /> {dateChip}
              </div>
              <button id="btn-refresh" type="button" onClick={handleRefresh} className="pms-hover-lift pms-focus"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 46, padding: '0 26px', background: PMS.gradBlue, color: PMS.white, border: 'none', borderRadius: 23, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: PMS.shadowCta, whiteSpace: 'nowrap' }}>
                <FiRefreshCw size={15} className={loading ? 'spin-anim' : ''} /> Refresh
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" style={{ marginTop: 20, padding: '12px 16px', borderRadius: 14, background: PMS.ice, border: `1px solid ${PMS.barSoft}`, fontSize: 12.5, color: PMS.navy }}>{String(error)}</div>
          )}

          {/* ── KPI row ─────────────────────────────────────────────── */}
          <div className="pms-grid-4" style={{ marginTop: 39, opacity: loading ? 0.75 : 1, transition: 'opacity 0.2s' }}>
            <PmsCard>
              <CardHeader title="Total Employees" chip={<HeaderChip icon={<FiUsers size={14} />} />} />
              <BigStat value={stats.totalEmployees} pill={isPeriod ? 'Period avg' : 'Workforce'} caption={`${departmentsSummary.length} departments tracked`} />
              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', ...T.small }}>
                  <span>Present vs absent</span>
                  <span>{stats.present} · {stats.absent}</span>
                </div>
                <div style={{ display: 'flex', gap: 3, marginTop: 10 }}>
                  <span style={{ flex: Math.max(stats.present, 0.5), height: 8, borderRadius: 4, background: PMS.gradBlue }} />
                  <span style={{ flex: Math.max(stats.absent, 0.5), height: 8, borderRadius: 4, background: PMS.navy }} />
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 10, ...T.small }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: PMS.blue }} />Present <strong style={{ color: PMS.navy }}>{stats.present}</strong></span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: PMS.navy }} />Absent <strong style={{ color: PMS.navy }}>{stats.absent}</strong></span>
                </div>
              </div>
            </PmsCard>

            <PmsCard>
              <CardHeader title="Attendance Rate" chip={<HeaderChip icon={<FiActivity size={14} />} />} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <BigStat value={`${stats.attendancePercentage}%`} pill={stats.attendancePercentage >= 90 ? 'Excellent' : stats.attendancePercentage >= 75 ? 'On track' : 'Needs focus'} pillTone="blue" caption={periodWord} />
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', justifyContent: 'center' }}>
                <Ring pct={stats.attendancePercentage} size={96} stroke={9} label={`${Math.round(stats.attendancePercentage)}%`} sub="present" />
              </div>
            </PmsCard>

            <PmsCard>
              <CardHeader title="Punctuality" chip={<HeaderChip icon={<FiCheckCircle size={14} />} />} />
              <BigStat value={stats.onTime} pill="On time" caption={`${periodWord} · ${stats.present} present`} />
              <div style={{ marginTop: 'auto', paddingTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 7, alignItems: 'end' }}>
                <StatTile value={stats.onTime} label="On time" />
                <StatTile value={stats.lateArrivals} label="Late" highlight />
                <StatTile value={stats.earlyExits} label="Early exit" />
              </div>
            </PmsCard>

            <PmsCard>
              <CardHeader title="Exceptions" chip={<HeaderChip onClick={() => document.getElementById('att-exceptions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} title="Jump to exceptions" />} />
              <BigStat value={exceptionTotal} pill="Needs review" caption={exceptionTotal ? `${exceptionTotal} records flagged for ${formatDisplayDate(selectedDate)}` : 'No exceptions flagged'} />
              <div style={{ marginTop: 'auto', paddingTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 7, alignItems: 'end' }}>
                <StatTile value={exceptions.lateArrivals.length} label="Late" />
                <StatTile value={exceptions.outsideFence.length} label="Outside fence" highlight />
                <StatTile value={exceptions.earlyExits.length} label="Early exit" />
              </div>
            </PmsCard>
          </div>

          {/* ── Exceptions panel ────────────────────────────────────── */}
          <section id="att-exceptions" style={{ marginTop: 61, scrollMarginTop: 100, background: PMS.navy, borderRadius: PMS.radiusPanel, padding: '26px 24px 24px', boxSizing: 'border-box', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: PMS.white, lineHeight: '24px' }}>Attendance Exceptions</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Late arrivals, geofence alerts and early exits · {formatDisplayDate(selectedDate)}</div>
              </div>
              <DarkTabs
                value={activeExceptionTab}
                onChange={k => { setActiveExceptionTab(k); setSelectedId(null) }}
                tabs={[
                  { key: 'late', label: 'Late Arrivals', count: exceptions.lateArrivals.length },
                  { key: 'geofence', label: 'Outside Fence', count: exceptions.outsideFence.length },
                  { key: 'early', label: 'Early Exits', count: exceptions.earlyExits.length },
                ]}
              />
            </div>

            <div className="pms-workday-body" style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                {rows.length === 0 ? (
                  <EmptyBox dark icon={<FiInbox size={14} />}
                    title={activeExceptionTab === 'late' ? 'No late arrivals' : activeExceptionTab === 'geofence' ? 'No outside geofence alerts' : 'No early exits'}
                    sub={`Nothing flagged for ${formatDisplayDate(selectedDate)}`} style={{ minHeight: 160, flex: 1 }} />
                ) : rows.map((r, i) => {
                  const sel = selected && r.employee_id === selected.employee_id
                  const name = `${r.first_name || ''} ${r.last_name || ''}`.trim()
                  const sub = activeExceptionTab === 'geofence' ? (r.matched_office_name || 'Geofenced area') : (r.shift_name || 'Shift')
                  const right = activeExceptionTab === 'early' ? fmtTime(r.check_out_time) : fmtTime(r.check_in_time)
                  return (
                    <button key={r.employee_id} type="button" onClick={() => setSelectedId(r.employee_id)} className="pms-focus" style={{
                      display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 62, padding: '0 14px', boxSizing: 'border-box',
                      borderRadius: PMS.radiusRow, border: 'none', cursor: 'pointer', textAlign: 'left', color: PMS.white,
                      background: sel ? PMS.gradBlue : PMS.navyRow, boxShadow: sel ? PMS.shadowRow : 'none',
                    }}>
                      <span style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: sel ? PMS.white : AVATAR_BGS[i % AVATAR_BGS.length], color: sel ? PMS.navy : PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{initials(name)}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || 'Employee'}</span>
                        <span style={{ display: 'block', fontSize: 10, color: sel ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.employee_code} · {sub}</span>
                      </span>
                      <span style={{ minWidth: 70, textAlign: 'right', flexShrink: 0, fontSize: 12.7, fontWeight: 700, whiteSpace: 'nowrap' }}>{right}</span>
                    </button>
                  )
                })}
                {excList.length > rows.length && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Showing 5 of {excList.length}. See Attendance Tracking for the full list.</div>
                )}
              </div>

              <div style={{ background: PMS.gradPanel, borderRadius: PMS.radiusInner, padding: '26px 24px 24px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)', display: 'flex', flexDirection: 'column', minWidth: 0, color: PMS.white }}>
                {!selected ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
                    <EmptyBox dark icon={<FiCheckCircle size={14} />} title="All clear" sub="No exception to review in this category" style={{ width: '100%', maxWidth: 360 }} />
                  </div>
                ) : (
                  <>
                    <div className="pms-att-top">
                      <div style={{ minWidth: 0 }}>
                        <div style={lbl}>Employee</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                          <span style={{ width: 36, height: 36, borderRadius: '50%', background: PMS.white, color: PMS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{initials(`${selected.first_name || ''} ${selected.last_name || ''}`)}</span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.first_name} {selected.last_name}</span>
                            <span style={{ display: 'block', fontSize: 9.5, color: 'rgba(255,255,255,0.7)' }}>{selected.employee_code}</span>
                          </span>
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={lbl}>Exception</div>
                        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: '34px', marginTop: 6, whiteSpace: 'nowrap' }}>
                          {activeExceptionTab === 'late' ? 'Late arrival' : activeExceptionTab === 'geofence' ? 'Outside geofence' : 'Early exit'}
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={lbl}>Date</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                          <span style={{ width: 36, height: 36, borderRadius: '50%', background: PMS.white, color: PMS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FiCalendar size={15} /></span>
                          <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatDisplayDate(selectedDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="pms-att-tiles" style={{ marginTop: 22 }}>
                      {detailTiles.map((t, i) => <DetailTile key={i} {...t} />)}
                    </div>
                    <div style={{ marginTop: 26 }}>
                      <div style={lbl}>Note</div>
                      <div style={{ fontSize: 13, lineHeight: '20px', marginTop: 6 }}>{detailNote}</div>
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: 24 }}>
                      <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 20, padding: '14px 20px', minHeight: 72, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '16px 40px', flexWrap: 'wrap' }}>
                        {[['Late arrivals', exceptions.lateArrivals.length], ['Outside fence', exceptions.outsideFence.length], ['Early exits', exceptions.earlyExits.length]].map(([c, v]) => (
                          <div key={c}>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>{c}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* ── Trends & departments ────────────────────────────────── */}
          <div style={{ marginTop: 40 }}>
            <SectionHeading title="Attendance Insights" sub="Attendance rate, late arrivals and department presence" />
            <div className="pms-grid-4">
              <PmsCard className="pms-span-2" style={{ minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: PMS.navy }}>Attendance Rate Trend</div>
                    <div style={{ ...T.small, marginTop: 2 }}>Share of employees present per day</div>
                  </div>
                  <Pill tone="blue" style={{ height: 22, fontSize: 10, padding: '0 10px' }}>{activeFilter === 'current_month' ? 'This month' : 'Last 7 days'}</Pill>
                </div>
                <div style={{ marginTop: 16 }}>
                  {trends.length === 0
                    ? <EmptyBox icon={<FiActivity size={14} />} title="No trend data found" style={{ minHeight: 180 }} />
                    : <TrendChart series={[{ key: 'rate', label: '% present', color: PMS.blue, values: rateSeries }]} labels={trendLabels} height={200} yMax={100} />}
                </div>
              </PmsCard>

              <PmsCard className="pms-span-2" style={{ minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: PMS.navy }}>Late Arrival Exceptions</div>
                    <div style={{ ...T.small, marginTop: 2 }}>Late check-ins per day</div>
                  </div>
                  <Pill style={{ height: 22, fontSize: 10, padding: '0 10px' }}>{trends.reduce((s, t) => s + (t.lateArrivals || 0), 0)} total</Pill>
                </div>
                {trends.length === 0 ? (
                  <div style={{ marginTop: 16 }}><EmptyBox icon={<FiClock size={14} />} title="No trend data found" style={{ minHeight: 180 }} /></div>
                ) : (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 6, height: 180, borderBottom: `1px solid ${PMS.pillGrey}` }}>
                      {trends.map((t, i) => {
                        const v = t.lateArrivals || 0
                        const peak = v === Math.max(...trends.map(x => x.lateArrivals || 0)) && v > 0
                        return (
                          <div key={i} title={`${trendLabels[i]}: ${v} late`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, maxWidth: 40 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: PMS.navy }}>{v}</span>
                            <span style={{ width: '100%', height: Math.max(4, Math.round((v / lateMax) * 150)), borderRadius: 8, background: peak ? PMS.gradBlueVert : PMS.gradBarSoft }} />
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', gap: 6, marginTop: 8 }}>
                      {trendLabels.map((l, i) => <span key={i} style={{ flex: 1, maxWidth: 40, textAlign: 'center', fontSize: 9.5, color: PMS.muted, whiteSpace: 'nowrap' }}>{trends.length > 12 && i % 3 ? '' : l}</span>)}
                    </div>
                  </div>
                )}
              </PmsCard>

              <PmsCard className="pms-span-full" style={{ minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: PMS.navy }}>Department Statistics</div>
                    <div style={{ ...T.small, marginTop: 2 }}>Present headcount by department · {formatDisplayDate(selectedDate)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 14, ...T.small }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: PMS.blue }} />Present</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: PMS.barSoft }} />Absent</span>
                  </div>
                </div>
                <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '14px 40px' }}>
                  {departmentsSummary.length === 0 ? (
                    <EmptyBox icon={<FiUsers size={14} />} title="No department statistics found" />
                  ) : departmentsSummary.map(d => {
                    const filled = d.totalEmployees > 0 ? Math.round((d.presentCount / d.totalEmployees) * 10) : 0
                    return (
                      <div key={d.departmentId} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1.1fr) minmax(0, 1.6fr) auto', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 11.5, color: PMS.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.departmentName}</span>
                        <span style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0,1fr))', gap: 3 }} aria-label={`${d.presentCount} of ${d.totalEmployees} present`}>
                          {Array.from({ length: 10 }).map((_, k) => <span key={k} style={{ height: 8, borderRadius: 4, background: k < filled ? PMS.gradBlue : PMS.barSoft }} />)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                          <strong style={{ fontSize: 11, color: PMS.navy }}>{d.presentCount}/{d.totalEmployees}</strong>
                          {d.absentCount > 0 && <Pill style={{ height: 20, fontSize: 9.5, padding: '0 8px' }}>{d.absentCount} absent</Pill>}
                          {d.lateCount > 0 && <Pill tone="blue" style={{ height: 20, fontSize: 9.5, padding: '0 8px' }}>{d.lateCount} late</Pill>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </PmsCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
