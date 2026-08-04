const departmentService = require('./department.service');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { logAudit } = require('../../utils/auditLog');

async function handleGetDepartments(req, res, next) {
  try {
    const list = await departmentService.listTopLevelDepartments(req.user.organizationId);
    res.status(STATUS_CODES.OK).json(list);
  } catch (err) {
    next(err);
  }
}

async function handleGetSubDepartments(req, res, next) {
  const { id } = req.params;
  try {
    const list = await departmentService.listSubDepartments(req.user.organizationId, id);
    res.status(STATUS_CODES.OK).json(list);
  } catch (err) {
    next(err);
  }
}

async function handleCreateDepartment(req, res, next) {
  try {
    const data = await departmentService.addDepartment(req.user.organizationId, req.body);
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'department_created', target: req.body.name, ip: req.ip });
    res.status(STATUS_CODES.CREATED).json({ message: 'Department created successfully.', data });
  } catch (err) {
    next(err);
  }
}

async function handleCreateSubDepartment(req, res, next) {
  const { id } = req.params;
  try {
    const data = await departmentService.addSubDepartment(req.user.organizationId, id, req.body);
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'sub_department_created', target: req.body.name, metadata: { parent_id: id }, ip: req.ip });
    res.status(STATUS_CODES.CREATED).json({ message: 'Sub-department created.', data });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateDepartment(req, res, next) {
  const { id } = req.params;
  try {
    const data = await departmentService.editDepartment(req.user.organizationId, id, req.body);
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'department_updated', target: id, ip: req.ip });
    res.status(STATUS_CODES.OK).json({ message: 'Updated successfully.', data });
  } catch (err) {
    next(err);
  }
}

async function handlePatchDepartmentStatus(req, res, next) {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const data = await departmentService.changeDepartmentStatus(req.user.organizationId, id, status);
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'department_status_changed', target: id, metadata: { status }, ip: req.ip });
    res.status(STATUS_CODES.OK).json({ message: `Status updated to ${status}.`, data });
  } catch (err) {
    next(err);
  }
}

async function handleDeleteDepartment(req, res, next) {
  const { id } = req.params;
  try {
    await departmentService.removeDepartment(req.user.organizationId, id);
    logAudit({ actorId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: 'department_deleted', target: id, ip: req.ip });
    res.status(STATUS_CODES.OK).json({ message: 'Department deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetDepartments,
  handleGetSubDepartments,
  handleCreateDepartment,
  handleCreateSubDepartment,
  handleUpdateDepartment,
  handlePatchDepartmentStatus,
  handleDeleteDepartment,
};
