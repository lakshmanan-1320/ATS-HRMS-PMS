/**
 * employeeData.service.js
 * Parameterized data access for authenticated employee profiles & reporting hierarchy.
 * Enforces strict organization/tenant isolation on every query.
 */

'use strict';

const { query } = require('../../config/db');
const logger = require('../../config/logger');

/**
 * Retrieves employee profile details.
 * @param {string} employeeId - UUID of employee
 * @param {string} organizationId - UUID of organization
 * @returns {Promise<object|null>}
 */
async function getEmployeeProfile(employeeId, organizationId) {
  if (!employeeId || !organizationId) return null;

  try {
    const sql = `
      SELECT
        e.employee_id,
        e.organization_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.gender,
        e.date_of_birth,
        e.date_of_joining,
        e.status,
        e.employment_type,
        e.designation,
        d.name AS department_name,
        p.name AS attendance_policy_name,
        s.shift_name,
        s.start_time AS shift_start_time,
        s.end_time AS shift_end_time
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN attendance_policies p ON e.attendance_policy_id = p.attendance_policy_id
      LEFT JOIN attendance_shifts s ON e.shift_id = s.shift_id
      WHERE e.employee_id = $1 AND e.organization_id = $2
      LIMIT 1
    `;
    const res = await query(sql, [employeeId, organizationId]);
    const row = res.rows[0];
    if (!row) return null;

    return {
      employeeId: row.employee_id,
      organizationId: row.organization_id,
      employeeCode: row.employee_code,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      email: row.email,
      phone: row.phone,
      gender: row.gender,
      dateOfJoining: row.date_of_joining,
      status: row.status,
      employmentType: row.employment_type,
      designation: row.designation,
      departmentName: row.department_name,
      attendancePolicyName: row.attendance_policy_name,
      shiftName: row.shift_name,
      shiftStartTime: row.shift_start_time,
      shiftEndTime: row.shift_end_time,
    };
  } catch (err) {
    logger.error('[Data:Employee] Error in getEmployeeProfile:', err.message);
    return null;
  }
}

/**
 * Retrieves the reporting manager for an employee.
 * @param {string} employeeId - UUID of employee
 * @param {string} organizationId - UUID of organization
 * @returns {Promise<object>}
 */
async function getReportingManager(employeeId, organizationId) {
  if (!employeeId || !organizationId) return { hasManager: false };

  try {
    const sql = `
      SELECT
        m.employee_id AS manager_employee_id,
        m.employee_code AS manager_code,
        m.first_name AS manager_first_name,
        m.last_name AS manager_last_name,
        m.email AS manager_email,
        m.designation AS manager_designation,
        d.name AS manager_department
      FROM employees e
      JOIN employees m ON e.manager_employee_id = m.employee_id
      LEFT JOIN departments d ON m.department_id = d.department_id
      WHERE e.employee_id = $1
        AND e.organization_id = $2
        AND m.organization_id = $2
      LIMIT 1
    `;
    const res = await query(sql, [employeeId, organizationId]);
    const row = res.rows[0];
    if (!row) {
      return { hasManager: false };
    }

    return {
      hasManager: true,
      managerId: row.manager_employee_id,
      managerCode: row.manager_code,
      fullName: `${row.manager_first_name || ''} ${row.manager_last_name || ''}`.trim(),
      email: row.manager_email,
      designation: row.manager_designation,
      department: row.manager_department,
    };
  } catch (err) {
    logger.error('[Data:Employee] Error in getReportingManager:', err.message);
    return { hasManager: false, error: err.message };
  }
}

module.exports = {
  getEmployeeProfile,
  getReportingManager,
};
