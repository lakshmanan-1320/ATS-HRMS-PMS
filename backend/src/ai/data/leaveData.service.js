/**
 * leaveData.service.js
 * Parameterized data access for leave balances, leave history, and current on-leave employees.
 * Enforces organization and user boundaries.
 */

'use strict';

const { query } = require('../../config/db');
const logger = require('../../config/logger');

function getCurrentLeaveYear() {
  return new Date().getFullYear();
}

/**
 * Retrieves leave balances (allocated, used, pending, remaining) for an employee.
 * @param {string} employeeId - UUID of employee
 * @param {string} organizationId - UUID of organization
 * @param {string} [leaveTypeFilter] - Optional leave type filter
 * @returns {Promise<object>}
 */
async function getEmployeeLeaveBalance(employeeId, organizationId, leaveTypeFilter = null) {
  const fy = getCurrentLeaveYear();
  if (!employeeId || !organizationId) {
    return { employeeId, balances: [], totalAllocated: 0, totalRemaining: 0, financialYear: fy };
  }

  try {
    const empRes = await query(
      `SELECT employee_id FROM employees WHERE employee_id = $1 AND organization_id = $2`,
      [employeeId, organizationId]
    );
    if (!empRes.rows.length) {
      return { employeeId, balances: [], totalAllocated: 0, totalRemaining: 0, financialYear: fy };
    }

    let balanceSql =
      `SELECT
        t.leave_type_id,
        t.leave_type_name,
        t.leave_type_code,
        t.is_paid_leave,
        t.allows_half_day,
        b.allocated_days,
        b.used_days,
        b.financial_year
      FROM employee_leave_balances b
      JOIN employees e ON e.employee_id = b.employee_id
      JOIN leave_types t ON t.leave_type_id = b.leave_type_id
      WHERE b.employee_id = $1
        AND e.organization_id = $2
        AND t.is_active = true`;
    const balanceParams = [employeeId, organizationId];

    if (leaveTypeFilter) {
      balanceParams.push(`%${leaveTypeFilter.toLowerCase()}%`, leaveTypeFilter.toLowerCase());
      balanceSql += ` AND (LOWER(t.leave_type_name) LIKE $${balanceParams.length - 1} OR LOWER(t.leave_type_code) = $${balanceParams.length})`;
    }

    balanceSql += ` ORDER BY b.financial_year DESC, t.leave_type_name ASC`;

    const balanceRes = await query(balanceSql, balanceParams);

    const pendingRes = await query(
      `SELECT leave_type_id, COALESCE(SUM(total_leave_days), 0) AS pending_days
       FROM leave_requests r
       JOIN employees e ON e.employee_id = r.employee_id
       WHERE r.employee_id = $1
         AND e.organization_id = $2
         AND UPPER(r.current_status) = 'PENDING'
       GROUP BY leave_type_id`,
      [employeeId, organizationId]
    );
    const pendingMap = new Map(pendingRes.rows.map((r) => [r.leave_type_id, parseFloat(r.pending_days)]));

    let totalAllocated = 0;
    let totalUsed = 0;
    let totalPending = 0;
    let totalRemaining = 0;

    const seenTypeIds = new Set();
    const balances = [];
    for (const row of balanceRes.rows) {
      if (seenTypeIds.has(row.leave_type_id)) continue;
      seenTypeIds.add(row.leave_type_id);
      const allocated = parseFloat(row.allocated_days) || 0;
      const used = parseFloat(row.used_days) || 0;
      const pending = pendingMap.get(row.leave_type_id) || 0;
      const remaining = Math.max(0, allocated - used);

      totalAllocated += allocated;
      totalUsed += used;
      totalPending += pending;
      totalRemaining += remaining;

const balance = {
  leaveTypeId: row.leave_type_id,
  leaveType: row.leave_type_name,
  code: row.leave_type_code,
  allocated,
  used,
  pending,
  remaining,
  isPaid: row.is_paid_leave,
  allowsHalfDay: row.allows_half_day,
};

balances.push(balance);
    }
    return {
      employeeId,
      financialYear: fy,
      balances,
      totalAllocated,
      totalUsed,
      totalPending,
      totalRemaining,
    };
  } catch (err) {
    logger.error('[Data:Leave] Error in getEmployeeLeaveBalance:', err.message);
    return { employeeId, balances: [], totalAllocated: 0, totalRemaining: 0, financialYear: fy, error: err.message };
  }
}

/**
 * Retrieves historical leave requests for an employee.
 * @param {string} employeeId - UUID of employee
 * @param {string} organizationId - UUID of organization
 * @param {object} [dateRange] - Explicit date range filter (if provided by user)
 * @param {number} [limit] - Max records
 * @returns {Promise<object>}
 */
async function getEmployeeLeaveHistory(employeeId, organizationId, dateRange = null, limit = 20) {
  if (!employeeId || !organizationId) {
    return { employeeId, records: [], count: 0, totalApprovedDays: 0 };
  }

  const params = [employeeId, organizationId];
  let dateClause = '';
  if (dateRange && dateRange.startDate && dateRange.endDate && dateRange.explicit) {
    const startParam = params.length + 1;
    const endParam = params.length + 2;
    dateClause = ` AND (r.start_date <= $${endParam} AND r.end_date >= $${startParam})`;
    params.push(dateRange.startDate, dateRange.endDate);
  }

  const sql = `
    SELECT
      r.leave_request_id,
      r.start_date,
      r.end_date,
      r.total_leave_days,
      r.session_type,
      r.current_status,
      r.leave_reason AS reason,
      r.rejection_reason,
      r.created_at,
      t.leave_type_name,
      t.leave_type_code,
      t.is_paid_leave
    FROM leave_requests r
    JOIN leave_types t ON r.leave_type_id = t.leave_type_id
    JOIN employees e ON e.employee_id = r.employee_id
    WHERE r.employee_id = $1
      AND e.organization_id = $2
      ${dateClause}
    ORDER BY r.start_date DESC
    LIMIT $${params.length + 1}
  `;
  params.push(limit);

  try {
    const res = await query(sql, params);
    let totalApprovedDays = 0;

    const records = res.rows.map((r) => {
      const days = parseFloat(r.total_leave_days) || 0;
      if (r.current_status === 'APPROVED') totalApprovedDays += days;
      return {
        leaveRequestId: r.leave_request_id,
        leaveType: r.leave_type_name,
        code: r.leave_type_code,
        startDate: String(r.start_date).slice(0, 10),
        endDate: String(r.end_date).slice(0, 10),
        days,
        sessionType: r.session_type || 'FULL_DAY',
        status: r.current_status,
        reason: r.reason || null,
        isPaid: r.is_paid_leave,
      };
    });

    return {
      employeeId,
      period: dateRange?.label || 'Recent',
      records,
      count: records.length,
      totalApprovedDays,
    };
  } catch (err) {
    logger.error('[Data:Leave] Error in getEmployeeLeaveHistory:', err.message);
    return { employeeId, records: [], count: 0, totalApprovedDays: 0, error: err.message };
  }
}

/**
 * Retrieves list of employees on approved leave today.
 * @param {string} organizationId
 * @param {string} [managerEmployeeId]
 * @returns {Promise<object>}
 */
async function getEmployeesCurrentlyOnLeave(organizationId, managerEmployeeId = null) {
  const today = new Date().toISOString().slice(0, 10);
  if (!organizationId) return { date: today, count: 0, employees: [] };

  try {
    const params = [organizationId, today];
    let managerFilter = '';
    if (managerEmployeeId) {
      params.push(managerEmployeeId);
      managerFilter = `AND e.manager_employee_id = $${params.length}`;
    }

    const sql = `
      SELECT
        e.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS full_name,
        e.designation,
        d.name AS department_name,
        t.leave_type_name,
        r.start_date,
        r.end_date,
        r.total_leave_days,
        r.current_status
      FROM leave_requests r
      JOIN employees e ON e.employee_id = r.employee_id
      LEFT JOIN departments d ON d.department_id = e.department_id
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE e.organization_id = $1
        AND $2::date BETWEEN r.start_date AND r.end_date
        AND r.current_status = 'APPROVED'
        ${managerFilter}
      ORDER BY e.first_name ASC
    `;

    const res = await query(sql, params);
    return {
      date: today,
      count: res.rows.length,
      employees: res.rows.map((r) => ({
        fullName: r.full_name,
        designation: r.designation,
        department: r.department_name,
        leaveType: r.leave_type_name,
        from: String(r.start_date).slice(0, 10),
        to: String(r.end_date).slice(0, 10),
        days: parseFloat(r.total_leave_days) || 0,
      })),
    };
  } catch (err) {
    logger.error('[Data:Leave] Error in getEmployeesCurrentlyOnLeave:', err.message);
    return { date: today, count: 0, employees: [], error: err.message };
  }
}

/**
 * Retrieves pending leave requests for an employee.
 */
async function getEmployeePendingLeaveRequests(employeeId, organizationId) {
  if (!employeeId || !organizationId) return { count: 0, requests: [] };

  try {
    const sql = `
      SELECT
        r.leave_request_id,
        r.start_date,
        r.end_date,
        r.total_leave_days,
        r.leave_reason,
        r.created_at,
        t.leave_type_name
      FROM leave_requests r
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      JOIN employees e ON e.employee_id = r.employee_id
      WHERE r.employee_id = $1
        AND e.organization_id = $2
        AND UPPER(r.current_status) = 'PENDING'
      ORDER BY r.start_date ASC
    `;
    const res = await query(sql, [employeeId, organizationId]);
    return {
      count: res.rows.length,
      requests: res.rows.map((r) => ({
        id: r.leave_request_id,
        leaveType: r.leave_type_name,
        startDate: String(r.start_date).slice(0, 10),
        endDate: String(r.end_date).slice(0, 10),
        days: parseFloat(r.total_leave_days) || 1,
        reason: r.leave_reason,
        createdAt: r.created_at,
      })),
    };
  } catch (err) {
    logger.error('[Data:Leave] Error in getEmployeePendingLeaveRequests:', err.message);
    return { count: 0, requests: [], error: err.message };
  }
}

/**
 * Retrieves team leave history and summary of leaves taken per team member (for managers).
 */
async function getTeamLeaveHistory(managerEmployeeId, organizationId, limit = 30) {
  if (!managerEmployeeId || !organizationId) return { count: 0, members: [], topLeaveTaker: null, records: [] };

  try {
    // 1. Grouped sum per team member
    const summarySql = `
      SELECT
        e.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        e.designation,
        COALESCE(SUM(r.total_leave_days), 0) AS total_leave_days,
        COUNT(r.leave_request_id) AS leave_count
      FROM employees e
      LEFT JOIN leave_requests r ON r.employee_id = e.employee_id AND r.current_status = 'APPROVED'
      WHERE e.organization_id = $1
        AND e.manager_employee_id = $2
        AND e.status = 'active'
      GROUP BY e.employee_id, e.first_name, e.last_name, e.employee_code, e.designation
      ORDER BY total_leave_days DESC, e.first_name ASC
    `;
    const summaryRes = await query(summarySql, [organizationId, managerEmployeeId]);

    const members = summaryRes.rows.map((r) => ({
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      designation: r.designation,
      totalLeaveDays: parseFloat(r.total_leave_days) || 0,
      leaveCount: parseInt(r.leave_count || '0', 10),
    }));

    const topLeaveTaker = members.length > 0 && members[0].totalLeaveDays > 0 ? members[0] : null;

    // 2. Recent approved leave requests
    const recordsSql = `
      SELECT
        r.leave_request_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        t.leave_type_name,
        r.start_date,
        r.end_date,
        r.total_leave_days,
        r.current_status
      FROM leave_requests r
      JOIN employees e ON e.employee_id = r.employee_id
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE e.organization_id = $1
        AND e.manager_employee_id = $2
        AND r.current_status = 'APPROVED'
      ORDER BY r.start_date DESC
      LIMIT $3
    `;
    const recordsRes = await query(recordsSql, [organizationId, managerEmployeeId, limit]);

    const records = recordsRes.rows.map((r) => ({
      id: r.leave_request_id,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      leaveType: r.leave_type_name,
      startDate: String(r.start_date).slice(0, 10),
      endDate: String(r.end_date).slice(0, 10),
      days: parseFloat(r.total_leave_days) || 0,
    }));

    return {
      count: records.length,
      members,
      topLeaveTaker,
      records,
    };
  } catch (err) {
    logger.error('[Data:Leave] Error in getTeamLeaveHistory:', err.message);
    return { count: 0, members: [], topLeaveTaker: null, records: [], error: err.message };
  }
}

module.exports = {
  getEmployeeLeaveBalance,
  getEmployeeLeaveHistory,
  getEmployeesCurrentlyOnLeave,
  getEmployeePendingLeaveRequests,
  getTeamLeaveHistory,
};
