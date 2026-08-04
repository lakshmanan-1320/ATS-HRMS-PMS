const { query } = require('../../config/db');

async function getBalance(employeeId, month, year) {
  const result = await query(
    'SELECT * FROM employee_permission_balances WHERE employee_id = $1 AND month = $2 AND year = $3',
    [employeeId, month, year]
  );
  return result.rows[0] || null;
}

async function upsertBalance(employeeId, month, year, allocatedCount = 2, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `INSERT INTO employee_permission_balances (employee_id, month, year, allocated_count, used_count)
     VALUES ($1, $2, $3, $4, 0)
     ON CONFLICT (employee_id, month, year)
     DO UPDATE SET allocated_count = EXCLUDED.allocated_count, updated_at = NOW()
     RETURNING *`,
    [employeeId, month, year, allocatedCount]
  );
  return result.rows[0];
}

async function lockBalance(employeeId, month, year, txClient) {
  const result = await txClient.query(
    `SELECT * FROM employee_permission_balances
     WHERE employee_id = $1 AND month = $2 AND year = $3
     FOR UPDATE`,
    [employeeId, month, year]
  );
  return result.rows[0] || null;
}

async function incrementUsed(balanceId, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `UPDATE employee_permission_balances
     SET used_count = used_count + 1, updated_at = NOW()
     WHERE balance_id = $1
     RETURNING *`,
    [balanceId]
  );
  return result.rows[0];
}

async function decrementUsed(balanceId, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `UPDATE employee_permission_balances
     SET used_count = GREATEST(0, used_count - 1), updated_at = NOW()
     WHERE balance_id = $1
     RETURNING *`,
    [balanceId]
  );
  return result.rows[0];
}

async function getMyBalances(employeeId) {
  const result = await query(
    `SELECT * FROM employee_permission_balances
     WHERE employee_id = $1
     ORDER BY year DESC, month DESC`,
    [employeeId]
  );
  return result.rows;
}

async function getAllBalancesForMonth(month, year) {
  const result = await query(
    `SELECT b.*, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.employee_code
     FROM employee_permission_balances b
     JOIN employees e ON e.employee_id = b.employee_id
     WHERE b.month = $1 AND b.year = $2
     ORDER BY e.first_name, e.last_name`,
    [month, year]
  );
  return result.rows;
}

async function createRequest(data, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `INSERT INTO permission_requests
      (employee_id, manager_employee_id, permission_date, start_time, end_time,
       duration_hours, reason, status, month, year)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9)
     RETURNING *`,
    [
      data.employee_id,
      data.manager_employee_id || null,
      data.permission_date,
      data.start_time,
      data.end_time,
      data.duration_hours || 2.00,
      data.reason || null,
      data.month,
      data.year,
    ]
  );
  return result.rows[0];
}

async function getRequestById(id) {
  const result = await query(
    `SELECT r.*,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            e.employee_code,
            CONCAT(m.first_name, ' ', m.last_name) AS manager_name
     FROM permission_requests r
     JOIN employees e ON e.employee_id = r.employee_id
     LEFT JOIN employees m ON m.employee_id = r.manager_employee_id
     WHERE r.permission_request_id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getMyRequests(employeeId) {
  const result = await query(
    `SELECT r.*,
            CONCAT(m.first_name, ' ', m.last_name) AS manager_name
     FROM permission_requests r
     LEFT JOIN employees m ON m.employee_id = r.manager_employee_id
     WHERE r.employee_id = $1
     ORDER BY r.created_at DESC`,
    [employeeId]
  );
  return result.rows;
}

async function getManagerRequests(managerEmployeeId) {
  const result = await query(
    `SELECT r.*,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            e.employee_code
     FROM permission_requests r
     JOIN employees e ON e.employee_id = r.employee_id
     WHERE r.manager_employee_id = $1
     ORDER BY r.created_at DESC`,
    [managerEmployeeId]
  );
  return result.rows;
}

async function getAdminRequests(filters = {}) {
  const params = [];
  const conditions = [];

  if (filters.month) {
    params.push(filters.month);
    conditions.push(`r.month = $${params.length}`);
  }
  if (filters.year) {
    params.push(filters.year);
    conditions.push(`r.year = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`r.status = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT r.*,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            e.employee_code,
            CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
            CONCAT(a.first_name, ' ', a.last_name) AS approved_by_name
     FROM permission_requests r
     JOIN employees e ON e.employee_id = r.employee_id
     LEFT JOIN employees m ON m.employee_id = r.manager_employee_id
     LEFT JOIN employees a ON a.employee_id = r.approved_by_employee_id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  );
  return result.rows;
}

async function updateRequest(id, data, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `UPDATE permission_requests SET
      status                  = $1,
      approved_by_employee_id = $2,
      approved_at             = $3,
      rejection_reason        = $4,
      updated_at              = NOW()
     WHERE permission_request_id = $5
     RETURNING *`,
    [
      data.status,
      data.approved_by_employee_id || null,
      data.approved_at || null,
      data.rejection_reason || null,
      id,
    ]
  );
  return result.rows[0];
}

async function getActiveEmployeeIds() {
  const result = await query(
    `SELECT e.employee_id
     FROM employees e
     JOIN users u ON u.employee_id = e.employee_id
     WHERE u.is_active = true AND u.role = 'employee'`
  );
  return result.rows.map(r => r.employee_id);
}

// -------------------------------------------------------------
// Permission Settings (singleton row id = 1)
// -------------------------------------------------------------

const DEFAULT_SETTINGS = {
  id: 1,
  monthly_count: 2,
  hours_per_permission: 2.00,
  pro_rata_on_join: true,
};

async function getPermissionSettings() {
  const result = await query('SELECT * FROM permission_settings WHERE id = 1 LIMIT 1');
  return result.rows[0] || DEFAULT_SETTINGS;
}

async function savePermissionSettings(data) {
  const result = await query(
    `UPDATE permission_settings SET
       monthly_count        = $1,
       hours_per_permission = $2,
       pro_rata_on_join     = $3,
       updated_at           = NOW()
     WHERE id = 1
     RETURNING *`,
    [
      parseInt(data.monthly_count, 10) || 2,
      parseFloat(data.hours_per_permission) || 2.00,
      data.pro_rata_on_join !== false,
    ]
  );
  return result.rows[0];
}

module.exports = {
  getBalance,
  upsertBalance,
  lockBalance,
  incrementUsed,
  decrementUsed,
  getMyBalances,
  getAllBalancesForMonth,
  createRequest,
  getRequestById,
  getMyRequests,
  getManagerRequests,
  getAdminRequests,
  updateRequest,
  getActiveEmployeeIds,
  getPermissionSettings,
  savePermissionSettings,
};
