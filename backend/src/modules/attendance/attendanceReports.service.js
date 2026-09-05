const { query } = require('../../config/db');
const env = require('../../config/env');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

/* ─── Helper: Time Zone Formatter ─── */
function formatInTimeZone(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '—';
  
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

function safeFormatDate(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

async function getEmployeeIdFromUser(userId) {
  const res = await query(`SELECT employee_id FROM users WHERE user_id = $1`, [userId]);
  return res.rows[0]?.employee_id || null;
}

/* ─── Period Day Matrix Generation ─── */
async function getPeriodDayMatrix(orgId, filters = {}, user) {
  const { 
    start_date, 
    end_date, 
    employee_id, 
    department_id, 
    designation, 
    policy_id, 
    shift_id, 
    attendance_result, 
    location_status, 
    search,
    regularized_only,
    permissions_only
  } = filters;

  const startDate = start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = end_date || new Date().toISOString().slice(0, 10);

  let userConstraint = '';
  const params = [orgId, startDate, endDate];
  let pIdx = 4;

  if (user.role === 'employee') {
    const empId = await getEmployeeIdFromUser(user.id);
    userConstraint = `AND e.employee_id = $${pIdx}`;
    params.push(empId);
    pIdx++;
  } else if (user.role === 'manager') {
    const empId = await getEmployeeIdFromUser(user.id);
    userConstraint = `AND (e.manager_employee_id = $${pIdx} OR e.employee_id = $${pIdx})`;
    params.push(empId);
    pIdx++;
  }

  let filterConditions = '';
  if (employee_id) {
    filterConditions += ` AND e.employee_id = $${pIdx}`;
    params.push(employee_id);
    pIdx++;
  }
  if (department_id) {
    filterConditions += ` AND e.department_id = $${pIdx}`;
    params.push(department_id);
    pIdx++;
  }
  if (designation) {
    filterConditions += ` AND e.designation ILIKE $${pIdx}`;
    params.push(`%${designation}%`);
    pIdx++;
  }
  if (policy_id) {
    filterConditions += ` AND e.attendance_policy_id = $${pIdx}`;
    params.push(policy_id);
    pIdx++;
  }
  if (search) {
    filterConditions += ` AND (CONCAT(e.first_name, ' ', e.last_name) ILIKE $${pIdx} OR e.employee_code ILIKE $${pIdx} OR u.email ILIKE $${pIdx})`;
    params.push(`%${search}%`);
    pIdx++;
  }

  // Outer filters applied to the final SELECT query
  let outerFilterConditions = '';
  if (shift_id) {
    outerFilterConditions += ` AND (ap.shift_id = $${pIdx} OR (ap.shift_id IS NULL AND ae.shift_id = $${pIdx}))`;
    params.push(shift_id);
    pIdx++;
  }
  if (attendance_result) {
    outerFilterConditions += ` AND ap.attendance_result = $${pIdx}`;
    params.push(attendance_result);
    pIdx++;
  }
  if (location_status) {
    if (location_status === 'LOCATION_NOT_VERIFIED') {
      outerFilterConditions += ` AND (ap.location_status IS NULL OR ap.location_status = 'LOCATION_NOT_VERIFIED')`;
    } else {
      outerFilterConditions += ` AND ap.location_status = $${pIdx}`;
      params.push(location_status);
      pIdx++;
    }
  }
  if (regularized_only === 'true' || regularized_only === true) {
    outerFilterConditions += ` AND ap.is_regularized = true`;
  }
  if (permissions_only === 'true' || permissions_only === true) {
    outerFilterConditions += ` AND reg.request_category = 'PERMISSION' AND reg.approval_status = 'APPROVED'`;
  }

  const sql = `
    WITH date_series AS (
      SELECT generate_series($2::date, $3::date, '1 day'::interval)::date AS d_date
    ),
    active_emp AS (
      SELECT 
        e.employee_id, e.employee_code, e.first_name, e.last_name, e.designation, e.department_id, e.attendance_policy_id, e.shift_id, u.user_id,
        d.name AS department_name, pol.name AS policy_name, es.shift_name, es.shift_code, es.start_time AS shift_start_time, es.end_time AS shift_end_time, es.minimum_hours
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN attendance_policies pol ON e.attendance_policy_id = pol.attendance_policy_id
      LEFT JOIN attendance_shifts es ON e.shift_id = es.shift_id
      WHERE e.organization_id = $1 AND e.status = 'active' ${userConstraint} ${filterConditions}
    ),
    holidays_in_range AS (
      SELECT holiday_date, holiday_name 
      FROM holidays 
      WHERE is_deleted = false AND is_active = true AND holiday_date BETWEEN $2::date AND $3::date
    ),
    leaves_in_range AS (
      SELECT lr.employee_id, lr.start_date, lr.end_date, lt.is_paid_leave
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
      WHERE lr.current_status = 'APPROVED' AND (lr.start_date <= $3::date AND lr.end_date >= $2::date)
    )
    SELECT 
      ae.employee_id,
      ae.employee_code,
      ae.first_name,
      ae.last_name,
      ae.designation,
      ae.department_name,
      ae.policy_name,
      ae.shift_name,
      ae.shift_code,
      ae.shift_start_time,
      ae.shift_end_time,
      ae.minimum_hours,
      ds.d_date AS attendance_date,
      EXTRACT(DOW FROM ds.d_date)::int AS day_of_week,
      ap.attendance_punch_id,
      COALESCE(ap.regularized_check_in, ap.check_in_time) AS check_in_time,
      COALESCE(ap.regularized_check_out, ap.check_out_time) AS check_out_time,
      ap.check_in_time AS original_check_in_time,
      ap.check_out_time AS original_check_out_time,
      ap.is_regularized,
      CASE
        WHEN reg.approval_status = 'PENDING' THEN 'Pending Approval'
        WHEN reg.approval_status = 'REJECTED' THEN 'Rejected'
        WHEN reg.approval_status = 'APPROVED' AND reg.request_category = 'REGULARIZATION' THEN 'Regularized'
        WHEN reg.approval_status = 'APPROVED' AND reg.request_category = 'PERMISSION' THEN 'Permission Approved'
        ELSE NULL
      END AS adjustment_status,
      ap.work_duration_minutes,
      ap.attendance_result,
      ap.location_status,
      ap.matched_office_location_id,
      ap.gps_accuracy,
      ol.location_name AS matched_office_name,
      h.holiday_name,
      l.is_paid_leave
    FROM date_series ds
    CROSS JOIN active_emp ae
    LEFT JOIN attendance_punches ap ON ap.employee_id = ae.user_id AND ap.attendance_date = ds.d_date
    LEFT JOIN office_locations ol ON ap.matched_office_location_id = ol.office_location_id
    LEFT JOIN holidays_in_range h ON h.holiday_date = ds.d_date
    LEFT JOIN leaves_in_range l ON l.employee_id = ae.employee_id AND ds.d_date BETWEEN l.start_date AND l.end_date
    LEFT JOIN LATERAL (
      SELECT request_category, approval_status, request_type
      FROM attendance_regularization_requests
      WHERE employee_id = ae.employee_id AND attendance_date = ds.d_date
      ORDER BY created_at DESC LIMIT 1
    ) reg ON true
    WHERE 1=1 ${outerFilterConditions}
    ORDER BY ae.first_name, ae.last_name, ds.d_date DESC
  `;

  const result = await query(sql, params);
  return result.rows;
}

/* ─── Format worked minutes to hours ─── */
function formatDuration(mins) {
  if (mins === null || mins === undefined) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* ─── 1. Attendance Summary Report ─── */
async function getSummaryReport(orgId, filters, user) {
  const matrix = await getPeriodDayMatrix(orgId, filters, user);
  if (matrix.length === 0) {
    return { totalEmployees: 0, present: 0, absent: 0, lateArrivals: 0, earlyExits: 0, complianceRate: 100, records: [] };
  }

  const empMap = {};
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLateArrivals = 0;
  let totalEarlyExits = 0;
  let totalOnTime = 0;
  let totalCompletedShifts = 0;

  matrix.forEach(row => {
    if (!empMap[row.employee_id]) {
      empMap[row.employee_id] = {
        employee: `${row.first_name} ${row.last_name}`,
        employee_code: row.employee_code,
        department: row.department_name || '—',
        shift: row.shift_name || '—',
        present_days: 0,
        absent_days: 0,
        late_arrivals: 0,
        early_exits: 0,
        total_worked_mins: 0,
      };
    }
    const emp = empMap[row.employee_id];
    if (row.attendance_punch_id) {
      emp.present_days++;
      totalPresent++;
      if (row.attendance_result === 'LATE_ARRIVAL') { emp.late_arrivals++; totalLateArrivals++; }
      if (row.attendance_result === 'EARLY_EXIT') { emp.early_exits++; totalEarlyExits++; }
      if (row.attendance_result === 'ON_TIME') totalOnTime++;
      if (row.attendance_result === 'COMPLETED_SHIFT') totalCompletedShifts++;
      if (row.work_duration_minutes != null) emp.total_worked_mins += row.work_duration_minutes;
    } else {
      if (row.day_of_week !== 0 && !row.holiday_name && row.is_paid_leave === null) {
        emp.absent_days++;
        totalAbsent++;
      }
    }
  });

  const records = Object.values(empMap).map(emp => ({
    employee: emp.employee,
    employee_code: emp.employee_code,
    department: emp.department,
    shift: emp.shift,
    present_days: emp.present_days,
    absent_days: emp.absent_days,
    late_arrivals: emp.late_arrivals,
    early_exits: emp.early_exits,
    worked_hours: formatDuration(emp.total_worked_mins),
    compliance_rate: emp.present_days > 0
      ? `${Math.max(0, Math.round(((emp.present_days - emp.late_arrivals - emp.early_exits) / emp.present_days) * 100))}%`
      : '100%'
  }));

  const complianceNumerator = totalOnTime + totalCompletedShifts;
  const complianceRate = totalPresent > 0 ? Number(((complianceNumerator / totalPresent) * 100).toFixed(1)) : 100.0;

  return {
    totalEmployees: Object.keys(empMap).length,
    present: totalPresent,
    absent: totalAbsent,
    lateArrivals: totalLateArrivals,
    earlyExits: totalEarlyExits,
    complianceRate,
    records
  };
}

/* ─── 2. Daily Attendance Report ─── */
async function getDailyReport(orgId, filters, user) {
  const matrix = await getPeriodDayMatrix(orgId, filters, user);
  return matrix.map(row => ({
    employee: `${row.first_name} ${row.last_name}`,
    employee_code: row.employee_code,
    department: row.department_name || '—',
    shift: row.shift_name || '—',
    date: safeFormatDate(row.attendance_date),
    check_in: row.check_in_time ? formatInTimeZone(row.check_in_time) : '—',
    check_out: row.check_out_time ? formatInTimeZone(row.check_out_time) : '—',
    worked_hours: formatDuration(row.work_duration_minutes),
    result: row.attendance_result || (row.attendance_punch_id ? 'PRESENT' : (row.day_of_week === 0 ? 'WEEKLY_OFF' : row.holiday_name ? 'HOLIDAY' : row.is_paid_leave !== null ? 'LEAVE' : 'ABSENT'))
  }));
}

/* ─── 3. Monthly Attendance Report ─── */
async function getMonthlyReport(orgId, filters, user) {
  const matrix = await getPeriodDayMatrix(orgId, filters, user);
  const empMap = {};

  matrix.forEach(row => {
    if (!empMap[row.employee_id]) {
      empMap[row.employee_id] = {
        employee: `${row.first_name} ${row.last_name}`,
        code: row.employee_code,
        department: row.department_name || '—',
        present: 0,
        absent: 0,
        late: 0,
        early: 0,
        workMinutesSum: 0,
        workMinutesCount: 0
      };
    }

    const emp = empMap[row.employee_id];
    if (row.attendance_punch_id) {
      emp.present++;
      if (row.attendance_result === 'LATE_ARRIVAL') emp.late++;
      if (row.attendance_result === 'EARLY_EXIT') emp.early++;
      if (row.work_duration_minutes != null) {
        emp.workMinutesSum += row.work_duration_minutes;
        emp.workMinutesCount++;
      }
    } else {
      if (row.day_of_week !== 0 && !row.holiday_name && row.is_paid_leave === null) {
        emp.absent++;
      }
    }
  });

  return Object.values(empMap).map(e => ({
    employee: e.employee,
    code: e.code,
    department: e.department,
    present_days: e.present,
    absent_days: e.absent,
    late_arrivals: e.late,
    early_exits: e.early,
    average_hours: e.workMinutesCount > 0 ? formatDuration(Math.round(e.workMinutesSum / e.workMinutesCount)) : '—'
  }));
}

/* ─── 4. Late Arrival Report ─── */
async function getLateArrivalReport(orgId, filters, user) {
  const matrix = await getPeriodDayMatrix(orgId, filters, user);
  const lateRows = matrix.filter(r => r.attendance_result === 'LATE_ARRIVAL');

  return lateRows.map(row => {
    const delay = row.check_in_time && row.shift_start_time
      ? Math.max(0, Math.floor((new Date(row.check_in_time) - new Date(`${safeFormatDate(row.attendance_date)}T${row.shift_start_time}Z`)) / (1000 * 60)))
      : 0;

    return {
      employee: `${row.first_name} ${row.last_name}`,
      department: row.department_name || '—',
      shift: row.shift_name || '—',
      date: safeFormatDate(row.attendance_date),
      expected_time: row.shift_start_time || '—',
      actual_punch_in: row.check_in_time ? formatInTimeZone(row.check_in_time) : '—',
      delay_minutes: delay
    };
  });
}

/* ─── 5. Early Exit Report ─── */
async function getEarlyExitReport(orgId, filters, user) {
  const matrix = await getPeriodDayMatrix(orgId, filters, user);
  const earlyRows = matrix.filter(r => r.attendance_result === 'EARLY_EXIT');

  return earlyRows.map(row => {
    const early = row.check_out_time && row.shift_end_time
      ? Math.max(0, Math.floor((new Date(`${safeFormatDate(row.attendance_date)}T${row.shift_end_time}Z`) - new Date(row.check_out_time)) / (1000 * 60)))
      : 0;

    return {
      employee: `${row.first_name} ${row.last_name}`,
      department: row.department_name || '—',
      shift: row.shift_name ? `${row.shift_name} (${row.shift_code})` : '—',
      date: safeFormatDate(row.attendance_date),
      expected_exit: row.shift_end_time || '—',
      actual_punch_out: row.check_out_time ? formatInTimeZone(row.check_out_time) : '—',
      early_minutes: early
    };
  });
}

/* ─── 6. Geofence Compliance Report ─── */
async function getGeofenceReport(orgId, filters, user) {
  const matrix = await getPeriodDayMatrix(orgId, filters, user);
  const complianceRows = matrix.filter(r => r.attendance_punch_id != null);

  const list = complianceRows.map(row => ({
    employee: `${row.first_name} ${row.last_name}`,
    department: row.department_name || '—',
    date: safeFormatDate(row.attendance_date),
    location_status: row.location_status || 'LOCATION_NOT_VERIFIED',
    matched_office: row.matched_office_name || '—',
    gps_accuracy: row.gps_accuracy != null ? `±${Number(row.gps_accuracy).toFixed(0)}m` : '—'
  }));

  const inside = list.filter(r => r.location_status === 'INSIDE_FENCE').length;
  const outside = list.filter(r => r.location_status === 'OUTSIDE_FENCE').length;
  const unverified = list.filter(r => r.location_status === 'LOCATION_NOT_VERIFIED').length;

  return {
    summary: { insideFenceCount: inside, outsideFenceCount: outside, locationNotVerifiedCount: unverified },
    records: list
  };
}

/* ─── 7. Department Attendance Report ─── */
async function getDepartmentReport(orgId, filters, user) {
  const matrix = await getPeriodDayMatrix(orgId, filters, user);
  const deptMap = {};

  matrix.forEach(row => {
    const deptName = row.department_name || 'Unassigned';
    if (!deptMap[deptName]) {
      deptMap[deptName] = {
        department: deptName,
        total_shifts: 0,
        present: 0,
        absent: 0,
        late: 0,
        early: 0,
        worked_mins: 0
      };
    }

    const d = deptMap[deptName];
    d.total_shifts++;
    if (row.attendance_punch_id) {
      d.present++;
      if (row.attendance_result === 'LATE_ARRIVAL') d.late++;
      if (row.attendance_result === 'EARLY_EXIT') d.early++;
      if (row.work_duration_minutes != null) d.worked_mins += row.work_duration_minutes;
    } else {
      if (row.day_of_week !== 0 && !row.holiday_name && row.is_paid_leave === null) {
        d.absent++;
      }
    }
  });

  return Object.values(deptMap).map(d => ({
    department: d.department,
    total_records: d.total_shifts,
    present_count: d.present,
    absent_count: d.absent,
    late_count: d.late,
    early_count: d.early,
    present_percentage: d.total_shifts > 0 ? `${Number(((d.present / d.total_shifts) * 100).toFixed(1))}%` : '0%'
  }));
}

/* ─── 8. Employee History Log Report ─── */
async function getEmployeeReport(orgId, employeeId, filters, user) {
  const matrix = await getPeriodDayMatrix(orgId, { ...filters, employee_id: employeeId }, user);
  return matrix.map(row => ({
    date: safeFormatDate(row.attendance_date),
    shift: row.shift_name ? `${row.shift_name} (${row.shift_code})` : '—',
    check_in: row.check_in_time ? formatInTimeZone(row.check_in_time) : '—',
    check_out: row.check_out_time ? formatInTimeZone(row.check_out_time) : '—',
    worked_hours: formatDuration(row.work_duration_minutes),
    adjustment: row.adjustment_status || '—',
    location: row.matched_office_name || (row.location_status ? row.location_status.replace(/_/g, ' ') : '—'),
    result: row.attendance_result || (row.attendance_punch_id ? 'PRESENT' : (row.day_of_week === 0 ? 'WEEKLY_OFF' : row.holiday_name ? 'HOLIDAY' : row.is_paid_leave !== null ? 'LEAVE' : 'ABSENT'))
  }));
}

/* ─── 9. Payroll Attendance Summary Report ─── */
async function getPayrollReport(orgId, filters, user) {
  const matrix = await getPeriodDayMatrix(orgId, filters, user);
  const empMap = {};

  matrix.forEach(row => {
    if (!empMap[row.employee_id]) {
      empMap[row.employee_id] = {
        employee: `${row.first_name} ${row.last_name}`,
        code: row.employee_code,
        department: row.department_name || '—',
        workingDays: 0,
        presentDays: 0,
        lopDays: 0,
        paidLeaveDays: 0,
        overtimeMinutes: 0
      };
    }

    const emp = empMap[row.employee_id];
    if (row.day_of_week !== 0 && !row.holiday_name) emp.workingDays++;

    if (row.attendance_punch_id) {
      emp.presentDays++;
    } else if (row.is_paid_leave !== null && row.is_paid_leave) {
      emp.paidLeaveDays++;
    } else if (row.day_of_week !== 0 && !row.holiday_name) {
      emp.lopDays++;
    }
  });

  return Object.values(empMap).map(e => ({
    employee: e.employee,
    employee_code: e.code,
    department: e.department,
    working_days: e.workingDays,
    present_days: e.presentDays,
    paid_leave_days: e.paidLeaveDays,
    lop_days: e.lopDays,
    payable_days: e.presentDays + e.paidLeaveDays
  }));
}

/* ─── 10. Attendance Exceptions Report ─── */
async function getExceptionsReport(orgId, filters, user) {
  const matrix = await getPeriodDayMatrix(orgId, filters, user);
  const exceptions = [];

  matrix.forEach(row => {
    if (row.attendance_punch_id) {
      if (!row.check_out_time) {
        exceptions.push({
          employee: `${row.first_name} ${row.last_name}`,
          code: row.employee_code,
          department: row.department_name || '—',
          date: safeFormatDate(row.attendance_date),
          exception_type: 'Missing Punch Out',
          details: 'Employee checked in but has no checkout punch recorded.'
        });
      }
      if (row.location_status === 'OUTSIDE_FENCE') {
        exceptions.push({
          employee: `${row.first_name} ${row.last_name}`,
          code: row.employee_code,
          department: row.department_name || '—',
          date: safeFormatDate(row.attendance_date),
          exception_type: 'Outside Geofence',
          details: 'Punch recorded outside approved office geofence radius.'
        });
      }
    }
  });

  return exceptions;
}

/* ─── Exporter Helpers: CSV ─── */
function generateCSV(reportType, data, user, filters) {
  if (!Array.isArray(data) || data.length === 0) return 'No data available';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}

/* ─── Exporter Helpers: XLSX ─── */
function generateXLSX(reportType, data, user, filters) {
  const list = Array.isArray(data) ? data : (data?.records || []);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(list.length > 0 ? list : [{ message: 'No data available' }]);
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/* ─── Exporter Helpers: PDF ─── */
function generatePDF(reportType, data, user, filters) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Header Accent Bar
      doc.rect(0, 0, 842, 14).fill('#4f46e5');

      // Title & Subtitle
      doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('Insight HCM', 30, 24);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#475569').text(`Attendance Report: ${(reportType || 'report').toUpperCase().replace(/-/g, ' ')}`, 30, 44);

      // Audit Details Card Box (Right Aligned)
      doc.rect(480, 22, 332, 42).fill('#f8fafc').stroke('#cbd5e1');
      doc.fontSize(7.5).fillColor('#475569').font('Helvetica');
      doc.text(`Generated By: ${user.email} (${user.role})`, 490, 27);
      doc.text(`Generated At: ${new Date().toLocaleString('en-IN')}`, 490, 38);
      const filterStr = Object.entries(filters || {}).filter(([k,v]) => v).map(([k,v]) => `${k}=${v}`).join(', ');
      doc.text(`Filters: ${filterStr || 'None'}`, 490, 49, { width: 310, truncate: true });

      let listData = Array.isArray(data) ? data : (data?.records || []);
      if (!listData || listData.length === 0) {
        doc.fontSize(12).fillColor('#64748b').text('No records found matching filters.', 30, 95);
        doc.end();
        return;
      }

      const headers = Object.keys(listData[0]);

      function getHeaderTitle(h) {
        if (h === 'present_days') return 'PRESENT';
        if (h === 'absent_days') return 'ABSENT';
        if (h === 'late_arrivals') return 'LATE';
        if (h === 'early_exits') return 'EARLY';
        if (h === 'worked_hours') return 'WORKED HRS';
        if (h === 'compliance_rate') return 'COMPLIANCE RATE';
        if (h === 'employee_code') return 'EMP CODE';
        if (h === 'actual_punch_in') return 'PUNCH IN';
        if (h === 'actual_punch_out') return 'PUNCH OUT';
        if (h === 'location_status') return 'LOCATION';
        return h.replace(/_/g, ' ').toUpperCase();
      }

      // Calculate Custom Column Widths
      const totalWidth = 782;
      const colWidths = {};
      const numCols = headers.length;

      headers.forEach(h => {
        if (h === 'employee') colWidths[h] = 110;
        else if (h === 'employee_code' || h === 'code') colWidths[h] = 65;
        else if (h === 'department') colWidths[h] = 105;
        else if (h === 'shift') colWidths[h] = 110;
        else if (h === 'date') colWidths[h] = 65;
        else if (h === 'check_in' || h === 'actual_punch_in') colWidths[h] = 70;
        else if (h === 'check_out' || h === 'actual_punch_out') colWidths[h] = 70;
        else if (h === 'worked_hours' || h === 'average_hours') colWidths[h] = 72;
        else if (h === 'present_days' || h === 'absent_days' || h === 'late_arrivals' || h === 'early_exits') colWidths[h] = 55;
        else if (h === 'compliance_rate') colWidths[h] = 100;
        else if (h === 'result' || h === 'location_status') colWidths[h] = 75;
        else colWidths[h] = Math.floor(totalWidth / numCols);
      });

      const assignedSum = Object.values(colWidths).reduce((a, b) => a + b, 0);
      if (assignedSum !== totalWidth) {
        const diff = totalWidth - assignedSum;
        if (colWidths['shift']) colWidths['shift'] += diff;
        else headers.forEach(h => { colWidths[h] = Math.floor(colWidths[h] * (totalWidth / assignedSum)); });
      }

      let startY = 80;

      function drawTableHeaders(y) {
        doc.font('Helvetica-Bold').fontSize(7.5);
        let maxHeaderH = 18;
        headers.forEach(h => {
          const title = getHeaderTitle(h);
          const textH = doc.heightOfString(title, { width: colWidths[h] - 4 });
          if (textH + 6 > maxHeaderH) maxHeaderH = Math.ceil(textH + 6);
        });

        doc.rect(30, y - 4, totalWidth, maxHeaderH).fill('#e0e7ff');
        doc.fillColor('#1e1b4b');
        let currentX = 30;
        headers.forEach(h => {
          const w = colWidths[h];
          const title = getHeaderTitle(h);
          doc.text(title, currentX + 2, y, { width: w - 4 });
          currentX += w;
        });
        return y + maxHeaderH + 2;
      }

      startY = drawTableHeaders(startY);

      // Draw Rows across pages cleanly with dynamic row height
      listData.forEach((row, idx) => {
        doc.font('Helvetica').fontSize(7.5);
        let maxCellHeight = 16;

        headers.forEach(h => {
          let val = row[h];
          if (val === null || val === undefined) val = '—';
          const textH = doc.heightOfString(String(val), { width: colWidths[h] - 6 });
          if (textH + 6 > maxCellHeight) maxCellHeight = Math.ceil(textH + 6);
        });

        if (startY + maxCellHeight > 540) {
          doc.addPage();
          startY = drawTableHeaders(40);
        }

        if (idx % 2 === 1) {
          doc.rect(30, startY - 2, totalWidth, maxCellHeight).fill('#f8fafc');
        }

        doc.fillColor('#334155');
        let currentX = 30;

        headers.forEach(h => {
          const w = colWidths[h];
          let val = row[h];
          if (val === null || val === undefined) val = '—';
          doc.text(String(val), currentX + 3, startY, { width: w - 6 });
          currentX += w;
        });

        doc.moveTo(30, startY + maxCellHeight - 2).lineTo(30 + totalWidth, startY + maxCellHeight - 2).stroke('#f1f5f9');
        startY += maxCellHeight;
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  getSummaryReport,
  getDailyReport,
  getMonthlyReport,
  getLateArrivalReport,
  getEarlyExitReport,
  getGeofenceReport,
  getDepartmentReport,
  getEmployeeReport,
  getPayrollReport,
  getExceptionsReport,
  generateCSV,
  generateXLSX,
  generatePDF
};
