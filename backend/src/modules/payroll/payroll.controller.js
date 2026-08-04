const service = require('./payroll.service');
const revisionService = require('./revision.service');
const overtimeService = require('./overtime.service');
const { logAudit } = require('../../utils/auditLog');
const { STATUS_CODES } = require('../../constants/statusCodes');

// Helper wrapper to simplify controller boilerplate
function catchAsync(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

// --- Salary Structures ---
const handleCreateSalaryStructure = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const userId = req.user.id;
  const result = await service.createSalaryStructure(orgId, req.validatedBody, userId);
  res.status(STATUS_CODES.CREATED).json({
    success: true,
    data: result
  });
});

const handleListSalaryStructures = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const result = await service.listSalaryStructures(orgId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: result
  });
});

const handleUpdateSalaryStructure = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { salary_structure_id } = req.params;
  const result = await service.updateSalaryStructure(orgId, salary_structure_id, req.validatedBody);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: result
  });
});

// --- Salary Assignments ---
const handleAssignSalary = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { employee_id } = req.params;
  const result = await service.assignSalaryStructure(orgId, employee_id, req.validatedBody);
  res.status(STATUS_CODES.CREATED).json({
    success: true,
    data: result
  });
});

const handleListSalaryAssignments = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { employee_id } = req.params;
  const result = await service.listSalaryAssignments(orgId, employee_id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: result
  });
});

// --- Week Off Settings ---
const handleGetWeekOff = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const toggles = await service.getWeekOffToggles(orgId);
  const settings = await service.listWeekOffSettings(orgId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: {
      toggles,
      settings
    }
  });
});

const handleUpdateWeekOffToggles = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const result = await service.updateWeekOffToggles(orgId, req.body);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: result
  });
});

const handleUpsertWeekOffSetting = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const result = await service.upsertWeekOffSetting(orgId, req.body);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: result
  });
});

const handleDeleteWeekOffSetting = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { id } = req.params;
  const result = await service.deleteWeekOffSetting(orgId, id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: result
  });
});

// --- Payroll Runs ---
const handleGeneratePayroll = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const userId = req.user.id;
  const result = await service.generatePayrollRun(orgId, req.validatedBody, userId);
  res.status(STATUS_CODES.CREATED).json({
    success: true,
    data: result
  });
});

const handleListPayrollRuns = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const result = await service.listPayrollRuns(orgId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: result
  });
});

const handleGetPayrollRunDetails = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { id } = req.params;
  const result = await service.getPayrollRunDetails(orgId, id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: result
  });
});

const handleApprovePayroll = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const userId = req.user.id;
  const { id } = req.params;
  const result = await service.approvePayrollRun(orgId, id, userId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: result
  });
});

const handleLockPayroll = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const userId = req.user.id;
  const { id } = req.params;
  const result = await service.lockPayrollRun(orgId, id, userId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: result
  });
});

// --- Adjustments ---
const handleCreateAdjustment = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const userId = req.user.id;
  const { id } = req.params; // payroll_run_id
  const result = await service.createAdjustment(orgId, id, req.validatedBody, userId);
  res.status(STATUS_CODES.CREATED).json({
    success: true,
    data: result
  });
});

const handleDeleteAdjustment = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const userId = req.user.id;
  const { id, adjustment_id } = req.params; // id is runId
  await service.deleteAdjustment(orgId, id, adjustment_id, userId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'Adjustment deleted successfully.'
  });
});

// --- Employee Payslips ---
const handleGetMyPayslips = catchAsync(async (req, res) => {
  const employeeId = req.user.employeeId;
  if (!employeeId) {
    throw new Error('Employee profile not linked to user account.');
  }
  const result = await service.getEmployeePayslips(employeeId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: result
  });
});

const handleGetPayslipDetails = catchAsync(async (req, res) => {
  const employeeId = req.user.employeeId;
  const role = req.user.role;
  const { id } = req.params; // employee_payroll_id
  const result = await service.getPayslipDetails(employeeId, id, role);
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: result
  });
});

const handleGetPayslipDownload = catchAsync(async (req, res) => {
  const employeeId = req.user.employeeId;
  const role = req.user.role;
  const { id } = req.params; // employee_payroll_id
  const absolutePath = await service.downloadPayslipPDF(employeeId, id, role);
  res.sendFile(absolutePath);
});

const handleBulkImportAdjustments = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const userId = req.user.id;
  const { id } = req.params; // payroll_run_id
  const { rows } = req.body;
  await service.bulkImportAdjustments(orgId, id, rows, userId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'Adjustments bulk imported successfully.'
  });
});

// --- Dynamic Payroll Components ---
const handleListPayrollComponents = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const result = await service.getPayrollComponents(orgId);
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleGetPayrollComponentById = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { id } = req.params;
  const result = await service.getPayrollComponentById(orgId, id);
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleCreatePayrollComponent = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const result = await service.createPayrollComponent(orgId, req.validatedBody);
  res.status(STATUS_CODES.CREATED).json({ success: true, data: result });
});

const handleUpdatePayrollComponent = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { id } = req.params;
  const result = await service.updatePayrollComponent(orgId, id, req.validatedBody);
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleDeletePayrollComponent = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { id } = req.params;
  await service.deletePayrollComponent(orgId, id);
  res.status(STATUS_CODES.OK).json({ success: true, message: 'Component deleted successfully.' });
});

// --- Employee Salary Configuration ---
const handleGetEmployeeSalaryConfig = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { employee_id } = req.params;
  const { date } = req.query;
  const result = await service.getEmployeeSalaryConfig(orgId, employee_id, date);
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleSaveEmployeeSalaryConfig = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { employee_id } = req.params;
  const result = await service.saveEmployeeSalaryConfig(orgId, employee_id, req.validatedBody);
  res.status(STATUS_CODES.CREATED).json({ success: true, data: result });
});

// --- Salary Revisions ---
const handleCreateRevision = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const userId = req.user.userId || req.user.id;
  const { employee_id } = req.body;
  const result = await revisionService.createRevision(orgId, employee_id, req.body, userId);
  res.status(STATUS_CODES.CREATED).json({ success: true, data: result });
});

const handleGetRevisionById = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { id } = req.params;
  const result = await revisionService.getRevisionById(orgId, id);
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleListRevisions = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const result = await revisionService.listRevisions(orgId, req.query);
  const stats = await revisionService.getDashboardStats(orgId);
  res.status(STATUS_CODES.OK).json({ success: true, data: result, stats });
});

const handleGetRevisionHistory = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { employeeId } = req.params;
  const result = await revisionService.getRevisionHistory(orgId, employeeId);
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleCancelRevision = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const userId = req.user.userId || req.user.id;
  const { id } = req.params;
  const result = await revisionService.cancelRevision(orgId, id, userId);
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

// --- Overtime Settings & Workflow ---
const handleGetOvertimeSettings = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const result = await overtimeService.getSettings(orgId);
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleUpdateOvertimeSettings = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const result = await overtimeService.updateSettings(orgId, req.validatedBody);
  logAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: 'overtime_settings_updated',
    target: 'overtime_settings',
    metadata: req.validatedBody,
    ip: req.ip
  });
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleGetEligibleOvertimeDates = catchAsync(async (req, res) => {
  const employeeId = req.user.employeeId;
  const orgId = req.user.organizationId;
  if (!employeeId) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Employee profile reference is required.');
  }
  const result = await overtimeService.getEligibleDates(employeeId, orgId);
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleCreateOvertimeRequest = catchAsync(async (req, res) => {
  const employeeId = req.user.employeeId;
  const orgId = req.user.organizationId;
  if (!employeeId) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Employee profile reference is required.');
  }
  const result = await overtimeService.createRequest(orgId, employeeId, req.validatedBody);
  logAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: 'overtime_requested',
    target: result.overtime_request_id,
    metadata: { attendance_date: result.attendance_date, requested_ot_minutes: result.requested_ot_minutes },
    ip: req.ip
  });
  res.status(STATUS_CODES.CREATED).json({ success: true, data: result });
});

const handleGetMyOvertimeRequests = catchAsync(async (req, res) => {
  const employeeId = req.user.employeeId;
  const orgId = req.user.organizationId;
  if (!employeeId) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Employee profile reference is required.');
  }
  const result = await overtimeService.listRequests(orgId, { employee_id: employeeId });
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleGetPendingOvertimeRequests = catchAsync(async (req, res) => {
  const managerEmployeeId = req.user.employeeId;
  const orgId = req.user.organizationId;
  const role = req.user.role;
  const filters = { approval_status: 'PENDING' };
  
  if (role !== 'client_admin' && role !== 'super_admin') {
    if (!managerEmployeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Manager profile reference is required.');
    }
    filters.manager_employee_id = managerEmployeeId;
  }
  
  const result = await overtimeService.listRequests(orgId, filters);
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleApproveOvertimeRequest = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { id } = req.params;
  const { approved_ot_minutes } = req.body;
  const managerUserId = req.user.id;
  
  const result = await overtimeService.approveRequest(orgId, id, approved_ot_minutes, managerUserId);
  logAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: 'overtime_approved',
    target: id,
    metadata: { approved_ot_minutes: result.approved_ot_minutes },
    ip: req.ip
  });
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleRejectOvertimeRequest = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { id } = req.params;
  const { remarks } = req.body;
  const managerUserId = req.user.id;
  
  const result = await overtimeService.rejectRequest(orgId, id, remarks, managerUserId);
  logAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: 'overtime_rejected',
    target: id,
    metadata: { remarks },
    ip: req.ip
  });
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handleGetOvertimeHistory = catchAsync(async (req, res) => {
  const managerEmployeeId = req.user.employeeId;
  const orgId = req.user.organizationId;
  const role = req.user.role;
  const filters = {};
  
  if (role !== 'client_admin' && role !== 'super_admin') {
    if (!managerEmployeeId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Manager profile reference is required.');
    }
    filters.manager_employee_id = managerEmployeeId;
  }
  
  const result = await overtimeService.listRequests(orgId, filters);
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

const handlePreviewSalaryConfig = catchAsync(async (req, res) => {
  const orgId = req.user.organizationId;
  const { salary_type, salary_amount, components } = req.body;
  
  if (!salary_type || !['MONTHLY_GROSS', 'ANNUAL_CTC'].includes(salary_type)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Salary type must be MONTHLY_GROSS or ANNUAL_CTC.');
  }
  const amt = parseFloat(salary_amount);
  if (isNaN(amt) || amt <= 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Salary amount must be a positive number.');
  }

  const result = await service.getSalaryBreakdownPreview(orgId, salary_type, amt, components);
  res.status(STATUS_CODES.OK).json({ success: true, data: result });
});

module.exports = {
  handleCreateSalaryStructure,
  handleListSalaryStructures,
  handleUpdateSalaryStructure,
  handleAssignSalary,
  handleListSalaryAssignments,
  handleGetWeekOff,
  handleUpdateWeekOffToggles,
  handleUpsertWeekOffSetting,
  handleDeleteWeekOffSetting,
  handleGeneratePayroll,
  handleListPayrollRuns,
  handleGetPayrollRunDetails,
  handleApprovePayroll,
  handleLockPayroll,
  handleCreateAdjustment,
  handleDeleteAdjustment,
  handleBulkImportAdjustments,
  handleGetMyPayslips,
  handleGetPayslipDetails,
  handleGetPayslipDownload,
  handleListPayrollComponents,
  handleGetPayrollComponentById,
  handleCreatePayrollComponent,
  handleUpdatePayrollComponent,
  handleDeletePayrollComponent,
  handleGetEmployeeSalaryConfig,
  handleSaveEmployeeSalaryConfig,
  handlePreviewSalaryConfig,
  handleCreateRevision,
  handleGetRevisionById,
  handleListRevisions,
  handleGetRevisionHistory,
  handleCancelRevision,
  handleGetOvertimeSettings,
  handleUpdateOvertimeSettings,
  handleGetEligibleOvertimeDates,
  handleCreateOvertimeRequest,
  handleGetMyOvertimeRequests,
  handleGetPendingOvertimeRequests,
  handleApproveOvertimeRequest,
  handleRejectOvertimeRequest,
  handleGetOvertimeHistory,
};
