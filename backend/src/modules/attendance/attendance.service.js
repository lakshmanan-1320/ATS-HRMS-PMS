const repository = require('./attendance.repository');
const officeLocationRepository = require('./officeLocation.repository');
const officeLocationService = require('./officeLocation.service');
const { findNearestZone } = require('../../utils/geo');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const env = require('../../config/env');
const { query, withTransaction } = require('../../config/db');
const { logAudit } = require('../../utils/auditLog');

const leaveRepository = require('../leave/leave.repository');
const { ATTENDANCE_STATUS } = require('../holidays/holiday.constants');

function getAttendanceDate(timeZone = env.timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatInTimeZone(value, timeZone = env.timezone) {
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

function getShiftDateTime(dateStr, timeStr, timeZone = env.timezone) {
  const offset = timeZone === 'Asia/Kolkata' ? '+05:30' : 'Z';
  return new Date(`${dateStr}T${timeStr}${offset}`);
}

function getNextDate(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

async function getEmployeeAssignedShift(userId, attendanceDate) {
  const result = await query(`
    WITH emp AS (
      SELECT employee_id, shift_id FROM employees WHERE employee_id = $1 OR employee_id = (SELECT employee_id FROM users WHERE user_id = $1 LIMIT 1) LIMIT 1
    ),
    assigned_shift AS (
      SELECT s.shift_id, s.shift_name, s.shift_code, s.start_time, s.end_time, s.grace_minutes, s.early_exit_grace_minutes, s.minimum_hours, s.color_code
      FROM shift_assignments sa
      JOIN attendance_shifts s ON sa.shift_id = s.shift_id
      WHERE sa.employee_id = (SELECT employee_id FROM emp)
        AND sa.effective_from <= $2::date
        AND (sa.effective_to IS NULL OR sa.effective_to >= $2::date)
        AND s.is_active = true
      ORDER BY COALESCE(sa.is_temporary, false) DESC, sa.effective_from DESC, sa.created_at DESC
      LIMIT 1
    )
    SELECT * FROM assigned_shift
    UNION ALL
    SELECT s.shift_id, s.shift_name, s.shift_code, s.start_time, s.end_time, s.grace_minutes, s.early_exit_grace_minutes, s.minimum_hours, s.color_code
    FROM emp e
    JOIN attendance_shifts s ON e.shift_id = s.shift_id
    WHERE s.is_active = true AND NOT EXISTS (SELECT 1 FROM assigned_shift)
    LIMIT 1
  `, [userId, attendanceDate]);
  return result.rows[0] || null;
}

async function resolveGeoFence(latitude, longitude, organizationId) {
  const zones = await repository.getActiveGeoFenceZones(organizationId);
  return findNearestZone(latitude, longitude, zones);
}

function checkInResponse(row, nearestZone, isOnLeave = false, isHoliday = false, holidayName = null) {
  let attendanceStatus = ATTENDANCE_STATUS.PRESENT;
  if (isHoliday) {
    attendanceStatus = ATTENDANCE_STATUS.HOLIDAY_PRESENT;
  } else if (isOnLeave) {
    attendanceStatus = ATTENDANCE_STATUS.ON_LEAVE;
  }

  return {
    success: true,
    message: 'Check-in successful',
    data: {
      attendanceId: row.attendance_punch_id,
      checkInTime: formatInTimeZone(row.check_in_time),
      latitude: row.check_in_latitude ? Number(row.check_in_latitude) : null,
      longitude: row.check_in_longitude ? Number(row.check_in_longitude) : null,
      zoneName: nearestZone?.zoneName || row.zone_name || null,
      distanceMeters: nearestZone?.distanceMeters ?? row.distance_meters ?? null,
      isWithinFence: nearestZone?.isWithinFence ?? row.is_within_fence ?? null,
      is_on_leave: isOnLeave,
      is_holiday: isHoliday,
      holiday_name: holidayName,
      attendance_status: attendanceStatus,
      location_status: row.location_status,
      gps_accuracy: row.gps_accuracy ? Number(row.gps_accuracy) : null,
      distance_from_office: row.distance_from_office ? Number(row.distance_from_office) : null,
      location_source: row.location_source,
      matched_office_location_id: row.matched_office_location_id,
      shift_id: row.shift_id,
      attendance_result: row.attendance_result,
    },
  };
}

function checkOutResponse(row, isHoliday = false, holidayName = null, isOnLeave = false) {
  let attendanceStatus = ATTENDANCE_STATUS.PRESENT;
  if (isHoliday) {
    attendanceStatus = ATTENDANCE_STATUS.HOLIDAY_PRESENT;
  } else if (isOnLeave) {
    attendanceStatus = ATTENDANCE_STATUS.ON_LEAVE;
  }

  return {
    success: true,
    message: 'Check-out successful',
    data: {
      attendanceId: row.attendance_punch_id,
      checkOutTime: formatInTimeZone(row.check_out_time),
      workDurationMinutes: row.work_duration_minutes,
      is_on_leave: isOnLeave,
      is_holiday: isHoliday,
      holiday_name: holidayName,
      attendance_status: attendanceStatus,
      shift_id: row.shift_id,
      attendance_result: row.attendance_result,
    },
  };
}

async function checkIn(user, body, idempotencyKey = null, ip = null) {
  const employeeId = user.id;
  const attendanceDate = getAttendanceDate();
  const isOnLeave = await leaveRepository.getActiveLeaveForEmployeeOnDate(employeeId, attendanceDate);

  // Check if today is holiday
  const holidayResult = await query(
    `SELECT holiday_name FROM holidays WHERE holiday_date = $1 AND is_active = true AND is_deleted = false LIMIT 1`,
    [attendanceDate]
  );
  const holiday = holidayResult.rows[0];
  const isHoliday = !!holiday;

  // Resolve assigned shift details
  const assignedShift = await getEmployeeAssignedShift(employeeId, attendanceDate);
  let attendanceResult = 'ON_TIME';
  let shiftId = null;

  if (assignedShift) {
    shiftId = assignedShift.shift_id;
    const shiftStart = getShiftDateTime(attendanceDate, assignedShift.start_time);
    const allowedCheckIn = new Date(shiftStart.getTime() + assignedShift.grace_minutes * 60 * 1000);
    const now = new Date();
    if (now <= allowedCheckIn) {
      attendanceResult = 'ON_TIME';
    } else {
      attendanceResult = 'LATE_ARRIVAL';
    }
  }

  // Fetch employee policy validation settings
  const policyRes = await query(
    `SELECT p.enable_location_validation, p.policy_type
     FROM users u
     JOIN employees e ON u.employee_id = e.employee_id
     LEFT JOIN attendance_policies p ON e.attendance_policy_id = p.attendance_policy_id
     WHERE u.user_id = $1`,
    [employeeId]
  );
  const policy = policyRes.rows[0];
  const isLocationValidationEnabled = policy ? (Boolean(policy.enable_location_validation) || policy.policy_type === 'OFFICE') : false;

  let locationStatus = 'LOCATION_NOT_VERIFIED';
  let matchedOfficeLocationId = null;
  let distanceFromOffice = null;
  let isWithinFence = null;
  let zoneName = null;

  const logBlockedPunch = async (reason, matchedOfficeId = null, distance = null) => {
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'punch_blocked',
      target: user.id,
      metadata: {
        latitude: body.latitude,
        longitude: body.longitude,
        gps_accuracy: body.accuracy,
        office_location_id: matchedOfficeId,
        distance_from_office: distance,
        reason,
        action_type: 'check_in',
      },
      ip,
    });
  };

  // Future: Prevent GPS Spoofing
  // if (body.isMockLocation || body.mocked) {
  //   throw new ApiError(STATUS_CODES.BAD_REQUEST, "Mocked/Spoofed GPS location detected. Please use real coordinates.");
  // }

  if (isLocationValidationEnabled) {
    if (body.latitude == null || body.longitude == null) {
      await logBlockedPunch('missing_gps_coordinates');
      throw new ApiError(STATUS_CODES.BAD_REQUEST, "You are outside the permitted office location. Please move within the office geofence to mark attendance.");
    }

    if (body.accuracy == null || body.accuracy > 100) {
      await logBlockedPunch('low_gps_accuracy');
      throw new ApiError(STATUS_CODES.BAD_REQUEST, "Unable to verify your location accurately. Please enable High Accuracy Location and try again.");
    }

    // Fetch allowed office locations
    const locsRes = await query(
      `SELECT ol.office_location_id, ol.location_name, ol.latitude, ol.longitude, ol.radius_meters
       FROM users u
       JOIN employees e ON u.employee_id = e.employee_id
       JOIN attendance_policy_locations apl ON e.attendance_policy_id = apl.attendance_policy_id
       JOIN office_locations ol ON apl.office_location_id = ol.office_location_id
       WHERE u.user_id = $1 AND ol.is_active = true`,
      [employeeId]
    );
    const allowedLocations = locsRes.rows;

    if (allowedLocations.length === 0) {
      await logBlockedPunch('no_office_locations_configured');
      throw new ApiError(STATUS_CODES.BAD_REQUEST, "No office locations are configured for your attendance policy. Please contact your administrator.");
    }

    let insideAny = false;
    let closestLocation = null;
    let minDistance = Infinity;

    for (const loc of allowedLocations) {
      const dist = officeLocationService.calculateDistance(
        body.latitude,
        body.longitude,
        loc.latitude,
        loc.longitude
      );
      if (dist !== null) {
        if (dist < minDistance) {
          minDistance = dist;
          closestLocation = loc;
        }
        if (dist <= loc.radius_meters) {
          insideAny = true;
          locationStatus = 'INSIDE_FENCE';
          matchedOfficeLocationId = loc.office_location_id;
          distanceFromOffice = dist;
          zoneName = loc.location_name;
          isWithinFence = true;
          break;
        }
      }
    }

    if (!insideAny) {
      await logBlockedPunch(
        'outside_geofence',
        closestLocation ? closestLocation.office_location_id : null,
        minDistance !== Infinity ? minDistance : null
      );
      throw new ApiError(STATUS_CODES.BAD_REQUEST, "You are outside the permitted office location. Please move within the office geofence to mark attendance.");
    }
  } else {
    // Location validation disabled
    if (policy && policy.policy_type === 'REMOTE') {
      zoneName = 'Remote';
      locationStatus = 'REMOTE';
    } else if (body.latitude != null && body.longitude != null) {
      zoneName = 'Standard Location';
      locationStatus = 'GPS_CAPTURED';
    } else {
      zoneName = 'Standard Location';
      locationStatus = 'LOCATION_NOT_VERIFIED';
    }
  }

  const { row, created } = await repository.createCheckIn({
    employeeId,
    attendanceDate,
    latitude: body.latitude,
    longitude: body.longitude,
    selfieUrl: body.selfieUrl,
    deviceInfo: body.deviceInfo,
    idempotencyKey,
    geoFenceZoneId: null,
    zoneName: zoneName || null,
    distanceMeters: distanceFromOffice ? Math.round(distanceFromOffice) : null,
    isWithinFence,
    locationStatus,
    gpsAccuracy: body.accuracy,
    distanceFromOffice,
    locationSource: body.locationSource || 'UNKNOWN',
    matchedOfficeLocationId,
    shiftId,
    attendanceResult,
  });

  if (!created && idempotencyKey && row.check_in_idempotency_key === idempotencyKey) {
    return checkInResponse(row, null, isOnLeave, isHoliday, holiday?.holiday_name);
  }

  if (!created) {
    throw new ApiError(STATUS_CODES.CONFLICT, 'Already checked in for today.');
  }

  return checkInResponse(row, null, isOnLeave, isHoliday, holiday?.holiday_name);
}

async function checkOut(user, body, idempotencyKey = null, ip = null) {
  const employeeId = user.id;
  const attendanceDate = getAttendanceDate();

  // Check if today is holiday
  const holidayResult = await query(
    `SELECT holiday_name FROM holidays WHERE holiday_date = $1 AND is_active = true AND is_deleted = false LIMIT 1`,
    [attendanceDate]
  );
  const holiday = holidayResult.rows[0];
  const isHoliday = !!holiday;
  const isOnLeave = await leaveRepository.getActiveLeaveForEmployeeOnDate(employeeId, attendanceDate);

  // Fetch employee policy validation settings
  const policyRes = await query(
    `SELECT p.enable_location_validation, p.policy_type
     FROM users u
     JOIN employees e ON u.employee_id = e.employee_id
     LEFT JOIN attendance_policies p ON e.attendance_policy_id = p.attendance_policy_id
     WHERE u.user_id = $1`,
    [employeeId]
  );
  const policy = policyRes.rows[0];
  const isLocationValidationEnabled = policy ? (Boolean(policy.enable_location_validation) || policy.policy_type === 'OFFICE') : false;

  const logBlockedPunch = async (reason, matchedOfficeId = null, distance = null) => {
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'punch_blocked',
      target: user.id,
      metadata: {
        latitude: body.latitude,
        longitude: body.longitude,
        gps_accuracy: body.accuracy,
        office_location_id: matchedOfficeId,
        distance_from_office: distance,
        reason,
        action_type: 'check_out',
      },
      ip,
    });
  };

  // Future: Prevent GPS Spoofing
  // if (body.isMockLocation || body.mocked) {
  //   throw new ApiError(STATUS_CODES.BAD_REQUEST, "Mocked/Spoofed GPS location detected. Please use real coordinates.");
  // }

  if (isLocationValidationEnabled) {
    if (body.latitude == null || body.longitude == null) {
      await logBlockedPunch('missing_gps_coordinates');
      throw new ApiError(STATUS_CODES.BAD_REQUEST, "You are outside the permitted office location. Please move within the office geofence to mark attendance.");
    }

    if (body.accuracy == null || body.accuracy > 100) {
      await logBlockedPunch('low_gps_accuracy');
      throw new ApiError(STATUS_CODES.BAD_REQUEST, "Unable to verify your location accurately. Please enable High Accuracy Location and try again.");
    }

    // Fetch allowed office locations
    const locsRes = await query(
      `SELECT ol.office_location_id, ol.location_name, ol.latitude, ol.longitude, ol.radius_meters
       FROM users u
       JOIN employees e ON u.employee_id = e.employee_id
       JOIN attendance_policy_locations apl ON e.attendance_policy_id = apl.attendance_policy_id
       JOIN office_locations ol ON apl.office_location_id = ol.office_location_id
       WHERE u.user_id = $1 AND ol.is_active = true`,
      [employeeId]
    );
    const allowedLocations = locsRes.rows;

    if (allowedLocations.length === 0) {
      await logBlockedPunch('no_office_locations_configured');
      throw new ApiError(STATUS_CODES.BAD_REQUEST, "No office locations are configured for your attendance policy. Please contact your administrator.");
    }

    let insideAny = false;
    let closestLocation = null;
    let minDistance = Infinity;

    for (const loc of allowedLocations) {
      const dist = officeLocationService.calculateDistance(
        body.latitude,
        body.longitude,
        loc.latitude,
        loc.longitude
      );
      if (dist !== null) {
        if (dist < minDistance) {
          minDistance = dist;
          closestLocation = loc;
        }
        if (dist <= loc.radius_meters) {
          insideAny = true;
          break;
        }
      }
    }

    if (!insideAny) {
      await logBlockedPunch(
        'outside_geofence',
        closestLocation ? closestLocation.office_location_id : null,
        minDistance !== Infinity ? minDistance : null
      );
      throw new ApiError(STATUS_CODES.BAD_REQUEST, "You are outside the permitted office location. Please move within the office geofence to mark attendance.");
    }
  }

  // 1. Fetch current punch record to see if there is an active check-in and check its shift_id
  const existingPunch = await repository.findByEmployeeAndDate(employeeId, attendanceDate);
  let attendanceResult = 'COMPLETED_SHIFT'; // Default if no shift is linked

  if (existingPunch && existingPunch.shift_id) {
    // Fetch the shift details
    const shiftRes = await query(
      `SELECT start_time, end_time, early_exit_grace_minutes FROM attendance_shifts WHERE shift_id = $1`,
      [existingPunch.shift_id]
    );
    const shift = shiftRes.rows[0];
    if (shift) {
      const shiftStart = getShiftDateTime(attendanceDate, shift.start_time);
      let shiftEnd = getShiftDateTime(attendanceDate, shift.end_time);
      if (shift.end_time < shift.start_time) {
        shiftEnd = getShiftDateTime(getNextDate(attendanceDate), shift.end_time);
      }

      const earlyExitLimit = new Date(shiftEnd.getTime() - shift.early_exit_grace_minutes * 60 * 1000);
      const now = new Date();
      if (now < earlyExitLimit) {
        attendanceResult = 'EARLY_EXIT';
      } else {
        attendanceResult = 'COMPLETED_SHIFT';
      }
    }
  }

  const { row, status } = await repository.updateCheckOut({
    employeeId,
    attendanceDate,
    latitude: body.latitude,
    longitude: body.longitude,
    selfieUrl: body.selfieUrl,
    deviceInfo: body.deviceInfo,
    idempotencyKey,
    attendanceResult,
  });

  if (status === 'missing_check_in') {
    throw new ApiError(STATUS_CODES.CONFLICT, 'Check-out requires an active check-in record.');
  }

  if (status === 'already_checked_out') {
    if (idempotencyKey && row.check_out_idempotency_key === idempotencyKey) {
      return checkOutResponse(row, isHoliday, holiday?.holiday_name, isOnLeave);
    }
    throw new ApiError(STATUS_CODES.CONFLICT, 'Already checked out for today.');
  }

  return checkOutResponse(row, isHoliday, holiday?.holiday_name, isOnLeave);
}

async function getTodayStatus(user) {
  const employeeId = user.id;
  const attendanceDate = getAttendanceDate();
  const isOnLeave = await leaveRepository.getActiveLeaveForEmployeeOnDate(employeeId, attendanceDate);

  // Check if today is holiday
  const holidayResult = await query(
    `SELECT holiday_name FROM holidays WHERE holiday_date = $1 AND is_active = true AND is_deleted = false LIMIT 1`,
    [attendanceDate]
  );
  const holiday = holidayResult.rows[0];
  const isHoliday = !!holiday;

  const row = await repository.findByEmployeeAndDate(employeeId, attendanceDate);
  if (!row) {
    let attendanceStatus = ATTENDANCE_STATUS.ABSENT;
    if (isHoliday) {
      attendanceStatus = ATTENDANCE_STATUS.HOLIDAY;
    } else if (isOnLeave) {
      attendanceStatus = ATTENDANCE_STATUS.ON_LEAVE;
    }

    return {
      success: true,
      message: isHoliday ? 'Today is a holiday.' : (isOnLeave ? 'On leave today.' : 'No punch record found for today.'),
      data: {
        is_on_leave: isOnLeave,
        is_holiday: isHoliday,
        holiday_name: holiday?.holiday_name || null,
        attendance_status: attendanceStatus,
      },
    };
  }

  let attendanceStatus = ATTENDANCE_STATUS.PRESENT;
  if (isHoliday) {
    attendanceStatus = ATTENDANCE_STATUS.HOLIDAY_PRESENT;
  } else if (isOnLeave) {
    attendanceStatus = ATTENDANCE_STATUS.ON_LEAVE;
  }

  return {
    success: true,
    message: 'Today\'s punch record found.',
    data: {
      attendanceId: row.attendance_punch_id,
      checkInTime: formatInTimeZone(row.check_in_time),
      checkOutTime: row.check_out_time ? formatInTimeZone(row.check_out_time) : null,
      latitude: row.check_in_latitude ? Number(row.check_in_latitude) : null,
      longitude: row.check_in_longitude ? Number(row.check_in_longitude) : null,
      checkOutLatitude: row.check_out_latitude ? Number(row.check_out_latitude) : null,
      checkOutLongitude: row.check_out_longitude ? Number(row.check_out_longitude) : null,
      zoneName: row.zone_name || null,
      distanceMeters: row.distance_meters ?? null,
      isWithinFence: row.is_within_fence ?? null,
      workDurationMinutes: row.work_duration_minutes ?? null,
      is_on_leave: isOnLeave,
      is_holiday: isHoliday,
      holiday_name: holiday?.holiday_name || null,
      attendance_status: attendanceStatus,
      location_status: row.location_status,
      gps_accuracy: row.gps_accuracy ? Number(row.gps_accuracy) : null,
      distance_from_office: row.distance_from_office ? Number(row.distance_from_office) : null,
      location_source: row.location_source,
      matched_office_location_id: row.matched_office_location_id,
      shift_id: row.shift_id,
      attendance_result: row.attendance_result,
    },
  };
}

async function getMyHistory(user, queryParams) {
  const userId = user.userId;
  if (!userId) return [];

  const { start_date, end_date } = queryParams;

  const result = await query(`
    SELECT
      ap.attendance_punch_id,
      ap.attendance_date,
      ap.check_in_time,
      ap.check_out_time,
      ap.check_in_latitude,
      ap.check_in_longitude,
      ap.check_out_latitude,
      ap.check_out_longitude,
      ap.zone_name,
      ap.distance_meters,
      ap.is_within_fence,
      ap.work_duration_minutes,
      ap.device_info,
      ap.location_status,
      ap.gps_accuracy,
      ap.distance_from_office,
      ap.location_source,
      ap.matched_office_location_id,
      ol.location_name AS matched_office_name,
      ap.shift_id,
      ap.attendance_result,
      s.shift_name,
      s.shift_code,
      s.start_time AS shift_start_time,
      s.end_time AS shift_end_time,
      s.color_code AS shift_color_code
    FROM attendance_punches ap
    LEFT JOIN office_locations ol ON ap.matched_office_location_id = ol.office_location_id
    LEFT JOIN attendance_shifts s ON ap.shift_id = s.shift_id
    WHERE ap.employee_id = $1
      AND ($2::date IS NULL OR ap.attendance_date >= $2)
      AND ($3::date IS NULL OR ap.attendance_date <= $3)
    ORDER BY ap.attendance_date DESC
  `, [userId, start_date || null, end_date || null]);

  return result.rows.map(row => {
    let work_duration_minutes = row.work_duration_minutes;
    if (work_duration_minutes === null && row.check_in_time && row.check_out_time) {
      work_duration_minutes = Math.floor((new Date(row.check_out_time) - new Date(row.check_in_time)) / (1000 * 60));
    }

    return {
      ...row,
      check_in_latitude: row.check_in_latitude ? Number(row.check_in_latitude) : null,
      check_in_longitude: row.check_in_longitude ? Number(row.check_in_longitude) : null,
      check_out_latitude: row.check_out_latitude ? Number(row.check_out_latitude) : null,
      check_out_longitude: row.check_out_longitude ? Number(row.check_out_longitude) : null,
      work_duration_minutes,
      check_in_time: row.check_in_time ? formatInTimeZone(row.check_in_time) : null,
      check_out_time: row.check_out_time ? formatInTimeZone(row.check_out_time) : null,
    };
  });
}

async function getTeamMembers(user) {
  const employeeId = user.employeeId;
  const organizationId = user.organizationId;
  if (!employeeId) return [];

  const sql = `
    WITH RECURSIVE subordinates AS (
        -- Direct reports (primary manager) + secondary manager assignments
        SELECT e.employee_id, e.first_name, e.last_name, e.employee_code, e.manager_employee_id, e.designation
        FROM employees e
        WHERE (e.manager_employee_id = $1 OR e.secondary_manager_id = $1) AND e.organization_id = $2
        
        UNION ALL
        
        SELECT e.employee_id, e.first_name, e.last_name, e.employee_code, e.manager_employee_id, e.designation
        FROM employees e
        INNER JOIN subordinates s ON e.manager_employee_id = s.employee_id
        WHERE e.organization_id = $2
    )
    SELECT DISTINCT employee_id, first_name, last_name, employee_code, designation
    FROM subordinates
    ORDER BY first_name, last_name;
  `;
  const result = await query(sql, [employeeId, organizationId]);
  return result.rows;
}

async function getTeamHistory(user, queryParams) {
  const employeeId = user.employeeId;
  const organizationId = user.organizationId;
  if (!employeeId) return [];

  const { employee_id, start_date, end_date } = queryParams;

  const sql = `
    WITH RECURSIVE subordinates AS (
        -- Direct reports (primary manager) + secondary manager assignments
        SELECT e.employee_id, e.first_name, e.last_name, e.employee_code, e.manager_employee_id, u.user_id, e.designation
        FROM employees e
        LEFT JOIN users u ON e.employee_id = u.employee_id
        WHERE (e.manager_employee_id = $1 OR e.secondary_manager_id = $1) AND e.organization_id = $2
        
        UNION ALL
        
        SELECT e.employee_id, e.first_name, e.last_name, e.employee_code, e.manager_employee_id, u.user_id, e.designation
        FROM employees e
        LEFT JOIN users u ON e.employee_id = u.employee_id
        INNER JOIN subordinates s ON e.manager_employee_id = s.employee_id
        WHERE e.organization_id = $2
    )
    SELECT 
        ap.attendance_punch_id,
        sub.employee_id,
        sub.first_name,
        sub.last_name,
        sub.employee_code,
        sub.designation,
        ap.attendance_date,
        ap.check_in_time,
        ap.check_out_time,
        ap.check_in_latitude,
        ap.check_in_longitude,
        ap.check_out_latitude,
        ap.check_out_longitude,
        ap.zone_name,
        ap.distance_meters,
        ap.is_within_fence,
        ap.work_duration_minutes,
        ap.device_info,
        ap.location_status,
        ap.gps_accuracy,
        ap.distance_from_office,
        ap.location_source,
        ap.matched_office_location_id,
        ol.location_name AS matched_office_name,
        ap.shift_id,
        ap.attendance_result,
        s.shift_name,
        s.shift_code,
        s.start_time AS shift_start_time,
        s.end_time AS shift_end_time,
        s.color_code AS shift_color_code
    FROM subordinates sub
    JOIN attendance_punches ap ON sub.user_id = ap.employee_id
    LEFT JOIN office_locations ol ON ap.matched_office_location_id = ol.office_location_id
    LEFT JOIN attendance_shifts s ON ap.shift_id = s.shift_id
    WHERE ($3::uuid IS NULL OR sub.employee_id = $3)
      AND ($4::date IS NULL OR ap.attendance_date >= $4)
      AND ($5::date IS NULL OR ap.attendance_date <= $5)
    ORDER BY ap.attendance_date DESC, ap.check_in_time DESC;
  `;

  const result = await query(sql, [
    employeeId,
    organizationId,
    employee_id || null,
    start_date || null,
    end_date || null
  ]);

  return result.rows.map(row => {
    let work_duration_minutes = row.work_duration_minutes;
    if (work_duration_minutes === null && row.check_in_time && row.check_out_time) {
      work_duration_minutes = Math.floor((new Date(row.check_out_time) - new Date(row.check_in_time)) / (1000 * 60));
    }

    return {
      ...row,
      check_in_latitude: row.check_in_latitude ? Number(row.check_in_latitude) : null,
      check_in_longitude: row.check_in_longitude ? Number(row.check_in_longitude) : null,
      check_out_latitude: row.check_out_latitude ? Number(row.check_out_latitude) : null,
      check_out_longitude: row.check_out_longitude ? Number(row.check_out_longitude) : null,
      check_in_time: row.check_in_time ? formatInTimeZone(row.check_in_time) : null,
      check_out_time: row.check_out_time ? formatInTimeZone(row.check_out_time) : null,
      work_duration_minutes,
    };
  });
}

async function getAdminOverview(user, queryParams) {
  const organizationId = user.organizationId;
  
  const page = parseInt(queryParams.page, 10) || 1;
  const limitParam = queryParams.limit;
  const limit = limitParam === 'all' ? 'all' : (parseInt(limitParam, 10) || 10);
  
  const search = queryParams.search || null;
  const department_id = queryParams.department_id || null;
  const employee_id = queryParams.employee_id || null;
  const policy_id = queryParams.policy_id || null;
  const shift_id = queryParams.shift_id || null;
  const attendance_result = queryParams.attendance_result || null;
  const location_status = queryParams.location_status || null;
  
  const startDate = queryParams.start_date || queryParams.date || getAttendanceDate();
  const endDate = queryParams.end_date || queryParams.date || getAttendanceDate();
  const isRange = startDate !== endDate;

  let baseQuery = '';
  let countQuery = '';
  const whereClauses = [];
  const params = [organizationId];

  let pIdx = 2;

  whereClauses.push(`e.organization_id = $1`);
  whereClauses.push(`e.status = 'active'`);

  if (search) {
    whereClauses.push(`(e.first_name ILIKE $${pIdx} OR e.last_name ILIKE $${pIdx} OR e.employee_code ILIKE $${pIdx} OR e.email ILIKE $${pIdx})`);
    params.push(`%${search}%`);
    pIdx++;
  }
  if (department_id) {
    whereClauses.push(`e.department_id = $${pIdx}`);
    params.push(department_id);
    pIdx++;
  }
  if (employee_id) {
    whereClauses.push(`e.employee_id = $${pIdx}`);
    params.push(employee_id);
    pIdx++;
  }
  if (policy_id) {
    whereClauses.push(`e.attendance_policy_id = $${pIdx}`);
    params.push(policy_id);
    pIdx++;
  }
  if (shift_id) {
    whereClauses.push(`(ap.shift_id = $${pIdx} OR (ap.shift_id IS NULL AND e.shift_id = $${pIdx}))`);
    params.push(shift_id);
    pIdx++;
  }
  if (attendance_result) {
    whereClauses.push(`ap.attendance_result = $${pIdx}`);
    params.push(attendance_result);
    pIdx++;
  }
  if (location_status) {
    if (location_status === 'LOCATION_NOT_VERIFIED') {
      whereClauses.push(`(ap.location_status IS NULL OR ap.location_status = 'LOCATION_NOT_VERIFIED')`);
    } else {
      whereClauses.push(`ap.location_status = $${pIdx}`);
      params.push(location_status);
      pIdx++;
    }
  }

  if (isRange) {
    whereClauses.push(`ap.attendance_date BETWEEN $${pIdx} AND $${pIdx + 1}`);
    params.push(startDate, endDate);
    pIdx += 2;

    const selectFields = `
      e.employee_id,
      e.employee_code,
      e.first_name,
      e.last_name,
      e.designation,
      d.name AS department,
      pol.name AS policy_name,
      pol.enable_late_arrival_lop,
      pol.late_arrivals_threshold,
      pol.lop_days_per_threshold,
      ap.attendance_date,
      ap.check_in_time,
      ap.check_out_time,
      ap.check_in_latitude,
      ap.check_in_longitude,
      ap.work_duration_minutes,
      ap.zone_name,
      ap.is_within_fence,
      ap.location_status,
      ap.gps_accuracy,
      ap.distance_from_office,
      ap.location_source,
      ap.matched_office_location_id,
      ol.location_name AS matched_office_name,
      ap.shift_id,
      ap.attendance_result,
      ap.regularized_check_in,
      ap.regularized_check_out,
      ap.is_regularized,
      CASE
        WHEN reg.approval_status = 'PENDING' THEN 'Pending Approval'
        WHEN reg.approval_status = 'REJECTED' THEN 'Rejected'
        WHEN reg.approval_status = 'APPROVED' AND reg.request_category = 'REGULARIZATION' THEN 'Regularized'
        WHEN reg.approval_status = 'APPROVED' AND reg.request_category = 'PERMISSION' THEN 'Permission Approved'
        ELSE NULL
      END AS adjustment_status,
      COALESCE(s.shift_name, es.shift_name) AS shift_name,
      COALESCE(s.shift_code, es.shift_code) AS shift_code,
      COALESCE(s.start_time, es.start_time) AS shift_start_time,
      COALESCE(s.end_time, es.end_time) AS shift_end_time,
      COALESCE(s.color_code, es.color_code) AS shift_color_code,
      'present' AS attendance_status
    `;

    const fromTables = `
      FROM attendance_punches ap
      JOIN users u ON ap.employee_id = u.user_id
      JOIN employees e ON u.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN attendance_policies pol ON e.attendance_policy_id = pol.attendance_policy_id
      LEFT JOIN attendance_shifts es ON e.shift_id = es.shift_id
      LEFT JOIN office_locations ol ON ap.matched_office_location_id = ol.office_location_id
      LEFT JOIN attendance_shifts s ON ap.shift_id = s.shift_id
      LEFT JOIN LATERAL (
        SELECT request_category, approval_status, request_type
        FROM attendance_regularization_requests
        WHERE employee_id = e.employee_id AND attendance_date = ap.attendance_date
        ORDER BY created_at DESC LIMIT 1
      ) reg ON true
    `;

    baseQuery = `SELECT ${selectFields} ${fromTables} WHERE ${whereClauses.join(' AND ')} ORDER BY ap.attendance_date DESC, e.first_name, e.last_name`;
    countQuery = `SELECT COUNT(*) ${fromTables} WHERE ${whereClauses.join(' AND ')}`;
  } else {
    whereClauses.push(`(ap.attendance_date = $${pIdx} OR ap.attendance_date IS NULL)`);
    params.push(startDate);
    pIdx++;

    const selectFields = `
      e.employee_id,
      e.employee_code,
      e.first_name,
      e.last_name,
      e.designation,
      d.name AS department,
      pol.name AS policy_name,
      pol.enable_late_arrival_lop,
      pol.late_arrivals_threshold,
      pol.lop_days_per_threshold,
      COALESCE(ap.attendance_date, $${pIdx - 1}::date) AS attendance_date,
      ap.check_in_time,
      ap.check_out_time,
      ap.check_in_latitude,
      ap.check_in_longitude,
      ap.work_duration_minutes,
      ap.zone_name,
      ap.is_within_fence,
      ap.location_status,
      ap.gps_accuracy,
      ap.distance_from_office,
      ap.location_source,
      ap.matched_office_location_id,
      ol.location_name AS matched_office_name,
      ap.shift_id,
      ap.attendance_result,
      ap.regularized_check_in,
      ap.regularized_check_out,
      ap.is_regularized,
      CASE
        WHEN reg.approval_status = 'PENDING' THEN 'Pending Approval'
        WHEN reg.approval_status = 'REJECTED' THEN 'Rejected'
        WHEN reg.approval_status = 'APPROVED' AND reg.request_category = 'REGULARIZATION' THEN 'Regularized'
        WHEN reg.approval_status = 'APPROVED' AND reg.request_category = 'PERMISSION' THEN 'Permission Approved'
        ELSE NULL
      END AS adjustment_status,
      COALESCE(s.shift_name, es.shift_name) AS shift_name,
      COALESCE(s.shift_code, es.shift_code) AS shift_code,
      COALESCE(s.start_time, es.start_time) AS shift_start_time,
      COALESCE(s.end_time, es.end_time) AS shift_end_time,
      COALESCE(s.color_code, es.color_code) AS shift_color_code,
      CASE
        WHEN ap.attendance_punch_id IS NOT NULL THEN 'present'
        ELSE 'absent'
      END AS attendance_status
    `;

    const fromTables = `
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN users u ON u.employee_id = e.employee_id
      LEFT JOIN attendance_policies pol ON e.attendance_policy_id = pol.attendance_policy_id
      LEFT JOIN attendance_shifts es ON e.shift_id = es.shift_id
      LEFT JOIN attendance_punches ap ON ap.employee_id = u.user_id AND ap.attendance_date = $${pIdx - 1}::date
      LEFT JOIN office_locations ol ON ap.matched_office_location_id = ol.office_location_id
      LEFT JOIN attendance_shifts s ON ap.shift_id = s.shift_id
      LEFT JOIN LATERAL (
        SELECT request_category, approval_status, request_type
        FROM attendance_regularization_requests
        WHERE employee_id = e.employee_id AND attendance_date = $${pIdx - 1}::date
        ORDER BY created_at DESC LIMIT 1
      ) reg ON true
    `;

    baseQuery = `SELECT ${selectFields} ${fromTables} WHERE ${whereClauses.join(' AND ')} ORDER BY e.first_name, e.last_name`;
    countQuery = `SELECT COUNT(*) ${fromTables} WHERE ${whereClauses.join(' AND ')}`;
  }

  const countResult = await query(countQuery, params);
  const totalCount = parseInt(countResult.rows[0].count, 10);

  if (limit !== 'all') {
    const offset = (page - 1) * limit;
    baseQuery += ` LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
    params.push(limit, offset);
  }

  const result = await query(baseQuery, params);

  const rows = result.rows.map(row => {
    const isReg = !!row.is_regularized;
    const checkInToUse = isReg ? row.regularized_check_in : row.check_in_time;
    const checkOutToUse = isReg ? row.regularized_check_out : row.check_out_time;

    let work_duration_minutes = row.work_duration_minutes;
    if (work_duration_minutes === null && checkInToUse && checkOutToUse) {
      work_duration_minutes = Math.floor((new Date(checkOutToUse) - new Date(checkInToUse)) / (1000 * 60));
    }

    return {
      ...row,
      check_in_latitude: row.check_in_latitude ? Number(row.check_in_latitude) : null,
      check_in_longitude: row.check_in_longitude ? Number(row.check_in_longitude) : null,
      check_in_time: checkInToUse ? formatInTimeZone(checkInToUse) : null,
      check_out_time: checkOutToUse ? formatInTimeZone(checkOutToUse) : null,
      original_check_in_time: isReg && row.check_in_time ? formatInTimeZone(row.check_in_time) : null,
      original_check_out_time: isReg && row.check_out_time ? formatInTimeZone(row.check_out_time) : null,
      work_duration_minutes,
    };
  });

  return {
    records: rows,
    pagination: {
      totalCount,
      totalPages: limit === 'all' ? 1 : Math.ceil(totalCount / limit),
      currentPage: page,
      limit: limit === 'all' ? totalCount : limit,
    }
  };
}

async function getAdminDashboardSummary(organizationId, date) {
  const targetDate = date || getAttendanceDate();

  const totalEmployeesRes = await query(
    `SELECT COUNT(*)::int AS count FROM employees WHERE organization_id = $1 AND status = 'active'`,
    [organizationId]
  );
  const totalEmployees = totalEmployeesRes.rows[0].count;

  const punchStatsRes = await query(
    `SELECT 
       COUNT(*)::int AS present,
       COUNT(CASE WHEN ap.attendance_result = 'ON_TIME' THEN 1 END)::int AS on_time,
       COUNT(CASE WHEN ap.attendance_result = 'LATE_ARRIVAL' THEN 1 END)::int AS late_arrivals,
       COUNT(CASE WHEN ap.attendance_result = 'EARLY_EXIT' THEN 1 END)::int AS early_exits,
       COUNT(CASE WHEN ap.attendance_result = 'COMPLETED_SHIFT' THEN 1 END)::int AS completed_shifts,
       COUNT(CASE WHEN ap.location_status = 'INSIDE_FENCE' THEN 1 END)::int AS inside_fence,
       COUNT(CASE WHEN ap.location_status = 'OUTSIDE_FENCE' THEN 1 END)::int AS outside_fence,
       COUNT(CASE WHEN ap.location_status IS NULL OR ap.location_status = 'LOCATION_NOT_VERIFIED' THEN 1 END)::int AS location_not_verified
     FROM attendance_punches ap
     JOIN users u ON ap.employee_id = u.user_id
     JOIN employees e ON u.employee_id = e.employee_id
     WHERE e.organization_id = $1 AND e.status = 'active' AND ap.attendance_date = $2::date`,
    [organizationId, targetDate]
  );

  const stats = punchStatsRes.rows[0];
  const present = stats.present || 0;
  const absent = Math.max(0, totalEmployees - present);

  return {
    date: targetDate,
    totalEmployees,
    present,
    absent,
    onTime: stats.on_time || 0,
    lateArrivals: stats.late_arrivals || 0,
    earlyExits: stats.early_exits || 0,
    completedShifts: stats.completed_shifts || 0,
    insideFence: stats.inside_fence || 0,
    outsideFence: stats.outside_fence || 0,
    locationNotVerified: stats.location_not_verified || 0,
    attendancePercentage: totalEmployees > 0 ? Number(((present / totalEmployees) * 100).toFixed(1)) : 0.0
  };
}

async function getAdminTrends(organizationId, range) {
  const today = new Date();
  let startDate = new Date();

  if (range === '7days') {
    startDate.setDate(today.getDate() - 6);
  } else if (range === '30days') {
    startDate.setDate(today.getDate() - 29);
  } else if (range === 'current_month') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  } else {
    startDate.setDate(today.getDate() - 6);
  }

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = today.toISOString().split('T')[0];

  const result = await query(
    `WITH date_series AS (
       SELECT generate_series($2::date, $3::date, '1 day'::interval)::date AS d_date
     ),
     total_emp AS (
       SELECT COUNT(*)::int AS emp_count FROM employees WHERE organization_id = $1 AND status = 'active'
     )
     SELECT 
       ds.d_date AS date,
       COALESCE(te.emp_count, 0) AS total_employees,
       COUNT(ap.attendance_punch_id)::int AS present,
       COUNT(CASE WHEN ap.attendance_result = 'ON_TIME' THEN 1 END)::int AS on_time,
       COUNT(CASE WHEN ap.attendance_result = 'LATE_ARRIVAL' THEN 1 END)::int AS late_arrivals,
       COUNT(CASE WHEN ap.attendance_result = 'EARLY_EXIT' THEN 1 END)::int AS early_exits,
       COUNT(CASE WHEN ap.attendance_result = 'COMPLETED_SHIFT' THEN 1 END)::int AS completed_shifts
     FROM date_series ds
     CROSS JOIN total_emp te
     LEFT JOIN employees e ON e.organization_id = $1 AND e.status = 'active'
     LEFT JOIN users u ON u.employee_id = e.employee_id
     LEFT JOIN attendance_punches ap ON ap.employee_id = u.user_id AND ap.attendance_date = ds.d_date
     GROUP BY ds.d_date, te.emp_count
     ORDER BY ds.d_date ASC`,
    [organizationId, startStr, endStr]
  );

  return result.rows.map(r => {
    const total = r.total_employees;
    const present = r.present;
    const absent = Math.max(0, total - present);
    const complianceNumerator = r.on_time + r.completed_shifts;
    const complianceRate = present > 0 ? Number(((complianceNumerator / present) * 100).toFixed(1)) : 100.0;

    return {
      date: r.date instanceof Date 
        ? r.date.toISOString().split('T')[0] 
        : (typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0]),
      totalEmployees: total,
      present,
      absent,
      onTime: r.on_time,
      lateArrivals: r.late_arrivals,
      earlyExits: r.early_exits,
      completedShifts: r.completed_shifts,
      complianceRate
    };
  });
}

async function getAdminDepartmentsSummary(organizationId, date) {
  const targetDate = date || getAttendanceDate();

  const result = await query(
    `SELECT 
       d.department_id,
       d.name AS department_name,
       COUNT(e.employee_id)::int AS total_employees,
       COUNT(CASE WHEN ap.attendance_punch_id IS NOT NULL THEN 1 END)::int AS present_count,
       COUNT(CASE WHEN ap.attendance_result = 'LATE_ARRIVAL' THEN 1 END)::int AS late_count
     FROM departments d
     JOIN employees e ON e.department_id = d.department_id
     LEFT JOIN users u ON u.employee_id = e.employee_id
     LEFT JOIN attendance_punches ap ON ap.employee_id = u.user_id AND ap.attendance_date = $2::date
     WHERE e.organization_id = $1 AND e.status = 'active'
     GROUP BY d.department_id, d.name
     ORDER BY d.name`,
    [organizationId, targetDate]
  );

  return result.rows.map(r => ({
    departmentId: r.department_id,
    departmentName: r.department_name,
    totalEmployees: r.total_employees,
    presentCount: r.present_count,
    absentCount: Math.max(0, r.total_employees - r.present_count),
    lateCount: r.late_count
  }));
}

async function getEmployeeHistory(organizationId, employeeId, startDate, endDate) {
  const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
  const end = endDate || getAttendanceDate();

  const result = await query(
    `SELECT
       ap.attendance_punch_id,
       ap.attendance_date,
       ap.check_in_time,
       ap.check_out_time,
       ap.work_duration_minutes,
       ap.location_status,
       ol.location_name AS matched_office_name,
       COALESCE(s.shift_name, es.shift_name) AS shift_name,
       COALESCE(s.shift_code, es.shift_code) AS shift_code,
       ap.attendance_result,
       pol.name AS policy_name,
       ap.regularized_check_in,
       ap.regularized_check_out,
       ap.is_regularized,
       CASE
         WHEN reg.approval_status = 'PENDING' THEN 'Pending Approval'
         WHEN reg.approval_status = 'REJECTED' THEN 'Rejected'
         WHEN reg.approval_status = 'APPROVED' AND reg.request_category = 'REGULARIZATION' THEN 'Regularized'
         WHEN reg.approval_status = 'APPROVED' AND reg.request_category = 'PERMISSION' THEN 'Permission Approved'
         ELSE NULL
       END AS adjustment_status
     FROM attendance_punches ap
     JOIN users u ON ap.employee_id = u.user_id
     JOIN employees e ON u.employee_id = e.employee_id
     LEFT JOIN departments d ON e.department_id = d.department_id
     LEFT JOIN attendance_policies pol ON e.attendance_policy_id = pol.attendance_policy_id
     LEFT JOIN attendance_shifts es ON e.shift_id = es.shift_id
     LEFT JOIN office_locations ol ON ap.matched_office_location_id = ol.office_location_id
     LEFT JOIN attendance_shifts s ON ap.shift_id = s.shift_id
     LEFT JOIN LATERAL (
       SELECT request_category, approval_status, request_type
       FROM attendance_regularization_requests
       WHERE employee_id = e.employee_id AND attendance_date = ap.attendance_date
       ORDER BY created_at DESC LIMIT 1
     ) reg ON true
     WHERE e.organization_id = $1::uuid 
       AND e.employee_id = $2::uuid 
       AND ap.attendance_date BETWEEN $3::date AND $4::date
     ORDER BY ap.attendance_date DESC`,
    [organizationId, employeeId, start, end]
  );

  return result.rows.map(row => {
    const isReg = !!row.is_regularized;
    const checkInToUse = isReg ? row.regularized_check_in : row.check_in_time;
    const checkOutToUse = isReg ? row.regularized_check_out : row.check_out_time;

    return {
      ...row,
      check_in_time: checkInToUse ? formatInTimeZone(checkInToUse) : null,
      check_out_time: checkOutToUse ? formatInTimeZone(checkOutToUse) : null,
      original_check_in_time: isReg && row.check_in_time ? formatInTimeZone(row.check_in_time) : null,
      original_check_out_time: isReg && row.check_out_time ? formatInTimeZone(row.check_out_time) : null,
    };
  });
}

async function listPolicies(organizationId) {
  const res = await query(
    `SELECT p.attendance_policy_id, p.organization_id, p.name, p.description, 
            p.policy_type, p.enable_location_validation, p.enable_shift_validation, 
            p.is_active, p.is_deleted, p.created_at, p.updated_at,
            p.enable_late_arrival_lop, p.late_arrivals_threshold, p.lop_days_per_threshold,
            COALESCE(COUNT(e.employee_id), 0)::int AS usage_count
     FROM attendance_policies p
     LEFT JOIN employees e ON e.attendance_policy_id = p.attendance_policy_id AND e.status = 'active'
     WHERE p.organization_id = $1 AND p.is_deleted = false
     GROUP BY p.attendance_policy_id, p.organization_id, p.name, p.description, 
              p.policy_type, p.enable_location_validation, p.enable_shift_validation, 
              p.is_active, p.is_deleted, p.created_at, p.updated_at,
              p.enable_late_arrival_lop, p.late_arrivals_threshold, p.lop_days_per_threshold
     ORDER BY p.created_at DESC`,
    [organizationId]
  );
  
  const policies = res.rows;
  if (policies.length === 0) return [];

  const policyIds = policies.map(p => p.attendance_policy_id);
  const locsRes = await query(
    `SELECT attendance_policy_id, office_location_id 
     FROM attendance_policy_locations 
     WHERE attendance_policy_id = ANY($1)`,
    [policyIds]
  );

  const locsMap = {};
  for (const row of locsRes.rows) {
    if (!locsMap[row.attendance_policy_id]) {
      locsMap[row.attendance_policy_id] = [];
    }
    locsMap[row.attendance_policy_id].push(row.office_location_id);
  }

  for (const policy of policies) {
    policy.office_location_ids = locsMap[policy.attendance_policy_id] || [];
  }

  return policies;
}

async function getPolicyById(organizationId, policyId) {
  const res = await query(
    `SELECT attendance_policy_id, organization_id, name, description, 
            policy_type, enable_location_validation, enable_shift_validation, 
            is_active, is_deleted, created_at, updated_at,
            enable_late_arrival_lop, late_arrivals_threshold, lop_days_per_threshold
     FROM attendance_policies
     WHERE attendance_policy_id = $1 AND organization_id = $2 AND is_deleted = false`,
    [policyId, organizationId]
  );
  const policy = res.rows[0];
  if (!policy) return null;

  const locs = await query(
    `SELECT office_location_id FROM attendance_policy_locations WHERE attendance_policy_id = $1`,
    [policyId]
  );
  policy.office_location_ids = locs.rows.map(r => r.office_location_id);
  return policy;
}

async function createPolicy(organizationId, data) {
  const { name, description, policy_type, enable_location_validation, enable_shift_validation, is_active, office_location_ids, enable_late_arrival_lop, late_arrivals_threshold, lop_days_per_threshold } = data;
  
  const enableLateLop = !!enable_late_arrival_lop;
  let lateLimit = 0;
  let lopDeduction = 0.00;

  if (enableLateLop) {
    lateLimit = parseInt(late_arrivals_threshold) || 0;
    lopDeduction = parseFloat(lop_days_per_threshold) || 0.00;

    if (lateLimit < 1) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Late Arrival Threshold must be at least 1 when LOP rule is enabled.');
    }
    if (lopDeduction <= 0) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'LOP Days Deduction must be greater than 0 when LOP rule is enabled.');
    }
  }
  
  return await withTransaction(async (client) => {
    const res = await client.query(
      `INSERT INTO attendance_policies (organization_id, name, description, policy_type, enable_location_validation, enable_shift_validation, is_active, enable_late_arrival_lop, late_arrivals_threshold, lop_days_per_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [organizationId, name, description, policy_type, enable_location_validation, enable_shift_validation, is_active, enableLateLop, lateLimit, lopDeduction]
    );
    const policy = res.rows[0];

    if (enable_location_validation && Array.isArray(office_location_ids) && office_location_ids.length > 0) {
      for (const locId of office_location_ids) {
        await client.query(
          `INSERT INTO attendance_policy_locations (attendance_policy_id, office_location_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [policy.attendance_policy_id, locId]
        );
      }
    }
    
    policy.office_location_ids = enable_location_validation && Array.isArray(office_location_ids) ? office_location_ids : [];
    return policy;
  });
}

async function updatePolicy(organizationId, policyId, data) {
  const { name, description, policy_type, enable_location_validation, enable_shift_validation, is_active, office_location_ids, enable_late_arrival_lop, late_arrivals_threshold, lop_days_per_threshold } = data;
  
  const enableLateLop = !!enable_late_arrival_lop;
  let lateLimit = 0;
  let lopDeduction = 0.00;

  if (enableLateLop) {
    lateLimit = parseInt(late_arrivals_threshold) || 0;
    lopDeduction = parseFloat(lop_days_per_threshold) || 0.00;

    if (lateLimit < 1) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Late Arrival Threshold must be at least 1 when LOP rule is enabled.');
    }
    if (lopDeduction <= 0) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'LOP Days Deduction must be greater than 0 when LOP rule is enabled.');
    }
  }
  
  return await withTransaction(async (client) => {
    const res = await client.query(
      `UPDATE attendance_policies
       SET name = $1, description = $2, policy_type = $3, enable_location_validation = $4, enable_shift_validation = $5, is_active = $6, enable_late_arrival_lop = $7, late_arrivals_threshold = $8, lop_days_per_threshold = $9, updated_at = NOW()
       WHERE attendance_policy_id = $10 AND organization_id = $11 AND is_deleted = false
       RETURNING *`,
      [name, description, policy_type, enable_location_validation, enable_shift_validation, is_active, enableLateLop, lateLimit, lopDeduction, policyId, organizationId]
    );
    if (!res.rows.length) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Attendance policy not found.');
    }
    const policy = res.rows[0];

    // Clear existing locations
    await client.query(
      `DELETE FROM attendance_policy_locations WHERE attendance_policy_id = $1`,
      [policyId]
    );

    // Save new locations
    if (enable_location_validation && Array.isArray(office_location_ids) && office_location_ids.length > 0) {
      for (const locId of office_location_ids) {
        await client.query(
          `INSERT INTO attendance_policy_locations (attendance_policy_id, office_location_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [policyId, locId]
        );
      }
    }

    policy.office_location_ids = enable_location_validation && Array.isArray(office_location_ids) ? office_location_ids : [];
    return policy;
  });
}

async function deletePolicy(organizationId, policyId) {
  // Check if any active employee is assigned to this policy
  const countRes = await query(
    `SELECT COUNT(*) FROM employees WHERE attendance_policy_id = $1 AND organization_id = $2 AND status = 'active'`,
    [policyId, organizationId]
  );
  if (parseInt(countRes.rows[0].count) > 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot delete policy because it is currently assigned to active employees.');
  }

  const res = await query(
    `UPDATE attendance_policies 
     SET is_active = false, is_deleted = true, updated_at = NOW() 
     WHERE attendance_policy_id = $1 AND organization_id = $2 AND is_deleted = false 
     RETURNING *`,
    [policyId, organizationId]
  );
  if (!res.rows.length) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Attendance policy not found.');
  }
  return { success: true, message: 'Policy soft-deleted successfully.' };
}

async function getPolicyAssignedMembers(organizationId, policyId) {
  // Check policy exists
  const policy = await getPolicyById(organizationId, policyId);
  if (!policy) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Attendance policy not found.');
  }

  const res = await query(
    `SELECT e.employee_id, e.employee_code, e.first_name, e.last_name, e.designation, 
            d.name AS department_name, e.status, apa.effective_from, apa.created_at AS assigned_at
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.department_id
     LEFT JOIN LATERAL (
       SELECT effective_from, created_at
       FROM attendance_policy_assignments
       WHERE policy_id = $1 AND employee_id = e.employee_id
       ORDER BY created_at DESC
       LIMIT 1
     ) apa ON true
     WHERE e.attendance_policy_id = $1 AND e.organization_id = $2
     ORDER BY e.first_name, e.last_name`,
    [policyId, organizationId]
  );
  return res.rows;
}

async function getPolicyAssignedDepartments(organizationId, policyId) {
  // Check policy exists
  const policy = await getPolicyById(organizationId, policyId);
  if (!policy) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Attendance policy not found.');
  }

  const res = await query(
    `SELECT DISTINCT d.department_id, d.name
     FROM departments d
     JOIN employees e ON e.department_id = d.department_id
     WHERE e.attendance_policy_id = $1 AND e.organization_id = $2 AND e.status = 'active'
     ORDER BY d.name`,
    [policyId, organizationId]
  );
  return res.rows;
}

async function assignPolicy(organizationId, policyId, body) {
  const { department_id, employee_ids, effective_from } = body;

  const policy = await getPolicyById(organizationId, policyId);
  if (!policy) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Attendance policy not found.');
  }

  let finalEmployeeIds = [];
  const departmentEmployeeIds = [];

  if (department_id) {
    const empRes = await query(
      `SELECT employee_id FROM employees 
       WHERE department_id = $1 AND organization_id = $2 AND status = 'active'`,
      [department_id, organizationId]
    );
    empRes.rows.forEach(r => {
      departmentEmployeeIds.push(r.employee_id);
      finalEmployeeIds.push(r.employee_id);
    });
  }

  if (Array.isArray(employee_ids) && employee_ids.length > 0) {
    employee_ids.forEach(id => {
      if (!finalEmployeeIds.includes(id)) {
        finalEmployeeIds.push(id);
      }
    });
  }

  if (!finalEmployeeIds.length) {
    return { success: true, message: 'No employees to assign.' };
  }

  const effectiveDate = effective_from || new Date().toISOString().split('T')[0];

  await withTransaction(async (client) => {
    // Enforce that employees can have only one active policy (we update the employees cache table)
    await client.query(
      `UPDATE employees 
       SET attendance_policy_id = $1, updated_at = NOW() 
       WHERE employee_id = ANY($2::uuid[]) AND organization_id = $3`,
      [policyId, finalEmployeeIds, organizationId]
    );

    // Insert history tracking
    for (const empId of finalEmployeeIds) {
      const assignmentType = departmentEmployeeIds.includes(empId) ? 'DEPARTMENT' : 'EMPLOYEE';
      await client.query(
        `INSERT INTO attendance_policy_assignments (policy_id, employee_id, assignment_type, effective_from)
         VALUES ($1, $2, $3, $4)`,
        [policyId, empId, assignmentType, effectiveDate]
      );
    }
  });

  return { success: true, message: `Successfully assigned policy to ${finalEmployeeIds.length} employee(s).` };
}

async function getEmployeePolicy(userId) {
  const res = await query(
    `SELECT p.attendance_policy_id, p.name, p.enable_late_arrival_lop, p.late_arrivals_threshold, p.lop_days_per_threshold
     FROM employees e
     JOIN users u ON e.employee_id = u.employee_id
     LEFT JOIN attendance_policies p ON e.attendance_policy_id = p.attendance_policy_id
     WHERE u.user_id = $1`,
    [userId]
  );
  return res.rows[0] || null;
}

module.exports = {
  checkIn,
  checkOut,
  getTodayStatus,
  getAttendanceDate,
  formatInTimeZone,
  getMyHistory,
  getEmployeePolicy,
  getEmployeeAssignedShift,
  getTeamMembers,
  getTeamHistory,
  getAdminOverview,
  listPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getPolicyAssignedMembers,
  getPolicyAssignedDepartments,
  assignPolicy,
  getAdminDashboardSummary,
  getAdminTrends,
  getAdminDepartmentsSummary,
  getEmployeeHistory,
};
