const { query } = require('../../config/db');

async function getPlans(organizationId) {
  const res = await query(
    `SELECT * FROM leave_plans WHERE organization_id = $1 ORDER BY name ASC`,
    [organizationId]
  );
  return res.rows;
}

async function createPlan(organizationId, data) {
  const res = await query(
    `INSERT INTO leave_plans (organization_id, name, description, leave_year_type, start_month, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      organizationId,
      data.name.trim(),
      data.description || null,
      data.leave_year_type || 'calendar_year',
      parseInt(data.start_month, 10) || 1,
      data.is_active !== false
    ]
  );
  return res.rows[0];
}

async function updatePlan(planId, data) {
  const res = await query(
    `UPDATE leave_plans
     SET name = $1,
         description = $2,
         leave_year_type = $3,
         start_month = $4,
         is_active = $5,
         updated_at = NOW()
     WHERE leave_plan_id = $6
     RETURNING *`,
    [
      data.name.trim(),
      data.description || null,
      data.leave_year_type || 'calendar_year',
      parseInt(data.start_month, 10) || 1,
      data.is_active !== false,
      planId
    ]
  );
  return res.rows[0] || null;
}

async function deletePlan(planId) {
  const res = await query(
    `DELETE FROM leave_plans WHERE leave_plan_id = $1 RETURNING *`,
    [planId]
  );
  return res.rows[0] || null;
}

async function getPlanTypes(planId) {
  const res = await query(
    `SELECT pt.*, t.leave_type_name, t.leave_type_code, t.is_paid_leave
     FROM leave_plan_types pt
     JOIN leave_types t ON pt.leave_type_id = t.leave_type_id
     WHERE pt.leave_plan_id = $1
     ORDER BY t.leave_type_name ASC`,
    [planId]
  );
  return res.rows;
}

async function upsertPlanType(planId, data, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(
    `INSERT INTO leave_plan_types (
       leave_plan_id, leave_type_id, quota_days, accrual_type,
       carry_forward_rule, max_carry_forward_days, encashment_rule, max_encash_days
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (leave_plan_id, leave_type_id)
     DO UPDATE SET
       quota_days = EXCLUDED.quota_days,
       accrual_type = EXCLUDED.accrual_type,
       carry_forward_rule = EXCLUDED.carry_forward_rule,
       max_carry_forward_days = EXCLUDED.max_carry_forward_days,
       encashment_rule = EXCLUDED.encashment_rule,
       max_encash_days = EXCLUDED.max_encash_days,
       updated_at = NOW()
     RETURNING *`,
    [
      planId,
      data.leave_type_id,
      parseFloat(data.quota_days) || 0.00,
      data.accrual_type || 'ANNUAL',
      data.carry_forward_rule || 'LAPSE',
      parseFloat(data.max_carry_forward_days) || 0.00,
      data.encashment_rule || 'NONE',
      parseFloat(data.max_encash_days) || 0.00
    ]
  );
  return res.rows[0];
}

async function deletePlanType(planId, leaveTypeId) {
  const res = await query(
    `DELETE FROM leave_plan_types WHERE leave_plan_id = $1 AND leave_type_id = $2 RETURNING *`,
    [planId, leaveTypeId]
  );
  return res.rows[0] || null;
}

async function getPlanEmployees(planId) {
  const res = await query(
    `SELECT employee_id, first_name, last_name, employee_code, email
     FROM employees
     WHERE leave_plan_id = $1 AND status = 'active'
     ORDER BY first_name, last_name`,
    [planId]
  );
  return res.rows;
}

async function assignEmployeesToPlan(planId, employeeIds, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(
    `UPDATE employees
     SET leave_plan_id = $1
     WHERE employee_id = ANY($2::uuid[])
     RETURNING employee_id`,
    [planId, employeeIds]
  );
  return res.rows;
}

async function getUnassignedEmployees(organizationId) {
  const res = await query(
    `SELECT employee_id, first_name, last_name, employee_code, email
     FROM employees
     WHERE organization_id = $1 AND leave_plan_id IS NULL AND status = 'active'
     ORDER BY first_name, last_name`,
    [organizationId]
  );
  return res.rows;
}

async function createLedgerEntry(data, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(
    `INSERT INTO leave_ledger_entries (
       employee_id, leave_type_id, financial_year, transaction_type, days, reference_id, remarks, created_by
     )
     VALUES ($1::uuid, $2::uuid, $3::integer, $4::varchar, $5::numeric, $6::uuid, $7::text, $8::uuid)
     RETURNING *`,
    [
      data.employee_id,
      data.leave_type_id,
      data.financial_year,
      data.transaction_type,
      data.days,
      data.reference_id || null,
      data.remarks || null,
      data.created_by || null
    ]
  );
  return res.rows[0];
}

async function getLedgerEntries(employeeId, leaveTypeId, financialYear) {
  const res = await query(
    `SELECT * FROM leave_ledger_entries
     WHERE employee_id = $1::uuid AND leave_type_id = $2::uuid AND financial_year = $3::integer
     ORDER BY created_at ASC`,
    [employeeId, leaveTypeId, financialYear]
  );
  return res.rows;
}

async function getBalancesFromLedger(employeeId, financialYear) {
  const res = await query(
    `SELECT leave_type_id, COALESCE(SUM(days), 0.00)::numeric AS balance
     FROM leave_ledger_entries
     WHERE employee_id = $1::uuid AND financial_year = $2::integer
     GROUP BY leave_type_id`,
    [employeeId, financialYear]
  );
  return res.rows;
}

async function getYearEndStatus(planId, year) {
  const res = await query(
    `SELECT * FROM leave_year_end_logs
     WHERE leave_plan_id = $1::uuid AND processed_year = $2::integer`,
    [planId, year]
  );
  return res.rows[0] || null;
}

async function upsertYearEndLog(logId, planId, year, status, adminId, remarks, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(
    `INSERT INTO leave_year_end_logs (log_id, leave_plan_id, processed_year, status, processed_by_admin_user_id, remarks)
     VALUES (COALESCE($1::uuid, gen_random_uuid()), $2::uuid, $3::integer, $4::varchar, $5::uuid, $6::text)
     ON CONFLICT (leave_plan_id, processed_year)
     DO UPDATE SET status = EXCLUDED.status, processed_by_admin_user_id = EXCLUDED.processed_by_admin_user_id, remarks = EXCLUDED.remarks, updated_at = NOW()
     RETURNING *`,
    [logId || null, planId, year, status, adminId, remarks || null]
  );
  return res.rows[0];
}

async function createEncashment(data, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(
    `INSERT INTO leave_encashments (
       employee_id, leave_type_id, financial_year, encashed_days, encash_rate, amount, payroll_status
     )
     VALUES ($1::uuid, $2::uuid, $3::integer, $4::numeric, $5::numeric, $6::numeric, 'PENDING')
     RETURNING *`,
    [
      data.employee_id,
      data.leave_type_id,
      data.financial_year,
      data.encashed_days,
      data.encash_rate,
      data.amount
    ]
  );
  return res.rows[0];
}

async function isAccrualPeriodProcessed(organizationId, period) {
  const res = await query(
    `SELECT EXISTS(
       SELECT 1 FROM leave_accrual_runs
       WHERE organization_id = $1::uuid AND accrual_period = $2::varchar AND status = 'COMPLETED'
     )`,
    [organizationId, period]
  );
  return res.rows[0]?.exists || false;
}

async function createAccrualRun(organizationId, period, status, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(
    `INSERT INTO leave_accrual_runs (organization_id, accrual_period, status)
     VALUES ($1::uuid, $2::varchar, $3::varchar)
     RETURNING *`,
    [organizationId, period, status]
  );
  return res.rows[0];
}

async function updateAccrualRunStatus(runId, status, txClient = null) {
  const run = txClient || { query };
  const res = await run.query(
    `UPDATE leave_accrual_runs
     SET status = $1::varchar
     WHERE run_id = $2::uuid
     RETURNING *`,
    [status, runId]
  );
  return res.rows[0] || null;
}

module.exports = {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getPlanTypes,
  upsertPlanType,
  deletePlanType,
  getPlanEmployees,
  assignEmployeesToPlan,
  getUnassignedEmployees,
  createLedgerEntry,
  getLedgerEntries,
  getBalancesFromLedger,
  getYearEndStatus,
  upsertYearEndLog,
  createEncashment,
  isAccrualPeriodProcessed,
  createAccrualRun,
  updateAccrualRunStatus
};
