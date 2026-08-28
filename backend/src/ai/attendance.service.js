const { query } = require('../config/db');
const logger = require('../config/logger');

/**
 * attendance.service.js
 * Queries live attendance metrics, present/absent counts, late arrivals, and punch history.
 */

/**
 * Retrieves attendance summary for an employee over a given date range.
 * 
 * @param {object} employeeContext - Verified employee context
 * @param {object} [dateRange] - { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', label: string }
 * @returns {Promise<object>} - Structured attendance summary
 */
async function getAttendanceSummary(employeeContext, dateRange = null) {
  const { employeeId, userId, organizationId } = employeeContext;

  if (!organizationId || (!employeeId && !userId)) {
    return {
      type: 'employee_attendance',
      period: 'Unknown',
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      leaveDays: 0
    };
  }

  // Default to current month if no date range specified
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const defaultStart = new Date(year, month, 1).toISOString().slice(0, 10);
  const defaultEnd = new Date().toISOString().slice(0, 10);

  const startDate = dateRange?.startDate || defaultStart;
  const endDate = dateRange?.endDate || defaultEnd;
  const periodLabel = dateRange?.label || `${now.toLocaleString('default', { month: 'long' })} ${year}`;

  try {
    const matrixSql = `
      WITH auth_user AS (
        SELECT u.user_id, u.employee_id
        FROM users u
        JOIN employees e ON e.employee_id = u.employee_id
        WHERE u.user_id = $1
          AND u.employee_id = $2
          AND u.organization_id = $3
          AND e.organization_id = $3
        LIMIT 1
      ),
      days AS (
        SELECT generate_series($4::date, $5::date, interval '1 day')::date AS attendance_date
      )
      SELECT
        d.attendance_date,
        EXTRACT(DOW FROM d.attendance_date)::int AS day_of_week,
        ap.attendance_punch_id,
        ap.check_in_time,
        ap.check_out_time,
        ap.work_duration_minutes,
        ap.attendance_result,
        ap.location_status,
        lr.leave_request_id,
        lr.current_status AS leave_status,
        lt.leave_type_name,
        h.holiday_name
      FROM days d
      CROSS JOIN auth_user au
      LEFT JOIN attendance_punches ap
        ON ap.employee_id = au.user_id
       AND ap.attendance_date = d.attendance_date
      LEFT JOIN leave_requests lr
        ON lr.employee_id = au.employee_id
       AND lr.start_date <= d.attendance_date
       AND lr.end_date >= d.attendance_date
       AND lr.current_status IN ('APPROVED', 'PENDING')
      LEFT JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
      LEFT JOIN holidays h
        ON h.holiday_date = d.attendance_date
       AND h.is_active = true
       AND h.is_deleted = false
       AND (h.organization_id = $3 OR h.organization_id IS NULL)
      ORDER BY d.attendance_date ASC
    `;
    const matrixRes = await query(matrixSql, [userId, employeeId, organizationId, startDate, endDate]);
    const rows = matrixRes.rows;

    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let totalWorkMinutes = 0;
    let leaveDays = 0;
    let pendingLeaveDays = 0;
    let holidayDays = 0;
    let weekOffDays = 0;
    let totalWorkingDays = 0;

    const records = rows.map((row) => {
      const date = row.attendance_date instanceof Date ? row.attendance_date.toISOString().slice(0, 10) : String(row.attendance_date).slice(0, 10);
      const result = (row.attendance_result || '').toUpperCase();
      const isWeekOff = row.day_of_week === 0 || row.day_of_week === 6;
      const hasPunch = Boolean(row.attendance_punch_id);
      let status = 'ABSENT';

      if (row.holiday_name) {
        status = hasPunch ? 'HOLIDAY_PRESENT' : 'HOLIDAY';
        holidayDays += 1;
      } else if (row.leave_status === 'APPROVED') {
        status = 'APPROVED_LEAVE';
        leaveDays += 1;
      } else if (row.leave_status === 'PENDING') {
        status = hasPunch ? 'PRESENT_PENDING_LEAVE' : 'PENDING_LEAVE';
        pendingLeaveDays += 1;
      } else if (isWeekOff) {
        status = hasPunch ? 'WEEK_OFF_PRESENT' : 'WEEK_OFF';
        weekOffDays += 1;
      } else if (hasPunch && row.check_in_time && row.check_out_time) {
        status = result || 'PRESENT';
        presentDays += 1;
        totalWorkingDays += 1;
      } else if (hasPunch && row.check_in_time) {
        status = 'INCOMPLETE_PUNCH';
        presentDays += 1;
        totalWorkingDays += 1;
      } else {
        absentDays += 1;
        totalWorkingDays += 1;
      }

      if (hasPunch && (result === 'LATE_ARRIVAL' || result === 'LATE' || result === 'LATE_PRESENT')) {
        lateDays += 1;
      }
      if (hasPunch && (result === 'HALF_DAY' || (row.work_duration_minutes && row.work_duration_minutes < 240))) {
        halfDays += 1;
      }
      if (row.work_duration_minutes) {
        totalWorkMinutes += row.work_duration_minutes;
      }

      return {
        date,
        status,
        leaveType: row.leave_type_name || null,
        holidayName: row.holiday_name || null,
        checkIn: row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        checkOut: row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        attendanceResult: row.attendance_result || null,
        workHours: row.work_duration_minutes ? (row.work_duration_minutes / 60).toFixed(1) : null
      };
    });

    const attendedWorkingDays = presentDays + absentDays + leaveDays + pendingLeaveDays;
    const attendancePercentage = attendedWorkingDays > 0 ? Math.round((presentDays / attendedWorkingDays) * 100) : 100;

    return {
      type: 'employee_attendance',
      employeeId,
      period: periodLabel,
      startDate,
      endDate,
      totalWorkingDays,
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      leaveDays,
      pendingLeaveDays,
      holidayDays,
      weekOffDays,
      attendancePercentage: isNaN(attendancePercentage) ? 100 : attendancePercentage,
      totalWorkHours: (totalWorkMinutes / 60).toFixed(1),
      averageDailyHours: presentDays > 0 ? (totalWorkMinutes / (presentDays * 60)).toFixed(1) : '0.0',
      leaveRecords: records.filter((r) => r.status === 'APPROVED_LEAVE'),
      absentRecords: records.filter((r) => r.status === 'ABSENT'),
      lateRecords: records.filter((r) => ['LATE_ARRIVAL', 'LATE', 'LATE_PRESENT'].includes((r.attendanceResult || '').toUpperCase())),
      records,
      recentPunches: records.filter((r) => r.checkIn).slice(-5)
    };
  } catch (err) {
    logger.error('[AttendanceService] Error querying attendance summary:', err.message);
    return {
      type: 'employee_attendance',
      employeeId,
      period: periodLabel,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      leaveDays: 0,
      error: err.message
    };
  }
}

/**
 * Checks attendance punch for a specific date (e.g., yesterday or a specific date)
 */
async function getSpecificDateAttendance(employeeContext, targetDate) {
  const { employeeId, userId, organizationId } = employeeContext;

  try {
    const sql = `
      SELECT 
        attendance_punch_id,
        attendance_date,
        check_in_time,
        check_out_time,
        work_duration_minutes,
        attendance_result
      FROM attendance_punches
      WHERE employee_id = $1
        AND attendance_date = $4::date
        AND EXISTS (
          SELECT 1 FROM users u
          JOIN employees e ON e.employee_id = u.employee_id
          WHERE u.user_id = attendance_punches.employee_id
            AND u.user_id = $1
            AND u.employee_id = $2
            AND u.organization_id = $3
            AND e.organization_id = $3
        )
      LIMIT 1
    `;
    const res = await query(sql, [userId, employeeId, organizationId, targetDate]);
    const row = res.rows[0];

    if (!row) {
      return {
        date: targetDate,
        status: 'ABSENT',
        checkedIn: false,
        message: `No check-in record found for ${targetDate}.`
      };
    }

    return {
      date: targetDate,
      status: row.attendance_result || (row.check_in_time ? 'PRESENT' : 'ABSENT'),
      checkedIn: !!row.check_in_time,
      checkInTime: row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      checkOutTime: row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      workDurationMinutes: row.work_duration_minutes
    };
  } catch (err) {
    logger.error('[AttendanceService] Error querying specific date attendance:', err.message);
    return {
      date: targetDate,
      status: 'UNKNOWN',
      error: err.message
    };
  }
}

module.exports = {
  getAttendanceSummary,
  getSpecificDateAttendance
};
