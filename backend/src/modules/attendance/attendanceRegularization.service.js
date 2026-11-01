const repo = require('./attendanceRegularization.repository');
const { query } = require('../../config/db');

/**
 * Gets organization settings, creating default settings if they do not exist.
 */
async function getSettings(organizationId) {
  let settings = await repo.getSettings(organizationId);
  if (!settings) {
    settings = await repo.createSettings(organizationId);
  }
  return settings;
}

/**
 * Updates organization settings.
 */
async function updateSettings(organizationId, data) {
  const current = await getSettings(organizationId);

  const payload = {
    max_requests_allowed: data.max_requests_allowed !== undefined ? parseInt(data.max_requests_allowed) : current.max_requests_allowed,
    request_period: data.request_period || current.request_period,
    regularization_window_days: data.regularization_window_days !== undefined ? parseInt(data.regularization_window_days) : current.regularization_window_days,
    reason_required: data.reason_required !== undefined ? !!data.reason_required : current.reason_required,
    enable_partial_day_permissions: data.enable_partial_day_permissions !== undefined ? !!data.enable_partial_day_permissions : current.enable_partial_day_permissions,
    allow_future_regularization: data.allow_future_regularization !== undefined ? !!data.allow_future_regularization : current.allow_future_regularization,
    allow_missed_punch: data.allow_missed_punch !== undefined ? !!data.allow_missed_punch : current.allow_missed_punch,
    allow_attendance_correction: data.allow_attendance_correction !== undefined ? !!data.allow_attendance_correction : current.allow_attendance_correction,
    allow_late_coming_permission: data.allow_late_coming_permission !== undefined ? !!data.allow_late_coming_permission : current.allow_late_coming_permission,
    allow_early_exit_permission: data.allow_early_exit_permission !== undefined ? !!data.allow_early_exit_permission : current.allow_early_exit_permission,
    allow_temporary_exit_permission: data.allow_temporary_exit_permission !== undefined ? !!data.allow_temporary_exit_permission : current.allow_temporary_exit_permission,
    is_active: data.is_active !== undefined ? !!data.is_active : current.is_active
  };

  return await repo.updateSettings(organizationId, payload);
}

/**
 * Retrieves the date bounds for the current request period.
 */
function getPeriodBounds(period) {
  const today = new Date();
  let start, end;
  if (period === 'QUARTER') {
    const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
    start = new Date(today.getFullYear(), qStartMonth, 1);
    end = new Date(today.getFullYear(), qStartMonth + 3, 0);
  } else if (period === 'YEAR') {
    start = new Date(today.getFullYear(), 0, 1);
    end = new Date(today.getFullYear(), 11, 31);
  } else {
    // Default: MONTH
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

/**
 * Creates a regularization or permission request for the logged-in user.
 */
async function createRequest(userId, organizationId, data) {
  const employeeId = await repo.getEmployeeIdFromUser(userId);
  if (!employeeId) {
    throw new Error('Associated employee record not found for this user.');
  }

  const settings = await getSettings(organizationId);
  if (!settings.is_active) {
    throw new Error('Attendance adjustment and regularization feature is currently disabled.');
  }

  // 1. Validate Category & Type permissions
  if (data.request_category === 'REGULARIZATION') {
    if (data.request_type === 'MISSING_PUNCH_IN' || data.request_type === 'MISSING_PUNCH_OUT') {
      if (!settings.allow_missed_punch) throw new Error('Missed punch requests are disabled by policy.');
    } else if (data.request_type === 'ATTENDANCE_CORRECTION') {
      if (!settings.allow_attendance_correction) throw new Error('Attendance correction requests are disabled by policy.');
    } else {
      throw new Error(`Invalid regularization request type: ${data.request_type}`);
    }
  } else if (data.request_category === 'PERMISSION') {
    if (!settings.enable_partial_day_permissions) {
      throw new Error('Partial day permissions are disabled by policy.');
    }
    if (data.request_type === 'LATE_COMING_PERMISSION' && !settings.allow_late_coming_permission) {
      throw new Error('Late arrival permissions are disabled by policy.');
    }
    if (data.request_type === 'EARLY_EXIT_PERMISSION' && !settings.allow_early_exit_permission) {
      throw new Error('Early leave permissions are disabled by policy.');
    }
    if (data.request_type === 'TEMPORARY_EXIT_PERMISSION' && !settings.allow_temporary_exit_permission) {
      throw new Error('Temporary exit permissions are disabled by policy.');
    }
  } else {
    throw new Error('Request category must be either REGULARIZATION or PERMISSION.');
  }

  // 2. Validate Reason Requirement
  if (settings.reason_required && (!data.reason || !data.reason.trim())) {
    throw new Error('A detailed reason is mandatory for submitting regularization requests.');
  }

  // 3. Validate Future Date Restrictions
  const targetDate = new Date(data.attendance_date);
  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  if (!settings.allow_future_regularization && targetDateOnly > todayDateOnly) {
    throw new Error('Submitting regularization requests for future dates is not allowed.');
  }

  // 4. Validate Past Window Days Limits
  const diffDays = Math.ceil((todayDateOnly.getTime() - targetDateOnly.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > settings.regularization_window_days) {
    throw new Error(`Requests cannot be submitted for attendance records older than ${settings.regularization_window_days} days.`);
  }

  // 5. Validate Period Submission Limits
  const { startDate, endDate } = getPeriodBounds(settings.request_period);
  const periodCount = await repo.getRequestCountInPeriod(employeeId, startDate, endDate);
  if (periodCount >= settings.max_requests_allowed) {
    throw new Error(`You have reached the maximum allowed regularization requests (${settings.max_requests_allowed}) for the current ${settings.request_period.toLowerCase()}.`);
  }

  // 6. Validate Duplicate Pending Requests
  const hasPending = await repo.hasPendingRequestForDate(employeeId, data.attendance_date);
  if (hasPending) {
    throw new Error('There is already a pending regularization request for this date.');
  }

  return await repo.createRequest(organizationId, employeeId, data);
}

/**
 * Gets requests submitted by the logged-in user.
 */
async function getMyRequests(userId) {
  const employeeId = await repo.getEmployeeIdFromUser(userId);
  if (!employeeId) return [];
  return await repo.getEmployeeRequests(employeeId);
}

/**
 * Cancels a pending request.
 */
async function cancelRequest(userId, requestId) {
  const employeeId = await repo.getEmployeeIdFromUser(userId);
  const request = await repo.getRequestById(requestId);

  if (!request) {
    throw new Error('Request not found.');
  }
  if (request.employee_id !== employeeId) {
    throw new Error('Access denied. You do not own this regularization request.');
  }
  if (request.approval_status !== 'PENDING') {
    throw new Error('Only requests in PENDING status can be cancelled.');
  }

  return await repo.updateRequestStatus(requestId, 'CANCELLED', null, 'rejection_reason', 'Cancelled by employee');
}

/**
 * Gets pending requests under the logged-in manager.
 */
async function getPendingRequests(userId) {
  const employeeId = await repo.getEmployeeIdFromUser(userId);
  if (!employeeId) return [];
  return await repo.getPendingRequestsForManager(employeeId);
}

/**
 * Helper to recalculate shift result status and worked minutes.
 */
function calculatePunchMetadata(checkIn, checkOut, shift, dateString) {
  const cIn = new Date(checkIn);
  const cOut = checkOut ? new Date(checkOut) : null;
  let workDurationMinutes = null;
  if (cIn && cOut) {
    workDurationMinutes = Math.floor((cOut.getTime() - cIn.getTime()) / 60000);
  }

  if (!shift) {
    return { workDurationMinutes, attendanceResult: 'COMPLETED_SHIFT' };
  }

  // Form shift datetime objects
  const parseTime = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(dateString);
    d.setUTCHours(h, m, 0, 0);
    return d;
  };

  const shiftStart = parseTime(shift.start_time);
  let shiftEnd = parseTime(shift.end_time);
  if (shift.end_time < shift.start_time) {
    shiftEnd.setDate(shiftEnd.getDate() + 1);
  }

  const graceMinutes = shift.grace_minutes || 15;
  const earlyExitGrace = shift.early_exit_grace_minutes || 5;

  const allowedCheckIn = new Date(shiftStart.getTime() + graceMinutes * 60000);
  let attendanceResult = 'ON_TIME';

  if (cIn > allowedCheckIn) {
    attendanceResult = 'LATE_ARRIVAL';
  } else if (cOut) {
    const earlyExitLimit = new Date(shiftEnd.getTime() - earlyExitGrace * 60000);
    if (cOut < earlyExitLimit) {
      attendanceResult = 'EARLY_EXIT';
    } else {
      attendanceResult = 'COMPLETED_SHIFT';
    }
  }

  return { workDurationMinutes, attendanceResult };
}

/**
 * Approves a request and applies adjustments.
 */
async function approveRequest(userId, requestId, managerComments) {
  const managerEmployeeId = await repo.getEmployeeIdFromUser(userId);
  const request = await repo.getRequestById(requestId);

  if (!request) {
    throw new Error('Regularization request not found.');
  }
  if (request.manager_employee_id !== managerEmployeeId) {
    throw new Error('Access denied. You are not the authorized manager to approve this request.');
  }
  if (request.approval_status !== 'PENDING') {
    throw new Error('Only requests in PENDING status can be approved.');
  }

  return await applyApproval(request, managerEmployeeId, managerComments);
}

/**
 * Applies an approved request: adjusts the attendance punch (for REGULARIZATION
 * requests) and marks the request APPROVED. Shared by manager and admin approval.
 */
async function applyApproval(request, approverEmployeeId, comments) {
  const requestId = request.regularization_request_id;

  // 1. If Request Category is REGULARIZATION, apply checks and insert/update attendance punch
  if (request.request_category === 'REGULARIZATION') {
    const empUserId = await repo.getUserIdFromEmployee(request.employee_id);
    if (!empUserId) {
      throw new Error('Associated employee user credentials not found.');
    }

    const dateStr = new Date(request.attendance_date).toISOString().slice(0, 10);

    // Check if punch exists
    const punchRes = await query(
      `SELECT attendance_punch_id, check_in_time, check_out_time, shift_id
       FROM attendance_punches
       WHERE employee_id = $1::uuid AND attendance_date = $2::date`,
      [empUserId, dateStr]
    );
    const punch = punchRes.rows[0];

    // Fetch employee shift details
    const shiftRes = await query(
      `SELECT s.*
       FROM employees e
       LEFT JOIN attendance_shifts s ON e.shift_id = s.shift_id
       WHERE e.employee_id = $1`,
      [request.employee_id]
    );
    const shift = shiftRes.rows[0] || null;

    // Determine metadata values
    const checkInVal = request.requested_check_in || (punch ? punch.check_in_time : null);
    const checkOutVal = request.requested_check_out || (punch ? punch.check_out_time : null);
    const { workDurationMinutes, attendanceResult } = calculatePunchMetadata(checkInVal, checkOutVal, shift, dateStr);

    if (punch) {
      // Update existing punch setting regularized columns
      await query(
        `UPDATE attendance_punches
         SET regularized_check_in = $1::timestamptz,
             regularized_check_out = $2::timestamptz,
             is_regularized = TRUE,
             work_duration_minutes = $3::integer,
             attendance_result = $4::varchar,
             shift_id = COALESCE(shift_id, $5::uuid),
             updated_at = NOW()
         WHERE attendance_punch_id = $6::uuid`,
        [checkInVal, checkOutVal, workDurationMinutes, attendanceResult, shift?.shift_id || null, punch.attendance_punch_id]
      );
    } else {
      // Create new punch setting regularized columns
      await query(
        `INSERT INTO attendance_punches (
           employee_id, attendance_date,
           check_in_time, check_out_time, check_in_latitude, check_in_longitude,
           regularized_check_in, regularized_check_out, is_regularized,
           work_duration_minutes, attendance_result, shift_id
         )
         VALUES ($1::uuid, $2::date, $3::timestamptz, $4::timestamptz, 0, 0, $3::timestamptz, $4::timestamptz, TRUE, $5::integer, $6::varchar, $7::uuid)`,
        [
          empUserId,
          dateStr,
          checkInVal,
          checkOutVal,
          workDurationMinutes,
          attendanceResult,
          shift?.shift_id || null
        ]
      );
    }
  }

  // 2. Mark the request as Approved
  return await repo.updateRequestStatus(requestId, 'APPROVED', approverEmployeeId, 'manager_comments', comments);
}

// ── Client-admin actions (organization-wide) ─────────────────────────────────

function notFound() {
  const err = new Error('Regularization request not found.');
  err.statusCode = 404;
  return err;
}

async function getOrgPendingRequests(organizationId) {
  return await repo.getPendingRequestsForOrganization(organizationId);
}

async function adminApproveRequest(organizationId, userId, requestId, comments) {
  const request = await repo.getRequestById(requestId);
  if (!request || request.organization_id !== organizationId) throw notFound();
  if (request.approval_status !== 'PENDING') {
    throw new Error('Only requests in PENDING status can be approved.');
  }
  // Admins may not have an employee record; approved_by stays null in that case.
  const approverEmployeeId = await repo.getEmployeeIdFromUser(userId);
  return await applyApproval(request, approverEmployeeId || null, comments);
}

async function adminRejectRequest(organizationId, requestId, rejectionReason) {
  if (!rejectionReason || !rejectionReason.trim()) {
    throw new Error('A rejection comment is mandatory.');
  }
  const request = await repo.getRequestById(requestId);
  if (!request || request.organization_id !== organizationId) throw notFound();
  if (request.approval_status !== 'PENDING') {
    throw new Error('Only requests in PENDING status can be rejected.');
  }
  return await repo.updateRequestStatus(requestId, 'REJECTED', null, 'rejection_reason', rejectionReason);
}

/**
 * Rejects a regularization request.
 */
async function rejectRequest(userId, requestId, rejectionReason) {
  if (!rejectionReason || !rejectionReason.trim()) {
    throw new Error('A rejection comment is mandatory.');
  }

  const managerEmployeeId = await repo.getEmployeeIdFromUser(userId);
  const request = await repo.getRequestById(requestId);

  if (!request) {
    throw new Error('Regularization request not found.');
  }
  if (request.manager_employee_id !== managerEmployeeId) {
    throw new Error('Access denied. You are not the authorized manager to reject this request.');
  }
  if (request.approval_status !== 'PENDING') {
    throw new Error('Only requests in PENDING status can be rejected.');
  }

  return await repo.updateRequestStatus(requestId, 'REJECTED', null, 'rejection_reason', rejectionReason);
}

module.exports = {
  getSettings,
  updateSettings,
  createRequest,
  getMyRequests,
  cancelRequest,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  getOrgPendingRequests,
  adminApproveRequest,
  adminRejectRequest
};
