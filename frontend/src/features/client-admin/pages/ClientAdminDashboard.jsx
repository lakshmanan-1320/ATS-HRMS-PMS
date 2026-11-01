import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  FiUsers, FiTarget, FiBarChart2, FiFileText, FiBriefcase, FiShare2, FiCalendar, FiClock,
  FiFlag, FiRefreshCw, FiDownload, FiSliders,
} from 'react-icons/fi'
import ClientAdminSidebar from '../../../components/layout/ClientAdminSidebar.jsx'
import ClientAdminTopBar from '../../../components/layout/ClientAdminTopBar.jsx'
import { useModules, PMS_MODULE_KEYS } from '../../../hooks/useModules'
import { PMS } from '../../employee-portal/theme'
import { PeriodTabs } from '../../employee-portal/components/dashboard/DashboardHero'
import { PendingApprovalCard } from '../../employee-portal/components/dashboard/KpiCards'
import { TotalEmployeesCard, OverallPerformanceCard, GoalCompletionCard, TodayAttendanceCard } from '../components/dashboard/AdminKpiCards'
import PendingApprovalsPanel, { ApprovalFilters, applyFilters, normalizeRequests } from '../components/dashboard/PendingApprovals'
import {
  SectionHeading, SegmentTabs, QuickAccessGrid, InsightCard, DepartmentBarsCard, StatusDonutCard,
  PendingActionsChart, LatestAlertsCard, PerformanceOverviewCard, PerformanceTrendCard, RecentGoalsCard,
  kpiBuckets, goalBuckets,
} from '../components/dashboard/AdminInsights'
import { Ring } from '../components/dashboard/AdminCharts'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sa_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const QUICK_LINKS = [
  { icon: FiUsers, label: 'Employees', path: '/client-admin/employees', desc: 'Manage team', module: null },
  { icon: FiTarget, label: 'Goals', path: '/client-admin/goals', desc: 'Track OKRs', module: 'goals' },
  { icon: FiBarChart2, label: 'KPI', path: '/client-admin/kpi', desc: 'Metrics', module: 'kpi' },
  { icon: FiFileText, label: 'Appraisal', path: '/client-admin/appraisal', desc: 'Reviews', module: 'performance' },
  { icon: FiBriefcase, label: 'Departments', path: '/client-admin/departments', desc: 'Org structure', module: null },
  { icon: FiShare2, label: 'Org Chart', path: '/client-admin/org-chart', desc: 'Hierarchy', module: null },
  { icon: FiCalendar, label: 'Leaves', path: '/client-admin/leave', desc: 'Leave management', module: 'leave' },
  { icon: FiClock, label: 'Attendance', path: '/client-admin/attendance', desc: 'Daily logs', module: 'attendance' },
]

const INSIGHT_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'goals', label: 'Goals' },
  { key: 'kpis', label: 'KPIs' },
  { key: 'appraisals', label: 'Appraisals' },
]

function downloadStatsCsv(stats, range) {
  if (!stats) return
  const rows = [['Metric', 'Value']]
  const add = (k, v) => rows.push([k, v ?? 0])
  add('Period', range)
  add('Total employees', stats.employees?.total); add('Active employees', stats.employees?.active); add('Inactive employees', stats.employees?.inactive)
  add('Departments', stats.departments)
  Object.entries(stats.goals?.by_status || {}).forEach(([k, v]) => add(`Goals – ${k.replace(/_/g, ' ')}`, v))
  add('Goals total', stats.goals?.total); add('Goal completion %', stats.goals?.completion_rate)
  Object.entries(stats.kpis?.by_status || {}).forEach(([k, v]) => add(`KPIs – ${k.replace(/_/g, ' ').toLowerCase()}`, v))
  add('KPI total', stats.kpis?.total); add('KPI approval %', stats.kpis?.completion_rate)
  add('Appraisal cycles – active', stats.appraisals?.active_cycles); add('Appraisal cycles – draft', stats.appraisals?.draft_cycles); add('Appraisal cycles – closed', stats.appraisals?.closed_cycles)
  add('Pending leave requests', stats.pending_leaves); add('Pending regularizations', stats.pending_regularizations)
  if (stats.attendance_today) { add('Present today', stats.attendance_today.present); add('Absent today', stats.attendance_today.absent) }
  ;(stats.department_breakdown || []).forEach(d => add(`Department – ${d.department}`, d.employee_count))
  const esc = v => `"${String(v).replace(/"/g, '""')}"`
  const blob = new Blob([rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dashboard-report-${range}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ClientAdminDashboard() {
  const navigate = useNavigate()
  const { isEnabled } = useModules()

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [requests, setRequests] = useState({ leaves: [], regs: [], goals: [] })
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(true)
  const [insightTab, setInsightTab] = useState('overview')

  const isPmsActive = isEnabled('pms') && (isEnabled('goals') || isEnabled('performance') || isEnabled('kpi'))
  const goalsOn = isPmsActive && isEnabled('goals')

  const visibleQuickLinks = QUICK_LINKS.filter(l => {
    if (!l.module) return true
    if (PMS_MODULE_KEYS.includes(l.module)) return isPmsActive && isEnabled(l.module)
    return isEnabled(l.module)
  })

  // ── data ──────────────────────────────────────────────────────────────────
  const loadStats = useCallback(() => {
    setLoading(true)
    setError(null)
    api.get(`/client-admin/dashboard/stats?range=${dateRange}`)
      .then(r => {
        setStats(r.data)
        sessionStorage.setItem('ca_pending_regs', String(Number(r.data?.pending_regularizations ?? 0)))
        window.dispatchEvent(new Event('pms:pending-updated'))
      })
      .catch(err => setError(err.response?.data?.message || 'Could not load stats'))
      .finally(() => setLoading(false))
  }, [dateRange])

  const loadNotifications = useCallback(() => {
    api.get('/client-admin/dashboard/notifications')
      .then(r => setNotifications(Array.isArray(r.data) ? r.data : []))
      .catch(() => { })
  }, [])

  const loadRequests = useCallback(() => {
    setRequestsLoading(true)
    const leaveCall = isEnabled('leave')
      ? api.get('/v1/leave/admin/leaves').then(r => (Array.isArray(r.data) ? r.data : []).filter(l => String(l.current_status).toUpperCase() === 'PENDING')).catch(() => [])
      : Promise.resolve([])
    const regCall = isEnabled('attendance')
      ? api.get('/attendance/regularization/admin/pending').then(r => r.data?.data || []).catch(() => [])
      : Promise.resolve([])
    const goalCall = goalsOn
      ? api.get('/client-admin/goals', { params: { status: 'PENDING_APPROVAL', limit: 50 } }).then(r => r.data?.data || []).catch(() => [])
      : Promise.resolve([])
    Promise.all([leaveCall, regCall, goalCall])
      .then(([leaves, regs, goals]) => setRequests({ leaves, regs, goals }))
      .finally(() => setRequestsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalsOn])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadNotifications() }, [loadNotifications])
  useEffect(() => { loadRequests() }, [loadRequests])

  async function handleAct(item, action, note) {
    if (item.kind === 'leave') {
      await api.post(`/v1/leave/admin/leaves/${item.id}/${action}`, { remarks: note || undefined })
    } else if (item.kind === 'regularization') {
      await api.post(`/attendance/regularization/admin/${item.id}/${action}`, { remarks: note || undefined })
    } else {
      throw new Error('Goal approvals are handled on the Goals page.')
    }
    loadRequests()
    loadStats()
    loadNotifications()
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const allItems = useMemo(() => normalizeRequests(requests), [requests])
  const filtered = useMemo(() => applyFilters(allItems, filters), [allItems, filters])
  const counts = {
    leave: filtered.filter(i => i.kind === 'leave').length,
    regularization: filtered.filter(i => i.kind === 'regularization').length,
    goal: filtered.filter(i => i.kind === 'goal').length,
  }
  const departmentOptions = useMemo(() => {
    const set = new Set([...(stats?.department_breakdown || []).map(d => d.department), ...allItems.map(i => i.department).filter(Boolean)])
    return [...set].sort()
  }, [stats, allItems])
  const typeOptions = useMemo(() => [...new Set(allItems.map(i => i.typeLabel))].sort(), [allItems])

  const getEmployeeStats = useCallback((item) => {
    const mine = allItems.filter(i => i.employeeId && i.employeeId === item.employeeId)
    const submitted = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'
    if (item.kind === 'leave') {
      return [
        { caption: 'Days requested', value: `${item.days} day${item.days === 1 ? '' : 's'}` },
        { caption: 'Open requests', value: `${mine.length} pending` },
        { caption: 'Submitted', value: submitted },
      ]
    }
    return [
      { caption: 'Attendance date', value: item.dateLabel },
      { caption: 'Open requests', value: `${mine.length} pending` },
      { caption: 'Submitted', value: submitted },
    ]
  }, [allItems])

  const employees = stats?.employees || { total: 0, active: 0, inactive: 0 }
  const goals = stats?.goals || { by_status: {}, total: 0, completion_rate: 0 }
  const kpis = stats?.kpis || { by_status: {}, total: 0, completion_rate: 0 }
  const appraisals = stats?.appraisals || { active_cycles: 0, draft_cycles: 0, closed_cycles: 0, total_cycles: 0 }
  const trend = stats?.goal_trend || []
  const gB = goalBuckets(goals.by_status)
  const kB = kpiBuckets(kpis.by_status)
  const composite = Math.round(((goals.completion_rate || 0) + (kpis.completion_rate || 0)) / 2)
  const pendingLeaves = stats?.pending_leaves ?? requests.leaves.length
  const pendingRegs = stats?.pending_regularizations ?? requests.regs.length
  const pendingGoals = goals.by_status?.pending_approval || 0
  const kpiPendingReview = kB.submitted

  const pendingActions = [
    goalsOn && { label: 'Goals to approve', value: pendingGoals, onClick: () => navigate('/client-admin/goals') },
    isPmsActive && { label: 'KPIs to review', value: kpiPendingReview, onClick: () => navigate('/client-admin/kpi') },
    isEnabled('leave') && { label: 'Leave requests', value: pendingLeaves, onClick: () => navigate('/client-admin/leave-approvals') },
    isEnabled('attendance') && { label: 'Regularizations', value: pendingRegs, onClick: () => navigate('/client-admin/regularizations') },
    goalsOn && { label: 'Rejected goals', value: gB.rejected, onClick: () => navigate('/client-admin/goals') },
    { label: 'Inactive accounts', value: employees.inactive || 0, onClick: () => navigate('/client-admin/employees') },
  ].filter(Boolean)
  const pendingTotal = pendingActions.reduce((s, a) => s + a.value, 0)

  const companyName = stats?.company_name || sessionStorage.getItem('company_name') || 'Insight Technology'
  const now = new Date()
  const dateLabel = `${now.toLocaleDateString('en-US', { weekday: 'short' })}, ${now.getDate()} ${now.toLocaleDateString('en-US', { month: 'short' })} ${now.getFullYear()}`
  const show = key => insightTab === 'overview' || insightTab === key

  return (
    <div className="pms-page" style={{ display: 'flex', minHeight: '100vh', background: PMS.white, fontFamily: PMS.fontHead }}>
      <ClientAdminSidebar active="dashboard" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ClientAdminTopBar title="Dashboard" />

        {/* role="main" instead of <main> so the legacy body.client-admin-theme main-scoped overrides don't repaint the PMS panels */}
        <div role="main" className="pms-main" style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── Heading ────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px 24px', flexWrap: 'wrap', paddingTop: 19 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: PMS.fontHead, fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, lineHeight: 1.5, color: PMS.navy, letterSpacing: '-0.5px' }}>Dashboard</div>
              <div style={{ fontFamily: PMS.fontHead, fontSize: 13, color: PMS.muted, lineHeight: '20px', marginTop: -2 }}>Welcome back, {companyName}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px 24px', flexWrap: 'wrap', minWidth: 0 }}>
              <PeriodTabs value={dateRange} onChange={setDateRange} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 18px', background: PMS.white, border: `1px solid ${PMS.border}`, borderRadius: 21, fontSize: 12, color: PMS.navy, whiteSpace: 'nowrap', boxSizing: 'border-box' }}>
                <FiCalendar size={13} /> {dateLabel}
              </div>
              <button type="button" onClick={() => setShowFilters(v => !v)} title={showFilters ? 'Hide approval filters' : 'Show approval filters'} aria-pressed={showFilters} className="pms-icon-btn pms-focus pms-hide-sm"
                style={{ width: 42, height: 42, borderRadius: '50%', background: showFilters ? PMS.ice : PMS.white, border: `1px solid ${showFilters ? PMS.barSoft : PMS.border}`, color: PMS.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                <FiSliders size={16} />
              </button>
              <button type="button" onClick={() => downloadStatsCsv(stats, dateRange)} disabled={!stats} className="pms-hover-lift pms-focus"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 46, padding: '0 26px', background: PMS.gradBlue, color: PMS.white, border: 'none', borderRadius: 23, fontSize: 13, fontWeight: 700, cursor: stats ? 'pointer' : 'default', boxShadow: PMS.shadowCta, whiteSpace: 'nowrap', opacity: stats ? 1 : 0.7 }}>
                <FiDownload size={15} /> Generate report
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" style={{ marginTop: 20, padding: '12px 16px', borderRadius: 14, background: PMS.ice, border: `1px solid ${PMS.barSoft}`, color: PMS.navy, fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span>{error}</span>
              <button type="button" onClick={loadStats} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: PMS.blue, fontWeight: 700, cursor: 'pointer' }}><FiRefreshCw size={13} /> Retry</button>
            </div>
          )}

          {/* ── KPI row ─────────────────────────────────────────────────── */}
          <div className="pms-grid-4" style={{ marginTop: 39, opacity: loading && stats ? 0.7 : 1, transition: 'opacity 0.2s' }}>
            <TotalEmployeesCard employees={employees} departments={stats?.departments} breakdown={stats?.department_breakdown || []} />
            {isPmsActive ? (
              <>
                <OverallPerformanceCard score={composite} trend={trend} onOpen={() => navigate('/client-admin/performance')} />
                <GoalCompletionCard rate={goals.completion_rate || 0} completed={goals.by_status?.completed || 0} total={goals.total || 0} trend={trend} onOpen={() => navigate('/client-admin/goals')} />
              </>
            ) : (
              <TodayAttendanceCard className="pms-span-2" attendance={stats?.attendance_today} onOpen={() => navigate('/client-admin/attendance')} />
            )}
            <PendingApprovalCard
              title="Pending Actions"
              pill="Needs review"
              emptyCaption="Nothing waiting for your approval"
              captionSuffix="awaiting your approval"
              leaves={pendingLeaves}
              regs={pendingRegs}
              goals={pendingGoals}
              showGoals={goalsOn}
              onOpen={() => document.getElementById('pending-approvals')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              onLeaves={() => navigate('/client-admin/leave-approvals')}
              onRegs={() => navigate('/client-admin/regularizations')}
              onGoals={() => navigate('/client-admin/goals')}
            />
          </div>

          {/* ── Filters ─────────────────────────────────────────────────── */}
          {showFilters && (
            <div style={{ marginTop: 61 }}>
              <ApprovalFilters filters={filters} setFilters={setFilters} departments={departmentOptions} types={typeOptions} />
            </div>
          )}

          {/* ── Pending approvals ───────────────────────────────────────── */}
          <div id="pending-approvals" style={{ marginTop: showFilters ? 28 : 61, scrollMarginTop: 100 }}>
            <PendingApprovalsPanel
              items={filtered}
              counts={counts}
              showGoals={goalsOn}
              loading={requestsLoading}
              onAct={handleAct}
              onOpenGoals={() => navigate('/client-admin/goals')}
              getEmployeeStats={getEmployeeStats}
              menuLinks={[
                ...(isEnabled('leave') ? [{ label: 'Open leave approvals', onClick: () => navigate('/client-admin/leave-approvals') }] : []),
                ...(isEnabled('attendance') ? [{ label: 'Open regularizations', onClick: () => navigate('/client-admin/regularizations') }] : []),
                ...(goalsOn ? [{ label: 'Open goals', onClick: () => navigate('/client-admin/goals') }] : []),
                { label: 'Refresh list', onClick: loadRequests },
              ]}
            />
          </div>

          {/* ── Quick access ────────────────────────────────────────────── */}
          <div style={{ marginTop: 40 }}>
            <SectionHeading title="Quick Access" sub="Jump straight into the modules you use most" />
            <QuickAccessGrid links={visibleQuickLinks} onOpen={navigate} />
          </div>

          {/* ── Performance insights ────────────────────────────────────── */}
          <div style={{ marginTop: 40 }}>
            <SectionHeading
              title={isPmsActive ? 'Performance Insights' : 'Organisation Insights'}
              sub={isPmsActive ? 'Goals, KPIs, appraisals and alerts across the organisation' : 'Headcount, pending actions and alerts across the organisation'}
              right={isPmsActive ? <SegmentTabs tabs={INSIGHT_TABS} value={insightTab} onChange={setInsightTab} label="Insight focus" /> : null}
            />

            {isPmsActive && (
              <div className="pms-grid-4">
                {show('goals') && (
                  <InsightCard title="Total Goals" icon={<FiFlag size={14} />} value={goals.total || 0}
                    caption={<><strong style={{ color: PMS.blue }}>{goals.completion_rate || 0}%</strong> completed</>}
                    footer={<><strong style={{ color: PMS.navy }}>{goals.by_status?.active || 0}</strong> active · <strong style={{ color: PMS.navy }}>{goals.by_status?.draft || 0}</strong> draft</>}
                    onOpen={() => navigate('/client-admin/goals')} />
                )}
                {show('kpis') && (
                  <InsightCard title="KPI Assignments" icon={<FiBarChart2 size={14} />} value={kpis.total || 0}
                    caption={<><strong style={{ color: PMS.blue }}>{kB.approved}</strong> approved or running</>}
                    footer={<><strong style={{ color: PMS.navy }}>{kB.submitted}</strong> submitted · <strong style={{ color: PMS.navy }}>{kB.pending}</strong> draft</>}
                    onOpen={() => navigate('/client-admin/kpi')} />
                )}
                {show('appraisals') && (
                  <InsightCard title="Appraisal Cycles" icon={<FiRefreshCw size={14} />} value={appraisals.total_cycles || 0}
                    pill={`${appraisals.active_cycles || 0} live`}
                    caption={`${appraisals.draft_cycles || 0} draft · ${appraisals.closed_cycles || 0} closed`}
                    footer={<><strong style={{ color: PMS.navy }}>{stats?.departments || 0}</strong> depts · <strong style={{ color: PMS.navy }}>{employees.total || 0}</strong> reviewees</>}
                    onOpen={() => navigate('/client-admin/appraisal')} />
                )}
                {show('kpis') && (
                  <InsightCard title="KPI Approval" value={`${kpis.completion_rate || 0}%`}
                    caption={`${kpiPendingReview} awaiting review`}
                    footer={<><strong style={{ color: PMS.navy }}>{kB.approved}</strong> of {kpis.total || 0} approved</>}
                    onOpen={() => navigate('/client-admin/kpi')}>
                    <Ring pct={kpis.completion_rate || 0} size={60} stroke={6} label={`${kB.approved}/${kpis.total || 0}`} />
                  </InsightCard>
                )}
              </div>
            )}

            <div className="pms-grid-4" style={{ marginTop: isPmsActive ? 25 : 0 }}>
              {insightTab === 'overview' && (
                <DepartmentBarsCard className="pms-span-2" breakdown={stats?.department_breakdown || []} total={employees.total || 0} onOpen={() => navigate('/client-admin/departments')} />
              )}
              {isPmsActive && show('kpis') && (
                <StatusDonutCard title="KPI Status" pillText={`${kpis.total || 0} assigned`} buckets={kB} total={kpis.total || 0} onOpen={() => navigate('/client-admin/kpi')} />
              )}
              {isPmsActive && show('goals') && (
                <StatusDonutCard title="Goals by Status" pillText={`${goals.total || 0} goals`} buckets={gB} total={goals.total || 0} onOpen={() => navigate('/client-admin/goals')} />
              )}
            </div>

            <div className="pms-grid-4" style={{ marginTop: 25 }}>
              {insightTab === 'overview' && <PendingActionsChart className="pms-span-2" items={pendingActions} total={pendingTotal} />}
              {insightTab === 'overview' && <LatestAlertsCard alerts={notifications} onOpen={() => navigate('/client-admin/audit')} />}
              {isPmsActive && (show('goals') || show('appraisals')) && (
                <PerformanceOverviewCard buckets={gB} total={goals.total || 0} appraisals={appraisals} onOpen={() => navigate('/client-admin/appraisal')} />
              )}
            </div>

            {(insightTab === 'overview' || insightTab === 'goals') && (
              <div className="pms-grid-4" style={{ marginTop: 25 }}>
                {goalsOn && <RecentGoalsCard className="pms-span-2" goals={stats?.recent_goals || []} onOpen={() => navigate('/client-admin/goals')} />}
                {isEnabled('attendance') && insightTab === 'overview' && (
                  <TodayAttendanceCard className={goalsOn ? 'pms-span-2' : 'pms-span-full'} attendance={stats?.attendance_today} onOpen={() => navigate('/client-admin/attendance')} />
                )}
              </div>
            )}

            {goalsOn && (insightTab === 'overview' || insightTab === 'goals') && (
              <div style={{ marginTop: 25 }}>
                <PerformanceTrendCard trend={trend} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
