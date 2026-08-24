const { query } = require('../../config/db');

async function getPipStatistics(orgId, filters = {}) {
  let whereSql = `WHERE p.organization_id = $1`;
  const params = [orgId];
  let idx = 2;

  if (filters.financial_year_id) {
    // Note: Since PIPs aren't tied directly to a cycle or FY column, we can resolve FY dates
    const fyRes = await query(`SELECT start_date, end_date FROM financial_years WHERE financial_year_id = $1`, [filters.financial_year_id]);
    const fy = fyRes.rows[0];
    if (fy) {
      whereSql += ` AND p.start_date >= $${idx++} AND p.end_date <= $${idx++}`;
      params.push(fy.start_date, fy.end_date);
    }
  }

  if (filters.department_id) {
    whereSql += ` AND e.department_id = $${idx++}`;
    params.push(filters.department_id);
  }

  if (filters.manager_employee_id) {
    whereSql += ` AND e.manager_employee_id = $${idx++}`;
    params.push(filters.manager_employee_id);
  }

  // Active PIPs count
  const activeRes = await query(
    `SELECT COUNT(*) as count FROM pips p JOIN employees e ON p.employee_id = e.employee_id ${whereSql} AND p.status = 'ACTIVE' AND p.is_monitoring = FALSE`,
    params
  );

  // Monitoring count
  const monitorRes = await query(
    `SELECT COUNT(*) as count FROM pips p JOIN employees e ON p.employee_id = e.employee_id ${whereSql} AND (p.status = 'MONITORING' OR (p.status = 'EXTENDED' AND p.is_monitoring = TRUE))`,
    params
  );

  // Completed count (only formal PIPs count towards Success Rate)
  const completedRes = await query(
    `SELECT COUNT(*) as count FROM pips p JOIN employees e ON p.employee_id = e.employee_id ${whereSql} AND p.status = 'COMPLETED' AND p.is_monitoring = FALSE`,
    params
  );

  // Extended count
  const extendedRes = await query(
    `SELECT COUNT(*) as count FROM pips p JOIN employees e ON p.employee_id = e.employee_id ${whereSql} AND p.status = 'EXTENDED' AND p.is_monitoring = FALSE`,
    params
  );

  // Escalated count
  const escalatedRes = await query(
    `SELECT COUNT(*) as count FROM pips p JOIN employees e ON p.employee_id = e.employee_id ${whereSql} AND p.status = 'ESCALATED' AND p.is_monitoring = FALSE`,
    params
  );

  // Total candidates queue
  const candidatesRes = await query(
    `SELECT COUNT(*) as count FROM pip_candidates pc JOIN employees e ON pc.employee_id = e.employee_id WHERE pc.organization_id = $1 AND pc.status = 'PENDING'`,
    [orgId]
  );

  const totalClosed = parseInt(completedRes.rows[0].count, 10) + parseInt(escalatedRes.rows[0].count, 10);
  const successCount = parseInt(completedRes.rows[0].count, 10);
  const successRate = totalClosed > 0 ? parseFloat(((successCount / totalClosed) * 100).toFixed(2)) : 0.00;

  // Average Improvement Percentage
  const avgImprovRes = await query(
    `SELECT AVG(p.overall_progress) as avg_progress 
     FROM pips p 
     JOIN employees e ON p.employee_id = e.employee_id 
     ${whereSql}`,
    params
  );

  return {
    potentialCandidates: parseInt(candidatesRes.rows[0].count, 10),
    monitoring: parseInt(monitorRes.rows[0].count, 10),
    activePips: parseInt(activeRes.rows[0].count, 10),
    completed: parseInt(completedRes.rows[0].count, 10),
    extended: parseInt(extendedRes.rows[0].count, 10),
    escalated: parseInt(escalatedRes.rows[0].count, 10),
    averageImprovement: parseFloat(parseFloat(avgImprovRes.rows[0]?.avg_progress || 0).toFixed(2)),
    successRate
  };
}

async function getDetailedReport(orgId, filters = {}) {
  let whereSql = `WHERE p.organization_id = $1`;
  const params = [orgId];
  let idx = 2;

  if (filters.status) {
    whereSql += ` AND p.status = $${idx++}`;
    params.push(filters.status);
  }
  if (filters.department_id) {
    whereSql += ` AND e.department_id = $${idx++}`;
    params.push(filters.department_id);
  }
  if (filters.is_monitoring !== undefined) {
    whereSql += ` AND p.is_monitoring = $${idx++}`;
    params.push(filters.is_monitoring === 'true' || filters.is_monitoring === true);
  }

  const sql = `
    SELECT p.*,
           CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
           e.employee_code,
           e.designation,
           dept.name AS department_name,
           CONCAT(mgr.first_name, ' ', mgr.last_name) AS manager_name,
           t.name AS template_name
    FROM pips p
    JOIN employees e ON p.employee_id = e.employee_id
    LEFT JOIN departments dept ON e.department_id = dept.department_id
    LEFT JOIN employees mgr ON e.manager_employee_id = mgr.employee_id
    LEFT JOIN pip_templates t ON p.template_id = t.template_id
    ${whereSql}
    ORDER BY p.created_at DESC
  `;

  const res = await query(sql, params);
  return res.rows;
}

module.exports = {
  getPipStatistics,
  getDetailedReport
};
