const { query } = require('../../config/db');

async function findSuperAdminByEmail(email) {
  const result = await query(
    'SELECT * FROM super_admins WHERE email = $1 AND is_active = true',
    [email]
  );
  return result.rows[0] || null;
}

async function findClientAdminByEmail(email) {
  const result = await query(
    "SELECT * FROM client_admins WHERE email = $1 AND status = 'active'",
    [email]
  );
  return result.rows[0] || null;
}

async function findEmployeeByEmail(email) {
  const result = await query(
    `SELECT e.*,
       EXISTS(
         SELECT 1 FROM employees r WHERE r.manager_employee_id = e.employee_id AND r.organization_id = e.organization_id
       ) AS is_manager
     FROM employees e
     WHERE e.email = $1 AND e.status = 'active'`,
    [email]
  );
  return result.rows[0] || null;
}

async function updateSuperAdminLastLogin(id) {
  await query('UPDATE super_admins SET last_login = NOW() WHERE super_admin_id = $1', [id]);
}

async function updateClientAdminLastLogin(id) {
  await query('UPDATE client_admins SET last_login = NOW() WHERE client_admin_id = $1', [id]);
}

async function updateEmployeeLastLogin(id) {
  await query('UPDATE employees SET last_login = NOW() WHERE id = $1', [id]);
}

module.exports = {
  findSuperAdminByEmail,
  findClientAdminByEmail,
  findEmployeeByEmail,
  updateSuperAdminLastLogin,
  updateClientAdminLastLogin,
  updateEmployeeLastLogin,
};
