const service = require('./goalSettings.service');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function handleGet(req, res, next) {
  try {
    const { financialYearId } = req.params;
    const orgId = req.user.organizationId;
    const data = await service.getGoalSettings(financialYearId, orgId);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) {
    next(err);
  }
}

async function handleUpdate(req, res, next) {
  try {
    const { financialYearId } = req.params;
    const orgId = req.user.organizationId;
    const data = await service.updateGoalSettings(financialYearId, orgId, req.body);
    
    await req.logActivity({
      moduleName: 'goalSettings',
      actionName: 'goal_settings_updated',
      entityName: 'goal_settings',
      entityId: data.goal_setting_id,
      entityDisplayName: 'Goal Settings',
      newData: data
    });

    res.status(STATUS_CODES.OK).json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGet,
  handleUpdate
};
