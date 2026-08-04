const { query } = require('../../config/db');

async function getSettings(organizationId, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(
    'SELECT * FROM overtime_settings WHERE organization_id = $1 AND is_active = true',
    [organizationId]
  );
  return res.rows[0] || null;
}

async function upsertSettings(organizationId, payload, txClient = null) {
  const run = txClient || { query };
  const {
    is_enabled,
    requires_approval,
    calculation_method,
    hourly_rate_basis,
    standard_monthly_hours,
    weekday_multiplier,
    weekend_multiplier,
    holiday_multiplier,
    weekday_hourly_rate,
    weekend_hourly_rate,
    holiday_hourly_rate,
    minimum_ot_minutes,
    rounding_rule
  } = payload;

  const res = await run.query(`
    INSERT INTO overtime_settings (
      organization_id, is_enabled, requires_approval, calculation_method,
      hourly_rate_basis, standard_monthly_hours, weekday_multiplier, weekend_multiplier, holiday_multiplier,
      weekday_hourly_rate, weekend_hourly_rate, holiday_hourly_rate, minimum_ot_minutes, rounding_rule
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (organization_id) DO UPDATE SET
      is_enabled = EXCLUDED.is_enabled,
      requires_approval = EXCLUDED.requires_approval,
      calculation_method = EXCLUDED.calculation_method,
      hourly_rate_basis = EXCLUDED.hourly_rate_basis,
      standard_monthly_hours = EXCLUDED.standard_monthly_hours,
      weekday_multiplier = EXCLUDED.weekday_multiplier,
      weekend_multiplier = EXCLUDED.weekend_multiplier,
      holiday_multiplier = EXCLUDED.holiday_multiplier,
      weekday_hourly_rate = EXCLUDED.weekday_hourly_rate,
      weekend_hourly_rate = EXCLUDED.weekend_hourly_rate,
      holiday_hourly_rate = EXCLUDED.holiday_hourly_rate,
      minimum_ot_minutes = EXCLUDED.minimum_ot_minutes,
      rounding_rule = EXCLUDED.rounding_rule,
      updated_at = NOW()
    RETURNING *
  `, [
    organizationId, is_enabled, requires_approval, calculation_method,
    hourly_rate_basis, standard_monthly_hours || 208, weekday_multiplier || 1.5, weekend_multiplier || 2.0, holiday_multiplier || 2.5,
    weekday_hourly_rate || 0, weekend_hourly_rate || 0, holiday_hourly_rate || 0, minimum_ot_minutes || 0, rounding_rule || 'EXACT'
  ]);

  return res.rows[0];
}

async function createRequest(organizationId, payload, txClient = null) {
  const run = txClient || { query };
  const {
    employee_id,
    attendance_date,
    clock_out_time,
    requested_ot_minutes,
    day_type,
    reason,
    approval_status
  } = payload;

  const res = await run.query(`
    INSERT INTO overtime_requests (
      organization_id, employee_id, attendance_date, clock_out_time,
      requested_ot_minutes, day_type, reason, approval_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    organizationId, employee_id, attendance_date, clock_out_time,
    requested_ot_minutes, day_type, reason, approval_status || 'PENDING'
  ]);

  return res.rows[0];
}

async function getRequestById(organizationId, id, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(`
    SELECT r.*,
           e.first_name, e.last_name, e.employee_code, e.designation,
           d.name AS department_name,
           app_emp.first_name AS approver_first, app_emp.last_name AS approver_last
    FROM overtime_requests r
    JOIN employees e ON r.employee_id = e.employee_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN users u ON r.approved_by = u.user_id
    LEFT JOIN employees app_emp ON u.employee_id = app_emp.employee_id
    WHERE r.organization_id = $1 AND r.overtime_request_id = $2
  `, [organizationId, id]);
  return res.rows[0] || null;
}

async function listRequests(organizationId, filters = {}, txClient = null) {
  const run = txClient || { query };
  let sql = `
    SELECT r.*,
           e.first_name, e.last_name, e.employee_code, e.designation,
           d.name AS department_name,
           app_emp.first_name AS approver_first, app_emp.last_name AS approver_last
    FROM overtime_requests r
    JOIN employees e ON r.employee_id = e.employee_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN users u ON r.approved_by = u.user_id
    LEFT JOIN employees app_emp ON u.employee_id = app_emp.employee_id
    WHERE r.organization_id = $1
  `;
  const params = [organizationId];
  let paramIdx = 2;

  if (filters.employee_id) {
    sql += ` AND r.employee_id = $${paramIdx++}`;
    params.push(filters.employee_id);
  }
  if (filters.approval_status) {
    sql += ` AND r.approval_status = $${paramIdx++}`;
    params.push(filters.approval_status);
  }
  if (filters.manager_employee_id) {
    // Reporting manager filter (only fetch requests for employees managed by this user)
    const mIdx = paramIdx++;
    sql += ` AND (e.manager_employee_id = $${mIdx} OR e.secondary_manager_id = $${mIdx})`;
    params.push(filters.manager_employee_id);
  }
  if (filters.start_date) {
    sql += ` AND r.attendance_date >= $${paramIdx++}`;
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    sql += ` AND r.attendance_date <= $${paramIdx++}`;
    params.push(filters.end_date);
  }

  sql += ` ORDER BY r.attendance_date DESC, r.created_at DESC`;

  const res = await run.query(sql, params);
  return res.rows;
}

async function updateRequestStatus(organizationId, id, payload, txClient = null) {
  const run = txClient || { query };
  const { approval_status, approved_ot_minutes, approved_by, remarks } = payload;
  const res = await run.query(`
    UPDATE overtime_requests
    SET approval_status = $1,
        approved_ot_minutes = $2,
        approved_by = $3,
        approved_at = NOW(),
        remarks = $4,
        updated_at = NOW()
    WHERE organization_id = $5 AND overtime_request_id = $6
    RETURNING *
  `, [approval_status, approved_ot_minutes, approved_by, remarks || null, organizationId, id]);
  return res.rows[0] || null;
}

async function getEligibleAttendanceDatesWithExtraHours(employeeId, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(`
    SELECT 
        ap.attendance_date::text as attendance_date,
        ap.check_in_time,
        ap.check_out_time,
        COALESCE(ap.shift_id, eff_sa.shift_id, e.shift_id) AS shift_id,
        s.shift_name,
        s.start_time AS shift_start,
        s.end_time AS shift_end,
        s.minimum_hours::numeric AS shift_min_hours
    FROM attendance_punches ap
    JOIN employees e ON (ap.employee_id = e.employee_id OR ap.employee_id IN (SELECT user_id FROM users WHERE employee_id = e.employee_id))
    LEFT JOIN LATERAL (
      SELECT sa.shift_id
      FROM shift_assignments sa
      WHERE sa.employee_id = e.employee_id
        AND sa.effective_from <= ap.attendance_date
        AND (sa.effective_to IS NULL OR sa.effective_to >= ap.attendance_date)
      ORDER BY COALESCE(sa.is_temporary, false) DESC, sa.effective_from DESC, sa.created_at DESC
      LIMIT 1
    ) eff_sa ON true
    LEFT JOIN attendance_shifts s ON COALESCE(ap.shift_id, eff_sa.shift_id, e.shift_id) = s.shift_id
    WHERE e.employee_id = $1
      AND ap.check_in_time IS NOT NULL 
      AND ap.check_out_time IS NOT NULL
      AND ap.attendance_date >= CURRENT_DATE - INTERVAL '60 days'
      AND NOT EXISTS (
          SELECT 1 FROM overtime_requests r
          WHERE r.employee_id = e.employee_id
            AND r.attendance_date = ap.attendance_date
            AND r.approval_status IN ('PENDING', 'APPROVED')
      )
    ORDER BY ap.attendance_date DESC
  `, [employeeId]);
  return res.rows;
}

async function getAttendanceDetails(employeeId, date, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(`
    SELECT 
        ap.attendance_punch_id,
        ap.attendance_date::text as attendance_date,
        ap.check_in_time,
        ap.check_out_time,
        COALESCE(ap.shift_id, eff_sa.shift_id, e.shift_id) AS shift_id,
        s.shift_name,
        s.start_time AS shift_start,
        s.end_time AS shift_end,
        s.minimum_hours::numeric AS shift_min_hours
    FROM attendance_punches ap
    JOIN employees e ON (ap.employee_id = e.employee_id OR ap.employee_id IN (SELECT user_id FROM users WHERE employee_id = e.employee_id))
    LEFT JOIN LATERAL (
      SELECT sa.shift_id
      FROM shift_assignments sa
      WHERE sa.employee_id = e.employee_id
        AND sa.effective_from <= ap.attendance_date
        AND (sa.effective_to IS NULL OR sa.effective_to >= ap.attendance_date)
      ORDER BY COALESCE(sa.is_temporary, false) DESC, sa.effective_from DESC, sa.created_at DESC
      LIMIT 1
    ) eff_sa ON true
    LEFT JOIN attendance_shifts s ON COALESCE(ap.shift_id, eff_sa.shift_id, e.shift_id) = s.shift_id
    WHERE e.employee_id = $1 AND ap.attendance_date = $2
    LIMIT 1
  `, [employeeId, date]);
  return res.rows[0] || null;
}

async function checkPayrollLock(organizationId, date, txClient = null) {
  const run = txClient || { query };
  // Check if a payroll run for this month and year is locked or approved
  const targetDate = new Date(date);
  const month = targetDate.getMonth() + 1; // getMonth is 0-indexed
  const year = targetDate.getFullYear();

  const res = await run.query(`
    SELECT current_status FROM payroll_runs
    WHERE organization_id = $1 AND payroll_month = $2 AND payroll_year = $3
  `, [organizationId, month, year]);
  
  const status = res.rows[0]?.current_status;
  return status === 'APPROVED' || status === 'LOCKED';
}

module.exports = {
  getSettings,
  upsertSettings,
  createRequest,
  getRequestById,
  listRequests,
  updateRequestStatus,
  getEligibleAttendanceDatesWithExtraHours,
  getAttendanceDetails,
  checkPayrollLock
};
