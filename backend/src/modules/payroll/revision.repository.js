const { query } = require('../../config/db');

async function createRevision(orgId, payload, txClient = null) {
  const run = txClient || { query };
  const {
    employee_id,
    old_salary_config_id,
    new_salary_config_id,
    increment_amount,
    increment_percentage,
    effective_from,
    reason,
    remarks,
    status,
    created_by
  } = payload;

  const result = await run.query(`
    INSERT INTO salary_revisions (
      organization_id, employee_id, old_salary_config_id, new_salary_config_id,
      increment_amount, increment_percentage, effective_from, reason, remarks, status, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    orgId, employee_id, old_salary_config_id || null, new_salary_config_id,
    increment_amount, increment_percentage, effective_from, reason, remarks || null, status || 'PENDING', created_by || null
  ]);

  return result.rows[0];
}

async function getRevisionById(orgId, revisionId) {
  const result = await query(`
    SELECT r.*,
           e.first_name, e.last_name, e.employee_code, e.designation,
           cr_emp.first_name as creator_first, cr_emp.last_name as creator_last
    FROM salary_revisions r
    JOIN employees e ON r.employee_id = e.employee_id
    LEFT JOIN users u ON r.created_by = u.user_id
    LEFT JOIN employees cr_emp ON u.employee_id = cr_emp.employee_id
    WHERE r.organization_id = $1 AND r.revision_id = $2
  `, [orgId, revisionId]);
  return result.rows[0] || null;
}

async function listRevisions(orgId, filters = {}) {
  let sql = `
    SELECT r.*,
           e.first_name, e.last_name, e.employee_code, e.designation,
           d.name as department_name,
           esc_old.gross_salary as old_gross, esc_old.ctc_amount as old_ctc,
           esc_new.gross_salary as new_gross, esc_new.ctc_amount as new_ctc
    FROM salary_revisions r
    JOIN employees e ON r.employee_id = e.employee_id
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN employee_salary_configs esc_old ON r.old_salary_config_id = esc_old.employee_salary_config_id
    JOIN employee_salary_configs esc_new ON r.new_salary_config_id = esc_new.employee_salary_config_id
    WHERE r.organization_id = $1
  `;
  const params = [orgId];
  let paramIdx = 2;

  if (filters.employee_id) {
    sql += ` AND r.employee_id = $${paramIdx++}`;
    params.push(filters.employee_id);
  }
  if (filters.status) {
    sql += ` AND r.status = $${paramIdx++}`;
    params.push(filters.status);
  }
  if (filters.effective_from) {
    sql += ` AND r.effective_from = $${paramIdx++}`;
    params.push(filters.effective_from);
  }

  sql += ` ORDER BY r.effective_from DESC, r.created_at DESC`;

  const result = await query(sql, params);
  return result.rows;
}

async function getRevisionHistory(orgId, employeeId) {
  const result = await query(`
    SELECT r.*,
           esc_old.salary_type as old_salary_type,
           esc_old.gross_salary as old_gross, esc_old.ctc_amount as old_ctc,
           esc_new.salary_type as new_salary_type,
           esc_new.gross_salary as new_gross, esc_new.ctc_amount as new_ctc,
           cr_emp.first_name as creator_first, cr_emp.last_name as creator_last
    FROM salary_revisions r
    LEFT JOIN employee_salary_configs esc_old ON r.old_salary_config_id = esc_old.employee_salary_config_id
    JOIN employee_salary_configs esc_new ON r.new_salary_config_id = esc_new.employee_salary_config_id
    LEFT JOIN users u ON r.created_by = u.user_id
    LEFT JOIN employees cr_emp ON u.employee_id = cr_emp.employee_id
    WHERE r.organization_id = $1 AND r.employee_id = $2
    ORDER BY r.effective_from DESC, r.created_at DESC
  `, [orgId, employeeId]);
  return result.rows;
}

async function updateRevisionStatus(orgId, revisionId, status, txClient = null) {
  const run = txClient || { query };
  const result = await run.query(`
    UPDATE salary_revisions
    SET status = $3
    WHERE organization_id = $1 AND revision_id = $2
    RETURNING *
  `, [orgId, revisionId, status]);
  return result.rows[0];
}

async function getDashboardStats(orgId) {
  const employeesCountRes = await query(`
    SELECT COUNT(*) as total FROM employees WHERE organization_id = $1 AND status = 'active'
  `, [orgId]);
  
  const revisionsRes = await query(`
    SELECT 
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as upcoming,
      COUNT(CASE WHEN status = 'EFFECTIVE' AND date_trunc('month', effective_from) = date_trunc('month', CURRENT_DATE) THEN 1 END) as this_month,
      COALESCE(AVG(CASE WHEN status = 'EFFECTIVE' THEN increment_percentage END), 0) as avg_percent,
      COALESCE(SUM(CASE WHEN status = 'EFFECTIVE' THEN increment_amount END), 0) as total_cost
    FROM salary_revisions
    WHERE organization_id = $1
  `, [orgId]);

  return {
    totalEmployees: parseInt(employeesCountRes.rows[0].total) || 0,
    upcomingRevisions: parseInt(revisionsRes.rows[0].upcoming) || 0,
    thisMonthRevisions: parseInt(revisionsRes.rows[0].this_month) || 0,
    avgIncrementPercent: parseFloat(revisionsRes.rows[0].avg_percent) || 0,
    totalIncrementCost: parseFloat(revisionsRes.rows[0].total_cost) || 0
  };
}

module.exports = {
  createRevision,
  getRevisionById,
  listRevisions,
  getRevisionHistory,
  updateRevisionStatus,
  getDashboardStats
};
