const { query } = require('../../config/db')

async function getClientAdminIdByOrg(orgId) {
  const r = await query(
    'SELECT client_admin_id FROM client_admins WHERE organization_id = $1',
    [orgId]
  )
  return r.rows[0]?.client_admin_id || null
}

// ── Filters for department/employee dropdowns ─────────────────────────────────

async function getDepartmentList(orgId) {
  const r = await query(
    `SELECT department_id AS id, name FROM departments
     WHERE organization_id = $1 AND status = 'active'
     ORDER BY name`,
    [orgId]
  )
  return r.rows
}

async function getEmployeeList(orgId) {
  const r = await query(
    `SELECT employee_id AS id, CONCAT(first_name,' ',last_name) AS name, employee_code
     FROM employees
     WHERE organization_id = $1 AND status = 'active'
     ORDER BY first_name, last_name`,
    [orgId]
  )
  return r.rows
}

// ── Reporting Hierarchy Subordinates ──────────────────────────────────────────

async function getVisibleEmployeeIds(employeeId) {
  const r = await query(`
    WITH RECURSIVE subordinates AS (
      SELECT employee_id FROM employees WHERE employee_id = $1
      UNION ALL
      SELECT e.employee_id FROM employees e
      INNER JOIN subordinates s ON e.manager_employee_id = s.employee_id
    )
    SELECT employee_id FROM subordinates
  `, [employeeId])
  return r.rows.map(row => row.employee_id)
}

// ── Dashboard KPI ─────────────────────────────────────────────────────────────

async function getExecutiveDashboard(orgId, visibleEmployeeIds = null) {
  const empRes = await query(`
    SELECT 
      COUNT(CASE WHEN e.status = 'active' THEN 1 END) AS active_count,
      COUNT(CASE WHEN e.status = 'inactive' THEN 1 END) AS inactive_count,
      COUNT(CASE WHEN (e.date_of_joining + (COALESCE(c.probation_months, 6) * INTERVAL '1 month')) > NOW() AND e.status = 'active' THEN 1 END) AS probation_count,
      COUNT(CASE WHEN e.gender = 'Male' THEN 1 END) AS male_count,
      COUNT(CASE WHEN e.gender = 'Female' THEN 1 END) AS female_count
    FROM employees e
    LEFT JOIN companies c ON 1=1
    WHERE e.organization_id = $1
      AND ($2::uuid[] IS NULL OR e.employee_id = ANY($2::uuid[]))
  `, [orgId, visibleEmployeeIds])

  const attendanceRes = await query(`
    SELECT 
      COUNT(CASE WHEN ap.attendance_result = 'PRESENT' THEN 1 END) AS present_count,
      COUNT(CASE WHEN ap.attendance_result = 'LATE_ARRIVAL' THEN 1 END) AS late_count,
      COUNT(CASE WHEN ap.attendance_result = 'ABSENT' THEN 1 END) AS absent_count,
      COUNT(CASE WHEN ap.location_status = 'OUTSIDE_GEOFENCE' THEN 1 END) AS missing_fence_count
    FROM attendance_punches ap
    JOIN users u ON ap.employee_id = u.user_id
    JOIN employees e ON u.employee_id = e.employee_id
    WHERE e.organization_id = $1
      AND ap.attendance_date = CURRENT_DATE
      AND ($2::uuid[] IS NULL OR e.employee_id = ANY($2::uuid[]))
  `, [orgId, visibleEmployeeIds])

  const pendingRes = await query(`
    SELECT
      (SELECT COUNT(*) FROM leave_requests lr JOIN employees e ON lr.employee_id = e.employee_id WHERE e.organization_id = $1 AND lr.current_status = 'PENDING' AND ($2::uuid[] IS NULL OR e.employee_id = ANY($2::uuid[]))) AS pending_leaves_count,
      (SELECT COUNT(*) FROM overtime_requests otr JOIN employees e ON otr.employee_id = e.employee_id WHERE e.organization_id = $1 AND otr.approval_status = 'PENDING' AND ($2::uuid[] IS NULL OR e.employee_id = ANY($2::uuid[]))) AS pending_ot_count,
      (SELECT COUNT(*) FROM attendance_regularizations arr JOIN employees e ON arr.employee_id = e.employee_id WHERE e.organization_id = $1 AND arr.current_status = 'PENDING' AND ($2::uuid[] IS NULL OR e.employee_id = ANY($2::uuid[]))) AS pending_reg_count
  `, [orgId, visibleEmployeeIds])

  const confirmationRes = await query(`
    SELECT 
      e.employee_code,
      CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
      (e.date_of_joining + (COALESCE(c.probation_months, 6) * INTERVAL '1 month'))::date AS confirmation_date
    FROM employees e
    LEFT JOIN companies c ON 1=1
    WHERE e.organization_id = $1
      AND e.status = 'active'
      AND ($2::uuid[] IS NULL OR e.employee_id = ANY($2::uuid[]))
      AND (e.date_of_joining + (COALESCE(c.probation_months, 6) * INTERVAL '1 month')) >= NOW()::date
      AND (e.date_of_joining + (COALESCE(c.probation_months, 6) * INTERVAL '1 month')) <= (NOW() + INTERVAL '30 days')::date
  `, [orgId, visibleEmployeeIds])

  const birthdayRes = await query(`
    SELECT 
      e.employee_code,
      CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
      e.date_of_birth
    FROM employees e
    WHERE e.organization_id = $1
      AND e.status = 'active'
      AND ($2::uuid[] IS NULL OR e.employee_id = ANY($2::uuid[]))
      AND (
        (EXTRACT(MONTH FROM e.date_of_birth) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(DAY FROM e.date_of_birth) >= EXTRACT(DAY FROM NOW()))
        OR
        (EXTRACT(MONTH FROM e.date_of_birth) = EXTRACT(MONTH FROM (NOW() + INTERVAL '30 days')) AND EXTRACT(DAY FROM e.date_of_birth) <= EXTRACT(DAY FROM (NOW() + INTERVAL '30 days')))
      )
  `, [orgId, visibleEmployeeIds])

  return {
    employees: empRes.rows[0],
    attendance_today: attendanceRes.rows[0],
    pending_tasks: pendingRes.rows[0],
    upcoming_confirmations: confirmationRes.rows,
    upcoming_birthdays: birthdayRes.rows
  }
}

// ── Goal Report ───────────────────────────────────────────────────────────────

async function getGoalReport(clientId, filters = {}, visibleEmployeeIds = null) {
  const conditions = ['g.client_admin_id = $1', 'g.parent_goal_id IS NULL']
  const params = [clientId]
  let i = 2

  if (filters.department_id) {
    conditions.push(`g.assigned_to_department_id = $${i++}`)
    params.push(filters.department_id)
  }
  if (filters.employee_id) {
    conditions.push(`g.assigned_to_employee_id = $${i++}`)
    params.push(filters.employee_id)
  }
  if (filters.status) {
    conditions.push(`g.status = $${i++}`)
    params.push(filters.status)
  }
  if (filters.goal_type) {
    conditions.push(`g.goal_type = $${i++}`)
    params.push(filters.goal_type)
  }
  if (filters.date_from) {
    conditions.push(`g.created_at >= $${i++}::timestamptz`)
    params.push(filters.date_from)
  }
  if (filters.date_to) {
    conditions.push(`g.created_at <= $${i++}::timestamptz`)
    params.push(filters.date_to)
  }
  if (visibleEmployeeIds) {
    conditions.push(`g.assigned_to_employee_id = ANY($${i++}::uuid[])`)
    params.push(visibleEmployeeIds)
  }

  const r = await query(`
    SELECT
      g.goal_id,
      g.title,
      g.goal_type,
      g.status,
      g.priority,
      g.progress,
      g.weight,
      g.start_date,
      g.due_date,
      g.created_at,
      CONCAT(e.first_name,' ',e.last_name) AS employee_name,
      e.employee_code,
      d.name AS department_name,
      CONCAT(me.first_name,' ',me.last_name) AS manager_name
    FROM goals g
    LEFT JOIN employees e  ON g.assigned_to_employee_id = e.employee_id
    LEFT JOIN departments d ON g.assigned_to_department_id = d.department_id
    LEFT JOIN employees me ON e.manager_employee_id = me.employee_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY g.created_at DESC
  `, params)

  return r.rows
}

// ── Appraisal Report ──────────────────────────────────────────────────────────

async function getAppraisalCycleList(clientId) {
  const r = await query(
    `SELECT appraisal_cycle_id AS id, name, period_start, period_end, status
     FROM appraisal_cycles
     WHERE client_admin_id = $1
     ORDER BY period_start DESC`,
    [clientId]
  )
  return r.rows
}

async function getAppraisalReport(clientId, cycleId, visibleEmployeeIds = null) {
  const conditions = ['e.organization_id = (SELECT organization_id FROM client_admins WHERE client_admin_id = $1)', 'e.status = \'active\'']
  const params = [clientId, cycleId]
  let i = 3

  if (visibleEmployeeIds) {
    conditions.push(`e.employee_id = ANY($${i++}::uuid[])`)
    params.push(visibleEmployeeIds)
  }

  const r = await query(`
    SELECT
      e.employee_id,
      e.employee_code,
      CONCAT(e.first_name,' ',e.last_name) AS employee_name,
      e.designation,
      d.name AS department_name,
      CONCAT(m.first_name,' ',m.last_name) AS manager_name,
      sa.status         AS self_status,
      sa.submitted_at   AS self_submitted_at,
      ma.status         AS manager_status,
      ma.submitted_at   AS manager_submitted_at,
      ma.final_rating
    FROM employees e
    LEFT JOIN departments d  ON e.department_id = d.department_id
    LEFT JOIN employees m    ON e.manager_employee_id = m.employee_id
    LEFT JOIN self_appraisals    sa ON sa.cycle_id = $2 AND sa.employee_id = e.employee_id
    LEFT JOIN manager_appraisals ma ON ma.cycle_id = $2 AND ma.employee_id = e.employee_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.first_name, e.last_name
  `, params)

  return r.rows
}

// ── KPI Report ────────────────────────────────────────────────────────────────

async function getKpiReport(clientId, filters = {}, visibleEmployeeIds = null) {
  const conditions = ['ca.client_admin_id = $1']
  const params = [clientId]
  let i = 2

  if (filters.status) {
    conditions.push(`k.status = $${i++}`)
    params.push(filters.status)
  }
  if (filters.category) {
    conditions.push(`k.kpi_type = $${i++}`)
    params.push(filters.category)
  }
  if (filters.employee_id) {
    conditions.push(`g.assigned_to_employee_id = $${i++}`)
    params.push(filters.employee_id)
  }
  if (visibleEmployeeIds) {
    conditions.push(`g.assigned_to_employee_id = ANY($${i++}::uuid[])`)
    params.push(visibleEmployeeIds)
  }

  const r = await query(`
    SELECT
      k.kpi_id AS id,
      k.title AS kpi_name,
      k.kpi_code AS code,
      k.kpi_type AS category,
      k.unit AS measurement_unit,
      'linear' AS scoring_method,
      k.target_value,
      k.approved_value AS achieved_value,
      k.weight_percentage AS weight,
      k.status,
      false AS over_achievement_allowed,
      k.completion_percentage AS achievement_pct,
      g.title   AS goal_title,
      g.status  AS goal_status,
      CONCAT(e.first_name,' ',e.last_name) AS employee_name,
      e.employee_code,
      d.name AS department_name,
      CONCAT(ab.first_name,' ',ab.last_name) AS approved_by_name,
      k.updated_at AS approved_at,
      k.updated_at AS entered_at
    FROM goal_kpis k
    JOIN client_admins ca ON k.organization_id = ca.organization_id
    JOIN goals g         ON k.goal_id = g.goal_id
    LEFT JOIN employees e  ON g.assigned_to_employee_id = e.employee_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN users u_ab ON k.approved_by = u_ab.user_id
    LEFT JOIN employees ab ON u_ab.employee_id = ab.employee_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.first_name, g.title, k.title
  `, params)

  return r.rows
}

async function getKpiCategories(clientId) {
  const r = await query(
    `SELECT DISTINCT kpi_type AS category FROM kpi_library kl
     JOIN client_admins ca ON kl.organization_id = ca.organization_id
     WHERE ca.client_admin_id = $1 AND kl.kpi_type IS NOT NULL
     ORDER BY category`,
    [clientId]
  )
  return r.rows.map(row => row.category)
}

// ── Payroll Reports ───────────────────────────────────────────────────────────

async function getPayrollRunList(orgId) {
  const r = await query(
    `SELECT payroll_run_id AS id, payroll_month, payroll_year, current_status,
            payroll_start_date, payroll_end_date
     FROM payroll_runs
     WHERE organization_id = $1
     ORDER BY payroll_year DESC, payroll_month DESC`,
    [orgId]
  )
  return r.rows
}

async function getPayrollReport(orgId, runId, filters = {}, visibleEmployeeIds = null) {
  const conditions = ['ep.payroll_run_id = $1', 'pr.organization_id = $2']
  const params = [runId, orgId]
  let i = 3

  if (filters.department_id) {
    conditions.push(`e.department_id = $${i++}`)
    params.push(filters.department_id)
  }
  if (visibleEmployeeIds) {
    conditions.push(`e.employee_id = ANY($${i++}::uuid[])`)
    params.push(visibleEmployeeIds)
  }

  const r = await query(`
    SELECT
      ep.employee_payroll_id,
      e.employee_code,
      CONCAT(e.first_name,' ',e.last_name) AS employee_name,
      e.designation,
      d.name    AS department_name,
      ss.structure_name,
      ep.working_days,
      ep.present_days,
      ep.paid_leave_days,
      ep.holiday_days,
      ep.week_off_days,
      ep.lop_days,
      ep.gross_salary,
      ep.total_earnings,
      ep.total_additions,
      ep.total_deductions,
      ep.net_salary,
      ep.current_status,
      pr.payroll_month,
      pr.payroll_year,
      pr.payroll_start_date,
      pr.payroll_end_date,
      pr.current_status AS run_status
    FROM employee_payrolls ep
    JOIN employees e         ON ep.employee_id = e.employee_id
    LEFT JOIN salary_structures ss ON ep.salary_structure_id = ss.salary_structure_id
    JOIN payroll_runs pr      ON ep.payroll_run_id = pr.payroll_run_id
    LEFT JOIN departments d   ON e.department_id = d.department_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.first_name, e.last_name
  `, params)

  const payrolls = r.rows
  if (payrolls.length === 0) return []

  const compsRes = await query(`
    SELECT epc.employee_payroll_id, epc.component_code, epc.actual_amount
    FROM employee_payroll_components epc
    JOIN employee_payrolls ep ON epc.employee_payroll_id = ep.employee_payroll_id
    WHERE ep.payroll_run_id = $1
  `, [runId])

  const compsMap = {}
  compsRes.rows.forEach(c => {
    if (!compsMap[c.employee_payroll_id]) {
      compsMap[c.employee_payroll_id] = {}
    }
    compsMap[c.employee_payroll_id][c.component_code] = parseFloat(c.actual_amount)
  })

  payrolls.forEach(p => {
    p.components = compsMap[p.employee_payroll_id] || {}
  })

  return payrolls
}

// ── Comprehensive Employee Directory ──────────────────────────────────────────

async function getEmployeeReport(orgId, filters = {}, visibleEmployeeIds = null) {
  const conditions = ['e.organization_id = $1']
  const params = [orgId]
  let i = 2

  if (filters.department_id) {
    conditions.push(`e.department_id = $${i++}`)
    params.push(filters.department_id)
  }
  if (filters.status) {
    conditions.push(`e.status = $${i++}`)
    params.push(filters.status)
  }
  if (filters.manager_employee_id) {
    conditions.push(`e.manager_employee_id = $${i++}`)
    params.push(filters.manager_employee_id)
  }
  if (visibleEmployeeIds) {
    conditions.push(`e.employee_id = ANY($${i++}::uuid[])`)
    params.push(visibleEmployeeIds)
  }

  const r = await query(`
    SELECT 
      e.employee_id,
      e.employee_code,
      CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
      e.email,
      e.phone,
      d.name as department_name,
      e.designation,
      e.status,
      e.date_of_joining,
      CONCAT(mgr.first_name, ' ', mgr.last_name) AS manager_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN employees mgr ON e.manager_employee_id = mgr.employee_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.first_name, e.last_name
  `, params)

  return r.rows
}

// ── Attendance Registers ──────────────────────────────────────────────────────

async function getAttendanceReport(orgId, filters = {}, visibleEmployeeIds = null) {
  const conditions = ['e.organization_id = $1']
  const params = [orgId]
  let i = 2

  if (filters.start_date) {
    conditions.push(`ap.attendance_date >= $${i++}::date`)
    params.push(filters.start_date)
  }
  if (filters.end_date) {
    conditions.push(`ap.attendance_date <= $${i++}::date`)
    params.push(filters.end_date)
  }
  if (filters.department_id) {
    conditions.push(`e.department_id = $${i++}`)
    params.push(filters.department_id)
  }
  if (filters.shift_id) {
    conditions.push(`ap.shift_id = $${i++}`)
    params.push(filters.shift_id)
  }
  if (filters.attendance_result) {
    conditions.push(`ap.attendance_result = $${i++}`)
    params.push(filters.attendance_result)
  }
  if (filters.location_status) {
    conditions.push(`ap.location_status = $${i++}`)
    params.push(filters.location_status)
  }
  if (filters.missing_punch === 'true') {
    conditions.push(`(ap.check_in_time IS NULL OR ap.check_out_time IS NULL)`)
  }
  if (visibleEmployeeIds) {
    conditions.push(`e.employee_id = ANY($${i++}::uuid[])`)
    params.push(visibleEmployeeIds)
  }

  const r = await query(`
    SELECT 
      ap.attendance_punch_id,
      e.employee_code,
      CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
      d.name as department_name,
      ap.attendance_date,
      ap.check_in_time AS check_in,
      ap.check_out_time AS check_out,
      ap.work_duration_minutes / 60.0 AS working_hours,
      GREATEST(0, ROUND(EXTRACT(EPOCH FROM (ap.check_in_time::time - sh.start_time))/60.0)) AS late_minutes,
      GREATEST(0, ROUND(EXTRACT(EPOCH FROM (sh.end_time - ap.check_out_time::time))/60.0)) AS early_exit_minutes,
      ap.attendance_result,
      ap.location_status,
      sh.shift_name
    FROM attendance_punches ap
    JOIN users u ON ap.employee_id = u.user_id
    JOIN employees e ON u.employee_id = e.employee_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN attendance_shifts sh ON ap.shift_id = sh.shift_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ap.attendance_date DESC, e.first_name
  `, params)

  return r.rows
}

// ── Attendance Regularizations ────────────────────────────────────────────────

async function getRegularizationReport(orgId, filters = {}, visibleEmployeeIds = null) {
  const conditions = ['e.organization_id = $1']
  const params = [orgId]
  let i = 2

  if (filters.start_date) {
    conditions.push(`arr.attendance_date >= $${i++}::date`)
    params.push(filters.start_date)
  }
  if (filters.end_date) {
    conditions.push(`arr.attendance_date <= $${i++}::date`)
    params.push(filters.end_date)
  }
  if (filters.department_id) {
    conditions.push(`e.department_id = $${i++}`)
    params.push(filters.department_id)
  }
  if (filters.approval_status) {
    conditions.push(`arr.current_status = $${i++}`)
    params.push(filters.approval_status)
  }
  if (visibleEmployeeIds) {
    conditions.push(`e.employee_id = ANY($${i++}::uuid[])`)
    params.push(visibleEmployeeIds)
  }

  const r = await query(`
    SELECT 
      arr.regularization_id,
      e.employee_code,
      CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
      d.name as department_name,
      arr.attendance_date,
      arr.regularization_type,
      arr.requested_checkin_time AS check_in_requested,
      arr.requested_checkout_time AS check_out_requested,
      arr.current_status AS approval_status,
      arr.reason,
      CONCAT(appr.first_name, ' ', appr.last_name) AS approved_by_name
    FROM attendance_regularizations arr
    JOIN employees e ON arr.employee_id = e.employee_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN employees appr ON arr.approved_by_employee_id = appr.employee_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY arr.attendance_date DESC, e.first_name
  `, params)

  return r.rows
}

// ── Leaves Registers ──────────────────────────────────────────────────────────

async function getLeaveReport(orgId, filters = {}, visibleEmployeeIds = null) {
  const conditions = ['e.organization_id = $1']
  const params = [orgId]
  let i = 2

  if (filters.start_date) {
    conditions.push(`lr.start_date >= $${i++}::date`)
    params.push(filters.start_date)
  }
  if (filters.end_date) {
    conditions.push(`lr.end_date <= $${i++}::date`)
    params.push(filters.end_date)
  }
  if (filters.department_id) {
    conditions.push(`e.department_id = $${i++}`)
    params.push(filters.department_id)
  }
  if (filters.status) {
    conditions.push(`lr.current_status = $${i++}`)
    params.push(filters.status)
  }
  if (visibleEmployeeIds) {
    conditions.push(`e.employee_id = ANY($${i++}::uuid[])`)
    params.push(visibleEmployeeIds)
  }

  const r = await query(`
    SELECT 
      lr.leave_request_id,
      e.employee_code,
      CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
      d.name as department_name,
      lt.leave_type_name,
      lr.start_date,
      lr.end_date,
      lr.total_leave_days,
      lr.session_type,
      lr.current_status,
      lr.leave_reason AS reason,
      CONCAT(appr.first_name, ' ', appr.last_name) AS approved_by_name
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.employee_id
    LEFT JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN employees appr ON lr.approved_by_employee_id = appr.employee_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY lr.start_date DESC, e.first_name
  `, params)

  return r.rows
}

// ── Overtime Registers ────────────────────────────────────────────────────────

async function getOvertimeReport(orgId, filters = {}, visibleEmployeeIds = null) {
  const conditions = ['e.organization_id = $1']
  const params = [orgId]
  let i = 2

  if (filters.start_date) {
    conditions.push(`otr.attendance_date >= $${i++}::date`)
    params.push(filters.start_date)
  }
  if (filters.end_date) {
    conditions.push(`otr.attendance_date <= $${i++}::date`)
    params.push(filters.end_date)
  }
  if (filters.department_id) {
    conditions.push(`e.department_id = $${i++}`)
    params.push(filters.department_id)
  }
  if (filters.status) {
    conditions.push(`otr.approval_status = $${i++}`)
    params.push(filters.status)
  }
  if (visibleEmployeeIds) {
    conditions.push(`e.employee_id = ANY($${i++}::uuid[])`)
    params.push(visibleEmployeeIds)
  }

  const r = await query(`
    SELECT 
      otr.overtime_request_id,
      e.employee_code,
      CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
      d.name as department_name,
      otr.attendance_date,
      otr.day_type,
      otr.requested_ot_minutes / 60.0 AS requested_hours,
      otr.approved_ot_minutes / 60.0 AS approved_hours,
      0.00 AS amount_paid,
      otr.approval_status,
      CONCAT(appr.first_name, ' ', appr.last_name) AS approved_by_name
    FROM overtime_requests otr
    JOIN employees e ON otr.employee_id = e.employee_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN users appru ON otr.approved_by = appru.user_id
    LEFT JOIN employees appr ON appru.employee_id = appr.employee_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY otr.attendance_date DESC, e.first_name
  `, params)

  return r.rows
}

// ── Holidays Registers ────────────────────────────────────────────────────────

async function getHolidayReport(orgId) {
  const r = await query(`
    SELECT 
      holiday_id,
      holiday_name,
      holiday_date,
      holiday_type,
      description
    FROM holidays
    WHERE is_deleted = false AND is_active = true
    ORDER BY holiday_date ASC
  `)
  return r.rows
}

// ── Shift Timeline Directory ──────────────────────────────────────────────────

async function getShiftReport(orgId, filters = {}, visibleEmployeeIds = null) {
  const conditions = ['e.organization_id = $1', 'e.status = \'active\'']
  const params = [orgId]
  let i = 2

  if (filters.department_id) {
    conditions.push(`e.department_id = $${i++}`)
    params.push(filters.department_id)
  }
  if (visibleEmployeeIds) {
    conditions.push(`e.employee_id = ANY($${i++}::uuid[])`)
    params.push(visibleEmployeeIds)
  }

  const r = await query(`
    SELECT DISTINCT ON (e.employee_id)
      e.employee_id,
      e.employee_code,
      CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
      d.name AS department_name,
      s.shift_name,
      s.shift_code,
      s.start_time,
      s.end_time
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN shift_assignments sa ON sa.employee_id = e.employee_id AND sa.effective_from <= CURRENT_DATE
    LEFT JOIN attendance_shifts s ON sa.shift_id = s.shift_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.employee_id, sa.effective_from DESC
  `, params)

  return r.rows
}

// ── Salary Revisions Register ─────────────────────────────────────────────────

async function getSalaryRevisionReport(orgId, filters = {}, visibleEmployeeIds = null) {
  const conditions = ['e.organization_id = $1']
  const params = [orgId]
  let i = 2

  if (filters.department_id) {
    conditions.push(`e.department_id = $${i++}`)
    params.push(filters.department_id)
  }
  if (visibleEmployeeIds) {
    conditions.push(`e.employee_id = ANY($${i++}::uuid[])`)
    params.push(visibleEmployeeIds)
  }

  const r = await query(`
    SELECT 
      sr.revision_id AS salary_revision_id,
      e.employee_code,
      CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
      d.name as department_name,
      old_sc.gross_salary AS old_gross_salary,
      new_sc.gross_salary AS new_gross_salary,
      sr.effective_from,
      sr.reason,
      sr.status AS current_status
    FROM salary_revisions sr
    JOIN employees e ON sr.employee_id = e.employee_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN employee_salary_configs old_sc ON sr.old_salary_config_id = old_sc.employee_salary_config_id
    LEFT JOIN employee_salary_configs new_sc ON sr.new_salary_config_id = new_sc.employee_salary_config_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY sr.effective_from DESC, e.first_name
  `, params)

  return r.rows
}

// ── Payroll Audit Log ─────────────────────────────────────────────────────────

async function getPayrollAuditReport(orgId) {
  const r = await query(`
    SELECT 
      pr.payroll_run_id,
      pr.payroll_month,
      pr.payroll_year,
      pr.current_status,
      pr.payroll_start_date,
      pr.payroll_end_date,
      CONCAT(g.first_name, ' ', g.last_name) AS generated_by_name,
      pr.created_at AS generated_at,
      CONCAT(a.first_name, ' ', a.last_name) AS approved_by_name,
      pr.approved_at,
      pr.updated_at AS locked_at
    FROM payroll_runs pr
    LEFT JOIN users gu ON pr.generated_by_admin_user_id = gu.user_id
    LEFT JOIN employees g ON gu.employee_id = g.employee_id
    LEFT JOIN users au ON pr.approved_by_admin_user_id = au.user_id
    LEFT JOIN employees a ON au.employee_id = a.employee_id
    WHERE pr.organization_id = $1
    ORDER BY pr.payroll_year DESC, pr.payroll_month DESC
  `, [orgId])

  return r.rows
}

async function getCompetencyGapReport(orgId) {
  const r = await query(`
    SELECT 
      c.name AS competency_name,
      COALESCE(AVG(a.rating), 0.00)::numeric(5,2) AS average_rating,
      3.00::numeric(5,2) AS target_rating,
      (COALESCE(AVG(a.rating), 0.00) - 3.00)::numeric(5,2) AS rating_gap
    FROM competency_assessments a
    JOIN goal_competencies c ON c.goal_competency_id = a.goal_competency_id
    WHERE a.organization_id = $1
    GROUP BY c.name
    ORDER BY c.name
  `, [orgId]);
  return r.rows;
}

async function getCompetencyDistribution(orgId) {
  const r = await query(`
    SELECT 
      rating AS rating_level,
      COUNT(*)::int AS count
    FROM competency_assessments
    WHERE organization_id = $1 AND rating IS NOT NULL
    GROUP BY rating
    ORDER BY rating
  `, [orgId]);
  return r.rows;
}

async function getCompetencyDepartment(orgId) {
  const r = await query(`
    SELECT 
      d.name AS department_name,
      c.name AS competency_name,
      COALESCE(AVG(a.rating), 0.00)::numeric(5,2) AS average_rating
    FROM competency_assessments a
    JOIN goal_assignments ga ON ga.assignment_id = a.assignment_id
    JOIN employees e ON e.employee_id = ga.employee_id
    JOIN departments d ON e.department_id = d.department_id
    JOIN goal_competencies c ON c.goal_competency_id = a.goal_competency_id
    WHERE a.organization_id = $1
    GROUP BY d.name, c.name
    ORDER BY d.name, c.name
  `, [orgId]);
  return r.rows;
}

module.exports = {
  getClientAdminIdByOrg,
  getDepartmentList,
  getEmployeeList,
  getGoalReport,
  getAppraisalCycleList,
  getAppraisalReport,
  getKpiReport,
  getKpiCategories,
  getPayrollRunList,
  getPayrollReport,
  getVisibleEmployeeIds,
  getExecutiveDashboard,
  getEmployeeReport,
  getAttendanceReport,
  getRegularizationReport,
  getLeaveReport,
  getOvertimeReport,
  getHolidayReport,
  getShiftReport,
  getSalaryRevisionReport,
  getPayrollAuditReport,
  getCompetencyGapReport,
  getCompetencyDistribution,
  getCompetencyDepartment
}
