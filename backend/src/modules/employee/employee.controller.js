const employeeService = require('./employee.service');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function handleGetNextCode(req, res, next) {
  try {
    const code = await employeeService.getNextCode(req.user.organizationId);
    res.status(STATUS_CODES.OK).json({ code });
  } catch (err) {
    next(err);
  }
}

async function handleGetOrgChart(req, res, next) {
  try {
    const list = await employeeService.getOrgChart(req.user.organizationId);
    res.status(STATUS_CODES.OK).json(list);
  } catch (err) {
    next(err);
  }
}

async function handleGetEmployees(req, res, next) {
  try {
    const list = await employeeService.listEmployees(req.user.organizationId, req.query);
    res.status(STATUS_CODES.OK).json(list);
  } catch (err) {
    next(err);
  }
}

async function handleGetEmployee(req, res, next) {
  const { id } = req.params;
  try {
    const data = await employeeService.getEmployee(req.user.organizationId, id);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) {
    next(err);
  }
}

async function handleCreateEmployee(req, res, next) {
  try {
    const data = await employeeService.addEmployee(req.user.organizationId, req.validatedBody);
    await req.logActivity({
      moduleName: 'employees',
      actionName: 'employee_created',
      entityName: 'employee',
      entityId: data.employee_id,
      entityDisplayName: `${req.validatedBody.first_name} ${req.validatedBody.last_name}`.trim(),
      newData: req.validatedBody
    });
    res.status(STATUS_CODES.CREATED).json({ message: 'Employee created.', data });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateEmployee(req, res, next) {
  const { id } = req.params;
  try {
    const oldEmployee = await employeeService.getEmployee(req.user.organizationId, id);
    const data = await employeeService.editEmployee(req.user.organizationId, id, req.validatedBody);
    await req.logActivity({
      moduleName: 'employees',
      actionName: 'employee_updated',
      entityName: 'employee',
      entityId: id,
      entityDisplayName: `${req.validatedBody.first_name} ${req.validatedBody.last_name}`.trim(),
      oldData: oldEmployee,
      newData: req.validatedBody
    });
    res.status(STATUS_CODES.OK).json({ message: 'Employee updated.', data });
  } catch (err) {
    next(err);
  }
}

async function handlePatchEmployeeStatus(req, res, next) {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const oldEmployee = await employeeService.getEmployee(req.user.organizationId, id);
    const data = await employeeService.changeEmployeeStatus(req.user.organizationId, id, status);
    await req.logActivity({
      moduleName: 'employees',
      actionName: 'employee_status_changed',
      entityName: 'employee',
      entityId: id,
      entityDisplayName: `${oldEmployee.first_name} ${oldEmployee.last_name}`.trim(),
      oldData: { status: oldEmployee.status },
      newData: { status }
    });
    res.status(STATUS_CODES.OK).json({ message: 'Status updated.', data });
  } catch (err) {
    next(err);
  }
}

async function handleResetPassword(req, res, next) {
  const { id } = req.params;
  try {
    const targetEmp = await employeeService.getEmployee(req.user.organizationId, id);
    const data = await employeeService.resetEmployeePassword(req.user.organizationId, id);
    await req.logActivity({
      moduleName: 'employees',
      actionName: 'employee_password_reset',
      entityName: 'employee',
      entityId: id,
      entityDisplayName: `${targetEmp.first_name} ${targetEmp.last_name}`.trim()
    });
    res.status(STATUS_CODES.OK).json({ message: 'Password reset.', data });
  } catch (err) {
    next(err);
  }
}

async function handleBulkImport(req, res, next) {
  const { rows } = req.body;
  try {
    const result = await employeeService.bulkImportEmployees(req.user.organizationId, rows);
    await req.logActivity({
      moduleName: 'employees',
      actionName: 'employee_bulk_imported',
      entityName: 'employee',
      newData: { count: rows?.length || 0 }
    });
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetManagers(req, res, next) {
  try {
    const { exclude_id, current_manager_id, current_secondary_id } = req.query;
    const list = await employeeService.listManagers(req.user.organizationId, {
      exclude_id,
      current_manager_id,
      current_secondary_id,
    });
    res.status(STATUS_CODES.OK).json(list);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetNextCode,
  handleGetOrgChart,
  handleGetManagers,
  handleGetEmployees,
  handleGetEmployee,
  handleCreateEmployee,
  handleUpdateEmployee,
  handlePatchEmployeeStatus,
  handleResetPassword,
  handleBulkImport,
};
