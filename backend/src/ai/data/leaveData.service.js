/**
 * leaveData.service.js
 * Parameterized data access for leave balances, leave history, and current on-leave employees.
 * Enforces organization and user boundaries.
 */

'use strict';

const { query } = require('../../config/db');
const logger = require('../../config/logger');

function getCurrentLeaveYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 4) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
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
      `SELECT leave_plan_id FROM employees WHERE employee_id = $1 AND organization_id = $2`,
      [employeeId, organizationId]
    );
    if (!empRes.rows.length) {
      return { employeeId, balances: [], totalAllocated: 0, totalRemaining: 0, financialYear: fy };
    }

    let leavePlanId = empRes.rows[0].leave_plan_id;
    if (!leavePlanId) {
      const defaultPlan = await query(
        `SELECT leave_plan_id FROM leave_plans WHERE organization_id = $1 AND is_active = true ORDER BY created_at ASC LIMIT 1`,
        [organizationId]
      );
      leavePlanId = defaultPlan.rows[0]?.leave_plan_id;
    }

    const planRes = await query(
      `SELECT
        t.leave_type_id,
        t.leave_type_name,
        t.leave_type_code,
        t.is_paid_leave,
        t.allows_half_day,
        COALESCE(lpt.quota_days, t.annual_quota_days, 12) AS quota_days,
        COALESCE(b.allocated_days, lpt.quota_days, t.annual_quota_days, 12) AS allocated_days,
        COALESCE(b.used_days, 0) AS used_days
      FROM leave_types t
      LEFT JOIN leave_plan_types lpt ON lpt.leave_type_id = t.leave_type_id AND lpt.leave_plan_id = $1
      LEFT JOIN employee_leave_balances b ON b.leave_type_id = t.leave_type_id AND b.employee_id = $2
      WHERE t.is_active = true
      ORDER BY t.leave_type_name ASC`,
      [leavePlanId || null, employeeId]
    );

    const pendingRes = await query(
      `SELECT leave_type_id, COALESCE(SUM(total_leave_days), 0) AS pending_days
       FROM leave_requests
       WHERE employee_id = $1 AND current_status = 'PENDING'
       GROUP BY leave_type_id`,
      [employeeId]
    );
    const pendingMap = new Map(pendingRes.rows.map((r) => [r.leave_type_id, parseFloat(r.pending_days)]));

    let totalAllocated = 0;
    let totalUsed = 0;
    let totalPending = 0;
    let totalRemaining = 0;

    const balances = planRes.rows.map((row) => {
      const allocated = parseFloat(row.allocated_days) || 0;
      const used = parseFloat(row.used_days) || 0;
      const pending = pendingMap.get(row.leave_type_id) || 0;
      const remaining = Math.max(0, allocated - used);

      totalAllocated += allocated;
      totalUsed += used;
      totalPending += pending;
      totalRemaining += remaining;

      return {
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
    });

    const filtered = leaveTypeFilter
      ? balances.filter(
          (b) =>
            b.leaveType.toLowerCase().includes(leaveTypeFilter.toLowerCase()) ||
            b.code.toLowerCase() === leaveTypeFilter.toLowerCase()
        )
      : balances;

    return {
      employeeId,
      financialYear: fy,
      balances: filtered.length > 0 ? filtered : balances,
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

  const params = [employeeId];
  let dateClause = '';
  if (dateRange && dateRange.startDate && dateRange.endDate && dateRange.explicit) {
    dateClause = ` AND (r.start_date <= $${params.length + 2} AND r.end_date >= $${params.length + 1})`;
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
    WHERE r.employee_id = $1
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

module.exports = {
  getEmployeeLeaveBalance,
  getEmployeeLeaveHistory,
  getEmployeesCurrentlyOnLeave,
};
