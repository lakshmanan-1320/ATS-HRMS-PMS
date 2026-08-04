const service = require('./clientModule.service');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function handleGetModules(req, res, next) {
  const { clientId } = req.params;
  try {
    const data = await service.listModulesForClient(clientId);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) { next(err); }
}

async function handleToggleModule(req, res, next) {
  const { clientId, moduleKey } = req.params;
  const { is_enabled } = req.body;
  try {
    const data = await service.setModuleEnabled(clientId, moduleKey, Boolean(is_enabled));
    res.status(STATUS_CODES.OK).json({ message: `Module ${moduleKey} ${data.is_enabled ? 'enabled' : 'disabled'}.`, data });
  } catch (err) { next(err); }
}

async function handleGetAllClientsModules(req, res, next) {
  try {
    const data = await service.listAllClientsWithModules();
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) { next(err); }
}

async function handleGetMyModules(req, res, next) {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) return res.status(200).json([]);
    const data = await service.listModulesForOrganization(orgId);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) { next(err); }
}

async function handleGetOrganizationModules(req, res, next) {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      return res.status(STATUS_CODES.OK).json({ organization_id: null, modules: {} });
    }
    const rawList = await service.listModulesForOrganization(orgId);
    const modules = {};
    rawList.forEach(m => {
      modules[m.module_key] = m.is_enabled;
    });
    res.status(STATUS_CODES.OK).json({
      organization_id: orgId,
      modules
    });
  } catch (err) { next(err); }
}

module.exports = {
  handleGetModules,
  handleToggleModule,
  handleGetAllClientsModules,
  handleGetMyModules,
  handleGetOrganizationModules
};
