const leaveService = require('./leave.service');
const leavePlansRepo = require('./leavePlans.repository');
const { STATUS_CODES } = require('../../constants/statusCodes');
const ApiError = require('../../utils/apiError');

// -------------------------------------------------------------
// Leave Policy Settings (CLIENT_ADMIN)
// -------------------------------------------------------------

async function handleGetLeaveSettings(req, res, next) {
  try {
    const settings = await leaveService.getLeavePolicySettings();
    res.status(STATUS_CODES.OK).json(settings);
  } catch (err) { next(err); }
}

async function handleSaveLeaveSettings(req, res, next) {
  try {
    const settings = await leaveService.saveLeavePolicySettings(req.body);
    res.status(STATUS_CODES.OK).json(settings);
  } catch (err) { next(err); }
}

// -------------------------------------------------------------
// Leave Types (CLIENT_ADMIN)
// -------------------------------------------------------------

async function handleCreateLeaveType(req, res, next) {
  try {
    const data = req.body;
    data.created_by_admin_user_id = req.user.userId;
    const leaveType = await leaveService.addLeaveType(data);
    res.status(STATUS_CODES.CREATED).json(leaveType);
  } catch (err) { next(err); }
}

async function handleUpdateLeaveType(req, res, next) {
  try {
    const { leave_type_id } = req.params;
    const leaveType = await leaveService.editLeaveType(leave_type_id, req.body);
    res.status(STATUS_CODES.OK).json(leaveType);
  } catch (err) { next(err); }
}

async function handleGetLeaveTypes(req, res, next) {
  try {
    const onlyActive = req.query.active === 'true';
    const leaveTypes = await leaveService.listLeaveTypes(onlyActive);
    res.status(STATUS_CODES.OK).json(leaveTypes);
  } catch (err) { next(err); }
}

// -------------------------------------------------------------
// Leave Balances & Requests (EMPLOYEE)
// -------------------------------------------------------------

async function handleGetMyBalances(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only employees have leave balances.');
    }
    const dateParam = req.query.date ? new Date(req.query.date) : new Date();
    const balances = await leaveService.getEmployeeBalances(req.user.employeeId, dateParam);
    res.status(STATUS_CODES.OK).json(balances);
  } catch (err) { next(err); }
}

async function handleCalculateLeavePreview(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only employees can use leave preview.');
    }
    const result = await leaveService.calculateLeavePreview(req.user.employeeId, req.body);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) { next(err); }
}

async function handleApplyLeave(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only employees can apply for leaves.');
    }
    const request = await leaveService.applyLeave(req.user.employeeId, req.user.organizationId, req.body);
    res.status(STATUS_CODES.CREATED).json(request);
  } catch (err) { next(err); }
}

async function handleGetMyLeaves(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only employees have leave history.');
    }
    const leaves = await leaveService.getMyLeaves(req.user.employeeId);
    res.status(STATUS_CODES.OK).json(leaves);
  } catch (err) { next(err); }
}

async function handleGetLeaveDetails(req, res, next) {
  try {
    const { leave_request_id } = req.params;
    const details = await leaveService.getLeaveRequestDetails(leave_request_id);
    
    // Authorization: User must be either the owner, the manager, or an HR/Client Admin
    const isOwner = details.employee_id === req.user.employeeId;
    const isManager = details.manager_employee_id === req.user.employeeId;
    const isHrOrAdmin = req.user.role === 'client_admin' || req.user.role === 'hr';

    if (!isOwner && !isManager && !isHrOrAdmin) {
      throw new ApiError(STATUS_CODES.FORBIDDEN, 'Access denied to this leave request details.');
    }

    res.status(STATUS_CODES.OK).json(details);
  } catch (err) { next(err); }
}

async function handleCancelLeave(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only employees can cancel leave requests.');
    }
    const { leave_request_id } = req.params;
    const { remarks } = req.body;
    const cancelled = await leaveService.cancelLeave(req.user.employeeId, leave_request_id, remarks);
    res.status(STATUS_CODES.OK).json(cancelled);
  } catch (err) { next(err); }
}

// -------------------------------------------------------------
// Approvals & Manager Actions (MANAGER)
// -------------------------------------------------------------

async function handleGetManagerLeaves(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only managers have leave approval lists.');
    }
    const leaves = await leaveService.getManagerLeaves(req.user.employeeId);
    res.status(STATUS_CODES.OK).json(leaves);
  } catch (err) { next(err); }
}

async function handleApproveLeave(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only manager employees can approve leaves.');
    }
    const { leave_request_id } = req.params;
    const { remarks } = req.body;
    const approved = await leaveService.approveLeave(req.user.employeeId, leave_request_id, remarks);
    res.status(STATUS_CODES.OK).json(approved);
  } catch (err) { next(err); }
}

async function handleRejectLeave(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only manager employees can reject leaves.');
    }
    const { leave_request_id } = req.params;
    const { remarks } = req.body;
    const rejected = await leaveService.rejectLeave(req.user.employeeId, leave_request_id, remarks);
    res.status(STATUS_CODES.OK).json(rejected);
  } catch (err) { next(err); }
}

async function handleCancelApprovedLeaveOverride(req, res, next) {
  try {
    const { leave_request_id } = req.params;
    const { remarks } = req.body;
    
    const cancelled = await leaveService.cancelApprovedLeaveOverride(
      req.user.employeeId,
      req.user.role,
      leave_request_id,
      remarks
    );
    res.status(STATUS_CODES.OK).json(cancelled);
  } catch (err) { next(err); }
}

// -------------------------------------------------------------
// Optional Holiday Eligibility (EMPLOYEE)
// -------------------------------------------------------------

async function handleGetOptionalHolidayEligibility(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only employees have optional holiday eligibility.');
    }
    const data = await leaveService.getOptionalHolidayEligibility(req.user.employeeId);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) { next(err); }
}

async function handleToggleOptionalHolidayAvail(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only employees can avail optional holidays.');
    }
    const { holiday_id } = req.params;
    if (!holiday_id) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'holiday_id is required.');
    const data = await leaveService.toggleOptionalHolidayAvail(req.user.employeeId, holiday_id);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) { next(err); }
}

async function handleGetTeamOptionalHolidays(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only managers have a team optional holiday view.');
    }
    const data = await leaveService.getTeamOptionalHolidays(req.user.employeeId);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) { next(err); }
}

// -------------------------------------------------------------
// Admin Access (CLIENT_ADMIN)
// -------------------------------------------------------------

async function handleGetAdminLeaves(req, res, next) {
  try {
    const leaves = await leaveService.getAdminLeaves(req.query);
    res.status(STATUS_CODES.OK).json(leaves);
  } catch (err) { next(err); }
}

async function handleGetAdminEmployeeBalances(req, res, next) {
  try {
    const { employee_id } = req.params;
    const balances = await leaveService.getAdminEmployeeBalances(employee_id);
    res.status(STATUS_CODES.OK).json(balances);
  } catch (err) { next(err); }
}

async function handleAdminApproveLeave(req, res, next) {
  try {
    const { leave_request_id } = req.params;
    const { remarks } = req.body;
    const result = await leaveService.adminApproveLeave(leave_request_id, remarks);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) { next(err); }
}

async function handleAdminRejectLeave(req, res, next) {
  try {
    const { leave_request_id } = req.params;
    const { remarks } = req.body;
    const result = await leaveService.adminRejectLeave(leave_request_id, remarks);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) { next(err); }
}

// -------------------------------------------------------------
// Leave Plans (CLIENT_ADMIN / HR)
// -------------------------------------------------------------

async function handleGetPlans(req, res, next) {
  try {
    const plans = await leavePlansRepo.getPlans(req.user.organizationId);
    res.status(STATUS_CODES.OK).json(plans);
  } catch (err) { next(err); }
}

async function handleCreatePlan(req, res, next) {
  try {
    const plan = await leavePlansRepo.createPlan(req.user.organizationId, req.body);
    res.status(STATUS_CODES.CREATED).json(plan);
  } catch (err) { next(err); }
}

async function handleUpdatePlan(req, res, next) {
  try {
    const { id } = req.params;
    const plan = await leavePlansRepo.updatePlan(id, req.body);
    if (!plan) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Leave plan not found.');
    res.status(STATUS_CODES.OK).json(plan);
  } catch (err) { next(err); }
}

async function handleDeletePlan(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await leavePlansRepo.deletePlan(id);
    if (!deleted) {
      throw new ApiError(STATUS_CODES.NOT_FOUND, 'Leave plan not found.');
    }
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Leave plan deleted successfully.', data: deleted });
  } catch (err) {
    if (err.code === '23503') {
      next(new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot delete this plan because employees are assigned to it. Please reassign the employees first.'));
    } else {
      next(err);
    }
  }
}

async function handleGetPlanTypes(req, res, next) {
  try {
    const { planId } = req.params;
    const planTypes = await leavePlansRepo.getPlanTypes(planId);
    res.status(STATUS_CODES.OK).json(planTypes);
  } catch (err) { next(err); }
}

async function handleUpsertPlanType(req, res, next) {
  try {
    const { planId } = req.params;
    const planType = await leavePlansRepo.upsertPlanType(planId, req.body);
    
    // Propagate quota change to employees under this plan
    await leaveService.propagatePlanTypeQuotaUpdate(planId, req.body.leave_type_id, req.body.quota_days);

    res.status(STATUS_CODES.OK).json(planType);
  } catch (err) { next(err); }
}

async function handleDeletePlanType(req, res, next) {
  try {
    const { planId, leaveTypeId } = req.params;
    const deleted = await leavePlansRepo.deletePlanType(planId, leaveTypeId);
    if (!deleted) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Leave plan type configuration not found.');
    res.status(STATUS_CODES.OK).json({ success: true, message: 'Leave plan type config deleted successfully.', data: deleted });
  } catch (err) { next(err); }
}

async function handleGetPlanEmployees(req, res, next) {
  try {
    const { planId } = req.params;
    const employees = await leavePlansRepo.getPlanEmployees(planId);
    res.status(STATUS_CODES.OK).json(employees);
  } catch (err) { next(err); }
}

async function handleAssignEmployeesToPlan(req, res, next) {
  try {
    const { planId } = req.params;
    const { employeeIds } = req.body;
    if (!Array.isArray(employeeIds)) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'employeeIds must be an array.');
    }
    const result = await leavePlansRepo.assignEmployeesToPlan(planId, employeeIds);
    res.status(STATUS_CODES.OK).json({ success: true, message: `${result.length} employee(s) assigned to plan.`, assignedCount: result.length });
  } catch (err) { next(err); }
}

async function handleGetUnassignedEmployees(req, res, next) {
  try {
    const employees = await leavePlansRepo.getUnassignedEmployees(req.user.organizationId);
    res.status(STATUS_CODES.OK).json(employees);
  } catch (err) { next(err); }
}

// -------------------------------------------------------------
// Accruals, Year-End, Adjustments (CLIENT_ADMIN / HR)
// -------------------------------------------------------------

async function handleRunAccruals(req, res, next) {
  try {
    const { period } = req.body;
    if (!period) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Period (YYYY-MM) is required.');
    const result = await leaveService.runLeaveAccruals(req.user.organizationId, period);
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) { next(err); }
}

async function handleProcessPlanYearEnd(req, res, next) {
  try {
    const { planId } = req.params;
    const { year } = req.body;
    if (!year) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Year is required.');
    const result = await leaveService.processPlanYearEnd(req.user.userId, planId, parseInt(year, 10));
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) { next(err); }
}

async function handleGetPlanYearEndStatus(req, res, next) {
  try {
    const { planId, year } = req.params;
    const status = await leavePlansRepo.getYearEndStatus(planId, parseInt(year, 10));
    res.status(STATUS_CODES.OK).json(status || { status: 'NOT_STARTED' });
  } catch (err) { next(err); }
}

async function handleAdjustBalance(req, res, next) {
  try {
    const { employeeId, leaveTypeId, financialYear, newAllocated, newUsed, remarks } = req.body;
    if (!employeeId || !leaveTypeId || !financialYear) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'employeeId, leaveTypeId, and financialYear are required.');
    }
    const result = await leaveService.adjustBalance(
      req.user.userId,
      employeeId,
      leaveTypeId,
      parseInt(financialYear, 10),
      parseFloat(newAllocated) || 0.00,
      parseFloat(newUsed) || 0.00,
      remarks
    );
    res.status(STATUS_CODES.OK).json(result);
  } catch (err) { next(err); }
}

module.exports = {
  handleGetLeaveSettings,
  handleSaveLeaveSettings,
  handleCreateLeaveType,
  handleUpdateLeaveType,
  handleGetLeaveTypes,
  handleGetMyBalances,
  handleCalculateLeavePreview,
  handleApplyLeave,
  handleGetMyLeaves,
  handleGetLeaveDetails,
  handleCancelLeave,
  handleGetManagerLeaves,
  handleApproveLeave,
  handleRejectLeave,
  handleCancelApprovedLeaveOverride,
  handleGetAdminLeaves,
  handleGetAdminEmployeeBalances,
  handleAdminApproveLeave,
  handleAdminRejectLeave,
  handleGetOptionalHolidayEligibility,
  handleToggleOptionalHolidayAvail,
  handleGetTeamOptionalHolidays,
  
  handleGetPlans,
  handleCreatePlan,
  handleUpdatePlan,
  handleDeletePlan,
  handleGetPlanTypes,
  handleUpsertPlanType,
  handleDeletePlanType,
  handleGetPlanEmployees,
  handleAssignEmployeesToPlan,
  handleGetUnassignedEmployees,
  handleRunAccruals,
  handleProcessPlanYearEnd,
  handleGetPlanYearEndStatus,
  handleAdjustBalance,
  handleGetPendingOptionalHolidaysForManager,
  handleDecideOptionalHoliday
};

async function handleGetPendingOptionalHolidaysForManager(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only managers have a pending optional holidays view.');
    }
    const data = await leaveService.getPendingOptionalHolidaysForManager(req.user.employeeId);
    res.status(STATUS_CODES.OK).json(data);
  } catch (err) { next(err); }
}

async function handleDecideOptionalHoliday(req, res, next) {
  try {
    if (!req.user.employeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only managers can decide on optional holiday requests.');
    }
    const { request_id } = req.params;
    const { status, remarks } = req.body;
    if (!request_id) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'request_id is required.');
    if (!status) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'status is required.');
    const data = await leaveService.decideOptionalHoliday(req.user.employeeId, request_id, status, remarks);
    res.status(STATUS_CODES.OK).json({ success: true, message: `Request successfully ${status.toLowerCase()}.`, data });
  } catch (err) { next(err); }
}
