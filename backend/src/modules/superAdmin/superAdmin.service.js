const { smtpRepository, emailService } = require('../notification');
const securityRepository = require('./security.repository');
const db = require('../../config/db');

async function getSmtpSettings() {
  const settings = await smtpRepository.getSmtpSettings();
  return { ...settings, password: '' };
}

async function saveSmtpSettings(settings) {
  await smtpRepository.saveSmtpSettings(settings);
}

async function testSmtp(cfg) {
  await emailService.testSmtpConnection(cfg);
}

async function getSecuritySettings() {
  return securityRepository.getSecuritySettings();
}

async function saveSecuritySettings(settings) {
  return securityRepository.saveSecuritySettings(settings);
}

async function getDashboardStats() {
  const [
    platformRes,
    growthRes,
    moduleRes,
    activityRes,
    empRes,
    leaveRes,
    payrollRes,
  ] = await Promise.all([
    db.query(`
      SELECT
        (SELECT COUNT(*) FROM organizations)::int                    AS total_orgs,
        COUNT(*)::int                                                 AS total_client_admins,
        COUNT(*) FILTER (WHERE status = 'active')::int               AS active_client_admins,
        COUNT(*) FILTER (WHERE status = 'inactive')::int             AS inactive_client_admins,
        COUNT(*) FILTER (WHERE status = 'suspended')::int            AS suspended_client_admins
      FROM client_admins
    `),
    db.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
        COUNT(*)::int AS count
      FROM client_admins
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `),
    db.query(`
      SELECT
        module_key,
        module_name,
        COUNT(*)::int                                    AS total_clients,
        COUNT(*) FILTER (WHERE is_enabled = true)::int  AS enabled_clients
      FROM client_modules
      GROUP BY module_key, module_name
      ORDER BY enabled_clients DESC
    `),
    db.query(`
      SELECT actor_email, actor_role, action_name AS action, entity_name AS target, ip_address, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 8
    `),
    db.query(`
      SELECT
        COUNT(*)::int                                     AS total_employees,
        COUNT(*) FILTER (WHERE status = 'active')::int   AS active_employees,
        COUNT(*) FILTER (WHERE status != 'active')::int  AS inactive_employees
      FROM employees
    `),
    db.query(`
      SELECT
        COUNT(*)::int                                              AS total_leaves,
        COUNT(*) FILTER (WHERE current_status = 'PENDING')::int   AS pending_leaves,
        COUNT(*) FILTER (WHERE current_status = 'APPROVED')::int  AS approved_leaves,
        COUNT(*) FILTER (WHERE current_status = 'REJECTED')::int  AS rejected_leaves
      FROM leave_requests
      WHERE created_at >= DATE_TRUNC('month', NOW())
    `),
    db.query(`
      SELECT
        COUNT(pr.*)::int                                                   AS total_runs,
        COUNT(pr.*) FILTER (WHERE pr.current_status = 'DRAFT')::int       AS draft_runs,
        COUNT(pr.*) FILTER (WHERE pr.current_status = 'APPROVED')::int    AS approved_runs,
        COUNT(pr.*) FILTER (WHERE pr.current_status = 'LOCKED')::int      AS locked_runs,
        COALESCE(SUM(ep.net_salary), 0)                                    AS total_net_salary
      FROM payroll_runs pr
      LEFT JOIN employee_payrolls ep ON ep.payroll_run_id = pr.payroll_run_id
      WHERE pr.payroll_year  = EXTRACT(YEAR  FROM NOW())
        AND pr.payroll_month = EXTRACT(MONTH FROM NOW())
    `),
  ]);

  return {
    platform:       platformRes.rows[0],
    clientGrowth:   growthRes.rows,
    moduleAdoption: moduleRes.rows,
    recentActivity: activityRes.rows,
    employees:      empRes.rows[0],
    leave:          leaveRes.rows[0],
    payroll:        payrollRes.rows[0],
  };
}

module.exports = {
  getSmtpSettings,
  saveSmtpSettings,
  testSmtp,
  getSecuritySettings,
  saveSecuritySettings,
  getDashboardStats,
};
