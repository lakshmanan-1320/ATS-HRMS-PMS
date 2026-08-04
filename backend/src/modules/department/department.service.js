const departmentRepository = require('./department.repository');
const { mapDepartment } = require('./department.mapper');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function listTopLevelDepartments(organizationId) {
  const rows = await departmentRepository.getTopLevelDepartments(organizationId);
  return rows.map(mapDepartment);
}

async function listSubDepartments(organizationId, parentId) {
  const rows = await departmentRepository.getSubDepartments(organizationId, parentId);
  return rows.map(mapDepartment);
}

async function addDepartment(organizationId, data) {
  const { name, description } = data;
  if (!name || !name.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Department name is required.');
  }

  const exists = await departmentRepository.getTopLevelDepartmentByName(organizationId, name.trim());
  if (exists) {
    throw new ApiError(STATUS_CODES.CONFLICT, 'A department with this name already exists.');
  }

  const row = await departmentRepository.createDepartment({
    name: name.trim(),
    description: description || null,
    organizationId,
  });

  return mapDepartment(row);
}

async function addSubDepartment(organizationId, parentId, data) {
  const { name, description } = data;
  if (!name || !name.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Sub-department name is required.');
  }

  // Validate parent exists
  const parent = await departmentRepository.getDepartmentById(organizationId, parentId);
  if (!parent || parent.parent_id !== null) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Parent department not found.');
  }

  const exists = await departmentRepository.getSubDepartmentByName(organizationId, parentId, name.trim());
  if (exists) {
    throw new ApiError(STATUS_CODES.CONFLICT, 'A sub-department with this name already exists.');
  }

  const row = await departmentRepository.createDepartment({
    name: name.trim(),
    description: description || null,
    organizationId,
    parentId,
  });

  return mapDepartment(row);
}

async function editDepartment(organizationId, id, data) {
  const { name, description } = data;
  if (!name || !name.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Name is required.');
  }

  const current = await departmentRepository.getDepartmentById(organizationId, id);
  if (!current) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Department not found.');
  }

  const parentId = current.parent_id;
  const exists = await departmentRepository.getDuplicateDepartmentName(organizationId, name.trim(), parentId, id);
  if (exists) {
    throw new ApiError(STATUS_CODES.CONFLICT, 'A department with this name already exists.');
  }

  const row = await departmentRepository.updateDepartment(organizationId, id, {
    name: name.trim(),
    description: description || null,
  });

  return mapDepartment(row);
}

async function changeDepartmentStatus(organizationId, id, status) {
  if (!['active', 'inactive'].includes(status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Status must be active or inactive.');
  }

  const row = await departmentRepository.updateDepartmentStatus(organizationId, id, status);
  if (!row) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Department not found.');
  }

  return mapDepartment(row);
}

async function removeDepartment(organizationId, id) {
  const row = await departmentRepository.deleteDepartment(organizationId, id);
  if (!row) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Department not found.');
  }
  return true;
}

module.exports = {
  listTopLevelDepartments,
  listSubDepartments,
  addDepartment,
  addSubDepartment,
  editDepartment,
  changeDepartmentStatus,
  removeDepartment,
};
