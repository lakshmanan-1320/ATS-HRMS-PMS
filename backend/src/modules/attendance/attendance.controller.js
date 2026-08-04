const attendanceService = require('./attendance.service');
const officeLocationService = require('./officeLocation.service');
const shiftService = require('./shift.service');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { logAudit } = require('../../utils/auditLog');

async function handleCheckIn(req, res, next) {
  try {
    const result = await attendanceService.checkIn(req.user, req.validatedBody, req.idempotencyKey, req.ip);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleCheckOut(req, res, next) {
  try {
    const result = await attendanceService.checkOut(req.user, req.validatedBody, req.idempotencyKey, req.ip);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetTodayStatus(req, res, next) {
  try {
    const result = await attendanceService.getTodayStatus(req.user);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetMyHistory(req, res, next) {
  try {
    const result = await attendanceService.getMyHistory(req.user, req.query);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetMyPolicy(req, res, next) {
  try {
    const result = await attendanceService.getEmployeePolicy(req.user.userId);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function handleGetTeamMembers(req, res, next) {
  try {
    const result = await attendanceService.getTeamMembers(req.user);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetTeamHistory(req, res, next) {
  try {
    const result = await attendanceService.getTeamHistory(req.user, req.query);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetAdminOverview(req, res, next) {
  try {
    const result = await attendanceService.getAdminOverview(req.user, req.query);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetAdminDashboardSummary(req, res, next) {
  try {
    const result = await attendanceService.getAdminDashboardSummary(req.user.organizationId, req.query.date);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetAdminTrends(req, res, next) {
  try {
    const result = await attendanceService.getAdminTrends(req.user.organizationId, req.query.range);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetAdminDepartmentsSummary(req, res, next) {
  try {
    const result = await attendanceService.getAdminDepartmentsSummary(req.user.organizationId, req.query.date);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleGetEmployeeHistory(req, res, next) {
  const { id } = req.params;
  const { start_date, end_date } = req.query;
  try {
    const result = await attendanceService.getEmployeeHistory(req.user.organizationId, id, start_date, end_date);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleListPolicies(req, res, next) {
  try {
    const result = await attendanceService.listPolicies(req.user.organizationId);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function handleGetPolicyById(req, res, next) {
  const { id } = req.params;
  try {
    const result = await attendanceService.getPolicyById(req.user.organizationId, id);
    if (!result) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Policy not found.' });
    }
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function handleGetPolicyMembers(req, res, next) {
  const { id } = req.params;
  try {
    const result = await attendanceService.getPolicyAssignedMembers(req.user.organizationId, id);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function handleGetPolicyDepartments(req, res, next) {
  const { id } = req.params;
  try {
    const result = await attendanceService.getPolicyAssignedDepartments(req.user.organizationId, id);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function handleCreatePolicy(req, res, next) {
  try {
    const result = await attendanceService.createPolicy(req.user.organizationId, req.validatedBody);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_policy_created',
      target: result.attendance_policy_id,
      metadata: { name: result.name, policy_type: result.policy_type },
      ip: req.ip,
    });
    res.status(STATUS_CODES.CREATED).json({ success: true, message: 'Attendance policy created.', data: result });
  } catch (err) {
    next(err);
  }
}

async function handleUpdatePolicy(req, res, next) {
  const { id } = req.params;
  try {
    const result = await attendanceService.updatePolicy(req.user.organizationId, id, req.validatedBody);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_policy_updated',
      target: id,
      metadata: { name: result.name, policy_type: result.policy_type },
      ip: req.ip,
    });
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Attendance policy updated.', data: result });
  } catch (err) {
    next(err);
  }
}

async function handleDeletePolicy(req, res, next) {
  const { id } = req.params;
  try {
    const result = await attendanceService.deletePolicy(req.user.organizationId, id);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_policy_deleted',
      target: id,
      ip: req.ip,
    });
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleAssignPolicy(req, res, next) {
  const { id } = req.params;
  try {
    const result = await attendanceService.assignPolicy(req.user.organizationId, id, req.validatedBody);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_policy_assigned',
      target: id,
      metadata: { 
        department_id: req.validatedBody.department_id, 
        employee_count: req.validatedBody.employee_ids?.length || 0,
        effective_from: req.validatedBody.effective_from 
      },
      ip: req.ip,
    });
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) {
    next(err);
  }
}

async function handleListOfficeLocations(req, res, next) {
  try {
    const result = await officeLocationService.listOfficeLocations(req.user.organizationId);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function handleGetOfficeLocationById(req, res, next) {
  const { id } = req.params;
  try {
    const result = await officeLocationService.getOfficeLocationDetails(req.user.organizationId, id);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function handleCreateOfficeLocation(req, res, next) {
  try {
    const result = await officeLocationService.createOfficeLocation(req.user.organizationId, req.body);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'office_location_created',
      target: result.office_location_id,
      metadata: { location_name: result.location_name },
      ip: req.ip,
    });
    res.status(STATUS_CODES.CREATED).json({ success: true, message: 'Office location created.', data: result });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateOfficeLocation(req, res, next) {
  const { id } = req.params;
  try {
    const result = await officeLocationService.updateOfficeLocation(req.user.organizationId, id, req.body);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'office_location_updated',
      target: id,
      metadata: { location_name: result.location_name },
      ip: req.ip,
    });
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Office location updated.', data: result });
  } catch (err) {
    next(err);
  }
}

async function handleDeleteOfficeLocation(req, res, next) {
  const { id } = req.params;
  try {
    const result = await officeLocationService.deleteOfficeLocation(req.user.organizationId, id);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'office_location_deleted',
      target: id,
      ip: req.ip,
    });
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Office location deleted.', data: result });
  } catch (err) {
    next(err);
  }
}

async function handleToggleOfficeLocationStatus(req, res, next) {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    const result = await officeLocationService.toggleStatus(req.user.organizationId, id, !!is_active);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'office_location_status_toggled',
      target: id,
      metadata: { is_active: !!is_active },
      ip: req.ip,
    });
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Office location status updated.', data: result });
  } catch (err) {
    next(err);
  }
}

async function handleListShifts(req, res, next) {
  try {
    const result = await shiftService.listShifts(req.user.organizationId);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function handleGetShiftById(req, res, next) {
  const { id } = req.params;
  try {
    const result = await shiftService.getShiftDetails(req.user.organizationId, id);
    res.status(STATUS_CODES.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function handleCreateShift(req, res, next) {
  try {
    const result = await shiftService.createShift(req.user.organizationId, req.body);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_shift_created',
      target: result.shift_id,
      metadata: { shift_name: result.shift_name, shift_code: result.shift_code },
      ip: req.ip,
    });
    res.status(STATUS_CODES.CREATED).json({ success: true, message: 'Shift created successfully.', data: result });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateShift(req, res, next) {
  const { id } = req.params;
  try {
    const result = await shiftService.updateShift(req.user.organizationId, id, req.body);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_shift_updated',
      target: id,
      metadata: { shift_name: result.shift_name, shift_code: result.shift_code },
      ip: req.ip,
    });
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Shift updated successfully.', data: result });
  } catch (err) {
    next(err);
  }
}

async function handleDeleteShift(req, res, next) {
  const { id } = req.params;
  try {
    const result = await shiftService.deleteShift(req.user.organizationId, id);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_shift_deleted',
      target: id,
      ip: req.ip,
    });
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Shift deleted successfully.', data: result });
  } catch (err) {
    next(err);
  }
}

async function handleToggleShiftStatus(req, res, next) {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    const result = await shiftService.toggleStatus(req.user.organizationId, id, !!is_active);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_shift_status_toggled',
      target: id,
      metadata: { is_active: !!is_active },
      ip: req.ip,
    });
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Shift status updated.', data: result });
  } catch (err) {
    next(err);
  }
}

async function handleAssignShift(req, res, next) {
  const { id } = req.params;
  try {
    const result = await shiftService.assignShift(req.user.organizationId, id, req.body);
    logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'attendance_shift_assigned',
      target: id,
      metadata: { count: result.count },
      ip: req.ip,
    });
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Shift assigned successfully.', data: result });
  } catch (err) {
    next(err);
  }
}

async function handleGetEmployeeShiftHistory(req, res, next) {
  const { id } = req.params;
  try {
    const data = await shiftService.getEmployeeShiftHistory(req.user.organizationId, id);
    res.status(STATUS_CODES.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleCheckIn,
  handleCheckOut,
  handleGetTodayStatus,
  handleGetMyHistory,
  handleGetMyPolicy,
  handleGetTeamMembers,
  handleGetTeamHistory,
  handleGetAdminOverview,
  handleListPolicies,
  handleGetPolicyById,
  handleGetPolicyMembers,
  handleGetPolicyDepartments,
  handleCreatePolicy,
  handleUpdatePolicy,
  handleDeletePolicy,
  handleAssignPolicy,
  handleListOfficeLocations,
  handleGetOfficeLocationById,
  handleCreateOfficeLocation,
  handleUpdateOfficeLocation,
  handleDeleteOfficeLocation,
  handleToggleOfficeLocationStatus,
  handleListShifts,
  handleGetShiftById,
  handleCreateShift,
  handleUpdateShift,
  handleDeleteShift,
  handleToggleShiftStatus,
  handleAssignShift,
  handleGetEmployeeShiftHistory,
  handleGetAdminDashboardSummary,
  handleGetAdminTrends,
  handleGetAdminDepartmentsSummary,
  handleGetEmployeeHistory,
};
