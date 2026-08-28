/**
 * attendanceData.service.js
 * Parameterized data access for live attendance, punches, check-in counts, and absence records.
 * Enforces organization and user boundaries.
 */

'use strict';

const { query } = require('../../config/db');
const logger = require('../../config/logger');

/**
 * Retrieves today's attendance punch for a specific employee.
 * @param {string} employeeId - UUID of employee
 * @param {string} organizationId - UUID of organization
 * @returns {Promise<object>}
 */
async function getTodayAttendance(employeeId, organizationId) {
  const today = new Date().toISOString().slice(0, 10);
  if (!employeeId || !organizationId) {
    return { date: today, status: 'NOT_FOUND', checkedIn: false };
  }

  try {
    const userRes = await query(
      `SELECT user_id FROM users WHERE employee_id = $1 AND organization_id = $2 LIMIT 1`,
      [employeeId, organizationId]
    );
    const userId = userRes.rows[0]?.user_id;
    if (!userId) {
      return { date: today, status: 'NO_USER_ACCOUNT', checkedIn: false };
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
      [userId, today]
    );

    const row = res.rows[0];
    if (!row) {
      return {
        date: today,
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
      date: today,
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
    logger.error('[Data:Attendance] Error in getTodayAttendance:', err.message);
    return { date: today, status: 'ERROR', error: err.message };
  }
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

module.exports = {
  getTodayAttendance,
  getCurrentCheckins,
  getAttendanceSummary,
  getEmployeesAbsentToday,
};
