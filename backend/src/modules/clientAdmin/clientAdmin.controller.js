const clientAdminService = require('./clientAdmin.service');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { logAudit } = require('../../utils/auditLog');

async function handleGetClientAdmins(req, res, next) {
  try {
    const list = await clientAdminService.listClientAdmins();
    res.status(STATUS_CODES.OK).json(list);
  } catch (err) {
    next(err);
  }
}

async function handleCreateClientAdmin(req, res, next) {
  try {
    const data = await clientAdminService.addClientAdmin({
      ...req.body,
      created_by: req.user.id,
    });
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'client_admin_created', target: req.body.email, metadata: { full_name: req.body.full_name }, ip: req.ip });
    res.status(STATUS_CODES.CREATED).json({ message: 'Client admin created successfully.', data });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateClientAdmin(req, res, next) {
  const { id } = req.params;
  try {
    const data = await clientAdminService.editClientAdmin(id, req.body);
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'client_admin_updated', target: id, ip: req.ip });
    res.status(STATUS_CODES.OK).json({ message: 'Client admin updated successfully.', data });
  } catch (err) {
    next(err);
  }
}

async function handlePatchClientAdminStatus(req, res, next) {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const data = await clientAdminService.changeClientAdminStatus(id, status);
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'client_admin_status_changed', target: id, metadata: { status }, ip: req.ip });
    res.status(STATUS_CODES.OK).json({ message: `Status updated to ${status}.`, data });
  } catch (err) {
    next(err);
  }
}

async function handleDeleteClientAdmin(req, res, next) {
  const { id } = req.params;
  try {
    await clientAdminService.removeClientAdmin(id);
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'client_admin_deleted', target: id, ip: req.ip });
    res.status(STATUS_CODES.OK).json({ message: 'Client admin deleted.' });
  } catch (err) {
    next(err);
  }
}

async function handlePatchClientAdminGoalMode(req, res, next) {
  const { id } = req.params;
  const { goal_mode } = req.body;
  try {
    const data = await clientAdminService.changeClientAdminGoalMode(id, goal_mode);
    res.status(STATUS_CODES.OK).json({ message: `Goal mode updated to ${goal_mode}.`, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetGoalConfig(req, res, next) {
  try {
    const data = await clientAdminService.getGoalConfig(req.params.id);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) {
    next(err);
  }
}

async function handleUpdateGoalConfig(req, res, next) {
  try {
    const data = await clientAdminService.updateGoalConfig(req.params.id, req.body);
    res.status(STATUS_CODES.OK).json({ message: 'Goal configuration updated.', data });
  } catch (err) {
    next(err);
  }
}

async function handleGetCompanies(req, res, next) {
  try {
    const list = await clientAdminService.listCompanies();
    res.status(STATUS_CODES.OK).json(list);
  } catch (err) {
    next(err);
  }
}

async function handleCreateCompany(req, res, next) {
  try {
    const data = await clientAdminService.addCompany(req.body);
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'company_created', target: req.body.name, ip: req.ip });
    res.status(STATUS_CODES.CREATED).json({ message: 'Company created successfully.', data });
  } catch (err) {
    next(err);
  }
}

async function handleDeleteCompany(req, res, next) {
  const { id } = req.params;
  try {
    await clientAdminService.removeCompany(id);
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'company_deleted', target: id, ip: req.ip });
    res.status(STATUS_CODES.OK).json({ message: 'Company deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetClientAdmins,
  handleCreateClientAdmin,
  handleUpdateClientAdmin,
  handlePatchClientAdminStatus,
  handlePatchClientAdminGoalMode,
  handleGetGoalConfig,
  handleUpdateGoalConfig,
  handleDeleteClientAdmin,
  handleGetCompanies,
  handleCreateCompany,
  handleDeleteCompany,
};
