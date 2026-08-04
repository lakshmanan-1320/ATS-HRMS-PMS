const { query } = require('../../config/db');
const env = require('../../config/env');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

/* ─── Helper: Time Zone Formatter ─── */
function formatInTimeZone(value, timeZone = env.timezone) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  const offset = timeZone === 'Asia/Kolkata' ? '+05:30' : 'Z';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
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
    return { totalEmployees: 0, present: 0, absent: 0, lateArrivals: 0, earlyExits: 0, complianceRate: 100 };
  }

  const empIds = new Set();
  let present = 0;
  let absent = 0;
  let lateArrivals = 0;
  let earlyExits = 0;
  let onTime = 0;
  let completedShifts = 0;

  matrix.forEach(row => {
    empIds.add(row.employee_id);
    if (row.attendance_punch_id) {
      present++;
      if (row.attendance_result === 'LATE_ARRIVAL') lateArrivals++;
      if (row.attendance_result === 'EARLY_EXIT') earlyExits++;
      if (row.attendance_result === 'ON_TIME') onTime++;
      if (row.attendance_result === 'COMPLETED_SHIFT') completedShifts++;
    } else {
      // Absent if: not weekend (Sunday = 0), not holiday, no approved leave
      if (row.day_of_week !== 0 && !row.holiday_name && row.is_paid_leave === null) {
        absent++;
      }
    }
  });

  const complianceNumerator = onTime + completedShifts;
  const complianceRate = present > 0 ? Number(((complianceNumerator / present) * 100).toFixed(1)) : 100.0;

  return {
    totalEmployees: empIds.size,
    present,
    absent,
    lateArrivals,
    earlyExits,
    complianceRate
  };
}

/* ─── 2. Daily Attendance Report ─── */
async function getDailyReport(orgId, filters, user) {
  const matrix = await getPeriodDayMatrix(orgId, filters, user);
  return matrix.map(row => ({
    employee: `${row.first_name} ${row.last_name}`,
    employee_code: row.employee_code,
    department: row.department_name || '—',
    shift: row.shift_name ? `${row.shift_name} (${row.shift_code})` : '—',
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
      shift: row.shift_name ? `${row.shift_name} (${row.shift_code})` : '—',
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
        empIds: new Set(),
        present: 0,
        absent: 0,
        late: 0
      };
    }

    const dept = deptMap[deptName];
    dept.empIds.add(row.employee_id);
    if (row.attendance_punch_id) {
      dept.present++;
      if (row.attendance_result === 'LATE_ARRIVAL') dept.late++;
    } else {
      if (row.day_of_week !== 0 && !row.holiday_name && row.is_paid_leave === null) {
        dept.absent++;
      }
    }
  });

  return Object.values(deptMap).map(d => {
    const totalRecords = d.present + d.absent;
    const rate = totalRecords > 0 ? Number(((d.present / totalRecords) * 100).toFixed(1)) : 100.0;
    return {
      department: d.department,
      total_employees: d.empIds.size,
      present: d.present,
      absent: d.absent,
      late_arrivals: d.late,
      attendance_percentage: rate
    };
  });
}

/* ─── 8. Employee Attendance History Report ─── */
async function getEmployeeReport(orgId, employeeId, filters, user) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId);
  if (!isUuid) return [];

  const empFilters = { ...filters, employee_id: employeeId };
  const matrix = await getPeriodDayMatrix(orgId, empFilters, user);
  return matrix.map(row => ({
    date: safeFormatDate(row.attendance_date),
    check_in: row.check_in_time ? formatInTimeZone(row.check_in_time) : '—',
    check_out: row.check_out_time ? formatInTimeZone(row.check_out_time) : '—',
    worked_hours: formatDuration(row.work_duration_minutes),
    shift: row.shift_name ? `${row.shift_name} (${row.shift_code})` : '—',
    result: row.attendance_result || (row.attendance_punch_id ? 'PRESENT' : (row.day_of_week === 0 ? 'WEEKLY_OFF' : row.holiday_name ? 'HOLIDAY' : row.is_paid_leave !== null ? 'LEAVE' : 'ABSENT')),
    location_status: row.location_status || 'LOCATION_NOT_VERIFIED'
  }));
}

/* ─── 9. Payroll Attendance Report ─── */
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
        leaveDays: 0,
        lopDays: 0,
        lateCounts: 0,
        overtimeMinutes: 0
      };
    }

    const emp = empMap[row.employee_id];
    
    // Working day count: calendar day minus weekly off and holiday
    const isWeeklyOff = row.day_of_week === 0;
    const isHoliday = !!row.holiday_name;
    if (!isWeeklyOff && !isHoliday) {
      emp.workingDays++;
    }

    if (row.attendance_punch_id) {
      emp.presentDays++;
      if (row.attendance_result === 'LATE_ARRIVAL') emp.lateCounts++;
      
      // Calculate overtime minutes
      const minHours = row.minimum_hours ? Number(row.minimum_hours) : 8;
      const expectedMinutes = minHours * 60;
      if (row.work_duration_minutes != null && row.work_duration_minutes > expectedMinutes) {
        emp.overtimeMinutes += (row.work_duration_minutes - expectedMinutes);
      }
    } else {
      if (row.is_paid_leave === true) {
        emp.leaveDays++;
      } else if (row.is_paid_leave === false) {
        emp.lopDays++;
      }
    }
  });

  return Object.values(empMap).map(e => ({
    employee: e.employee,
    code: e.code,
    department: e.department,
    working_days: e.workingDays,
    present_days: e.presentDays,
    leave_days: e.leaveDays,
    lop_days: e.lopDays,
    late_counts: e.lateCounts,
    overtime_hours: Number((e.overtimeMinutes / 60).toFixed(1))
  }));
}

/* ─── 10. Attendance Exception Report ─── */
async function getExceptionsReport(orgId, filters, user) {
  const matrix = await getPeriodDayMatrix(orgId, filters, user);
  const exceptionsList = [];

  matrix.forEach(row => {
    let exceptionType = null;
    let details = '';

    const hasPunch = !!row.attendance_punch_id;
    const dateStr = safeFormatDate(row.attendance_date);
    const todayStr = new Date().toISOString().slice(0, 10);

    if (hasPunch) {
      if (row.check_in_time === null && row.check_out_time !== null) {
        exceptionType = 'Missing Punch In';
        details = 'Checkout stamp exists without checkin stamp.';
      } else if (row.check_in_time !== null && row.check_out_time === null && dateStr < todayStr) {
        exceptionType = 'Missing Punch Out';
        details = 'Checkin stamp exists without checkout stamp.';
      } else if (row.location_status === 'OUTSIDE_FENCE') {
        exceptionType = 'Outside Fence';
        details = `Punch occurred outside geofenced area. Matched Office: ${row.matched_office_name || 'Unknown'}.`;
      }
    } else {
      // Check if employee has no shift assigned
      if (!row.shift_name) {
        exceptionType = 'No Shift Assigned';
        details = 'No active shift assignment configured for this employee.';
      }
    }

    if (exceptionType) {
      exceptionsList.push({
        employee: `${row.first_name} ${row.last_name}`,
        code: row.employee_code,
        department: row.department_name || '—',
        date: dateStr,
        exception_type: exceptionType,
        details
      });
    }
  });

  return exceptionsList;
}

/* ─── Exporter Helpers: CSV ─── */
function generateCSV(reportType, data, user, filters) {
  if (!Array.isArray(data) || data.length === 0) return '';
  const auditHeaders = [
    `Generated By: ${user.email} (${user.role})`,
    `Generated At: ${new Date().toLocaleString('en-IN')}`,
    `Filters: ${JSON.stringify(filters)}`,
    ''
  ];

  const headers = Object.keys(data[0]);
  const rows = data.map(item =>
    headers.map(header => {
      const val = item[header];
      return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  );

  return [...auditHeaders, headers.join(','), ...rows].join('\n');
}

/* ─── Exporter Helpers: XLSX ─── */
function generateXLSX(reportType, data, user, filters) {
  const wb = XLSX.utils.book_new();
  
  // Format audit metadata row array
  const metadataRows = [
    { A: 'Generated By:', B: `${user.email} (${user.role})` },
    { A: 'Generated At:', B: new Date().toLocaleString('en-IN') },
    { A: 'Filters Applied:', B: JSON.stringify(filters) },
    {} // spacing
  ];
  
  const ws = XLSX.utils.json_to_sheet(data, { origin: 'A5' });
  
  // Add audit metadata at the top of sheet
  XLSX.utils.sheet_add_json(ws, metadataRows, {
    header: ['A', 'B'],
    skipHeader: true,
    origin: 'A1'
  });

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

      // Document Header Accent
      doc.rect(0, 0, 842, 10).fill('#6366f1');
      doc.moveDown(1.5);

      // Title
      doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text('Insight HCM', 30, 20);
      doc.fontSize(12).font('Helvetica').fillColor('#475569').text(`Attendance Report: ${reportType.toUpperCase()}`, 30, 42);
      
      // Audit details Box
      doc.rect(480, 20, 330, 45).fill('#f8fafc').stroke('#cbd5e1');
      doc.fontSize(7.5).fillColor('#475569').font('Helvetica');
      doc.text(`Generated By: ${user.email} (${user.role})`, 490, 25);
      doc.text(`Generated At: ${new Date().toLocaleString('en-IN')}`, 490, 36);
      doc.text(`Filters: ${JSON.stringify(filters).slice(0, 60)}...`, 490, 47);

      // Grid/Table Setup
      doc.moveTo(30, 75).lineTo(812, 75).stroke('#cbd5e1');
      doc.moveDown(2);

      if (!Array.isArray(data) || data.length === 0) {
        doc.fontSize(12).text('No records found matching filters.', 30, 100);
        doc.end();
        return;
      }

      // Draw table columns
      const headers = Object.keys(data[0]);
      const colWidth = Math.floor(782 / headers.length);
      let startY = 85;

      // Draw Header Rows
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b');
      headers.forEach((h, i) => {
        const title = h.replace(/_/g, ' ').toUpperCase();
        doc.text(title, 30 + i * colWidth, startY, { width: colWidth - 5, truncate: true });
      });

      doc.moveTo(30, startY + 12).lineTo(812, startY + 12).stroke('#e2e8f0');
      startY += 18;

      // Draw Data Rows
      doc.font('Helvetica').fontSize(8).fillColor('#334155');
      data.slice(0, 40).forEach(row => {
        if (startY > 540) {
          doc.addPage();
          startY = 40;
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b');
          headers.forEach((h, i) => {
            doc.text(h.replace(/_/g, ' ').toUpperCase(), 30 + i * colWidth, startY, { width: colWidth - 5, truncate: true });
          });
          doc.moveTo(30, startY + 12).lineTo(812, startY + 12).stroke('#e2e8f0');
          startY += 18;
          doc.font('Helvetica').fontSize(8).fillColor('#334155');
        }

        headers.forEach((h, i) => {
          let val = row[h];
          if (val === null || val === undefined) val = '—';
          doc.text(String(val), 30 + i * colWidth, startY, { width: colWidth - 5, truncate: true });
        });

        startY += 14;
      });

      if (data.length > 40) {
        doc.fontSize(8.5).fillColor('#ef4444').text(`* Truncated: Only first 40 records are shown in PDF. Export CSV/XLSX for full lists.`, 30, startY + 5);
      }

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
