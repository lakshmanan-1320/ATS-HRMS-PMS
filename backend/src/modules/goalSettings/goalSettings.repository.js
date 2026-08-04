const { query } = require('../../config/db');

async function getGoalSettingsByFinancialYear(financialYearId, orgId) {
  const result = await query(
    `SELECT * FROM goal_settings WHERE financial_year_id = $1 AND organization_id = $2`,
    [financialYearId, orgId]
  );
  return result.rows[0] || null;
}

async function upsertGoalSettings(financialYearId, orgId, data) {
  const {
    max_goals_per_employee,
    goal_setting_direction,
    goal_approval_required,
    allow_goal_edit_after_approval,
    allow_employee_goal_creation,
    allow_manager_goal_creation,
    require_goal_weight_validation
  } = data;

  const result = await query(
    `INSERT INTO goal_settings (
      financial_year_id, organization_id, max_goals_per_employee, goal_setting_direction,
      goal_approval_required, allow_goal_edit_after_approval, allow_employee_goal_creation,
      allow_manager_goal_creation, require_goal_weight_validation, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (financial_year_id) DO UPDATE SET
      max_goals_per_employee = EXCLUDED.max_goals_per_employee,
      goal_setting_direction = EXCLUDED.goal_setting_direction,
      goal_approval_required = EXCLUDED.goal_approval_required,
      allow_goal_edit_after_approval = EXCLUDED.allow_goal_edit_after_approval,
      allow_employee_goal_creation = EXCLUDED.allow_employee_goal_creation,
      allow_manager_goal_creation = EXCLUDED.allow_manager_goal_creation,
      require_goal_weight_validation = EXCLUDED.require_goal_weight_validation,
      updated_at = NOW()
    RETURNING *`,
    [
      financialYearId, orgId,
      max_goals_per_employee !== undefined ? parseInt(max_goals_per_employee, 10) : 5,
      goal_setting_direction || 'HYBRID',
      goal_approval_required ?? true,
      allow_goal_edit_after_approval ?? false,
      allow_employee_goal_creation ?? true,
      allow_manager_goal_creation ?? true,
      require_goal_weight_validation ?? true
    ]
  );
  return result.rows[0];
}

module.exports = {
  getGoalSettingsByFinancialYear,
  upsertGoalSettings
};
