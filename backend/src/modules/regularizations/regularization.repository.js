const { query, withTransaction } = require('../../config/db');

async function getSettings() {
  const result = await query('SELECT setting_key, setting_value FROM system_settings');
  const settings = {};
  result.rows.forEach(r => {
    settings[r.setting_key] = r.setting_value;
  });
  return settings;
}

async function updateSetting(key, value, actorUserId = null) {
  return await query(
    `INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (setting_key) DO UPDATE
     SET setting_value = $2, updated_by = $3, updated_at = NOW()`,
    [key, String(value), actorUserId]
  );
}

async function findPendingRequestByDate(employeeId, attendanceDate) {
  const result = await query(
    `SELECT * FROM attendance_regularizations 
     WHERE employee_id = $1 AND attendance_date = $2 AND current_status = 'PENDING'
     LIMIT 1`,
    [employeeId, attendanceDate]
  );
  return result.rows[0] || null;
}

async function countMonthlyRequests(employeeId, startDate, endDate) {
  const result = await query(
    `SELECT COUNT(*) AS count FROM attendance_regularizations
     WHERE employee_id = $1 
       AND attendance_date BETWEEN $2 AND $3
       AND current_status != 'REJECTED'`,
    [employeeId, startDate, endDate]
  );
  return parseInt(result.rows[0].count) || 0;
}

async function createRequest(data) {
  const result = await query(
    `INSERT INTO attendance_regularizations (
      employee_id, manager_employee_id, attendance_date, regularization_type,
      requested_checkin_time, requested_checkout_time, reason, current_status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
     RETURNING *`,
    [
      data.employee_id,
      data.manager_employee_id,
      data.attendance_date,
      data.regularization_type,
      data.requested_checkin_time || null,
      data.requested_checkout_time || null,
      data.reason
    ]
  );
  return result.rows[0];
}

async function findById(id, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `SELECT r.*, e.first_name, e.last_name, e.employee_code,
            m.first_name AS manager_first_name, m.last_name AS manager_last_name
     FROM attendance_regularizations r
     JOIN employees e ON r.employee_id = e.employee_id
     JOIN employees m ON r.manager_employee_id = m.employee_id
     WHERE r.regularization_id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function updateRequestStatus(id, status, reviewerEmployeeId = null, remarks = null, client = null) {
  const executor = client || { query };
  const approvedAt = status === 'APPROVED' ? 'NOW()' : 'NULL';
  
  const result = await executor.query(
    `UPDATE attendance_regularizations
     SET current_status = $2,
         approved_by_employee_id = $3,
         approved_at = ${status === 'APPROVED' ? 'NOW()' : 'NULL'},
         rejection_reason = $4,
         updated_at = NOW()
     WHERE regularization_id = $1
     RETURNING *`,
    [id, status, reviewerEmployeeId, status === 'REJECTED' ? remarks : null]
  );
  return result.rows[0];
}

async function createAuditLog(regularizationId, previousStatus, newStatus, actionByEmployeeId, remarks = null, client = null) {
  const executor = client || { query };
  await executor.query(
    `INSERT INTO attendance_regularization_logs (
      regularization_id, previous_status, new_status, action_taken_by_employee_id, action_remarks
     ) VALUES ($1, $2, $3, $4, $5)`,
    [regularizationId, previousStatus, newStatus, actionByEmployeeId, remarks]
  );
}

async function getEmployeeRequests(employeeId) {
  const result = await query(
    `SELECT r.*, 
            m.first_name AS manager_first_name, m.last_name AS manager_last_name
     FROM attendance_regularizations r
     JOIN employees m ON r.manager_employee_id = m.employee_id
     WHERE r.employee_id = $1
     ORDER BY r.created_at DESC`,
    [employeeId]
  );
  return result.rows;
}

async function getManagerRequests(managerEmployeeId) {
  const result = await query(
    `SELECT r.*, e.first_name, e.last_name, e.employee_code
     FROM attendance_regularizations r
     JOIN employees e ON r.employee_id = e.employee_id
     WHERE r.manager_employee_id = $1 AND r.current_status = 'PENDING'
     ORDER BY r.created_at DESC`,
    [managerEmployeeId]
  );
  return result.rows;
}

async function getAllRequests(filters = {}) {
  const { employeeId, status, startDate, endDate, organizationId } = filters;
  const params = [];
  let pi = 1;
  let where = 'WHERE 1=1';

  if (organizationId) {
    where += ` AND e.organization_id = $${pi}`;
    params.push(organizationId);
    pi++;
  }

  if (employeeId) {
    where += ` AND r.employee_id = $${pi}`;
    params.push(employeeId);
    pi++;
  }
  if (status) {
    where += ` AND r.current_status = $${pi}`;
    params.push(status);
    pi++;
  }
  if (startDate && endDate) {
    where += ` AND r.attendance_date BETWEEN $${pi} AND $${pi+1}`;
    params.push(startDate, endDate);
    pi += 2;
  }

  const result = await query(
    `SELECT r.*, e.first_name, e.last_name, e.employee_code,
            m.first_name AS manager_first_name, m.last_name AS manager_last_name
     FROM attendance_regularizations r
     JOIN employees e ON r.employee_id = e.employee_id
     JOIN employees m ON r.manager_employee_id = m.employee_id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  );
  return result.rows;
}

async function getUserForEmployee(employeeId, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `SELECT user_id, email FROM users WHERE employee_id = $1 LIMIT 1`,
    [employeeId]
  );
  return result.rows[0] || null;
}

async function getEmployeeById(employeeId) {
  const result = await query(
    `SELECT employee_id, first_name, last_name, manager_employee_id FROM employees WHERE employee_id = $1`,
    [employeeId]
  );
  return result.rows[0] || null;
}

async function findPunchByUserIdAndDate(userId, attendanceDate, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `SELECT * FROM attendance_punches WHERE employee_id = $1 AND attendance_date = $2 LIMIT 1`,
    [userId, attendanceDate]
  );
  return result.rows[0] || null;
}

async function applyAttendanceCorrection(userId, date, data, client) {
  const existing = await findPunchByUserIdAndDate(userId, date, client);

  if (existing) {
    // Audit current times before applying corrections
    const originalCheckIn = existing.original_check_in_time || existing.check_in_time;
    const originalCheckOut = existing.original_check_out_time || existing.check_out_time;

    let workDuration = null;
    const newCheckIn = data.check_in_time || existing.check_in_time;
    const newCheckOut = data.check_out_time || existing.check_out_time;
    if (newCheckIn && newCheckOut) {
      workDuration = Math.floor((new Date(newCheckOut) - new Date(newCheckIn)) / (1000 * 60));
    }

    await client.query(
      `UPDATE attendance_punches
       SET check_in_time = $3,
           check_out_time = $4,
           original_check_in_time = $5,
           original_check_out_time = $6,
           attendance_source = 'REGULARIZATION',
           regularization_id = $7,
           work_duration_minutes = $8,
           updated_at = NOW()
       WHERE employee_id = $1 AND attendance_date = $2`,
      [
        userId,
        date,
        newCheckIn,
        newCheckOut,
        originalCheckIn,
        originalCheckOut,
        data.regularization_id,
        workDuration
      ]
    );
  } else {
    // Insert new punch with nullable coordinates
    let workDuration = null;
    if (data.check_in_time && data.check_out_time) {
      workDuration = Math.floor((new Date(data.check_out_time) - new Date(data.check_in_time)) / (1000 * 60));
    }

    await client.query(
      `INSERT INTO attendance_punches (
         employee_id, attendance_date, check_in_time, check_out_time,
         check_in_latitude, check_in_longitude,
         attendance_source, regularization_id, work_duration_minutes
       ) VALUES ($1, $2, $3, $4, NULL, NULL, 'REGULARIZATION', $5, $6)`,
      [
        userId,
        date,
        data.check_in_time,
        data.check_out_time,
        data.regularization_id,
        workDuration
      ]
    );
  }
}

module.exports = {
  getSettings,
  updateSetting,
  findPendingRequestByDate,
  countMonthlyRequests,
  createRequest,
  findById,
  updateRequestStatus,
  createAuditLog,
  getEmployeeRequests,
  getManagerRequests,
  getAllRequests,
  getUserForEmployee,
  getEmployeeById,
  findPunchByUserIdAndDate,
  applyAttendanceCorrection
};
