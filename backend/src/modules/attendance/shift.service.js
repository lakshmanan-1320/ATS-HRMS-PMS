const repository = require('./shift.repository');
const { query } = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

function validateTimeFormat(timeStr) {
  if (!timeStr) return false;
  // Matches HH:MM or HH:MM:SS
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(timeStr);
}

function validateShiftData(data) {
  if (!data.shiftName || !data.shiftName.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Shift Name is required.');
  }
  if (!data.shiftCode || !data.shiftCode.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Shift Code is required.');
  }
  if (!validateTimeFormat(data.startTime)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Valid Start Time (HH:MM) is required.');
  }
  if (!validateTimeFormat(data.endTime)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Valid End Time (HH:MM) is required.');
  }
  if (data.graceMinutes == null || isNaN(data.graceMinutes) || data.graceMinutes < 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Grace Minutes must be a non-negative number.');
  }
  if (data.earlyExitGraceMinutes == null || isNaN(data.earlyExitGraceMinutes) || data.earlyExitGraceMinutes < 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Early Exit Grace Minutes must be a non-negative number.');
  }
  if (data.minimumHours == null || isNaN(data.minimumHours) || data.minimumHours < 0 || data.minimumHours > 24) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Minimum Working Hours must be a number between 0 and 24.');
  }
}

async function createShift(organizationId, data) {
  validateShiftData(data);
  return await repository.create(organizationId, data);
}

async function updateShift(organizationId, shiftId, data) {
  const existing = await repository.findById(shiftId);
  if (!existing || existing.organization_id !== organizationId) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Shift not found.');
  }
  validateShiftData(data);
  return await repository.update(shiftId, data);
}

async function getShiftDetails(organizationId, shiftId) {
  const shift = await repository.findById(shiftId);
  if (!shift || shift.organization_id !== organizationId) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Shift not found.');
  }

  // 1. Get Assigned Employees List
  const employeesRes = await query(`
    SELECT e.employee_id, e.employee_code, e.first_name, e.last_name, e.designation, d.name AS department_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.department_id
    WHERE e.shift_id = $1 AND e.status = 'active'
    ORDER BY e.first_name ASC, e.last_name ASC
  `, [shiftId]);

  // 2. Get Assigned Departments List
  const departmentsRes = await query(`
    SELECT DISTINCT d.department_id, d.name
    FROM employees e
    JOIN departments d ON e.department_id = d.department_id
    WHERE e.shift_id = $1 AND e.status = 'active'
    ORDER BY d.name ASC
  `, [shiftId]);

  return {
    ...shift,
    assignedEmployees: employeesRes.rows || [],
    assignedDepartments: departmentsRes.rows || [],
  };
}

async function listShifts(organizationId) {
  return await repository.list(organizationId);
}

async function deleteShift(organizationId, shiftId) {
  const existing = await repository.findById(shiftId);
  if (!existing || existing.organization_id !== organizationId) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Shift not found.');
  }
  return await repository.deleteShift(shiftId);
}

async function toggleStatus(organizationId, shiftId, isActive) {
  const existing = await repository.findById(shiftId);
  if (!existing || existing.organization_id !== organizationId) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Shift not found.');
  }
  return await repository.setStatus(shiftId, isActive);
}

async function assignShift(organizationId, shiftId, data) {
  const existing = await repository.findById(shiftId);
  if (!existing || existing.organization_id !== organizationId) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Shift not found.');
  }

  const { effectiveFrom: inputEffectiveFrom, effectiveTo, isTemporary } = data;
  const effectiveFrom = inputEffectiveFrom || new Date().toISOString().split('T')[0];
  const employeeIds = new Set(data.employeeIds || []);

  // Fetch employees in departments if departmentIds provided
  if (Array.isArray(data.departmentIds) && data.departmentIds.length > 0) {
    const deptEmployeesRes = await query(`
      SELECT employee_id 
      FROM employees 
      WHERE department_id = ANY($1) 
        AND status = 'active' 
        AND organization_id = $2
    `, [data.departmentIds, organizationId]);
    
    deptEmployeesRes.rows.forEach(row => {
      employeeIds.add(row.employee_id);
    });
  }

  const targetEmployeeIds = Array.from(employeeIds);
  if (targetEmployeeIds.length === 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Please select at least one employee or department.');
  }

  if (isTemporary && (!effectiveTo || effectiveTo < effectiveFrom)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Temporary shift assignments require Effective To date on or after Effective From.');
  }

  await repository.assignEmployeesShift(shiftId, targetEmployeeIds, effectiveFrom, effectiveTo || null, Boolean(isTemporary));
  return { success: true, count: targetEmployeeIds.length };
}

async function getEmployeeShiftHistory(organizationId, employeeId) {
  return await repository.getEmployeeShiftHistory(organizationId, employeeId);
}

module.exports = {
  createShift,
  updateShift,
  getShiftDetails,
  listShifts,
  deleteShift,
  toggleStatus,
  assignShift,
  getEmployeeShiftHistory,
};
