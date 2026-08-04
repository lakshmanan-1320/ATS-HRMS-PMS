const { query } = require('../../config/db')

async function getCompanyName() {
  const r = await query('SELECT name FROM companies WHERE id = 1')
  return r.rows[0]?.name || null
}

async function getClientAdminIdByOrg(orgId) {
  const r = await query('SELECT client_admin_id FROM client_admins WHERE organization_id = $1', [orgId])
  return r.rows[0]?.client_admin_id || null
}

async function getEmployeeStats(orgId) {
  const r = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active')   AS active,
      COUNT(*) FILTER (WHERE status != 'active')  AS inactive,
      COUNT(*)                                     AS total
    FROM employees WHERE organization_id = $1
  `, [orgId])
  return r.rows[0]
}

async function getDepartmentCount(orgId) {
  const r = await query(
    "SELECT COUNT(*) AS total FROM departments WHERE organization_id = $1 AND status = 'active'",
    [orgId]
  )
  return Number(r.rows[0]?.total || 0)
}

async function getGoalStats(clientId, dateFrom, dateTo) {
  const params = [clientId]
  let dateFilter = ''
  if (dateFrom) { params.push(dateFrom); dateFilter += ` AND created_at >= $${params.length}::timestamptz` }
  if (dateTo)   { params.push(dateTo);   dateFilter += ` AND created_at <= $${params.length}::timestamptz` }

  const r = await query(`
    SELECT status, COUNT(*) AS count
    FROM goals
    WHERE client_admin_id = $1 AND parent_goal_id IS NULL${dateFilter}
    GROUP BY status
  `, params)
  const map = {}
  r.rows.forEach(row => { map[row.status] = Number(row.count) })
  const total = Object.values(map).reduce((a, b) => a + b, 0)
  return { by_status: map, total }
}

async function getKpiStats(clientId, dateFrom, dateTo) {
  const params = [clientId]
  let dateFilter = ''
  if (dateFrom) { params.push(dateFrom); dateFilter += ` AND k.created_at >= $${params.length}::timestamptz` }
  if (dateTo)   { params.push(dateTo);   dateFilter += ` AND k.created_at <= $${params.length}::timestamptz` }

  const r = await query(`
    SELECT k.status, COUNT(*) AS count
    FROM goal_kpis k
    JOIN client_admins ca ON k.organization_id = ca.organization_id
    WHERE ca.client_admin_id = $1${dateFilter}
    GROUP BY k.status
  `, params)
  const map = {}
  r.rows.forEach(row => { map[row.status] = Number(row.count) })
  const total = Object.values(map).reduce((a, b) => a + b, 0)
  const approved = Number(map.ACTIVE || 0) + Number(map.COMPLETED || 0)
  return {
    by_status: map,
    total,
    completion_rate: total > 0 ? Math.round((approved / total) * 100) : 0,
  }
}

async function getAppraisalStats(clientId, dateFrom, dateTo) {
  const params = [clientId]
  let dateFilter = ''
  if (dateFrom) { params.push(dateFrom); dateFilter += ` AND ac.created_at >= $${params.length}::timestamptz` }
  if (dateTo)   { params.push(dateTo);   dateFilter += ` AND ac.created_at <= $${params.length}::timestamptz` }

  const r = await query(`
    SELECT
      COUNT(*) FILTER (WHERE ac.status = 'active')  AS active_cycles,
      COUNT(*) FILTER (WHERE ac.status = 'closed')  AS closed_cycles,
      COUNT(*) FILTER (WHERE ac.status = 'draft')   AS draft_cycles,
      COUNT(*)                                        AS total_cycles
    FROM appraisal_cycles ac
    WHERE ac.client_admin_id = $1${dateFilter}
  `, params)
  return r.rows[0]
}

async function getRecentGoals(clientId, dateFrom, dateTo) {
  const params = [clientId]
  let dateFilter = ''
  if (dateFrom) { params.push(dateFrom); dateFilter += ` AND g.created_at >= $${params.length}::timestamptz` }
  if (dateTo)   { params.push(dateTo);   dateFilter += ` AND g.created_at <= $${params.length}::timestamptz` }

  const r = await query(`
    SELECT g.goal_id, g.title, g.status, g.weight, g.due_date,
           CONCAT(e.first_name, ' ', e.last_name) AS assigned_to
    FROM goals g
    LEFT JOIN employees e ON g.assigned_to_employee_id = e.employee_id
    WHERE g.client_admin_id = $1 AND g.parent_goal_id IS NULL${dateFilter}
    ORDER BY g.created_at DESC
    LIMIT 6
  `, params)
  return r.rows
}

async function getGoalCompletionTrend(clientId) {
  const r = await query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed
    FROM goals
    WHERE client_admin_id = $1
      AND parent_goal_id IS NULL
      AND created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at)
  `, [clientId])
  return r.rows
}

async function getRecentNotifications(clientId) {
  const r = await query(`
    (
      SELECT 'goal_pending' AS type,
             g.title,
             CONCAT(e.first_name, ' ', e.last_name) AS actor,
             g.updated_at AS created_at
      FROM goals g
      LEFT JOIN employees e ON g.assigned_to_employee_id = e.employee_id
      WHERE g.client_admin_id = $1 AND g.status = 'pending_approval'
        AND g.parent_goal_id IS NULL
      ORDER BY g.updated_at DESC LIMIT 3
    )
    UNION ALL
    (
      SELECT 'kpi_submitted' AS type,
             gk.title,
             CONCAT(e.first_name, ' ', e.last_name) AS actor,
             s.submitted_at AS created_at
      FROM goal_kpi_submissions s
      JOIN goal_kpis gk ON s.kpi_id = gk.kpi_id
      JOIN client_admins ca ON s.organization_id = ca.organization_id
      LEFT JOIN users u ON s.submitted_by = u.user_id
      LEFT JOIN employees e ON u.employee_id = e.employee_id
      WHERE ca.client_admin_id = $1 AND s.status = 'PENDING'
      ORDER BY s.submitted_at DESC LIMIT 3
    )
    UNION ALL
    (
      SELECT 'goal_rejected' AS type,
             g.title,
             CONCAT(e.first_name, ' ', e.last_name) AS actor,
             g.updated_at AS created_at
      FROM goals g
      LEFT JOIN employees e ON g.assigned_to_employee_id = e.employee_id
      WHERE g.client_admin_id = $1 AND g.status = 'rejected'
        AND g.parent_goal_id IS NULL
      ORDER BY g.updated_at DESC LIMIT 2
    )
    UNION ALL
    (
      SELECT 'leave_pending' AS type,
             lt.leave_type_name AS title,
             CONCAT(e.first_name, ' ', e.last_name) AS actor,
             lr.created_at
      FROM leave_requests lr
      JOIN employees e ON e.employee_id = lr.employee_id
      JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
      JOIN client_admins ca ON ca.organization_id = e.organization_id
      WHERE ca.client_admin_id = $1 AND lr.current_status = 'PENDING'
      ORDER BY lr.created_at DESC LIMIT 3
    )
    UNION ALL
    (
      SELECT 'regularization_pending' AS type,
             ar.regularization_type AS title,
             CONCAT(e.first_name, ' ', e.last_name) AS actor,
             ar.created_at
      FROM attendance_regularizations ar
      JOIN employees e ON e.employee_id = ar.employee_id
      JOIN client_admins ca ON ca.organization_id = e.organization_id
      WHERE ca.client_admin_id = $1 AND ar.current_status = 'PENDING'
      ORDER BY ar.created_at DESC LIMIT 3
    )
    ORDER BY created_at DESC
    LIMIT 10
  `, [clientId])
  return r.rows
}

async function getPendingLeavesCount(orgId) {
  const r = await query(`
    SELECT COUNT(*) AS count
    FROM leave_requests lr
    JOIN employees e ON e.employee_id = lr.employee_id
    WHERE e.organization_id = $1 AND lr.current_status = 'PENDING'
  `, [orgId])
  return Number(r.rows[0]?.count || 0)
}

async function getPendingRegularizationsCount(orgId) {
  const r = await query(`
    SELECT COUNT(*) AS count
    FROM attendance_regularizations ar
    JOIN employees e ON e.employee_id = ar.employee_id
    WHERE e.organization_id = $1 AND ar.current_status = 'PENDING'
  `, [orgId])
  return Number(r.rows[0]?.count || 0)
}

async function getTodayAttendanceSummary(orgId) {
  const r = await query(`
    SELECT
      COUNT(e.employee_id)                               AS total,
      COUNT(ap.attendance_punch_id)                      AS present
    FROM employees e
    LEFT JOIN users u ON u.employee_id = e.employee_id
    LEFT JOIN attendance_punches ap
      ON ap.employee_id = u.user_id
      AND ap.attendance_date = CURRENT_DATE
    WHERE e.organization_id = $1 AND e.status = 'active'
  `, [orgId])
  const total   = Number(r.rows[0]?.total   || 0)
  const present = Number(r.rows[0]?.present || 0)
  return { total, present, absent: total - present }
}

async function getDepartmentEmployeeBreakdown(orgId) {
  const r = await query(`
    SELECT d.name AS department, COUNT(e.employee_id) AS employee_count
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.department_id AND e.status = 'active'
    WHERE d.organization_id = $1 AND d.status = 'active'
    GROUP BY d.name
    ORDER BY employee_count DESC
    LIMIT 5
  `, [orgId])
  return r.rows
}

module.exports = {
  getCompanyName,
  getClientAdminIdByOrg,
  getEmployeeStats,
  getDepartmentCount,
  getGoalStats,
  getKpiStats,
  getAppraisalStats,
  getRecentGoals,
  getGoalCompletionTrend,
  getDepartmentEmployeeBreakdown,
  getRecentNotifications,
  getTodayAttendanceSummary,
  getPendingLeavesCount,
  getPendingRegularizationsCount,
}
