const repo = require('./profile.repository');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function getMyProfile(user) {
  if (!user) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'User authentication context is missing.');
  }

  const { role, email, employeeId, organizationId } = user;

  if (role === 'super_admin') {
    const profile = await repo.getSuperAdminProfile(email);
    if (!profile) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Super admin profile not found.');
    return { role, profile };
  }

  if (role === 'client_admin') {
    const profile = await repo.getClientAdminProfile(email);
    if (!profile) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Client admin profile not found.');
    return { role, profile };
  }

  // Employee / Manager / HR
  if (!employeeId || !organizationId) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Employee or organization identifier is missing in token.');
  }

  const profile = await repo.getFullEmployeeProfile(employeeId, organizationId);
  if (!profile) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee profile not found.');

  // Fetch extra details
  const [salaryDetails, leaveDetails, officeLocationPolicies] = await Promise.all([
    repo.getSalaryDetails(employeeId),
    repo.getLeaveDetails(employeeId),
    repo.getOfficeLocationPolicies(employeeId)
  ]);

  profile.salary_details = salaryDetails;
  profile.leave_details = leaveDetails;
  profile.office_location_policies = officeLocationPolicies;

  return { role, profile };
}

async function getEmployeeProfileById(user, targetEmployeeId) {
  const { role, organizationId } = user;

  // Authorization check: only client_admin, super_admin, or manager/HR can see others
  if (role !== 'client_admin' && role !== 'super_admin' && role !== 'manager' && role !== 'hr') {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You do not have permission to view other employee profiles.');
  }

  const resolvedOrgId = role === 'super_admin' 
    ? (await repo.getFullEmployeeProfile(targetEmployeeId, organizationId))?.organization_id || organizationId
    : organizationId;

  const profile = await repo.getFullEmployeeProfile(targetEmployeeId, resolvedOrgId);
  if (!profile) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee profile not found.');

  // Fetch extra details
  const [salaryDetails, leaveDetails, officeLocationPolicies] = await Promise.all([
    repo.getSalaryDetails(targetEmployeeId),
    repo.getLeaveDetails(targetEmployeeId),
    repo.getOfficeLocationPolicies(targetEmployeeId)
  ]);

  profile.salary_details = salaryDetails;
  profile.leave_details = leaveDetails;
  profile.office_location_policies = officeLocationPolicies;
  
  return { role: profile.role || 'employee', profile };
}

module.exports = {
  getMyProfile,
  getEmployeeProfileById
};
