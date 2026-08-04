const repository = require('./regularization.repository');
const leaveRepository = require('../leave/leave.repository');
const { REGULARIZATION_STATUS, REGULARIZATION_TYPES } = require('./regularization.constants');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { withTransaction, query } = require('../../config/db');
const { getSettings: getNotifSettings } = require('../notification/notificationSettings.repository');
const { sendRegularizationSubmittedEmail, sendRegularizationDecisionEmail } = require('../notification/email.service');
const notifRepo = require('../inAppNotification/inAppNotification.repository');

async function getSystemSettings() {
  const raw = await repository.getSettings();
  return {
    regularization_monthly_limit: parseInt(raw.regularization_monthly_limit || '5'),
    regularization_cutoff_day: parseInt(raw.regularization_cutoff_day || '5'),
    allow_holiday_regularization: raw.allow_holiday_regularization === 'true'
  };
}

async function updateSystemSettings(data, actorUserId = null) {
  if (data.regularization_monthly_limit !== undefined) {
    await repository.updateSetting('regularization_monthly_limit', data.regularization_monthly_limit, actorUserId);
  }
  if (data.regularization_cutoff_day !== undefined) {
    await repository.updateSetting('regularization_cutoff_day', data.regularization_cutoff_day, actorUserId);
  }
  if (data.allow_holiday_regularization !== undefined) {
    await repository.updateSetting('allow_holiday_regularization', String(data.allow_holiday_regularization) === 'true', actorUserId);
  }

  return await getSystemSettings();
}

async function createRequest(employeeId, data) {
  // 1. Fetch employee and check if they exist and have a manager
  const employee = await repository.getEmployeeById(employeeId);
  if (!employee) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee profile not found.');
  }
  if (!employee.manager_employee_id) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'No manager assigned. Regularization requires manager review.');
  }

  const settings = await getSystemSettings();
  const attendanceDate = data.attendance_date;

  // 2. Validate request date is in the past
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  if (attendanceDate >= todayStr) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot submit regularization requests for today or future dates.');
  }

  // 3. Enforce same-month cutoff: regularization for a given month closes on the Nth day of that same month
  const today = new Date(todayStr + 'T00:00:00Z');
  const reqDate = new Date(attendanceDate + 'T00:00:00Z');
  const reqYear = reqDate.getUTCFullYear();
  const reqMonth = reqDate.getUTCMonth(); // 0-indexed
  const cutoffDate = new Date(Date.UTC(reqYear, reqMonth, settings.regularization_cutoff_day));
  if (today > cutoffDate) {
    const suffix = settings.regularization_cutoff_day === 1 ? 'st' : settings.regularization_cutoff_day === 2 ? 'nd' : settings.regularization_cutoff_day === 3 ? 'rd' : 'th';
    const monthName = reqDate.toLocaleString('en-IN', { month: 'long', timeZone: 'UTC' });
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Regularization for ${monthName} is closed. The deadline was ${monthName} ${settings.regularization_cutoff_day}${suffix}.`);
  }

  // 4. Check for active PENDING requests
  const pendingRequest = await repository.findPendingRequestByDate(employeeId, attendanceDate);
  if (pendingRequest) {
    throw new ApiError(STATUS_CODES.CONFLICT, 'There is already a pending regularization request for this date.');
  }

  // 5. Enforce leave overlap constraint (approved or pending leaves)
  const hasLeaveOrPending = await leaveRepository.getLeaveOrPendingForEmployeeOnDate(employeeId, attendanceDate);
  if (hasLeaveOrPending) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot request regularization on dates with approved or pending leave.');
  }

  // 6. Enforce holiday rules
  const holidayResult = await query(
    `SELECT holiday_name FROM holidays WHERE holiday_date = $1 AND is_active = true AND is_deleted = false LIMIT 1`,
    [attendanceDate]
  );
  const holiday = holidayResult.rows[0];
  if (holiday && !settings.allow_holiday_regularization) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Regularization is not allowed on holidays (${holiday.holiday_name}) unless holiday duty is enabled.`);
  }

  // 7. Enforce monthly limit check
  const dateParts = attendanceDate.split('-');
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]);
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const currentMonthRequests = await repository.countMonthlyRequests(employeeId, startDateStr, endDateStr);
  if (currentMonthRequests >= settings.regularization_monthly_limit) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Monthly regularization limit of ${settings.regularization_monthly_limit} reached.`);
  }

  // 8. Insert request
  const created = await repository.createRequest({
    ...data,
    employee_id: employeeId,
    manager_employee_id: employee.manager_employee_id
  });

  // Fire-and-forget: notify manager (in-app + email)
  getNotifSettings().then(ns => {
    if (!ns.regularization_submitted) return;
    const empName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'An employee';
    // in-app → manager
    notifRepo.createNotification(
      employee.manager_employee_id,
      'regularization_submitted',
      'Regularization Request Submitted',
      `${empName} submitted an attendance regularization request for ${data.attendance_date}.`,
      created.regularization_id,
      'regularization'
    ).catch(() => {});
    // email → manager
    repository.getUserForEmployee(employee.manager_employee_id).then(mgr => {
      if (!mgr?.email) return;
      sendRegularizationSubmittedEmail(mgr.email, {
        employeeName: empName,
        attendanceDate: data.attendance_date,
        type: data.regularization_type || '',
        reason: data.reason || '',
      }).catch(e => console.error('[Notif] reg submitted email failed:', e.message));
    });
  }).catch(() => {});

  return created;
}

async function getRequestById(id, currentEmployeeId, role) {
  const request = await repository.findById(id);
  if (!request) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Regularization request not found.');
  }

  // Enforce access control
  if (role !== 'client_admin' && role !== 'super_admin') {
    if (request.employee_id !== currentEmployeeId && request.manager_employee_id !== currentEmployeeId) {
      throw new ApiError(STATUS_CODES.FORBIDDEN, 'Access denied. You do not have permissions to view this request.');
    }
  }

  return request;
}

async function approveRequest(id, managerEmployeeId) {
  const result = await withTransaction(async (client) => {
    const request = await repository.findById(id, client);
    if (!request) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Regularization request not found.');
    }

    if (request.current_status !== REGULARIZATION_STATUS.PENDING) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only pending requests can be approved.');
    }

    if (request.manager_employee_id !== managerEmployeeId) {
      throw new ApiError(STATUS_CODES.FORBIDDEN, 'Access denied. Only the assigned manager can approve this request.');
    }

    const userRow = await repository.getUserForEmployee(request.employee_id, client);
    if (!userRow) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'No user account associated with the applicant employee.');
    }

    await repository.applyAttendanceCorrection(
      userRow.user_id,
      request.attendance_date,
      {
        check_in_time: request.requested_checkin_time,
        check_out_time: request.requested_checkout_time,
        regularization_id: request.regularization_id
      },
      client
    );

    const updated = await repository.updateRequestStatus(id, REGULARIZATION_STATUS.APPROVED, managerEmployeeId, null, client);

    await repository.createAuditLog(
      id,
      REGULARIZATION_STATUS.PENDING,
      REGULARIZATION_STATUS.APPROVED,
      managerEmployeeId,
      'Approved by manager',
      client
    );

    return updated;
  });

  // Fire-and-forget: notify employee (in-app + email)
  getNotifSettings().then(async ns => {
    if (!ns.regularization_decision) return;
    const req = await repository.findById(id);
    if (!req) return;
    // in-app → employee
    notifRepo.createNotification(
      req.employee_id,
      'regularization_approved',
      'Regularization Request Approved',
      `Your attendance regularization request for ${req.attendance_date} has been approved.`,
      req.regularization_id,
      'regularization'
    ).catch(() => {});
    // email → employee
    const emp = await repository.getUserForEmployee(req.employee_id);
    if (!emp?.email) return;
    sendRegularizationDecisionEmail(emp.email, {
      employeeName: req.employee_name || 'Employee',
      attendanceDate: req.attendance_date,
      status: 'APPROVED',
      reason: '',
    }).catch(e => console.error('[Notif] reg approved email failed:', e.message));
  }).catch(() => {});

  return result;
}

async function rejectRequest(id, managerEmployeeId, rejectionReason) {
  const result = await withTransaction(async (client) => {
    const request = await repository.findById(id, client);
    if (!request) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Regularization request not found.');
    }

    if (request.current_status !== REGULARIZATION_STATUS.PENDING) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only pending requests can be rejected.');
    }

    if (request.manager_employee_id !== managerEmployeeId) {
      throw new ApiError(STATUS_CODES.FORBIDDEN, 'Access denied. Only the assigned manager can reject this request.');
    }

    const updated = await repository.updateRequestStatus(id, REGULARIZATION_STATUS.REJECTED, managerEmployeeId, rejectionReason, client);

    await repository.createAuditLog(
      id,
      REGULARIZATION_STATUS.PENDING,
      REGULARIZATION_STATUS.REJECTED,
      managerEmployeeId,
      rejectionReason,
      client
    );

    return updated;
  });

  // Fire-and-forget: notify employee (in-app + email)
  getNotifSettings().then(async ns => {
    if (!ns.regularization_decision) return;
    const req = await repository.findById(id);
    if (!req) return;
    // in-app → employee
    notifRepo.createNotification(
      req.employee_id,
      'regularization_rejected',
      'Regularization Request Rejected',
      `Your attendance regularization request for ${req.attendance_date} has been rejected.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`,
      req.regularization_id,
      'regularization'
    ).catch(() => {});
    // email → employee
    const emp = await repository.getUserForEmployee(req.employee_id);
    if (!emp?.email) return;
    sendRegularizationDecisionEmail(emp.email, {
      employeeName: req.employee_name || 'Employee',
      attendanceDate: req.attendance_date,
      status: 'REJECTED',
      reason: rejectionReason || '',
    }).catch(e => console.error('[Notif] reg rejected email failed:', e.message));
  }).catch(() => {});

  return result;
}

async function listEmployeeRequests(employeeId) {
  return await repository.getEmployeeRequests(employeeId);
}

async function listManagerRequests(managerEmployeeId) {
  return await repository.getManagerRequests(managerEmployeeId);
}

async function adminApproveRequest(id) {
  return await withTransaction(async (client) => {
    const request = await repository.findById(id, client);
    if (!request) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Regularization request not found.');
    }
    if (request.current_status !== REGULARIZATION_STATUS.PENDING) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only pending requests can be approved.');
    }

    const userRow = await repository.getUserForEmployee(request.employee_id, client);
    if (!userRow) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'No user account associated with the applicant employee.');
    }

    await repository.applyAttendanceCorrection(
      userRow.user_id,
      request.attendance_date,
      {
        check_in_time: request.requested_checkin_time,
        check_out_time: request.requested_checkout_time,
        regularization_id: request.regularization_id,
      },
      client
    );

    const updated = await repository.updateRequestStatus(id, REGULARIZATION_STATUS.APPROVED, null, null, client);

    await repository.createAuditLog(
      id,
      REGULARIZATION_STATUS.PENDING,
      REGULARIZATION_STATUS.APPROVED,
      null,
      'Approved by admin',
      client
    );

    return updated;
  });
}

async function adminRejectRequest(id, rejectionReason) {
  return await withTransaction(async (client) => {
    const request = await repository.findById(id, client);
    if (!request) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Regularization request not found.');
    }
    if (request.current_status !== REGULARIZATION_STATUS.PENDING) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only pending requests can be rejected.');
    }

    const updated = await repository.updateRequestStatus(id, REGULARIZATION_STATUS.REJECTED, null, rejectionReason, client);

    await repository.createAuditLog(
      id,
      REGULARIZATION_STATUS.PENDING,
      REGULARIZATION_STATUS.REJECTED,
      null,
      rejectionReason || 'Rejected by admin',
      client
    );

    return updated;
  });
}

async function listAllRequests(filters = {}) {
  return await repository.getAllRequests(filters);
}

module.exports = {
  getSystemSettings,
  updateSystemSettings,
  createRequest,
  getRequestById,
  approveRequest,
  rejectRequest,
  adminApproveRequest,
  adminRejectRequest,
  listEmployeeRequests,
  listManagerRequests,
  listAllRequests
};
