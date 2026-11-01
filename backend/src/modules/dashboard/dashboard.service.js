const repo = require('./dashboard.repository')
const ApiError = require('../../utils/apiError')
const { STATUS_CODES } = require('../../constants/statusCodes')
const clientModuleRepo = require('../clientModule/clientModule.repository')

async function resolveClientId(orgId) {
  const id = await repo.getClientAdminIdByOrg(orgId)
  if (!id) throw new ApiError(STATUS_CODES.FORBIDDEN, 'Client admin profile not found.')
  return id
}

function buildDateRange(range) {
  const now = new Date()
  if (range === 'week') {
    const from = new Date(now)
    from.setDate(now.getDate() - 7)
    return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
  }
  if (range === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
  }
  if (range === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    const from = new Date(now.getFullYear(), q * 3, 1)
    return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
  }
  return { dateFrom: null, dateTo: null }
}

async function getDashboardStats(orgId, range = 'all') {
  const clientId = await resolveClientId(orgId)
  const { dateFrom, dateTo } = buildDateRange(range)

  // Get enabled modules configuration
  const modules = await clientModuleRepo.getModulesForOrganization(orgId)
  const enabled = {}
  clientModuleRepo.SYSTEM_MODULES.forEach(m => {
    enabled[m.key] = true
  })
  modules.forEach(m => {
    enabled[m.module_key] = m.is_enabled
  })

  // Conditionally execute database queries for stats
  const isPmsActive = enabled['pms'] !== false && (enabled['goals'] || enabled['performance'] || enabled['kpi']);

  const employeesPromise = repo.getEmployeeStats(orgId)
  const departmentsPromise = repo.getDepartmentCount(orgId)
  const deptBreakdownPromise = repo.getDepartmentEmployeeBreakdown(orgId)
  const companyNamePromise = repo.getCompanyName()

  const goalsPromise = (isPmsActive && enabled['goals'])
    ? repo.getGoalStats(orgId, dateFrom, dateTo)
    : Promise.resolve({ by_status: {}, total: 0 })

  const kpisPromise = (isPmsActive && (enabled['goals'] || enabled['performance'] || enabled['kpi']))
    ? repo.getKpiStats(clientId, dateFrom, dateTo)
    : Promise.resolve({ by_status: {}, total: 0, completion_rate: 0 })

  const appraisalsPromise = (isPmsActive && enabled['performance'])
    ? repo.getAppraisalStats(clientId, dateFrom, dateTo)
    : Promise.resolve({ active_cycles: 0, closed_cycles: 0, draft_cycles: 0, total_cycles: 0 })

  const recentGoalsPromise = (isPmsActive && enabled['goals'])
    ? repo.getRecentGoals(orgId, dateFrom, dateTo)
    : Promise.resolve([])

  const trendPromise = (isPmsActive && enabled['goals'])
    ? repo.getGoalCompletionTrend(orgId)
    : Promise.resolve([])

  const attendanceTodayPromise = enabled['attendance']
    ? repo.getTodayAttendanceSummary(orgId)
    : Promise.resolve(null)

  const pendingLeavesPromise = enabled['leave']
    ? repo.getPendingLeavesCount(orgId)
    : Promise.resolve(0)

  const pendingRegularizationsPromise = enabled['attendance']
    ? repo.getPendingRegularizationsCount(orgId)
    : Promise.resolve(0)

  const [
    employees,
    departments,
    goals,
    kpis,
    appraisals,
    recentGoals,
    trend,
    deptBreakdown,
    companyName,
    attendanceToday,
    pendingLeaves,
    pendingRegularizations
  ] = await Promise.all([
    employeesPromise,
    departmentsPromise,
    goalsPromise,
    kpisPromise,
    appraisalsPromise,
    recentGoalsPromise,
    trendPromise,
    deptBreakdownPromise,
    companyNamePromise,
    attendanceTodayPromise,
    pendingLeavesPromise,
    pendingRegularizationsPromise,
  ])

  // Normalize raw DB statuses → frontend-expected keys
  const raw = goals.by_status || {}
  const normalizedByStatus = {
    active:           (Number(raw.active || 0)) + (Number(raw.in_progress || 0)),
    completed:        (Number(raw.completed || 0)) + (Number(raw.approved || 0)),
    pending_approval: (Number(raw.pending_approval || 0)) + (Number(raw.submitted || 0)),
    draft:            Number(raw.draft || 0),
    rejected:         Number(raw.rejected || 0),
    overdue:          Number(raw.overdue || 0),
  }

  const completedGoals = normalizedByStatus.completed
  const goalCompletionRate = (goals.total && goals.total > 0)
    ? Math.round((completedGoals / goals.total) * 100)
    : 0

  return {
    company_name: companyName,
    pms_enabled: Boolean(isPmsActive),
    employees: {
      active: Number(employees.active || 0),
      inactive: Number(employees.inactive || 0),
      total: Number(employees.total || 0),
    },
    departments,
    goals: {
      by_status: normalizedByStatus,
      total: Number(goals.total || 0),
      completion_rate: goalCompletionRate,
    },
    kpis: {
      by_status: kpis?.by_status || {},
      total: Number(kpis?.total || 0),
      completion_rate: Number(kpis?.completion_rate || 0),
    },
    appraisals: {
      active_cycles: Number(appraisals.active_cycles || 0),
      closed_cycles: Number(appraisals.closed_cycles || 0),
      draft_cycles: Number(appraisals.draft_cycles || 0),
      total_cycles: Number(appraisals.total_cycles || 0),
    },
    recent_goals: recentGoals,
    goal_trend: trend,
    department_breakdown: deptBreakdown,
    attendance_today: attendanceToday,
    pending_leaves: pendingLeaves,
    pending_regularizations: pendingRegularizations,
  }
}

async function getNotifications(orgId) {
  const clientId = await resolveClientId(orgId)
  const modules = await clientModuleRepo.getModulesForOrganization(orgId)
  const enabled = {}
  modules.forEach(m => { enabled[m.module_key] = m.is_enabled })
  const isPmsActive = enabled['pms'] !== false

  const rows = await repo.getRecentNotifications(clientId, {
    includeGoals: Boolean(isPmsActive && enabled['goals']),
    includeKpi: Boolean(isPmsActive && (enabled['goals'] || enabled['kpi'])),
  })
  return rows
}

module.exports = { getDashboardStats, getNotifications }
