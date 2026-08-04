const { query, withTransaction } = require('../../config/db');

async function createConfiguration(orgId, data) {
  const { name, is_default, tie_strategy } = data;
  if (is_default) {
    return await withTransaction(async (client) => {
      await client.query(
        `UPDATE bell_curve_configurations
         SET is_default = false, updated_at = NOW()
         WHERE organization_id = $1`,
        [orgId]
      );
      const res = await client.query(
        `INSERT INTO bell_curve_configurations (organization_id, name, is_default, tie_strategy)
         VALUES ($1, $2, true, $3)
         RETURNING *`,
        [orgId, name, tie_strategy || 'INCLUDE_ALL']
      );
      return res.rows[0];
    });
  } else {
    const res = await query(
      `INSERT INTO bell_curve_configurations (organization_id, name, is_default, tie_strategy)
       VALUES ($1, $2, false, $3)
       RETURNING *`,
      [orgId, name, tie_strategy || 'INCLUDE_ALL']
    );
    return res.rows[0];
  }
}

async function updateConfiguration(orgId, configId, data) {
  const { name, is_default, tie_strategy } = data;
  if (is_default) {
    return await withTransaction(async (client) => {
      await client.query(
        `UPDATE bell_curve_configurations
         SET is_default = false, updated_at = NOW()
         WHERE organization_id = $1 AND configuration_id != $2`,
        [orgId, configId]
      );
      const res = await client.query(
        `UPDATE bell_curve_configurations
         SET name = $1, is_default = true, tie_strategy = $2, updated_at = NOW()
         WHERE configuration_id = $3 AND organization_id = $4
         RETURNING *`,
        [name, tie_strategy || 'INCLUDE_ALL', configId, orgId]
      );
      return res.rows[0];
    });
  } else {
    const res = await query(
      `UPDATE bell_curve_configurations
       SET name = $1, is_default = false, tie_strategy = $2, updated_at = NOW()
       WHERE configuration_id = $3 AND organization_id = $4
       RETURNING *`,
      [name, tie_strategy || 'INCLUDE_ALL', configId, orgId]
    );
    return res.rows[0];
  }
}

async function deleteConfiguration(orgId, configId) {
  await query(
    `DELETE FROM bell_curve_configurations
     WHERE configuration_id = $1 AND organization_id = $2`,
    [configId, orgId]
  );
  return true;
}

async function getConfiguration(orgId, configId) {
  const res = await query(
    `SELECT * FROM bell_curve_configurations
     WHERE configuration_id = $1 AND organization_id = $2`,
    [configId, orgId]
  );
  return res.rows[0] || null;
}

async function listConfigurations(orgId) {
  const res = await query(
    `SELECT * FROM bell_curve_configurations
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [orgId]
  );
  return res.rows;
}

async function getBuckets(configId) {
  const res = await query(
    `SELECT * FROM bell_curve_buckets
     WHERE configuration_id = $1
     ORDER BY bucket_order ASC`,
    [configId]
  );
  return res.rows;
}

async function setConfigurationDefault(orgId, configId) {
  return await withTransaction(async (client) => {
    await client.query(
      `UPDATE bell_curve_configurations
       SET is_default = false, updated_at = NOW()
       WHERE organization_id = $1`,
      [orgId]
    );
    const res = await client.query(
      `UPDATE bell_curve_configurations
       SET is_default = true, updated_at = NOW()
       WHERE configuration_id = $1 AND organization_id = $2
       RETURNING *`,
      [configId, orgId]
    );
    return res.rows[0] || null;
  });
}

async function saveBuckets(configId, buckets) {
  return await withTransaction(async (client) => {
    // Delete existing buckets
    await client.query(
      `DELETE FROM bell_curve_buckets WHERE configuration_id = $1`,
      [configId]
    );
    // Insert new buckets
    const inserted = [];
    for (const b of buckets) {
      const res = await client.query(
        `INSERT INTO bell_curve_buckets (configuration_id, bucket_name, bucket_order, percentage, color, suggested_action)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [configId, b.bucket_name, b.bucket_order, b.percentage, b.color, b.suggested_action || null]
      );
      inserted.push(res.rows[0]);
    }
    return inserted;
  });
}

async function getLatestRunNumber(cycleId) {
  const res = await query(
    `SELECT COALESCE(MAX(run_number), 0) AS max_run FROM bell_curve_runs WHERE appraisal_cycle_id = $1`,
    [cycleId]
  );
  return parseInt(res.rows[0].max_run, 10);
}

async function createRun(configId, cycleId, runNumber, status, userId) {
  const res = await query(
    `INSERT INTO bell_curve_runs (configuration_id, appraisal_cycle_id, run_number, status, generated_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [configId, cycleId, runNumber, status || 'DRAFT', userId]
  );
  return res.rows[0];
}

async function getRunById(orgId, runId) {
  const res = await query(
    `SELECT r.*, c.organization_id
     FROM bell_curve_runs r
     JOIN bell_curve_configurations c ON r.configuration_id = c.configuration_id
     WHERE r.run_id = $1 AND c.organization_id = $2`,
    [runId, orgId]
  );
  return res.rows[0] || null;
}

async function getRunsByCycle(orgId, cycleId) {
  const res = await query(
    `SELECT r.*, u.email AS generated_by_email
     FROM bell_curve_runs r
     JOIN bell_curve_configurations c ON r.configuration_id = c.configuration_id
     LEFT JOIN users u ON r.generated_by = u.user_id
     WHERE r.appraisal_cycle_id = $1 AND c.organization_id = $2
     ORDER BY r.run_number DESC`,
    [cycleId, orgId]
  );
  return res.rows;
}

async function updateRunStatus(runId, status) {
  const res = await query(
    `UPDATE bell_curve_runs
     SET status = $1, updated_at = NOW()
     WHERE run_id = $2
     RETURNING *`,
    [status, runId]
  );
  return res.rows[0];
}

async function getFinalizedAppraisalScores(orgId, cycleId) {
  const res = await query(
    `SELECT ma.employee_id, ma.final_score
     FROM manager_appraisals ma
     JOIN employees e ON ma.employee_id = e.employee_id
     WHERE e.organization_id = $1 
       AND ma.cycle_id = $2 
       AND ma.status = 'submitted' 
       AND ma.final_score IS NOT NULL`,
    [orgId, cycleId]
  );
  return res.rows.map(r => ({
    employee_id: r.employee_id,
    final_score: parseFloat(r.final_score)
  }));
}

async function bulkInsertResults(orgId, runId, results) {
  return await withTransaction(async (client) => {
    // Clean old results for this run (though constraint unique prevents it, good for idempotency)
    await client.query(
      `DELETE FROM bell_curve_results WHERE run_id = $1`,
      [runId]
    );

    const inserted = [];
    for (const r of results) {
      const res = await client.query(
        `INSERT INTO bell_curve_results (organization_id, run_id, employee_id, appraisal_score, original_bucket_id, current_bucket_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [orgId, runId, r.employee_id, r.appraisal_score, r.original_bucket_id, r.current_bucket_id]
      );
      inserted.push(res.rows[0]);
    }
    return inserted;
  });
}

async function getResultsByRun(orgId, runId) {
  const res = await query(
    `SELECT res.*,
            e.first_name, e.last_name, e.employee_code, e.designation,
            dept.name AS department_name,
            CONCAT(mgr.first_name, ' ', mgr.last_name) AS manager_name,
            ob.bucket_name AS original_bucket_name, ob.color AS original_bucket_color,
            cb.bucket_name AS current_bucket_name, cb.color AS current_bucket_color,
            u.email AS calibrated_by_email
     FROM bell_curve_results res
     JOIN employees e ON res.employee_id = e.employee_id
     LEFT JOIN departments dept ON e.department_id = dept.department_id
     LEFT JOIN employees mgr ON e.manager_employee_id = mgr.employee_id
     LEFT JOIN bell_curve_buckets ob ON res.original_bucket_id = ob.bucket_id
     LEFT JOIN bell_curve_buckets cb ON res.current_bucket_id = cb.bucket_id
     LEFT JOIN users u ON res.calibrated_by = u.user_id
     WHERE res.organization_id = $1 AND res.run_id = $2
     ORDER BY res.appraisal_score DESC, e.first_name, e.last_name`,
    [orgId, runId]
  );
  return res.rows;
}

async function updateResultOverride(orgId, resultId, currentBucketId, reason, userId) {
  const res = await query(
    `UPDATE bell_curve_results
     SET current_bucket_id = $1,
         is_override = true,
         override_reason = $2,
         calibrated_by = $3,
         calibrated_date = NOW()
     WHERE result_id = $4 AND organization_id = $5
     RETURNING *`,
    [currentBucketId, reason, userId, resultId, orgId]
  );
  return res.rows[0] || null;
}

async function getAppraisalCycleDetails(orgId, cycleId) {
  const res = await query(
    `SELECT ac.* 
     FROM appraisal_cycles ac
     JOIN client_admins ca ON ac.client_admin_id = ca.client_admin_id
     WHERE ca.organization_id = $1 AND ac.appraisal_cycle_id = $2`,
    [orgId, cycleId]
  );
  return res.rows[0] || null;
}

module.exports = {
  createConfiguration,
  updateConfiguration,
  deleteConfiguration,
  getConfiguration,
  listConfigurations,
  getBuckets,
  setConfigurationDefault,
  saveBuckets,
  getLatestRunNumber,
  createRun,
  getRunById,
  getRunsByCycle,
  updateRunStatus,
  getFinalizedAppraisalScores,
  bulkInsertResults,
  getResultsByRun,
  updateResultOverride,
  getAppraisalCycleDetails
};
