const { query } = require('../../config/db');

async function getClientAdmins() {
  const result = await query(`
    SELECT ca.client_admin_id, ca.organization_id, ca.full_name, ca.email, ca.phone, ca.status, ca.notes, 
           ca.company_name, o.name AS organization_name,
           u.last_login_at AS last_login, ca.created_at, ca.updated_at
    FROM client_admins ca
    LEFT JOIN organizations o ON o.organization_id = ca.organization_id
    LEFT JOIN users u ON u.organization_id = ca.organization_id AND u.role = 'client_admin'
    ORDER BY ca.created_at DESC
  `);
  return result.rows;
}

async function findClientAdminById(id) {
  const result = await query(`
    SELECT ca.*, o.name AS organization_name, u.last_login_at AS last_login
    FROM client_admins ca
    LEFT JOIN organizations o ON o.organization_id = ca.organization_id
    LEFT JOIN users u ON u.organization_id = ca.organization_id AND u.role = 'client_admin'
    WHERE ca.client_admin_id = $1
  `, [id]);
  return result.rows[0] || null;
}

async function getClientAdminByEmail(email) {
  const result = await query('SELECT client_admin_id FROM client_admins WHERE LOWER(email) = LOWER($1)', [email.trim()]);
  return result.rows[0] || null;
}

async function getClientAdminByEmailExcludingId(email, excludeId) {
  const result = await query(
    'SELECT client_admin_id FROM client_admins WHERE LOWER(email) = LOWER($1) AND client_admin_id != $2',
    [email.trim(), excludeId]
  );
  return result.rows[0] || null;
}

async function createClientAdmin(data, txClient = null) {
  const run = txClient || { query };
  const { organization_id, full_name, email, phone, company_name, notes, created_by } = data;
  const result = await run.query(`
    INSERT INTO client_admins (organization_id, full_name, email, phone, company_name, status, notes, created_by)
    VALUES ($1,$2,$3,$4,$5,'active',$6,$7)
    RETURNING client_admin_id, organization_id, full_name, email, phone, status, notes, created_at
  `, [organization_id, full_name, email, phone, company_name, notes, created_by]);
  return result.rows[0];
}

async function updateClientAdmin(id, data, txClient = null) {
  const run = txClient || { query };
  const { full_name, email, phone, company_name, notes } = data;
  const result = await run.query(`
    UPDATE client_admins SET
      full_name=$1, email=$2, phone=$3, company_name=$4, notes=$5, updated_at=NOW()
    WHERE client_admin_id=$6
    RETURNING client_admin_id, organization_id, full_name, email, phone, status, notes, updated_at
  `, [full_name, email, phone, company_name, notes, id]);
  return result.rows[0];
}

async function updateClientAdminStatus(id, status, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    UPDATE client_admins SET status=$1, updated_at=NOW() WHERE client_admin_id=$2 RETURNING client_admin_id, organization_id, status
  `, [status, id]);
  return result.rows[0];
}

async function updateClientAdminGoalMode(id, goalMode, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    UPDATE client_admins SET goal_mode=$1, updated_at=NOW() WHERE client_admin_id=$2 RETURNING client_admin_id, organization_id, goal_mode
  `, [goalMode, id]);
  return result.rows[0];
}

async function getGoalConfig(clientAdminId) {
  const result = await query(
    'SELECT allow_employee_goal, allow_manager_goal, allow_admin_goal FROM client_admins WHERE client_admin_id = $1',
    [clientAdminId]
  );
  return result.rows[0] || null;
}

async function updateGoalConfig(clientAdminId, { allow_employee_goal, allow_manager_goal, allow_admin_goal }) {
  const result = await query(
    `UPDATE client_admins SET
      allow_employee_goal = $1,
      allow_manager_goal  = $2,
      allow_admin_goal    = $3,
      updated_at          = NOW()
     WHERE client_admin_id = $4
     RETURNING allow_employee_goal, allow_manager_goal, allow_admin_goal`,
    [allow_employee_goal, allow_manager_goal, allow_admin_goal, clientAdminId]
  );
  return result.rows[0] || null;
}

async function getCompanies() {
  const result = await query(`
    SELECT 
      o.organization_id,
      o.name AS company_name,
      o.created_at,
      COALESCE(e.emp_count, 0)::int AS total_employees,
      COALESCE(ca_agg.admins_count, 0)::int AS total_client_admins,
      COALESCE(ca_agg.admins_list, '[]'::json) AS client_admins
    FROM organizations o
    LEFT JOIN (
      SELECT organization_id, COUNT(*)::int AS emp_count
      FROM employees
      GROUP BY organization_id
    ) e ON e.organization_id = o.organization_id
    LEFT JOIN (
      SELECT 
        organization_id, 
        COUNT(*)::int AS admins_count,
        json_agg(json_build_object(
          'client_admin_id', client_admin_id,
          'full_name', full_name,
          'email', email,
          'phone', phone,
          'status', status,
          'created_at', created_at
        )) AS admins_list
      FROM client_admins
      GROUP BY organization_id
    ) ca_agg ON ca_agg.organization_id = o.organization_id
    ORDER BY o.created_at DESC
  `);
  return result.rows;
}

async function createCompany(name, timeoutConfig = {}, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(
    `INSERT INTO organizations (
      name, idle_session_timeout_minutes, warn_before_expiry_minutes, absolute_timeout_hours, extend_on_activity
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING organization_id, name AS company_name, idle_session_timeout_minutes, created_at`,
    [
      name.trim(),
      timeoutConfig.idle_session_timeout_minutes ?? 15,
      timeoutConfig.warn_before_expiry_minutes ?? 2,
      timeoutConfig.absolute_timeout_hours ?? 8,
      timeoutConfig.extend_on_activity ?? true
    ]
  );
  return result.rows[0];
}

async function deleteCompany(orgId, txClient = null) {
  const run = txClient || { query };
  await run.query('DELETE FROM organizations WHERE organization_id = $1', [orgId]);
  return { organization_id: orgId };
}

async function deleteClientAdmin(id, txClient = null) {
  const run = txClient || { query };
  const admin = await run.query('SELECT email FROM client_admins WHERE client_admin_id = $1', [id]);
  if (!admin.rows.length) return null;
  const email = admin.rows[0].email;

  await run.query('DELETE FROM users WHERE email = $1 AND role = $2', [email, 'client_admin']);
  await run.query('DELETE FROM client_admins WHERE client_admin_id = $1', [id]);
  return { client_admin_id: id };
}

module.exports = {
  getClientAdmins,
  findClientAdminById,
  getClientAdminByEmail,
  getClientAdminByEmailExcludingId,
  createClientAdmin,
  updateClientAdmin,
  updateClientAdminStatus,
  updateClientAdminGoalMode,
  getGoalConfig,
  updateGoalConfig,
  deleteClientAdmin,
  getCompanies,
  createCompany,
  deleteCompany,
};
