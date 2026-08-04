const repo = require('./clientModule.repository');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function listModulesForClient(clientAdminId) {
  return repo.getModulesForClient(clientAdminId);
}

async function setModuleEnabled(clientAdminId, moduleKey, isEnabled) {
  const validKeys = repo.SYSTEM_MODULES.map(m => m.key);
  if (!validKeys.includes(moduleKey)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Unknown module key: ${moduleKey}`);
  }
  const row = await repo.toggleModule(clientAdminId, moduleKey, isEnabled);
  if (!row) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Client or module not found.');
  return row;
}

async function listAllClientsWithModules() {
  return repo.getAllClientsWithModules();
}

async function listModulesForOrganization(organizationId) {
  return repo.getModulesForOrganization(organizationId);
}

module.exports = { listModulesForClient, setModuleEnabled, listAllClientsWithModules, listModulesForOrganization };
