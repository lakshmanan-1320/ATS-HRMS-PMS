const { query } = require('../../config/db');

/**
 * Gets regularization settings for an organization, or returns null.
 */
async function getSettings(organizationId) {
  const res = await query(
    `SELECT * FROM attendance_regularization_settings WHERE organization_id = $1`,
    [organizationId]
  );
  return res.rows[0] || null;
}

/**
 * Creates default regularization settings for an organization.
 */
async function createSettings(organizationId) {
  const res = await query(
    `INSERT INTO attendance_regularization_settings (organization_id) VALUES ($1) RETURNING *`,
    [organizationId]
  );
  return res.rows[0];
}

/**
 * Updates regularization settings for an organization.
 */
async function updateSettings(organizationId, data) {
  const res = await query(
    `UPDATE attendance_regularization_settings
     SET max_requests_allowed = $1,
         request_period = $2,
         regularization_window_days = $3,
         reason_required = $4,
         enable_partial_day_permissions = $5,
         allow_future_regularization = $6,
         allow_missed_punch = $7,
         allow_attendance_correction = $8,
         allow_late_coming_permission = $9,
         allow_early_exit_permission = $10,
         allow_temporary_exit_permission = $11,
         is_active = $12,
         updated_at = NOW()
     WHERE organization_id = $13
     RETURNING *`,
    [
      data.max_requests_allowed,
      data.request_period,
      data.regularization_window_days,
      data.reason_required,
      data.enable_partial_day_permissions,
      data.allow_future_regularization,
      data.allow_missed_punch,
      data.allow_attendance_correction,
      data.allow_late_coming_permission,
      data.allow_early_exit_permission,
      data.allow_temporary_exit_permission,
      data.is_active,
      organizationId
    ]
  );
  return res.rows[0] || null;
}

/**
 * Creates a pending regularization/permission request.
 */
async function createRequest(organizationId, employeeId, data) {
  const res = await query(
    `INSERT INTO attendance_regularization_requests (
       organization_id, employee_id, attendance_date, request_category, request_type,
       requested_check_in, requested_check_out, reason, approval_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
     RETURNING *`,
    [
      organizationId,
      employeeId,
      data.attendance_date,
      data.request_category,
      data.request_type,
      data.requested_check_in || null,
      data.requested_check_out || null,
      data.reason || null
    ]
  );
  return res.rows[0];
}

/**
 * Gets details of a request by its ID.
 */
async function getRequestById(requestId) {
  const res = await query(
    `SELECT r.*,
            e.first_name, e.last_name, e.employee_code,
            d.name as department_name,
            e.manager_employee_id
     FROM attendance_regularization_requests r
     JOIN employees e ON r.employee_id = e.employee_id
     LEFT JOIN departments d ON e.department_id = d.department_id
     WHERE r.regularization_request_id = $1`,
    [requestId]
  );
  return res.rows[0] || null;
}

/**
 * Lists history of requests for an employee.
 */
async function getEmployeeRequests(employeeId) {
  const res = await query(
    `SELECT r.*,
            e.first_name, e.last_name, e.employee_code
     FROM attendance_regularization_requests r
     JOIN employees e ON r.employee_id = e.employee_id
     WHERE r.employee_id = $1
     ORDER BY r.attendance_date DESC`,
    [employeeId]
  );
  return res.rows;
}

/**
 * Lists pending requests of direct reports for a manager.
 */
async function getPendingRequestsForManager(managerEmployeeId) {
  const res = await query(
    `SELECT r.*,
            e.first_name, e.last_name, e.employee_code,
            d.name as department_name
     FROM attendance_regularization_requests r
     JOIN employees e ON r.employee_id = e.employee_id
     LEFT JOIN departments d ON e.department_id = d.department_id
     WHERE e.manager_employee_id = $1 AND r.approval_status = 'PENDING'
     ORDER BY r.created_at ASC`,
    [managerEmployeeId]
  );
  return res.rows;
}

/**
 * Updates status of a request (Approved / Rejected / Cancelled).
 */
async function updateRequestStatus(requestId, status, userId, commentsField, commentsVal) {
  const queryStr = `
    UPDATE attendance_regularization_requests
    SET approval_status = $1::varchar,
        approved_by = CASE WHEN $1::varchar = 'APPROVED' THEN $2::uuid ELSE approved_by END,
        approved_at = CASE WHEN $1::varchar = 'APPROVED' THEN NOW() ELSE approved_at END,
        ${commentsField} = $3::text,
        updated_at = NOW()
    WHERE regularization_request_id = $4::uuid
    RETURNING *
  `;
  const res = await query(queryStr, [status, userId || null, commentsVal || null, requestId]);
  return res.rows[0] || null;
}

/**
 * Counts requests in PENDING or APPROVED status for an employee in a date range.
 */
async function getRequestCountInPeriod(employeeId, startDate, endDate) {
  const res = await query(
    `SELECT COUNT(*)::int
     FROM attendance_regularization_requests
     WHERE employee_id = $1
       AND approval_status IN ('PENDING', 'APPROVED')
       AND attendance_date BETWEEN $2::date AND $3::date`,
    [employeeId, startDate, endDate]
  );
  return res.rows[0]?.count || 0;
}

/**
 * Checks if there is already a pending request for an employee on a date.
 */
async function hasPendingRequestForDate(employeeId, attendanceDate) {
  const res = await query(
    `SELECT EXISTS(
       SELECT 1 FROM attendance_regularization_requests
       WHERE employee_id = $1 AND attendance_date = $2::date AND approval_status = 'PENDING'
     )`,
    [employeeId, attendanceDate]
  );
  return res.rows[0]?.exists || false;
}

/**
 * Resolves employee ID using user ID.
 */
async function getEmployeeIdFromUser(userId) {
  const res = await query(`SELECT employee_id FROM users WHERE user_id = $1`, [userId]);
  return res.rows[0]?.employee_id || null;
}

/**
 * Resolves user ID using employee ID.
 */
async function getUserIdFromEmployee(employeeId) {
  const res = await query(`SELECT user_id FROM users WHERE employee_id = $1`, [employeeId]);
  return res.rows[0]?.user_id || null;
}

module.exports = {
  getSettings,
  createSettings,
  updateSettings,
  createRequest,
  getRequestById,
  getEmployeeRequests,
  getPendingRequestsForManager,
  updateRequestStatus,
  getRequestCountInPeriod,
  hasPendingRequestForDate,
  getEmployeeIdFromUser,
  getUserIdFromEmployee
};
