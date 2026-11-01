const { query } = require('../../config/db');

async function createLeaveType(data, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `INSERT INTO leave_types (
      leave_type_name, leave_type_code, description, annual_quota_days,
      is_paid_leave, requires_attachment, allows_half_day, allows_negative_balance,
      max_consecutive_days, monthly_limit_days, lop_leave_type_id,
      is_active, created_by_admin_user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      data.leave_type_name,
      data.leave_type_code.toUpperCase().trim(),
      data.description || null,
      data.annual_quota_days || 0.00,
      data.is_paid_leave !== false,
      !!data.requires_attachment,
      data.allows_half_day !== false,
      !!data.allows_negative_balance,
      data.max_consecutive_days || null,
      data.monthly_limit_days || null,
      data.lop_leave_type_id || null,
      data.is_active !== false,
      data.created_by_admin_user_id || null,
    ]
  );
  return result.rows[0];
}

async function updateLeaveType(leaveTypeId, data, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `UPDATE leave_types SET
      leave_type_name        = $1,
      description            = $2,
      annual_quota_days      = $3,
      is_paid_leave          = $4,
      requires_attachment    = $5,
      allows_half_day        = $6,
      allows_negative_balance = $7,
      max_consecutive_days   = $8,
      monthly_limit_days     = $9,
      lop_leave_type_id      = $10,
      is_active              = $11,
      updated_at             = NOW()
    WHERE leave_type_id = $12
    RETURNING *`,
    [
      data.leave_type_name,
      data.description || null,
      data.annual_quota_days,
      data.is_paid_leave !== false,
      !!data.requires_attachment,
      data.allows_half_day !== false,
      !!data.allows_negative_balance,
      data.max_consecutive_days || null,
      data.monthly_limit_days || null,
      data.lop_leave_type_id || null,
      data.is_active !== false,
      leaveTypeId,
    ]
  );
  return result.rows[0];
}

async function getLeaveTypeById(leaveTypeId) {
  const result = await query(
    `SELECT lt.*,
            lop.leave_type_name AS lop_leave_type_name,
            lop.leave_type_code AS lop_leave_type_code
     FROM leave_types lt
     LEFT JOIN leave_types lop ON lop.leave_type_id = lt.lop_leave_type_id
     WHERE lt.leave_type_id = $1`,
    [leaveTypeId]
  );
  return result.rows[0] || null;
}

async function getLeaveTypeByCode(code) {
  const result = await query('SELECT * FROM leave_types WHERE UPPER(leave_type_code) = UPPER($1)', [code.trim()]);
  return result.rows[0] || null;
}

async function getLeaveTypes(onlyActive = false) {
  const filter = onlyActive ? 'WHERE is_active = true' : '';
  const result = await query(`SELECT * FROM leave_types ${filter} ORDER BY leave_type_name ASC`);
  return result.rows;
}

async function getBalancesByEmployee(employeeId, financialYear) {
  const result = await query(
    `SELECT b.*, t.leave_type_name, t.leave_type_code, t.is_paid_leave, t.allows_half_day, t.allows_negative_balance
     FROM employee_leave_balances b
     JOIN leave_types t ON t.leave_type_id = b.leave_type_id
     WHERE b.employee_id = $1 AND b.financial_year = $2`,
    [employeeId, financialYear]
  );
  return result.rows;
}

async function getBalance(employeeId, leaveTypeId, financialYear) {
  const result = await query(
    'SELECT * FROM employee_leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND financial_year = $3',
    [employeeId, leaveTypeId, financialYear]
  );
  return result.rows[0] || null;
}

async function createBalance(data, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `INSERT INTO employee_leave_balances (employee_id, leave_type_id, financial_year, allocated_days, used_days)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.employee_id, data.leave_type_id, data.financial_year, data.allocated_days || 0.00, data.used_days || 0.00]
  );
  return result.rows[0];
}

async function lockBalance(employeeId, leaveTypeId, financialYear, txClient) {
  const result = await txClient.query(
    `SELECT * FROM employee_leave_balances
     WHERE employee_id = $1 AND leave_type_id = $2 AND financial_year = $3
     FOR UPDATE`,
    [employeeId, leaveTypeId, financialYear]
  );
  return result.rows[0] || null;
}

async function updateBalance(balanceId, usedDays, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `UPDATE employee_leave_balances
     SET used_days = $1, updated_at = NOW()
     WHERE leave_balance_id = $2
     RETURNING *`,
    [usedDays, balanceId]
  );
  return result.rows[0];
}

async function getPendingRequestsSum(employeeId, leaveTypeId, leaveYearStart, leaveYearEnd) {
  const result = await query(
    `SELECT COALESCE(SUM(total_leave_days), 0.00) AS pending_days
     FROM leave_requests
     WHERE employee_id = $1
       AND leave_type_id = $2
       AND current_status = 'PENDING'
       AND start_date >= $3
       AND start_date <= $4`,
    [employeeId, leaveTypeId, leaveYearStart, leaveYearEnd]
  );
  return parseFloat(result.rows[0].pending_days);
}

async function getMonthlyLeaveUsage(employeeId, leaveTypeId, year, month) {
  const result = await query(
    `SELECT COALESCE(SUM(total_leave_days), 0.00) AS used_days
     FROM leave_requests
     WHERE employee_id = $1
       AND leave_type_id = $2
       AND current_status NOT IN ('REJECTED', 'CANCELLED')
       AND EXTRACT(YEAR FROM start_date)  = $3
       AND EXTRACT(MONTH FROM start_date) = $4`,
    [employeeId, leaveTypeId, year, month]
  );
  return parseFloat(result.rows[0].used_days);
}

async function getLeavePolicySettings() {
  const result = await query('SELECT * FROM organization_leave_settings WHERE id = 1 LIMIT 1');
  if (result.rows.length === 0) {
    return {
      leave_year_type: 'financial_year',
      leave_year_start_month: 4,
      pro_rata_on_join: true,
      auto_credit_on_join: true,
      optional_holiday_max_days: 2,
      optional_holiday_pro_rata: true,
      monthly_paid_leave_cap: null,
    };
  }
  return result.rows[0];
}

async function saveLeavePolicySettings(data) {
  const cap = data.monthly_paid_leave_cap != null ? parseInt(data.monthly_paid_leave_cap, 10) : null;
  const result = await query(
    `UPDATE organization_leave_settings SET
       leave_year_type             = $1,
       leave_year_start_month      = $2,
       pro_rata_on_join            = $3,
       auto_credit_on_join         = $4,
       optional_holiday_max_days   = $5,
       optional_holiday_pro_rata   = $6,
       monthly_paid_leave_cap      = $7,
       updated_at                  = NOW()
     WHERE id = 1
     RETURNING *`,
    [
      data.leave_year_type || 'financial_year',
      parseInt(data.leave_year_start_month, 10) || 4,
      data.pro_rata_on_join !== false,
      data.auto_credit_on_join !== false,
      parseInt(data.optional_holiday_max_days, 10) || 2,
      data.optional_holiday_pro_rata !== false,
      cap,
    ]
  );
  return result.rows[0];
}

async function getMonthlyPaidLeaveUsage(employeeId, year, month) {
  const result = await query(
    `SELECT COALESCE(SUM(r.total_leave_days), 0.00) AS used_days
     FROM leave_requests r
     JOIN leave_types t ON t.leave_type_id = r.leave_type_id
     WHERE r.employee_id = $1
       AND t.is_paid_leave = true
       AND r.current_status NOT IN ('REJECTED', 'CANCELLED')
       AND EXTRACT(YEAR  FROM r.start_date) = $2
       AND EXTRACT(MONTH FROM r.start_date) = $3`,
    [employeeId, year, month]
  );
  return parseFloat(result.rows[0].used_days);
}

// -------------------------------------------------------------
// Optional Holiday Balance
// -------------------------------------------------------------

async function getOptionalHolidayBalance(employeeId, leaveYear) {
  const result = await query(
    'SELECT * FROM employee_optional_holiday_balances WHERE employee_id = $1 AND leave_year = $2',
    [employeeId, leaveYear]
  );
  return result.rows[0] || null;
}

async function upsertOptionalHolidayBalance(data, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `INSERT INTO employee_optional_holiday_balances (id, employee_id, leave_year, allocated_days, used_days)
     VALUES (
       (SELECT COALESCE(MAX(id), 0) + 1 FROM employee_optional_holiday_balances),
       $1, $2, $3, $4
     )
     ON CONFLICT (employee_id, leave_year)
     DO UPDATE SET allocated_days = EXCLUDED.allocated_days, updated_at = NOW()
     RETURNING *`,
    [data.employee_id, data.leave_year, data.allocated_days, data.used_days || 0]
  );
  return result.rows[0];
}

async function getAvailedOptionalHolidays(employeeId, leaveYear) {
  const result = await query(
    `SELECT a.*, h.holiday_name, h.holiday_date, h.description
     FROM employee_optional_holiday_avails a
     JOIN holidays h ON h.holiday_id = a.holiday_id
     WHERE a.employee_id = $1 AND a.leave_year = $2`,
    [employeeId, leaveYear]
  );
  return result.rows;
}

async function availOptionalHoliday(employeeId, holidayId, leaveYear, txClient = null) {
  const run = txClient || { query };
  const ins = await run.query(
    `INSERT INTO employee_optional_holiday_avails (employee_id, holiday_id, leave_year)
     VALUES ($1, $2, $3) ON CONFLICT (employee_id, holiday_id) DO NOTHING
     RETURNING id`,
    [employeeId, holidayId, leaveYear]
  );
  // Only increment used_days when the row was actually inserted (not a duplicate)
  if (ins.rows.length === 0) return null;
  const result = await run.query(
    `UPDATE employee_optional_holiday_balances
     SET used_days = used_days + 1, updated_at = NOW()
     WHERE employee_id = $1 AND leave_year = $2
     RETURNING *`,
    [employeeId, leaveYear]
  );
  return result.rows[0];
}

async function unavailOptionalHoliday(employeeId, holidayId, leaveYear, txClient = null) {
  const run = txClient || { query };
  const del = await run.query(
    `DELETE FROM employee_optional_holiday_avails
     WHERE employee_id = $1 AND holiday_id = $2
     RETURNING id`,
    [employeeId, holidayId]
  );
  if (del.rows.length === 0) return null;
  const result = await run.query(
    `UPDATE employee_optional_holiday_balances
     SET used_days = GREATEST(0, used_days - 1), updated_at = NOW()
     WHERE employee_id = $1 AND leave_year = $2
     RETURNING *`,
    [employeeId, leaveYear]
  );
  return result.rows[0];
}

async function getOptionalHolidaysForYear(leaveYearStart, leaveYearEnd) {
  const result = await query(
    `SELECT holiday_id, holiday_name, holiday_date, description
     FROM holidays
     WHERE holiday_type = 'OPTIONAL'
       AND is_active = true
       AND is_deleted = false
       AND holiday_date BETWEEN $1 AND $2
     ORDER BY holiday_date ASC`,
    [leaveYearStart, leaveYearEnd]
  );
  return result.rows;
}

async function getTeamOptionalHolidays(managerEmployeeId) {
  const result = await query(
    `SELECT
       e.employee_id,
       CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
       e.employee_code,
       h.holiday_id,
       h.holiday_name,
       h.holiday_date,
       h.description,
       a.leave_year,
       a.created_at AS availed_at
     FROM employee_optional_holiday_avails a
     JOIN employees e ON e.employee_id = a.employee_id
     JOIN holidays h ON h.holiday_id = a.holiday_id
     WHERE e.manager_id = $1
     ORDER BY h.holiday_date ASC, e.first_name ASC`,
    [managerEmployeeId]
  );
  return result.rows;
}

async function hasOverlappingRequest(employeeId, startDate, endDate, excludeRequestDetailsId = null) {
  const params = [employeeId, startDate, endDate];
  let filter = '';
  if (excludeRequestDetailsId) {
    filter = 'AND leave_request_id != $4';
    params.push(excludeRequestDetailsId);
  }

  const result = await query(
    `SELECT 1 FROM leave_requests
     WHERE employee_id = $1
       AND current_status NOT IN ('REJECTED', 'CANCELLED')
       AND NOT (end_date < $2 OR start_date > $3)
       ${filter}
     LIMIT 1`,
    params
  );
  return result.rows.length > 0;
}

async function createLeaveRequest(data, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `INSERT INTO leave_requests (
      employee_id, manager_employee_id, leave_type_id, start_date, end_date,
      total_leave_days, session_type, leave_reason, attachment_url, file_id, attachment_type, current_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      data.employee_id,
      data.manager_employee_id,
      data.leave_type_id,
      data.start_date,
      data.end_date,
      data.total_leave_days,
      data.session_type || 'FULL_DAY',
      data.leave_reason || null,
      data.attachment_url || null,
      data.file_id || null,
      data.attachment_type || null,
      data.current_status || 'PENDING'
    ]
  );
  return result.rows[0];
}

async function getLeaveRequestById(id) {
  const result = await query(
    `SELECT r.*,
            e.organization_id,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            e.employee_code,
            CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
            t.leave_type_name,
            t.leave_type_code
     FROM leave_requests r
     JOIN employees e ON e.employee_id = r.employee_id
     JOIN employees m ON m.employee_id = r.manager_employee_id
     JOIN leave_types t ON t.leave_type_id = r.leave_type_id
     WHERE r.leave_request_id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getMyLeaveRequests(employeeId) {
  const result = await query(
    `SELECT r.*,
            t.leave_type_name,
            t.leave_type_code,
            CONCAT(m.first_name, ' ', m.last_name) AS manager_name
     FROM leave_requests r
     JOIN leave_types t ON t.leave_type_id = r.leave_type_id
     JOIN employees m ON m.employee_id = r.manager_employee_id
     WHERE r.employee_id = $1
     ORDER BY r.created_at DESC`,
     [employeeId]
  );
  return result.rows;
}

async function getManagerLeaveRequests(managerEmployeeId) {
  const result = await query(
    `SELECT r.*,
            t.leave_type_name,
            t.leave_type_code,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            e.employee_code
     FROM leave_requests r
     JOIN leave_types t ON t.leave_type_id = r.leave_type_id
     JOIN employees e ON e.employee_id = r.employee_id
     WHERE r.manager_employee_id = $1
     ORDER BY r.created_at DESC`,
     [managerEmployeeId]
  );
  return result.rows;
}

async function getAdminLeaveRequests(filters = {}) {
  const params = []
  const conditions = []

  // Tenant scoping: only requests from employees of the caller's organization
  if (filters.organization_id) {
    params.push(filters.organization_id)
    conditions.push(`e.organization_id = $${params.length}`)
  }
  if (filters.from_date) {
    params.push(filters.from_date)
    conditions.push(`r.start_date >= $${params.length}`)
  }
  if (filters.to_date) {
    params.push(filters.to_date)
    conditions.push(`r.start_date <= $${params.length}`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const result = await query(
    `SELECT r.*,
            t.leave_type_name,
            t.leave_type_code,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            e.employee_code,
            e.designation,
            d.name AS department_name,
            CONCAT(m.first_name, ' ', m.last_name) AS manager_name
     FROM leave_requests r
     JOIN leave_types t ON t.leave_type_id = r.leave_type_id
     JOIN employees e ON e.employee_id = r.employee_id
     LEFT JOIN departments d ON d.department_id = e.department_id
     LEFT JOIN employees m ON m.employee_id = r.manager_employee_id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  );
  return result.rows;
}

async function isEmployeeInOrganization(employeeId, organizationId) {
  const result = await query(
    'SELECT 1 FROM employees WHERE employee_id = $1 AND organization_id = $2',
    [employeeId, organizationId]
  );
  return result.rowCount > 0;
}

async function updateLeaveRequest(leaveRequestId, data, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `UPDATE leave_requests SET
      current_status = $1,
      approved_by_employee_id = $2,
      approved_at = $3,
      rejection_reason = $4,
      updated_at = NOW()
    WHERE leave_request_id = $5
    RETURNING *`,
    [
      data.current_status,
      data.approved_by_employee_id || null,
      data.approved_at || null,
      data.rejection_reason || null,
      leaveRequestId
    ]
  );
  return result.rows[0];
}

async function createAuditLog(data, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `INSERT INTO leave_request_audit_logs (
      leave_request_id, previous_status, new_status, action_taken_by_employee_id, action_remarks
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      data.leave_request_id,
      data.previous_status || null,
      data.new_status,
      data.action_taken_by_employee_id || null,
      data.action_remarks || null
    ]
  );
  return result.rows[0];
}

async function getAuditLogsForRequest(leaveRequestId) {
  const result = await query(
    `SELECT l.*, CONCAT(e.first_name, ' ', e.last_name) AS action_by_name
     FROM leave_request_audit_logs l
     LEFT JOIN employees e ON e.employee_id = l.action_taken_by_employee_id
     WHERE l.leave_request_id = $1
     ORDER BY l.created_at ASC`,
    [leaveRequestId]
  );
  return result.rows;
}

async function getLeaveOrPendingForEmployeeOnDate(employeeId, checkDate) {
  const result = await query(
    `SELECT 1 FROM leave_requests
     WHERE employee_id = $1
       AND current_status IN ('APPROVED', 'PENDING')
       AND $2 BETWEEN start_date AND end_date
     LIMIT 1`,
    [employeeId, checkDate]
  );
  return result.rows.length > 0;
}

async function getActiveLeaveForEmployeeOnDate(employeeId, checkDate) {
  const result = await query(
    `SELECT 1 FROM leave_requests
     WHERE employee_id = $1
       AND current_status = 'APPROVED'
       AND $2 BETWEEN start_date AND end_date
     LIMIT 1`,
    [employeeId, checkDate]
  );
  return result.rows.length > 0;
}

async function createOptionalHolidayRequest(data, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `INSERT INTO optional_holiday_requests (
      organization_id, employee_id, manager_employee_id, holiday_id, leave_year, status, remarks
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      data.organization_id,
      data.employee_id,
      data.manager_employee_id,
      data.holiday_id,
      data.leave_year,
      data.status || 'PENDING',
      data.remarks || null
    ]
  );
  return result.rows[0];
}

async function getOptionalHolidayRequestById(requestId, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `SELECT r.*, 
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            e.employee_code,
            h.holiday_name,
            h.holiday_date
     FROM optional_holiday_requests r
     JOIN employees e ON e.employee_id = r.employee_id
     JOIN holidays h ON h.holiday_id = r.holiday_id
     WHERE r.optional_holiday_request_id = $1`,
    [requestId]
  );
  return result.rows[0] || null;
}

async function getOptionalHolidayRequest(employeeId, holidayId, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `SELECT * FROM optional_holiday_requests
     WHERE employee_id = $1 AND holiday_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [employeeId, holidayId]
  );
  return result.rows[0] || null;
}

async function updateOptionalHolidayRequest(requestId, status, remarks, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `UPDATE optional_holiday_requests
     SET status = $1, remarks = $2, updated_at = NOW()
     WHERE optional_holiday_request_id = $3
     RETURNING *`,
    [status, remarks || null, requestId]
  );
  return result.rows[0];
}

async function getOptionalHolidayRequestsByEmployee(employeeId, leaveYear, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `SELECT r.*, h.holiday_name, h.holiday_date 
     FROM optional_holiday_requests r
     JOIN holidays h ON h.holiday_id = r.holiday_id
     WHERE r.employee_id = $1 AND r.leave_year = $2`,
    [employeeId, leaveYear]
  );
  return result.rows;
}

async function getPendingOptionalHolidaysForManager(managerEmployeeId, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `SELECT r.*, 
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            e.employee_code,
            h.holiday_name,
            h.holiday_date
     FROM optional_holiday_requests r
     JOIN employees e ON e.employee_id = r.employee_id
     JOIN holidays h ON h.holiday_id = r.holiday_id
     WHERE r.manager_employee_id = $1 AND r.status = 'PENDING'
     ORDER BY r.created_at ASC`,
    [managerEmployeeId]
  );
  return result.rows;
}

module.exports = {
  createLeaveType,
  updateLeaveType,
  getLeaveTypeById,
  getLeaveTypeByCode,
  getLeaveTypes,
  getBalancesByEmployee,
  getBalance,
  createBalance,
  lockBalance,
  updateBalance,
  getPendingRequestsSum,
  getMonthlyLeaveUsage,
  getMonthlyPaidLeaveUsage,
  getLeavePolicySettings,
  saveLeavePolicySettings,
  hasOverlappingRequest,
  createLeaveRequest,
  getLeaveRequestById,
  getMyLeaveRequests,
  getManagerLeaveRequests,
  getAdminLeaveRequests,
  isEmployeeInOrganization,
  updateLeaveRequest,
  createAuditLog,
  getAuditLogsForRequest,
  getActiveLeaveForEmployeeOnDate,
  getLeaveOrPendingForEmployeeOnDate,
  getOptionalHolidayBalance,
  upsertOptionalHolidayBalance,
  getAvailedOptionalHolidays,
  availOptionalHoliday,
  unavailOptionalHoliday,
  getOptionalHolidaysForYear,
  getTeamOptionalHolidays,
  createOptionalHolidayRequest,
  getOptionalHolidayRequestById,
  getOptionalHolidayRequest,
  updateOptionalHolidayRequest,
  getOptionalHolidayRequestsByEmployee,
  getPendingOptionalHolidaysForManager,
};
