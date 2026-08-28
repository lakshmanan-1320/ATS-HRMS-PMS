/**
 * hrmsData.service.js
 * Consolidated, parameterized data access layer for authenticated employee HRMS information.
 * Strictly enforces organization and employee tenant boundaries on every query.
 *
 * IMPORTANT — attendance_punches.employee_id stores the USER's user_id, not the employee_id.
 * All attendance queries must resolve user_id via: SELECT user_id FROM users WHERE employee_id = $1
 */

const { query } = require('../config/db');
const logger = require('../config/logger');

function getCurrentLeaveYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 4) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

// ─── 1. getEmployeeProfile ─────────────────────────────────────────────────────

async function getEmployeeProfile(employeeId, organizationId) {
  if (!employeeId || !organizationId) return null;
  try {
    const res = await query(`
      SELECT
        e.employee_id, e.organization_id, e.employee_code,
        e.first_name, e.last_name, e.email, e.phone,
        e.gender, e.date_of_birth, e.date_of_joining,
        e.status, e.employment_type, e.designation,
        d.name AS department_name,
        p.name AS attendance_policy_name,
        s.shift_name, s.start_time AS shift_start_time, s.end_time AS shift_end_time
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN attendance_policies p ON e.attendance_policy_id = p.attendance_policy_id
      LEFT JOIN attendance_shifts s ON e.shift_id = s.shift_id
      WHERE e.employee_id = $1 AND e.organization_id = $2
      LIMIT 1
    `, [employeeId, organizationId]);

    const row = res.rows[0];
    if (!row) return null;
    return {
      employeeId: row.employee_id,
      organizationId: row.organization_id,
      employeeCode: row.employee_code,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`.trim(),
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
    logger.error('[HRMSData] getEmployeeProfile:', err.message);
    return null;
  }
}

// ─── 2. getReportingManager ────────────────────────────────────────────────────
// Uses employees.manager_employee_id (verified from employee.repository.js schema).

async function getReportingManager(employeeId, organizationId) {
  if (!employeeId || !organizationId) return null;
  try {
    const res = await query(`
      SELECT
        m.employee_id   AS manager_employee_id,
        m.employee_code AS manager_code,
        m.first_name    AS manager_first_name,
        m.last_name     AS manager_last_name,
        m.email         AS manager_email,
        m.designation   AS manager_designation,
        d.name          AS manager_department
      FROM employees e
      JOIN employees m ON e.manager_employee_id = m.employee_id
      LEFT JOIN departments d ON m.department_id = d.department_id
      WHERE e.employee_id = $1
        AND e.organization_id = $2
        AND m.organization_id = $2
      LIMIT 1
    `, [employeeId, organizationId]);

    const row = res.rows[0];
    if (!row) return { hasManager: false };
    return {
      hasManager: true,
      managerId: row.manager_employee_id,
      managerCode: row.manager_code,
      fullName: `${row.manager_first_name} ${row.manager_last_name}`.trim(),
      email: row.manager_email,
      designation: row.manager_designation,
      department: row.manager_department,
    };
  } catch (err) {
    logger.error('[HRMSData] getReportingManager:', err.message);
    return null;
  }
}

// ─── 3. getActiveEmployeeCount ────────────────────────────────────────────────
// Count of active (non-terminated, non-inactive) employees for the organization.

async function getActiveEmployeeCount(organizationId) {
  if (!organizationId) return null;
  try {
    const res = await query(`
      SELECT COUNT(*) AS total
      FROM employees
      WHERE organization_id = $1
        AND status NOT IN ('terminated', 'inactive', 'resigned')
    `, [organizationId]);
    return { total: parseInt(res.rows[0]?.total || '0', 10) };
  } catch (err) {
    logger.error('[HRMSData] getActiveEmployeeCount:', err.message);
    return null;
  }
}

// ─── 4. getCurrentCheckinCount ────────────────────────────────────────────────
// Employees currently checked in today (checked in, no check-out yet).
// attendance_punches.employee_id stores the user_id.

async function getCurrentCheckinCount(organizationId) {
  if (!organizationId) return null;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await query(`
      SELECT COUNT(DISTINCT ap.employee_id) AS checked_in_count
      FROM attendance_punches ap
      JOIN users u ON u.user_id = ap.employee_id
      JOIN employees e ON e.employee_id = u.employee_id
      WHERE e.organization_id = $1
        AND ap.attendance_date = $2::date
        AND ap.check_in_time IS NOT NULL
    `, [organizationId, today]);
    return {
      date: today,
      checkedInCount: parseInt(res.rows[0]?.checked_in_count || '0', 10),
    };
  } catch (err) {
    logger.error('[HRMSData] getCurrentCheckinCount:', err.message);
    return null;
  }
}

// ─── 5. getEmployeesOnLeaveToday ──────────────────────────────────────────────
// List employees currently on approved leave today, scoped by role.
// managerEmployeeId: when non-null, restrict to direct reports only.

async function getEmployeesOnLeaveToday(organizationId, { managerEmployeeId = null } = {}) {
  if (!organizationId) return null;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const params = [organizationId, today];
    let managerFilter = '';
    if (managerEmployeeId) {
      managerFilter = `AND e.manager_employee_id = $3`;
      params.push(managerEmployeeId);
    }

    const res = await query(`
      SELECT
        e.employee_id,
        e.first_name || ' ' || e.last_name AS full_name,
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
    `, params);

    return {
      date: today,
      count: res.rows.length,
      employees: res.rows.map(r => ({
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
    logger.error('[HRMSData] getEmployeesOnLeaveToday:', err.message);
    return null;
  }
}

// ─── 6. getLeaveBalances ──────────────────────────────────────────────────────

async function getLeaveBalances(employeeId, organizationId, leaveTypeFilter = null) {
  if (!employeeId || !organizationId) {
    return { employeeId, balances: [], totalAllocated: 0, totalRemaining: 0, financialYear: getCurrentLeaveYear() };
  }
  const fy = getCurrentLeaveYear();
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

    const planRes = await query(`
      SELECT
        t.leave_type_id, t.leave_type_name, t.leave_type_code,
        t.is_paid_leave, t.allows_half_day,
        COALESCE(lpt.quota_days, t.annual_quota_days, 12) AS quota_days,
        COALESCE(b.allocated_days, lpt.quota_days, t.annual_quota_days, 12) AS allocated_days,
        COALESCE(b.used_days, 0) AS used_days
      FROM leave_types t
      LEFT JOIN leave_plan_types lpt ON lpt.leave_type_id = t.leave_type_id AND lpt.leave_plan_id = $1
      LEFT JOIN employee_leave_balances b ON b.leave_type_id = t.leave_type_id AND b.employee_id = $2
      WHERE t.is_active = true
      ORDER BY t.leave_type_name ASC
    `, [leavePlanId || null, employeeId]);

    const pendingRes = await query(
      `SELECT leave_type_id, COALESCE(SUM(total_leave_days), 0) AS pending_days
       FROM leave_requests WHERE employee_id = $1 AND current_status = 'PENDING' GROUP BY leave_type_id`,
      [employeeId]
    );
    const pendingMap = new Map(pendingRes.rows.map(r => [r.leave_type_id, parseFloat(r.pending_days)]));

    let totalAllocated = 0, totalUsed = 0, totalPending = 0, totalRemaining = 0;
    const balances = planRes.rows.map(row => {
      const allocated = parseFloat(row.allocated_days) || 0;
      const used = parseFloat(row.used_days) || 0;
      const pending = pendingMap.get(row.leave_type_id) || 0;
      const remaining = Math.max(0, allocated - used);
      totalAllocated += allocated; totalUsed += used; totalPending += pending; totalRemaining += remaining;
      return { leaveTypeId: row.leave_type_id, leaveType: row.leave_type_name, code: row.leave_type_code, allocated, used, pending, remaining, isPaid: row.is_paid_leave, allowsHalfDay: row.allows_half_day };
    });

    const filtered = leaveTypeFilter
      ? balances.filter(b => b.leaveType.toLowerCase().includes(leaveTypeFilter.toLowerCase()) || b.code.toLowerCase() === leaveTypeFilter.toLowerCase())
      : balances;

    return { employeeId, financialYear: fy, balances: filtered.length > 0 ? filtered : balances, totalAllocated, totalUsed, totalPending, totalRemaining };
  } catch (err) {
    logger.error('[HRMSData] getLeaveBalances:', err.message);
    return { employeeId, balances: [], totalAllocated: 0, totalRemaining: 0, financialYear: fy, error: err.message };
  }
}

// ─── 7. getLeaveHistory ───────────────────────────────────────────────────────
// dateRange = null means: return all recent history (no date filter applied).
// Only apply a date filter when the user explicitly mentioned a time period.

async function getLeaveHistory(employeeId, organizationId, dateRange = null, limit = 20) {
  if (!employeeId || !organizationId) {
    return { employeeId, records: [], count: 0, totalApprovedDays: 0 };
  }

  const params = [employeeId];
  // Only add date clause when user explicitly asked for a specific period
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
      r.leave_reason   AS reason,
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
    const records = res.rows.map(r => {
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
    logger.error('[HRMSData] getLeaveHistory:', err.message);
    return { employeeId, records: [], count: 0, totalApprovedDays: 0, error: err.message };
  }
}

// ─── 8. getTodayAttendance ────────────────────────────────────────────────────
// Queries today's attendance punch record for a specific employee.
// attendance_punches.employee_id = user_id from users table.

async function getTodayAttendance(employeeId, organizationId) {
  if (!employeeId || !organizationId) return null;
  const today = new Date().toISOString().slice(0, 10);
  try {
    // Resolve user_id from employee_id (attendance stores user_id)
    const userRes = await query(
      `SELECT user_id FROM users WHERE employee_id = $1 AND organization_id = $2 LIMIT 1`,
      [employeeId, organizationId]
    );
    const userId = userRes.rows[0]?.user_id;
    if (!userId) {
      return { date: today, status: 'NO_USER_RECORD', checkedIn: false, message: 'No user account linked to employee record.' };
    }

    const res = await query(`
      SELECT
        attendance_punch_id,
        attendance_date,
        check_in_time,
        check_out_time,
        work_duration_minutes,
        attendance_result,
        is_regularized
      FROM attendance_punches
      WHERE employee_id = $1 AND attendance_date = $2::date
      LIMIT 1
    `, [userId, today]);

    const row = res.rows[0];
    if (!row) {
      return { date: today, status: 'NOT_PUNCHED', checkedIn: false, checkIn: null, checkOut: null };
    }
    return {
      date: today,
      status: row.attendance_result || (row.check_in_time && row.check_out_time ? 'PRESENT' : row.check_in_time ? 'INCOMPLETE_PUNCH' : 'ABSENT'),
      checkedIn: !!row.check_in_time,
      checkIn: row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null,
      checkOut: row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null,
      workDurationMinutes: row.work_duration_minutes || 0,
      workHours: row.work_duration_minutes ? (row.work_duration_minutes / 60).toFixed(1) : null,
      isRegularized: row.is_regularized || false,
      missedPunchIn: !row.check_in_time,
      missedPunchOut: !!(row.check_in_time && !row.check_out_time),
    };
  } catch (err) {
    logger.error('[HRMSData] getTodayAttendance:', err.message);
    return { date: today, status: 'ERROR', error: err.message };
  }
}

// ─── 9. getAttendanceHistory ──────────────────────────────────────────────────

async function getAttendanceHistory(employeeId, organizationId, dateRange = null, limit = 30) {
  if (!employeeId || !organizationId) return { records: [], count: 0 };

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultEnd = now.toISOString().slice(0, 10);
  const startDate = dateRange?.startDate || defaultStart;
  const endDate = dateRange?.endDate || defaultEnd;

  try {
    // Resolve user_id — attendance_punches uses user_id
    const userRes = await query(
      `SELECT user_id FROM users WHERE employee_id = $1 AND organization_id = $2 LIMIT 1`,
      [employeeId, organizationId]
    );
    const userId = userRes.rows[0]?.user_id;
    if (!userId) return { records: [], count: 0 };

    const res = await query(`
      SELECT
        attendance_punch_id, attendance_date,
        check_in_time, check_out_time,
        work_duration_minutes, attendance_result, is_regularized
      FROM attendance_punches
      WHERE employee_id = $1
        AND attendance_date >= $2::date AND attendance_date <= $3::date
      ORDER BY attendance_date DESC
      LIMIT $4
    `, [userId, startDate, endDate, limit]);

    const records = res.rows.map(p => ({
      date: String(p.attendance_date).slice(0, 10),
      checkIn: p.check_in_time ? new Date(p.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null,
      checkOut: p.check_out_time ? new Date(p.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null,
      status: p.attendance_result || (p.check_in_time ? 'PRESENT' : 'ABSENT'),
      workHours: p.work_duration_minutes ? (p.work_duration_minutes / 60).toFixed(1) : null,
      isRegularized: p.is_regularized || false,
    }));

    return { period: dateRange?.label || `${startDate} to ${endDate}`, records, count: records.length };
  } catch (err) {
    logger.error('[HRMSData] getAttendanceHistory:', err.message);
    return { records: [], count: 0, error: err.message };
  }
}

// ─── 10. getAttendanceSummary ─────────────────────────────────────────────────

async function getAttendanceSummary(employeeId, organizationId, dateRange = null) {
  if (!employeeId || !organizationId) {
    return { period: 'Current Month', workingDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, attendancePercentage: 100 };
  }
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultEnd = now.toISOString().slice(0, 10);
  const startDate = dateRange?.startDate || defaultStart;
  const endDate = dateRange?.endDate || defaultEnd;
  const periodLabel = dateRange?.label || `${now.toLocaleString('en-IN', { month: 'long' })} ${now.getFullYear()}`;

  try {
    const userRes = await query(
      `SELECT user_id FROM users WHERE employee_id = $1 AND organization_id = $2 LIMIT 1`,
      [employeeId, organizationId]
    );
    const userId = userRes.rows[0]?.user_id;
    if (!userId) return { period: periodLabel, workingDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, attendancePercentage: 100 };

    const res = await query(`
      SELECT attendance_result, check_in_time, check_out_time, work_duration_minutes
      FROM attendance_punches
      WHERE employee_id = $1
        AND attendance_date >= $2::date AND attendance_date <= $3::date
    `, [userId, startDate, endDate]);

    let presentDays = 0, lateDays = 0, halfDays = 0, totalWorkMinutes = 0;
    res.rows.forEach(r => {
      if (r.check_in_time) {
        presentDays++;
        if (r.work_duration_minutes) totalWorkMinutes += r.work_duration_minutes;
        const result = (r.attendance_result || '').toUpperCase();
        if (['LATE_ARRIVAL', 'LATE', 'LATE_PRESENT'].includes(result)) lateDays++;
        if (result === 'HALF_DAY' || (r.work_duration_minutes && r.work_duration_minutes < 240)) halfDays++;
      }
    });

    const workingDays = res.rows.length;
    const absentDays = workingDays - presentDays;
    const attendancePercentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 100;

    return {
      period: periodLabel, startDate, endDate,
      workingDays, presentDays, absentDays, lateDays, halfDays,
      attendancePercentage,
      totalWorkHours: (totalWorkMinutes / 60).toFixed(1),
    };
  } catch (err) {
    logger.error('[HRMSData] getAttendanceSummary:', err.message);
    return { period: periodLabel, workingDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, attendancePercentage: 100, error: err.message };
  }
}

// ─── 11. getLeaveBalancesPlusPolicyContext ────────────────────────────────────
// Convenience: leave balance summary for mixed-mode (LEAVE_REQUEST) intent.

async function getLeaveBalancesAndHistory(employeeId, organizationId) {
  const [balances, history] = await Promise.all([
    getLeaveBalances(employeeId, organizationId),
    getLeaveHistory(employeeId, organizationId, null, 5),
  ]);
  return { balances, history };
}

module.exports = {
  getEmployeeProfile,
  getReportingManager,
  getActiveEmployeeCount,
  getCurrentCheckinCount,
  getEmployeesOnLeaveToday,
  getLeaveBalances,
  getLeaveHistory,
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceSummary,
  getLeaveBalancesAndHistory,
};
