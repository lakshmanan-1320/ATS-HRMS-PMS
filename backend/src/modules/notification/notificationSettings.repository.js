const { query } = require('../../config/db');
const { companyRowId } = require('../../config/env');

async function getSettings() {
  const result = await query('SELECT * FROM notification_settings WHERE id = $1 LIMIT 1', [companyRowId]);
  return result.rows[0] || {
    leave_submitted: true,
    leave_decision: true,
    regularization_submitted: true,
    regularization_decision: true,
    appraisal_cycle_opened: true,
    goal_submitted: true,
    goal_deadline_reminder: true,
    payroll_processed: true,
  };
}

async function saveSettings(data) {
  const result = await query(
    `UPDATE notification_settings SET
      leave_submitted = $1,
      leave_decision = $2,
      regularization_submitted = $3,
      regularization_decision = $4,
      appraisal_cycle_opened = $5,
      goal_submitted = $6,
      goal_deadline_reminder = $7,
      payroll_processed = $8,
      updated_at = NOW()
    WHERE id = $9
    RETURNING *`,
    [
      data.leave_submitted !== false,
      data.leave_decision !== false,
      data.regularization_submitted !== false,
      data.regularization_decision !== false,
      data.appraisal_cycle_opened !== false,
      data.goal_submitted !== false,
      data.goal_deadline_reminder !== false,
      data.payroll_processed !== false,
      companyRowId,
    ]
  );
  return result.rows[0];
}

module.exports = { getSettings, saveSettings };
