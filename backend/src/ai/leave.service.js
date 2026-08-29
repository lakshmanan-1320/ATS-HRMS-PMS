const { query } = require('../config/db');
const logger = require('../config/logger');

/**
 * leave.service.js
 * Retrieves live leave balances and leave request history for authenticated employees.
 */

/**
 * Computes current financial / leave year string (e.g., '2026-2027' or '2026')
 */
function getCurrentLeaveYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  // Indian Financial Year starts in April
  if (month >= 4) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

/**
 * Retrieves current leave balances for an authenticated employee.
 * 
 * @param {string} employeeId - Employee UUID
 * @param {string} organizationId - Organization UUID
 * @param {string} [leaveTypeFilter] - Optional filter for specific leave type
 * @returns {Promise<object>} - Structured leave balance data
 */
async function getLeaveBalances(employeeId, organizationId, leaveTypeFilter = null) {
  if (!employeeId || !organizationId) {
    return {
      type: 'employee_leave_balance',
      employeeId,
      balances: [],
      totalAllocated: 0,
      totalRemaining: 0,
      financialYear: getCurrentLeaveYear()
    };
  }

  const fy = getCurrentLeaveYear();

  try {
    // 1. Check if employee has mapped leave plan or organization default plan
    const empRes = await query(
      `SELECT e.leave_plan_id, e.organization_id, e.date_of_joining
       FROM employees e
       WHERE e.employee_id = $1 AND e.organization_id = $2`,
      [employeeId, organizationId]
    );

    if (!empRes.rows.length) {
      return {
        type: 'employee_leave_balance',
        employeeId,
        balances: [],
        totalAllocated: 0,
        totalRemaining: 0,
        financialYear: fy,
        message: 'Employee record not found.'
      };
    }

    let leavePlanId = empRes.rows[0].leave_plan_id;
    if (!leavePlanId) {
      const defaultPlanRes = await query(
        `SELECT leave_plan_id FROM leave_plans
         WHERE organization_id = $1 AND is_active = true
         ORDER BY created_at ASC LIMIT 1`,
        [organizationId]
      );
      leavePlanId = defaultPlanRes.rows[0]?.leave_plan_id;
    }

    // 2. Fetch plan types and balance records
    const planSql = `
      SELECT 
        t.leave_type_id,
        t.leave_type_name,
        t.leave_type_code,
        t.is_paid_leave,
        t.allows_half_day,
        COALESCE(lpt.quota_days, t.annual_quota_days, 12) AS quota_days,
        COALESCE(b.allocated_days, lpt.quota_days, t.annual_quota_days, 0) AS allocated_days,
        COALESCE(b.used_days, 0) AS used_days
      FROM leave_types t
      LEFT JOIN leave_plan_types lpt ON lpt.leave_type_id = t.leave_type_id AND lpt.leave_plan_id = $1
      LEFT JOIN employee_leave_balances b ON b.leave_type_id = t.leave_type_id AND b.employee_id = $2
      JOIN employees e ON e.employee_id = $2 AND e.organization_id = $3
      WHERE t.is_active = true
        AND (lpt.leave_plan_id IS NOT NULL OR b.leave_balance_id IS NOT NULL)
      ORDER BY t.leave_type_name ASC
    `;

    const planRes = await query(planSql, [leavePlanId || null, employeeId, organizationId]);

    // 3. Fetch pending requests count per leave type
    const pendingSql = `
      SELECT 
        leave_type_id,
        COALESCE(SUM(total_leave_days), 0) AS pending_days
      FROM leave_requests
      WHERE employee_id = $1
        AND current_status = 'PENDING'
        AND EXISTS (
          SELECT 1 FROM employees e
          WHERE e.employee_id = leave_requests.employee_id
            AND e.organization_id = $2
        )
      GROUP BY leave_type_id
    `;
    const pendingRes = await query(pendingSql, [employeeId, organizationId]);
    const pendingMap = new Map();
    pendingRes.rows.forEach(r => pendingMap.set(r.leave_type_id, parseFloat(r.pending_days)));

    let totalAllocated = 0;
    let totalUsed = 0;
    let totalPending = 0;
    let totalRemaining = 0;

    const balances = planRes.rows.map(row => {
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
        isPaid: row.is_paid_leave
      };
    });

    // Optional filter
    const filteredBalances = leaveTypeFilter
      ? balances.filter(b => b.leaveType.toLowerCase().includes(leaveTypeFilter.toLowerCase()))
      : balances;

    return {
      type: 'employee_leave_balance',
      employeeId,
      financialYear: fy,
      balances: filteredBalances.length > 0 ? filteredBalances : balances,
      totalAllocated,
      totalUsed,
      totalPending,
      totalRemaining
    };
  } catch (err) {
    logger.error('[LeaveService] Error querying leave balances:', err.message);
    return {
      type: 'employee_leave_balance',
      employeeId,
      balances: [],
      error: err.message
    };
  }
}

/**
 * Retrieves actual leave history for an authenticated employee.
 * 
 * @param {string} employeeId - Employee UUID
 * @param {string} organizationId - Organization UUID
 * @param {object} [dateRange] - Optional { startDate, endDate }
 * @param {number} [limit=10] - Max records
 * @returns {Promise<object>} - Structured leave history records
 */
async function getLeaveHistory(employeeId, organizationId, dateRange = null, limit = 10) {
  if (!employeeId || !organizationId) {
    return {
      type: 'employee_leave_history',
      employeeId,
      records: [],
      totalDays: 0
    };
  }

  let sql = `
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
  `;
  const params = [employeeId, organizationId];

  if (dateRange && dateRange.startDate && dateRange.endDate) {
    sql += ` AND (r.start_date <= $${params.length + 2} AND r.end_date >= $${params.length + 1})`;
    params.push(dateRange.startDate, dateRange.endDate);
  }

  sql += ` ORDER BY r.start_date DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  try {
    const res = await query(sql, params);
    let totalDays = 0;

    const records = res.rows.map(r => {
      const days = parseFloat(r.total_leave_days) || 0;
      if (r.current_status === 'APPROVED') totalDays += days;

      return {
        leaveRequestId: r.leave_request_id,
        leaveType: r.leave_type_name,
        code: r.leave_type_code,
        startDate: r.start_date instanceof Date ? r.start_date.toISOString().slice(0, 10) : String(r.start_date).slice(0, 10),
        endDate: r.end_date instanceof Date ? r.end_date.toISOString().slice(0, 10) : String(r.end_date).slice(0, 10),
        days,
        sessionType: r.session_type || 'FULL_DAY',
        status: r.current_status,
        reason: r.reason || null,
        isPaid: r.is_paid_leave
      };
    });

    return {
      type: 'employee_leave_history',
      employeeId,
      period: dateRange?.label || 'Recent',
      records,
      count: records.length,
      totalApprovedDays: totalDays
    };
  } catch (err) {
    logger.error('[LeaveService] Error querying leave history:', err.message);
    return {
      type: 'employee_leave_history',
      employeeId,
      records: [],
      error: err.message
    };
  }
}

module.exports = {
  getLeaveBalances,
  getLeaveHistory
};
