const repository = require('./overtime.repository');
const payrollRepository = require('./payroll.repository');
const { query } = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function calculateExtraMinutes(punch, settings) {
  if (!punch.check_in_time || !punch.check_out_time) return 0;

  // Worked Minutes
  const checkIn = new Date(punch.check_in_time);
  const checkOut = new Date(punch.check_out_time);
  const workedMinutes = Math.floor((checkOut - checkIn) / 60000);

  // Shift Minutes
  let shiftMinutes = 480;
  if (punch.shift_start && punch.shift_end) {
    shiftMinutes = timeStringToMinutes(punch.shift_end) - timeStringToMinutes(punch.shift_start);
    if (shiftMinutes <= 0) shiftMinutes += 1440; // Midnight crossing
  } else if (punch.shift_min_hours) {
    shiftMinutes = parseFloat(punch.shift_min_hours) * 60;
  }

  const extraMinutes = workedMinutes - shiftMinutes;
  if (extraMinutes <= 0) return 0;

  // Apply minimum OT threshold check
  if (settings && extraMinutes < (settings.minimum_ot_minutes || 0)) {
    return 0;
  }

  return extraMinutes;
}

function roundOTMinutes(minutes, rule) {
  if (rule === 'NEAREST_15_MIN') {
    return Math.round(minutes / 15) * 15;
  }
  if (rule === 'NEAREST_30_MIN') {
    return Math.round(minutes / 30) * 30;
  }
  return minutes; // EXACT
}

// --- Overtime Settings ---
async function getSettings(organizationId) {
  let settings = await repository.getSettings(organizationId);
  if (!settings) {
    // Return default settings
    settings = {
      is_enabled: false,
      requires_approval: true,
      calculation_method: 'SALARY_MULTIPLIER',
      hourly_rate_basis: 'GROSS_STANDARD_HOURS',
      standard_monthly_hours: 208,
      weekday_multiplier: 1.50,
      weekend_multiplier: 2.00,
      holiday_multiplier: 2.50,
      weekday_hourly_rate: 0.00,
      weekend_hourly_rate: 0.00,
      holiday_hourly_rate: 0.00,
      minimum_ot_minutes: 0,
      rounding_rule: 'EXACT',
      is_active: true
    };
  }
  return settings;
}

async function updateSettings(organizationId, payload) {
  return await repository.upsertSettings(organizationId, payload);
}

async function getWeekOffDays(organizationId, employeeId, targetDate) {
  try {
    const toggles = await payrollRepository.getWeekOffToggles(organizationId);
    
    // Get employee's department
    const empRes = await query(
      'SELECT department_id FROM employees WHERE employee_id = $1',
      [employeeId]
    );
    const departmentId = empRes.rows[0]?.department_id;
    
    // 1. Department scope
    if (toggles.enable_department_week_off && departmentId) {
      const rules = await query(
        `SELECT s.week_off_setting_id FROM week_off_settings s
         WHERE s.organization_id = $1 AND s.scope = 'DEPARTMENT' AND s.scope_id = $2 
           AND s.is_enabled = TRUE
           AND s.effective_from <= $3::date
           AND (s.effective_to IS NULL OR s.effective_to >= $3::date)
         ORDER BY s.effective_from DESC LIMIT 1`,
        [organizationId, departmentId, targetDate]
      );
      if (rules.rows.length > 0) {
        const days = await query(
          'SELECT weekday FROM week_off_days WHERE week_off_setting_id = $1',
          [rules.rows[0].week_off_setting_id]
        );
        return days.rows.map(d => d.weekday);
      }
    }
    
    // 2. Generic scope
    if (toggles.enable_generic_week_off) {
      const rules = await query(
        `SELECT s.week_off_setting_id FROM week_off_settings s
         WHERE s.organization_id = $1 AND s.scope = 'ORGANIZATION' AND s.scope_id IS NULL
           AND s.is_enabled = TRUE
           AND s.effective_from <= $2::date
           AND (s.effective_to IS NULL OR s.effective_to >= $2::date)
         ORDER BY s.effective_from DESC LIMIT 1`,
        [organizationId, targetDate]
      );
      if (rules.rows.length > 0) {
        const days = await query(
          'SELECT weekday FROM week_off_days WHERE week_off_setting_id = $1',
          [rules.rows[0].week_off_setting_id]
        );
        return days.rows.map(d => d.weekday);
      }
    }
  } catch (_) {}
  
  // Fallback to Sunday & Saturday
  return [0, 6];
}

async function getEligibleDates(employeeId, organizationId) {
  const settings = await getSettings(organizationId);
  if (!settings.is_enabled) {
    return [];
  }

  // Fetch employee eligibility (defaults to true if null)
  const empRes = await query('SELECT overtime_eligible FROM employees WHERE employee_id = $1', [employeeId]);
  if (empRes.rows.length === 0 || empRes.rows[0].overtime_eligible === false) {
    return [];
  }

  const rawPunches = await repository.getEligibleAttendanceDatesWithExtraHours(employeeId);
  const eligibleDates = [];

  for (const punch of rawPunches) {
    const extraMinutes = calculateExtraMinutes(punch, settings);
    if (extraMinutes > 0) {
      // Worked & Shift Minutes
      const checkIn = new Date(punch.check_in_time);
      const checkOut = new Date(punch.check_out_time);
      const workedMinutes = Math.floor((checkOut - checkIn) / 60000);

      let shiftMinutes = 480;
      if (punch.shift_start && punch.shift_end) {
        shiftMinutes = timeStringToMinutes(punch.shift_end) - timeStringToMinutes(punch.shift_start);
        if (shiftMinutes <= 0) shiftMinutes += 1440;
      } else if (punch.shift_min_hours) {
        shiftMinutes = parseFloat(punch.shift_min_hours) * 60;
      }

      // Determine day type
      const dateStr = punch.attendance_date;
      
      // Holiday check
      const holidayRes = await query(
        'SELECT 1 FROM holidays WHERE holiday_date = $1 AND is_active = true AND is_deleted = false',
        [dateStr]
      );
      let dayType = 'WEEKDAY';
      if (holidayRes.rows.length > 0) {
        dayType = 'HOLIDAY';
      } else {
        // Weekend check
        const weekOffDays = await getWeekOffDays(organizationId, employeeId, dateStr);
        const dayOfWeek = new Date(dateStr).getUTCDay();
        if (weekOffDays.includes(dayOfWeek)) {
          dayType = 'WEEKEND';
        }
      }

      eligibleDates.push({
        attendance_date: dateStr,
        check_in_time: punch.check_in_time,
        check_out_time: punch.check_out_time,
        shift_name: punch.shift_name || 'Standard Shift',
        shift_start: punch.shift_start,
        shift_end: punch.shift_end,
        worked_minutes: workedMinutes,
        shift_minutes: shiftMinutes,
        extra_minutes: extraMinutes,
        day_type: dayType
      });
    }
  }

  return eligibleDates;
}

async function createRequest(organizationId, employeeId, payload) {
  const { attendance_date, reason } = payload;
  
  const settings = await getSettings(organizationId);
  if (!settings.is_enabled) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Overtime module is not enabled for your organization.');
  }

  // 1. Verify eligibility
  const empRes = await query('SELECT overtime_eligible FROM employees WHERE employee_id = $1', [employeeId]);
  const emp = empRes.rows[0];
  if (!emp) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee profile not found.');
  }
  if (!emp.overtime_eligible) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'You are not eligible for overtime compensation.');
  }

  // 2. Prevent future dates
  const todayStr = new Date().toISOString().split('T')[0];
  if (attendance_date > todayStr) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot request overtime for future dates.');
  }

  // 3. Verify payroll lock status
  const isLocked = await repository.checkPayrollLock(organizationId, attendance_date);
  if (isLocked) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Payroll for the requested period is already approved or locked.');
  }

  // 4. Fetch punch details
  const punch = await repository.getAttendanceDetails(employeeId, attendance_date);
  if (!punch) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `No attendance punch records found for ${attendance_date}.`);
  }
  if (!punch.shift_id) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Overtime cannot be calculated because no shift was assigned on this date.');
  }
  if (!punch.check_out_time) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'You must clock-out before applying for overtime.');
  }

  // 5. Calculate extra hours
  const extraMinutesRaw = calculateExtraMinutes(punch, settings);
  if (extraMinutesRaw <= 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'No overtime duration detected for this date.');
  }

  // 6. Rounding Rule
  const requestedOtMinutes = roundOTMinutes(extraMinutesRaw, settings.rounding_rule);
  if (requestedOtMinutes <= 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Rounded overtime duration is 0 minutes.');
  }

  // Determine day type
  const holidayRes = await query(
    'SELECT 1 FROM holidays WHERE holiday_date = $1 AND is_active = true AND is_deleted = false',
    [attendance_date]
  );
  let dayType = 'WEEKDAY';
  if (holidayRes.rows.length > 0) {
    dayType = 'HOLIDAY';
  } else {
    const weekOffDays = await getWeekOffDays(organizationId, employeeId, attendance_date);
    const dayOfWeek = new Date(attendance_date).getUTCDay();
    if (weekOffDays.includes(dayOfWeek)) {
      dayType = 'WEEKEND';
    }
  }

  // 7. Enforce active request uniqueness constraint
  // (Index ensures this, but we validate explicitly for custom error feedback)
  const existingRes = await query(
    `SELECT approval_status FROM overtime_requests 
     WHERE employee_id = $1 AND attendance_date = $2 AND approval_status IN ('PENDING', 'APPROVED')`,
    [employeeId, attendance_date]
  );
  if (existingRes.rows.length > 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `A pending or approved overtime request already exists for ${attendance_date}.`);
  }

  // Create
  const result = await repository.createRequest(organizationId, {
    employee_id: employeeId,
    attendance_date,
    clock_out_time: punch.check_out_time,
    requested_ot_minutes: requestedOtMinutes,
    day_type: dayType,
    reason,
    approval_status: settings.requires_approval ? 'PENDING' : 'APPROVED'
  });

  return result;
}

async function approveRequest(organizationId, id, approvedOtMinutes, managerUserId) {
  const reqDetails = await repository.getRequestById(organizationId, id);
  if (!reqDetails) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Overtime request not found.');
  }
  if (reqDetails.approval_status !== 'PENDING') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Overtime request is already ${reqDetails.approval_status}.`);
  }

  // Check payroll lock
  const isLocked = await repository.checkPayrollLock(organizationId, reqDetails.attendance_date);
  if (isLocked) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot approve requests for a month with approved/locked payroll.');
  }

  let finalApprovedMinutes = parseInt(approvedOtMinutes);
  if (isNaN(finalApprovedMinutes) || finalApprovedMinutes === null || finalApprovedMinutes === undefined) {
    finalApprovedMinutes = reqDetails.requested_ot_minutes;
  }

  if (finalApprovedMinutes < 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Approved minutes cannot be negative.');
  }
  if (finalApprovedMinutes > reqDetails.requested_ot_minutes) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Approved minutes cannot exceed requested minutes (${reqDetails.requested_ot_minutes} mins).`);
  }

  const result = await repository.updateRequestStatus(organizationId, id, {
    approval_status: 'APPROVED',
    approved_ot_minutes: finalApprovedMinutes,
    approved_by: managerUserId,
    remarks: 'Approved by manager'
  });

  return result;
}

async function rejectRequest(organizationId, id, remarks, managerUserId) {
  const reqDetails = await repository.getRequestById(organizationId, id);
  if (!reqDetails) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Overtime request not found.');
  }
  if (reqDetails.approval_status !== 'PENDING') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Overtime request is already ${reqDetails.approval_status}.`);
  }

  // Check payroll lock
  const isLocked = await repository.checkPayrollLock(organizationId, reqDetails.attendance_date);
  if (isLocked) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot reject requests for a month with approved/locked payroll.');
  }

  const result = await repository.updateRequestStatus(organizationId, id, {
    approval_status: 'REJECTED',
    approved_ot_minutes: 0,
    approved_by: managerUserId,
    remarks: remarks || 'Rejected by manager'
  });

  return result;
}

async function listRequests(organizationId, filters = {}) {
  return await repository.listRequests(organizationId, filters);
}

module.exports = {
  getSettings,
  updateSettings,
  getEligibleDates,
  createRequest,
  approveRequest,
  rejectRequest,
  listRequests
};
