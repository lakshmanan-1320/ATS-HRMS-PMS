/**
 * attendanceData.service.js
 * Parameterized data access for live attendance, punches, check-in counts, and absence records.
 * Enforces organization and user boundaries.
 */

'use strict';

const { query } = require('../../config/db');
const logger = require('../../config/logger');

/**
 * Retrieves attendance punch for a specific employee on any date (today, yesterday, specific day).
 * @param {string} employeeId - UUID of employee
 * @param {string} organizationId - UUID of organization
 * @param {string} [targetDate] - Date string YYYY-MM-DD (defaults to today)
 * @param {string} [label] - Optional label (e.g. 'Today', 'Yesterday')
 * @returns {Promise<object>}
 */
async function getDayAttendance(employeeId, organizationId, targetDate = null, label = null) {
  const dateStr = targetDate || new Date().toISOString().slice(0, 10);
  const displayLabel = label || (dateStr === new Date().toISOString().slice(0, 10) ? 'Today' : dateStr);

  if (!employeeId || !organizationId) {
    return { date: dateStr, label: displayLabel, status: 'NOT_FOUND', checkedIn: false };
  }

  try {
    const userRes = await query(
      `SELECT user_id FROM users WHERE employee_id = $1 AND organization_id = $2 LIMIT 1`,
      [employeeId, organizationId]
    );
    const userId = userRes.rows[0]?.user_id;
    if (!userId) {
      return { date: dateStr, label: displayLabel, status: 'NO_USER_ACCOUNT', checkedIn: false };
    }

    const res = await query(
      `SELECT
        attendance_punch_id,
        attendance_date,
        check_in_time,
        check_out_time,
        work_duration_minutes,
        attendance_result,
        is_regularized
      FROM attendance_punches
      WHERE employee_id = $1 AND attendance_date = $2::date
      LIMIT 1`,
      [userId, dateStr]
    );

    const row = res.rows[0];
    if (!row) {
      return {
        date: dateStr,
        label: displayLabel,
        status: 'NOT_PUNCHED',
        checkedIn: false,
        checkIn: null,
        checkOut: null,
        missedPunchIn: true,
        missedPunchOut: false,
      };
    }

    const hasCheckIn = !!row.check_in_time;
    const hasCheckOut = !!row.check_out_time;

    return {
      date: dateStr,
      label: displayLabel,
      status: row.attendance_result || (hasCheckIn && hasCheckOut ? 'PRESENT' : hasCheckIn ? 'INCOMPLETE_PUNCH' : 'ABSENT'),
      checkedIn: hasCheckIn,
      checkIn: hasCheckIn ? new Date(row.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null,
      checkOut: hasCheckOut ? new Date(row.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null,
      workDurationMinutes: row.work_duration_minutes || 0,
      workHours: row.work_duration_minutes ? (row.work_duration_minutes / 60).toFixed(1) : null,
      isRegularized: row.is_regularized || false,
      missedPunchIn: !hasCheckIn,
      missedPunchOut: hasCheckIn && !hasCheckOut,
    };
  } catch (err) {
    logger.error(`[Data:Attendance] Error in getDayAttendance for ${dateStr}:`, err.message);
    return { date: dateStr, label: displayLabel, status: 'ERROR', error: err.message };
  }
}

/**
 * Retrieves today's attendance punch for a specific employee.
 */
async function getTodayAttendance(employeeId, organizationId) {
  const today = new Date().toISOString().slice(0, 10);
  return getDayAttendance(employeeId, organizationId, today, 'Today');
}

/**
 * Retrieves yesterday's attendance punch for a specific employee.
 */
async function getYesterdayAttendance(employeeId, organizationId) {
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yestStr = yest.toISOString().slice(0, 10);
  return getDayAttendance(employeeId, organizationId, yestStr, 'Yesterday');
}

/**
 * Retrieves count of employees who have checked in today.
 * @param {string} organizationId
 * @returns {Promise<object>}
 */
async function getCurrentCheckins(organizationId) {
  const today = new Date().toISOString().slice(0, 10);
  if (!organizationId) return { date: today, checkedInCount: 0 };

  try {
    const res = await query(
      `SELECT COUNT(DISTINCT ap.employee_id) AS checked_in_count
      FROM attendance_punches ap
      JOIN users u ON u.user_id = ap.employee_id
      JOIN employees e ON e.employee_id = u.employee_id
      WHERE e.organization_id = $1
        AND ap.attendance_date = $2::date
        AND ap.check_in_time IS NOT NULL`,
      [organizationId, today]
    );

    return {
      date: today,
      checkedInCount: parseInt(res.rows[0]?.checked_in_count || '0', 10),
    };
  } catch (err) {
    logger.error('[Data:Attendance] Error in getCurrentCheckins:', err.message);
    return { date: today, checkedInCount: 0, error: err.message };
  }
}

/**
 * Retrieves monthly / date-range attendance summary for an employee.
 * @param {string} employeeId
 * @param {string} organizationId
 * @param {object} [dateRange]
 * @returns {Promise<object>}
 */
async function getAttendanceSummary(employeeId, organizationId, dateRange = null) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultEnd = now.toISOString().slice(0, 10);

  const startDate = dateRange?.startDate || defaultStart;
  const endDate = dateRange?.endDate || defaultEnd;
  const periodLabel = dateRange?.label || `${now.toLocaleString('en-IN', { month: 'long' })} ${now.getFullYear()}`;

  if (!employeeId || !organizationId) {
    return { period: periodLabel, workingDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, attendancePercentage: 100 };
  }

  try {
    const userRes = await query(
      `SELECT user_id FROM users WHERE employee_id = $1 AND organization_id = $2 LIMIT 1`,
      [employeeId, organizationId]
    );
    const userId = userRes.rows[0]?.user_id;
    if (!userId) {
      return { period: periodLabel, workingDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, attendancePercentage: 100 };
    }

    const res = await query(
      `SELECT
        attendance_result,
        check_in_time,
        check_out_time,
        work_duration_minutes
      FROM attendance_punches
      WHERE employee_id = $1
        AND attendance_date >= $2::date AND attendance_date <= $3::date`,
      [userId, startDate, endDate]
    );

    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let totalWorkMinutes = 0;

    res.rows.forEach((r) => {
      if (r.check_in_time) {
        presentDays++;
        if (r.work_duration_minutes) totalWorkMinutes += r.work_duration_minutes;
        const result = (r.attendance_result || '').toUpperCase();
        if (['LATE_ARRIVAL', 'LATE', 'LATE_PRESENT'].includes(result)) lateDays++;
        if (result === 'HALF_DAY' || (r.work_duration_minutes && r.work_duration_minutes < 240)) halfDays++;
      }
    });

    const workingDays = res.rows.length;
    const absentDays = Math.max(0, workingDays - presentDays);
    const attendancePercentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 100;

    return {
      period: periodLabel,
      startDate,
      endDate,
      workingDays,
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      attendancePercentage,
      totalWorkHours: (totalWorkMinutes / 60).toFixed(1),
    };
  } catch (err) {
    logger.error('[Data:Attendance] Error in getAttendanceSummary:', err.message);
    return { period: periodLabel, workingDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, attendancePercentage: 100, error: err.message };
  }
}

/**
 * Retrieves list of employees absent or not checked in today (for managers/HR).
 * @param {string} organizationId
 * @param {string} [managerEmployeeId]
 * @returns {Promise<object>}
 */
async function getEmployeesAbsentToday(organizationId, managerEmployeeId = null) {
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
        d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN users u ON u.employee_id = e.employee_id
      LEFT JOIN attendance_punches ap ON ap.employee_id = u.user_id AND ap.attendance_date = $2::date
      WHERE e.organization_id = $1
        AND e.status NOT IN ('terminated', 'inactive', 'resigned')
        AND (ap.check_in_time IS NULL)
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
      })),
    };
  } catch (err) {
    logger.error('[Data:Attendance] Error in getEmployeesAbsentToday:', err.message);
    return { date: today, count: 0, employees: [], error: err.message };
  }
}

/**
 * Retrieves incomplete punches for an employee (e.g. checked in but missing check-out).
 * @param {string} employeeId - UUID of employee
 * @param {string} organizationId - UUID of organization
 * @param {number} [daysBack=30]
 * @returns {Promise<object>}
 */
async function getIncompletePunches(employeeId, organizationId, daysBack = 30) {
  if (!employeeId || !organizationId) {
    return { count: 0, records: [] };
  }

  try {
    const userRes = await query(
      `SELECT user_id FROM users WHERE employee_id = $1 AND organization_id = $2 LIMIT 1`,
      [employeeId, organizationId]
    );
    const userId = userRes.rows[0]?.user_id;
    if (!userId) return { count: 0, records: [] };

    const sql = `
      SELECT
        ap.attendance_punch_id,
        ap.attendance_date,
        ap.check_in_time,
        ap.check_out_time,
        ap.attendance_result,
        ap.is_regularized
      FROM attendance_punches ap
      WHERE ap.employee_id = $1
        AND ap.attendance_date >= (CURRENT_DATE - INTERVAL '${daysBack} days')::date
        AND (
          (ap.check_in_time IS NOT NULL AND ap.check_out_time IS NULL AND ap.attendance_date < CURRENT_DATE)
          OR (ap.check_in_time IS NULL AND ap.check_out_time IS NOT NULL)
          OR ap.attendance_result IN ('INCOMPLETE_PUNCH', 'HALF_DAY_INCOMPLETE', 'MISSING_PUNCH')
        )
      ORDER BY ap.attendance_date DESC
      LIMIT 10
    `;
    const res = await query(sql, [userId]);

    const records = res.rows.map((r) => ({
      id: r.attendance_punch_id,
      date: String(r.attendance_date).slice(0, 10),
      checkIn: r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not recorded',
      checkOut: r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not recorded',
      status: 'Incomplete',
      isRegularized: r.is_regularized || false,
    }));

    return {
      count: records.length,
      records,
    };
  } catch (err) {
    logger.error('[Data:Attendance] Error in getIncompletePunches:', err.message);
    return { count: 0, records: [], error: err.message };
  }
}

/**
 * Retrieves incomplete punches across a manager's direct reports.
 */
async function getTeamIncompletePunches(managerEmployeeId, organizationId) {
  if (!managerEmployeeId || !organizationId) return { count: 0, records: [] };

  try {
    const sql = `
      SELECT
        e.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        ap.attendance_date,
        ap.check_in_time,
        ap.check_out_time,
        ap.attendance_result
      FROM employees e
      JOIN users u ON u.employee_id = e.employee_id
      JOIN attendance_punches ap ON ap.employee_id = u.user_id
      WHERE e.organization_id = $1
        AND e.manager_employee_id = $2
        AND e.status = 'active'
        AND ap.attendance_date >= (CURRENT_DATE - INTERVAL '14 days')::date
        AND (
          (ap.check_in_time IS NOT NULL AND ap.check_out_time IS NULL AND ap.attendance_date < CURRENT_DATE)
          OR (ap.check_in_time IS NULL AND ap.check_out_time IS NOT NULL)
          OR ap.attendance_result IN ('INCOMPLETE_PUNCH', 'HALF_DAY_INCOMPLETE', 'MISSING_PUNCH')
        )
      ORDER BY ap.attendance_date DESC
      LIMIT 15
    `;
    const res = await query(sql, [organizationId, managerEmployeeId]);

    const records = res.rows.map((r) => ({
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      date: String(r.attendance_date).slice(0, 10),
      checkIn: r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not recorded',
      checkOut: r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not recorded',
    }));

    return {
      count: records.length,
      records,
    };
  } catch (err) {
    logger.error('[Data:Attendance] Error in getTeamIncompletePunches:', err.message);
    return { count: 0, records: [], error: err.message };
  }
}

/**
 * Retrieves team checkin/absence status for today for a manager.
 */
async function getTeamCheckinStatus(managerEmployeeId, organizationId) {
  const today = new Date().toISOString().slice(0, 10);
  if (!managerEmployeeId || !organizationId) return { checkedIn: [], notCheckedIn: [], total: 0 };

  try {
    const sql = `
      SELECT
        e.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        e.designation,
        d.name AS department_name,
        ap.check_in_time,
        ap.check_out_time,
        ap.attendance_result
      FROM employees e
      LEFT JOIN departments d ON d.department_id = e.department_id
      LEFT JOIN users u ON u.employee_id = e.employee_id
      LEFT JOIN attendance_punches ap ON ap.employee_id = u.user_id AND ap.attendance_date = $2::date
      WHERE e.organization_id = $1
        AND e.manager_employee_id = $3
        AND e.status = 'active'
      ORDER BY e.first_name ASC
    `;
    const res = await query(sql, [organizationId, today, managerEmployeeId]);

    const checkedIn = [];
    const notCheckedIn = [];

    res.rows.forEach((r) => {
      const item = {
        employeeName: r.employee_name,
        employeeCode: r.employee_code,
        designation: r.designation,
        department: r.department_name,
        checkInTime: r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null,
        checkOutTime: r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null,
      };
      if (r.check_in_time) {
        checkedIn.push(item);
      } else {
        notCheckedIn.push(item);
      }
    });

    return {
      date: today,
      total: res.rows.length,
      checkedInCount: checkedIn.length,
      notCheckedInCount: notCheckedIn.length,
      checkedIn,
      notCheckedIn,
    };
  } catch (err) {
    logger.error('[Data:Attendance] Error in getTeamCheckinStatus:', err.message);
    return { date: today, checkedIn: [], notCheckedIn: [], total: 0, error: err.message };
  }
}

/**
 * Retrieves team late arrivals for a manager.
 */
async function getTeamLateArrivals(managerEmployeeId, organizationId, date = null) {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  if (!managerEmployeeId || !organizationId) return { count: 0, lateEmployees: [] };

  try {
    const sql = `
      SELECT
        e.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        e.designation,
        ap.check_in_time,
        ap.attendance_result
      FROM employees e
      JOIN users u ON u.employee_id = e.employee_id
      JOIN attendance_punches ap ON ap.employee_id = u.user_id AND ap.attendance_date = $2::date
      WHERE e.organization_id = $1
        AND e.manager_employee_id = $3
        AND e.status = 'active'
        AND (
          UPPER(ap.attendance_result) IN ('LATE', 'LATE_ARRIVAL', 'LATE_PRESENT')
          OR (ap.check_in_time IS NOT NULL AND EXTRACT(HOUR FROM ap.check_in_time) >= 10)
        )
      ORDER BY ap.check_in_time ASC
    `;
    const res = await query(sql, [organizationId, targetDate, managerEmployeeId]);

    return {
      date: targetDate,
      count: res.rows.length,
      lateEmployees: res.rows.map((r) => ({
        employeeName: r.employee_name,
        employeeCode: r.employee_code,
        designation: r.designation,
        checkInTime: r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      })),
    };
  } catch (err) {
    logger.error('[Data:Attendance] Error in getTeamLateArrivals:', err.message);
    return { date: targetDate, count: 0, lateEmployees: [], error: err.message };
  }
}

module.exports = {
  getTodayAttendance,
  getYesterdayAttendance,
  getDayAttendance,
  getCurrentCheckins,
  getAttendanceSummary,
  getEmployeesAbsentToday,
  getIncompletePunches,
  getTeamIncompletePunches,
  getTeamCheckinStatus,
  getTeamLateArrivals,
};
