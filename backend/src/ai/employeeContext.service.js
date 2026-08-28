const { query } = require('../config/db');
const logger = require('../config/logger');

/**
 * employeeContext.service.js
 * Resolves authenticated JWT / session user into a verified employee context
 * with strict organization ownership and tenant isolation.
 */

/**
 * Resolves the authenticated user into an employee context object.
 * 
 * @param {object} user - Authenticated user payload from req.user
 * @returns {Promise<object>} - Sanitized employee context
 */
async function resolveEmployeeContext(user) {
  if (!user) {
    return {
      isAnonymous: true,
      organizationId: null,
      employeeId: null,
      message: 'Authentication is required to access HR records.'
    };
  }

  const role = user.role || 'employee';
  const userId = user.userId || user.user_id || user.id || null;
  const organizationId = user.organizationId || user.organization_id || null;
  const candidateEmployeeId = user.employeeId || user.employee_id || null;

  // Handle Super Admin without organization context
  if (role === 'super_admin' && !organizationId) {
    return {
      isSuperAdminNoOrg: true,
      organizationId: null,
      employeeId: null,
      role: 'super_admin',
      message: 'I need an organization context to answer questions about HR information.'
    };
  }

  if (!organizationId) {
    return {
      isUnauthorized: true,
      organizationId: null,
      employeeId: null,
      message: 'No organization context found for this account.'
    };
  }

  // Attempt to locate employee profile in this organization
  let sql = `
    SELECT 
      e.employee_id,
      e.organization_id,
      e.employee_code,
      e.first_name,
      e.last_name,
      e.email,
      e.designation,
      e.date_of_joining,
      e.status,
      e.department_id,
      e.leave_plan_id,
      e.attendance_policy_id,
      e.shift_id,
      d.name AS department_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.department_id
    WHERE e.organization_id = $1
  `;
  const params = [organizationId];

  if (candidateEmployeeId) {
    sql += ` AND e.employee_id = $2`;
    params.push(candidateEmployeeId);
  } else if (userId) {
    sql += ` AND (e.employee_id = $2 OR e.employee_id = (SELECT employee_id FROM users WHERE user_id = $2))`;
    params.push(userId);
  } else if (user.email) {
    sql += ` AND LOWER(e.email) = LOWER($2)`;
    params.push(user.email);
  }

  sql += ` LIMIT 1`;

  try {
    const res = await query(sql, params);
    const row = res.rows[0];

    if (row) {
      return {
        organizationId: row.organization_id,
        employeeId: row.employee_id,
        userId: userId,
        role: role,
        employeeCode: row.employee_code,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: `${row.first_name} ${row.last_name}`.trim(),
        email: row.email,
        designation: row.designation,
        departmentName: row.department_name,
        dateOfJoining: row.date_of_joining,
        status: row.status,
        leavePlanId: row.leave_plan_id,
        attendancePolicyId: row.attendance_policy_id,
        shiftId: row.shift_id,
        isEmployee: true,
        isAdmin: role === 'client_admin' || role === 'super_admin' || role === 'hr'
      };
    }

    // If client_admin or HR user without a direct employee record
    if (role === 'client_admin' || role === 'super_admin' || role === 'hr') {
      return {
        organizationId: organizationId,
        employeeId: null,
        userId: userId,
        role: role,
        isEmployee: false,
        isAdmin: true
      };
    }

    return {
      organizationId: organizationId,
      employeeId: null,
      userId: userId,
      role: role,
      isEmployee: false,
      message: 'Employee record not found for this account in the organization.'
    };
  } catch (err) {
    logger.error('[EmployeeContext] Error resolving employee context:', err.message);
    throw err;
  }
}

module.exports = {
  resolveEmployeeContext
};
