/**
 * regularizationData.service.js
 * Parameterized data access for attendance regularizations and pending manager approvals.
 * Enforces organization and user tenant boundaries.
 */

'use strict';

const { query } = require('../../config/db');
const logger = require('../../config/logger');

function formatRequestType(type, category) {
  if (!type && !category) return 'Attendance Regularization';
  const clean = (type || category || '').replace(/_/g, ' ').toLowerCase();
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Retrieves pending attendance regularization requests for an authenticated employee.
 * @param {string} employeeId - UUID of employee
 * @param {string} organizationId - UUID of organization
 * @returns {Promise<object>}
 */
async function getPendingRegularizationRequests(employeeId, organizationId) {
  if (!employeeId || !organizationId) {
    return { count: 0, requests: [] };
  }

  try {
    // Primary query on attendance_regularization_requests
    const sql = `
      SELECT
        r.regularization_request_id,
        r.attendance_date,
        r.request_category,
        r.request_type,
        r.requested_check_in,
        r.requested_check_out,
        r.reason,
        r.approval_status,
        r.created_at
      FROM attendance_regularization_requests r
      WHERE r.employee_id = $1
        AND r.organization_id = $2
        AND UPPER(r.approval_status) = 'PENDING'
      ORDER BY r.attendance_date DESC, r.created_at DESC
    `;
    const res = await query(sql, [employeeId, organizationId]);

    // Also check attendance_regularizations (legacy/alternative table) if empty
    let requests = res.rows.map((r) => ({
      id: r.regularization_request_id,
      attendanceDate: String(r.attendance_date).slice(0, 10),
      requestCategory: r.request_category || 'REGULARIZATION',
      requestType: formatRequestType(r.request_type, r.request_category),
      rawType: r.request_type,
      requestedCheckIn: r.requested_check_in,
      requestedCheckOut: r.requested_check_out,
      reason: r.reason || null,
      status: r.approval_status || 'PENDING',
      createdAt: r.created_at,
    }));

    if (requests.length === 0) {
      try {
        const legacyRes = await query(
          `SELECT
            r.regularization_id,
            r.attendance_date,
            r.regularization_type,
            r.reason,
            r.current_status,
            r.created_at
          FROM attendance_regularizations r
          JOIN employees e ON e.employee_id = r.employee_id
          WHERE r.employee_id = $1
            AND e.organization_id = $2
            AND UPPER(r.current_status) = 'PENDING'
          ORDER BY r.attendance_date DESC`,
          [employeeId, organizationId]
        );
        if (legacyRes.rows.length > 0) {
          requests = legacyRes.rows.map((r) => ({
            id: r.regularization_id,
            attendanceDate: String(r.attendance_date).slice(0, 10),
            requestCategory: 'REGULARIZATION',
            requestType: formatRequestType(r.regularization_type),
            rawType: r.regularization_type,
            requestedCheckIn: null,
            requestedCheckOut: null,
            reason: r.reason || null,
            status: r.current_status || 'PENDING',
            createdAt: r.created_at,
          }));
        }
      } catch (_) {}
    }

    return {
      count: requests.length,
      requests,
    };
  } catch (err) {
    logger.error('[Data:Regularization] Error in getPendingRegularizationRequests:', err.message);
    return { count: 0, requests: [], error: err.message };
  }
}

/**
 * Retrieves regularization history (all statuses) for an authenticated employee.
 * @param {string} employeeId - UUID of employee
 * @param {string} organizationId - UUID of organization
 * @param {object} [dateRange] - Optional date range
 * @param {number} [limit=20]
 * @returns {Promise<object>}
 */
async function getRegularizationHistory(employeeId, organizationId, dateRange = null, limit = 20) {
  if (!employeeId || !organizationId) {
    return { count: 0, requests: [] };
  }

  const params = [employeeId, organizationId];
  let dateClause = '';
  if (dateRange && dateRange.startDate && dateRange.endDate && dateRange.explicit) {
    params.push(dateRange.startDate, dateRange.endDate);
    dateClause = ` AND (r.attendance_date >= $${params.length - 1} AND r.attendance_date <= $${params.length})`;
  }

  try {
    params.push(limit);
    const sql = `
      SELECT
        r.regularization_request_id,
        r.attendance_date,
        r.request_category,
        r.request_type,
        r.requested_check_in,
        r.requested_check_out,
        r.reason,
        r.approval_status,
        r.created_at,
        r.rejection_reason
      FROM attendance_regularization_requests r
      WHERE r.employee_id = $1
        AND r.organization_id = $2
        ${dateClause}
      ORDER BY r.attendance_date DESC, r.created_at DESC
      LIMIT $${params.length}
    `;
    const res = await query(sql, params);

    const requests = res.rows.map((r) => ({
      id: r.regularization_request_id,
      attendanceDate: String(r.attendance_date).slice(0, 10),
      requestType: formatRequestType(r.request_type, r.request_category),
      reason: r.reason || null,
      status: r.approval_status,
      rejectionReason: r.rejection_reason || null,
      createdAt: r.created_at,
    }));

    return {
      period: dateRange?.label || 'Recent',
      count: requests.length,
      requests,
    };
  } catch (err) {
    logger.error('[Data:Regularization] Error in getRegularizationHistory:', err.message);
    return { period: 'Recent', count: 0, requests: [], error: err.message };
  }
}

/**
 * Retrieves all pending approvals (Leave + Regularization) for a Manager or HR/Admin.
 * @param {string} organizationId
 * @param {string} [managerEmployeeId] - Optional: if provided, filters by direct reports
 * @returns {Promise<object>}
 */
async function getPendingApprovals(organizationId, managerEmployeeId = null) {
  if (!organizationId) {
    return { totalPending: 0, leaveRequests: [], regularizationRequests: [] };
  }

  try {
    // 1. Pending Leave Requests
    const leaveParams = [organizationId];
    let leaveManagerFilter = '';
    if (managerEmployeeId) {
      leaveParams.push(managerEmployeeId);
      leaveManagerFilter = `AND (r.manager_employee_id = $${leaveParams.length} OR e.manager_employee_id = $${leaveParams.length})`;
    }

    const leaveSql = `
      SELECT
        r.leave_request_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        t.leave_type_name,
        r.start_date,
        r.end_date,
        r.total_leave_days,
        r.leave_reason,
        r.created_at
      FROM leave_requests r
      JOIN employees e ON e.employee_id = r.employee_id
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE e.organization_id = $1
        AND UPPER(r.current_status) = 'PENDING'
        ${leaveManagerFilter}
      ORDER BY r.created_at ASC
      LIMIT 20
    `;
    const leaveRes = await query(leaveSql, leaveParams);

    // 2. Pending Regularization Requests
    const regParams = [organizationId];
    let regManagerFilter = '';
    if (managerEmployeeId) {
      regParams.push(managerEmployeeId);
      regManagerFilter = `AND e.manager_employee_id = $${regParams.length}`;
    }

    const regSql = `
      SELECT
        r.regularization_request_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        r.attendance_date,
        r.request_type,
        r.request_category,
        r.reason,
        r.created_at
      FROM attendance_regularization_requests r
      JOIN employees e ON e.employee_id = r.employee_id
      WHERE r.organization_id = $1
        AND UPPER(r.approval_status) = 'PENDING'
        ${regManagerFilter}
      ORDER BY r.created_at ASC
      LIMIT 20
    `;
    const regRes = await query(regSql, regParams);

    const leaveRequests = leaveRes.rows.map((r) => ({
      id: r.leave_request_id,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      leaveType: r.leave_type_name,
      startDate: String(r.start_date).slice(0, 10),
      endDate: String(r.end_date).slice(0, 10),
      days: parseFloat(r.total_leave_days) || 1,
      reason: r.leave_reason,
      createdAt: r.created_at,
    }));

    const regularizationRequests = regRes.rows.map((r) => ({
      id: r.regularization_request_id,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      attendanceDate: String(r.attendance_date).slice(0, 10),
      requestType: formatRequestType(r.request_type, r.request_category),
      reason: r.reason,
      createdAt: r.created_at,
    }));

    const totalPending = leaveRequests.length + regularizationRequests.length;

    return {
      totalPending,
      leaveCount: leaveRequests.length,
      regularizationCount: regularizationRequests.length,
      leaveRequests,
      regularizationRequests,
    };
  } catch (err) {
    logger.error('[Data:Regularization] Error in getPendingApprovals:', err.message);
    return { totalPending: 0, leaveCount: 0, regularizationCount: 0, leaveRequests: [], regularizationRequests: [], error: err.message };
  }
}
/**
 * Retrieves pending regularizations for a manager's direct reports, sorted oldest-first.
 */
async function getManagerRegularizationPending(managerEmployeeId, organizationId) {
  if (!organizationId) return { count: 0, requests: [], oldestRequest: null };

  const params = [organizationId];
  let managerFilter = '';
  if (managerEmployeeId) {
    params.push(managerEmployeeId);
    managerFilter = `AND e.manager_employee_id = $${params.length}`;
  }

  try {
    const sql = `
      SELECT
        r.regularization_request_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        r.attendance_date,
        r.request_type,
        r.request_category,
        r.reason,
        r.created_at
      FROM attendance_regularization_requests r
      JOIN employees e ON e.employee_id = r.employee_id
      WHERE r.organization_id = $1
        AND UPPER(r.approval_status) = 'PENDING'
        ${managerFilter}
      ORDER BY r.created_at ASC, r.attendance_date ASC
      LIMIT 20
    `;
    const res = await query(sql, params);

    const requests = res.rows.map((r) => ({
      id: r.regularization_request_id,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      attendanceDate: String(r.attendance_date).slice(0, 10),
      requestType: formatRequestType(r.request_type, r.request_category),
      reason: r.reason,
      createdAt: r.created_at,
    }));

    return {
      count: requests.length,
      requests,
      oldestRequest: requests.length > 0 ? requests[0] : null,
    };
  } catch (err) {
    logger.error('[Data:Regularization] Error in getManagerRegularizationPending:', err.message);
    return { count: 0, requests: [], oldestRequest: null, error: err.message };
  }
}

/**
 * Retrieves regularization history for a manager's direct reports.
 */
async function getManagerRegularizationHistory(managerEmployeeId, organizationId, limit = 20) {
  if (!organizationId) return { count: 0, requests: [] };

  const params = [organizationId];
  let managerFilter = '';
  if (managerEmployeeId) {
    params.push(managerEmployeeId);
    managerFilter = `AND e.manager_employee_id = $${params.length}`;
  }
  params.push(limit);

  try {
    const sql = `
      SELECT
        r.regularization_request_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        r.attendance_date,
        r.request_type,
        r.request_category,
        r.reason,
        r.approval_status,
        r.created_at
      FROM attendance_regularization_requests r
      JOIN employees e ON e.employee_id = r.employee_id
      WHERE r.organization_id = $1
        ${managerFilter}
      ORDER BY r.created_at DESC, r.attendance_date DESC
      LIMIT $${params.length}
    `;
    const res = await query(sql, params);

    const requests = res.rows.map((r) => ({
      id: r.regularization_request_id,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      attendanceDate: String(r.attendance_date).slice(0, 10),
      requestType: formatRequestType(r.request_type, r.request_category),
      reason: r.reason,
      status: r.approval_status,
      createdAt: r.created_at,
    }));

    return {
      count: requests.length,
      requests,
    };
  } catch (err) {
    logger.error('[Data:Regularization] Error in getManagerRegularizationHistory:', err.message);
    return { count: 0, requests: [], error: err.message };
  }
}

module.exports = {
  getPendingRegularizationRequests,
  getRegularizationHistory,
  getPendingApprovals,
  getManagerRegularizationPending,
  getManagerRegularizationHistory,
  formatRequestType,
};
