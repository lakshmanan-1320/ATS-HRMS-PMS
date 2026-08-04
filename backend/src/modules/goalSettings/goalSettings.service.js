const repository = require('./goalSettings.repository');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function getGoalSettings(financialYearId, orgId) {
  let settings = await repository.getGoalSettingsByFinancialYear(financialYearId, orgId);
  if (!settings) {
    settings = {
      financial_year_id: financialYearId,
      organization_id: orgId,
      max_goals_per_employee: 5,
      goal_setting_direction: 'HYBRID',
      goal_approval_required: true,
      allow_goal_edit_after_approval: false,
      allow_employee_goal_creation: true,
      allow_manager_goal_creation: true,
      require_goal_weight_validation: true
    };
  }
  return settings;
}

async function updateGoalSettings(financialYearId, orgId, data) {
  return await repository.upsertGoalSettings(financialYearId, orgId, data);
}

module.exports = {
  getGoalSettings,
  updateGoalSettings
};
