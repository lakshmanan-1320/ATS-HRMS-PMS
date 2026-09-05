const permissionRepository = require('./permission.repository');
const { withTransaction } = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const employeeRepository = require('../employee/employee.repository');
const notifRepo = require('../inAppNotification/inAppNotification.repository');

// ── Settings helpers ─────────────────────────────────────────────

async function getSettings() {
  return permissionRepository.getPermissionSettings();
}

async function saveSettings(data) {
  const monthly_count = parseInt(data.monthly_count, 10);
  const hours_per_permission = parseFloat(data.hours_per_permission);

  if (!monthly_count || monthly_count < 1 || monthly_count > 30) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Monthly count must be between 1 and 30.');
  }
  if (isNaN(hours_per_permission) || hours_per_permission <= 0 || hours_per_permission > 12) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Hours per permission must be between 0.5 and 12.');
  }

  return permissionRepository.savePermissionSettings({
    monthly_count,
    hours_per_permission,
    pro_rata_on_join: data.pro_rata_on_join !== false,
  });
}

// ── Pro-rata calculation ─────────────────────────────────────────
// Calculates allocated_count for the joining month based on remaining days.
// Math.ceil so employees never get 0 when they join during the month.

function calculateProRataCount(monthlyCount, joiningDateStr) {
  if (!joiningDateStr) return monthlyCount;

  const joining = new Date(joiningDateStr + 'T00:00:00Z');
  const joinDay = joining.getUTCDate();
  const joinMonth = joining.getUTCMonth();
  const joinYear = joining.getUTCFullYear();

  // Total days in the joining month
  const totalDays = new Date(Date.UTC(joinYear, joinMonth + 1, 0)).getUTCDate();
  // Remaining days including join day
  const remainingDays = totalDays - joinDay + 1;

  const proRata = monthlyCount * (remainingDays / totalDays);
  return Math.max(1, Math.ceil(proRata));
}

// ── Balance helpers ──────────────────────────────────────────────

async function getMyBalance(employeeId) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const settings = await getSettings();

  let balance = await permissionRepository.getBalance(employeeId, month, year);
  if (!balance) {
    balance = await permissionRepository.upsertBalance(employeeId, month, year, settings.monthly_count);
  }
  return balance;
}

async function getMyBalances(employeeId) {
  return permissionRepository.getMyBalances(employeeId);
}

// ── Apply / Cancel ───────────────────────────────────────────────

async function applyPermission(employeeId, organizationId, data) {
  const { permission_date, start_time, end_time, reason } = data;

  if (!permission_date) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Permission date is required.');
  if (!start_time)      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Start time is required.');
  if (!end_time)        throw new ApiError(STATUS_CODES.BAD_REQUEST, 'End time is required.');
  if (start_time >= end_time) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'End time must be after start time.');

  const emp = await employeeRepository.getDetailedEmployeeById(organizationId, employeeId);
  if (!emp) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Employee profile not found.');
  if (!emp.manager_id) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'You do not have an assigned manager. Please contact HR.');

  const settings = await getSettings();
  const date = new Date(permission_date);
  const month = date.getMonth() + 1;
  const year  = date.getFullYear();

  const created = await withTransaction(async (client) => {
    let balance = await permissionRepository.lockBalance(employeeId, month, year, client);
    if (!balance) {
      await permissionRepository.upsertBalance(employeeId, month, year, settings.monthly_count, client);
      balance = await permissionRepository.lockBalance(employeeId, month, year, client);
    }

    const remaining = balance.allocated_count - balance.used_count;
    if (remaining <= 0) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        `No permission balance remaining for ${month}/${year}. Monthly quota of ${settings.monthly_count} has been fully used.`
      );
    }

    return permissionRepository.createRequest({
      employee_id: employeeId,
      manager_employee_id: emp.manager_id,
      permission_date,
      start_time,
      end_time,
      duration_hours: settings.hours_per_permission,
      reason,
      month,
      year,
    }, client);
  });

  // Fire-and-forget: notify manager
  if (emp.manager_id) {
    const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'An employee';
    notifRepo.createNotification(
      emp.manager_id,
      'permission_submitted',
      'Permission Request Submitted',
      `${empName} submitted a permission request for ${permission_date} (${start_time} - ${end_time}).`,
      created.permission_request_id,
      'permission'
    ).catch(() => {});
  }

  return created;
}

async function cancelRequest(requestId, employeeId) {
  const request = await permissionRepository.getRequestById(requestId);
  if (!request) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Permission request not found.');
  if (request.employee_id !== employeeId) throw new ApiError(STATUS_CODES.FORBIDDEN, 'Not your request.');
  if (request.status !== 'PENDING') throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only pending requests can be cancelled.');

  return permissionRepository.updateRequest(requestId, {
    status: 'CANCELLED',
    approved_by_employee_id: null,
    approved_at: null,
    rejection_reason: null,
  });
}

// ── Approve / Reject ─────────────────────────────────────────────

async function approveRequest(requestId, approverEmployeeId) {
  const request = await permissionRepository.getRequestById(requestId);
  if (!request) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Permission request not found.');
  if (request.status !== 'PENDING') throw new ApiError(STATUS_CODES.BAD_REQUEST, `Request is already ${request.status}.`);

  const result = await withTransaction(async (client) => {
    const balance = await permissionRepository.lockBalance(request.employee_id, request.month, request.year, client);
    if (!balance) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'No permission balance found for this employee/month.');

    if (balance.allocated_count - balance.used_count <= 0) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Employee has no remaining permission balance for this month.');
    }

    await permissionRepository.incrementUsed(balance.balance_id, client);

    return permissionRepository.updateRequest(requestId, {
      status: 'APPROVED',
      approved_by_employee_id: approverEmployeeId,
      approved_at: new Date(),
      rejection_reason: null,
    }, client);
  });

  // Fire-and-forget: notify applicant employee
  notifRepo.createNotification(
    request.employee_id,
    'permission_approved',
    'Permission Request Approved',
    `Your permission request for ${request.permission_date} (${request.start_time?.slice(0, 5)} - ${request.end_time?.slice(0, 5)}) was approved.`,
    requestId,
    'permission'
  ).catch(() => {});

  return result;
}

async function rejectRequest(requestId, approverEmployeeId, rejectionReason) {
  const request = await permissionRepository.getRequestById(requestId);
  if (!request) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Permission request not found.');
  if (request.status !== 'PENDING') throw new ApiError(STATUS_CODES.BAD_REQUEST, `Request is already ${request.status}.`);

  const result = await permissionRepository.updateRequest(requestId, {
    status: 'REJECTED',
    approved_by_employee_id: approverEmployeeId,
    approved_at: new Date(),
    rejection_reason: rejectionReason || null,
  });

  // Fire-and-forget: notify applicant employee
  const reasonMsg = rejectionReason ? ` Reason: ${rejectionReason}` : '';
  notifRepo.createNotification(
    request.employee_id,
    'permission_rejected',
    'Permission Request Rejected',
    `Your permission request for ${request.permission_date} (${request.start_time?.slice(0, 5)} - ${request.end_time?.slice(0, 5)}) was rejected.${reasonMsg}`,
    requestId,
    'permission'
  ).catch(() => {});

  return result;
}

// ── New employee provisioning ────────────────────────────────────
// Called inside the employee creation transaction when a new employee is added.

async function provisionPermissionsForNewEmployee(employeeId, dateOfJoining, txClient) {
  const settings = await getSettings();
  const joiningStr = dateOfJoining
    ? new Date(dateOfJoining).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const joining = new Date(joiningStr + 'T00:00:00Z');
  const month = joining.getUTCMonth() + 1;
  const year  = joining.getUTCFullYear();

  let allocatedCount = settings.monthly_count;
  if (settings.pro_rata_on_join) {
    allocatedCount = calculateProRataCount(settings.monthly_count, joiningStr);
  }

  await permissionRepository.upsertBalance(employeeId, month, year, allocatedCount, txClient);
}

// ── Monthly credit job ───────────────────────────────────────────

async function creditMonthlyPermissions() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const settings = await getSettings();

  const employeeIds = await permissionRepository.getActiveEmployeeIds();
  let credited = 0;
  let failed   = 0;

  for (const employeeId of employeeIds) {
    try {
      await permissionRepository.upsertBalance(employeeId, month, year, settings.monthly_count);
      credited++;
    } catch {
      failed++;
    }
  }

  return { credited, failed, total: employeeIds.length, month, year };
}

// ── Admin queries ────────────────────────────────────────────────

async function getAdminRequests(filters) {
  return permissionRepository.getAdminRequests(filters);
}

async function getAllBalancesForMonth(month, year) {
  return permissionRepository.getAllBalancesForMonth(month, year);
}

module.exports = {
  getSettings,
  saveSettings,
  getMyBalance,
  getMyBalances,
  applyPermission,
  cancelRequest,
  approveRequest,
  rejectRequest,
  provisionPermissionsForNewEmployee,
  creditMonthlyPermissions,
  getAdminRequests,
  getAllBalancesForMonth,
};
