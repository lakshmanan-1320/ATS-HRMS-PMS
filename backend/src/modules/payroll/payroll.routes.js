const router = require('express').Router();
const validate = require('../../middlewares/validate.middleware');
const { requireClientAdmin, requireEmployee } = require('../../middlewares/auth.middleware');

const {
  createSalaryStructureSchema,
  assignSalarySchema,
  generatePayrollSchema,
  createAdjustmentSchema,
  updateWeekOffSettingsSchema,
  createPayrollComponentSchema,
  saveEmployeeSalaryConfigSchema,
  upsertOvertimeSettingsSchema,
  createOvertimeRequestSchema,
} = require('./payroll.validation');

const {
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
} = require('./payroll.controller');

// --- Salary Structures (Admin Only) ---
router.post('/salary-structures', requireClientAdmin, validate(createSalaryStructureSchema), handleCreateSalaryStructure);
router.get('/salary-structures', requireClientAdmin, handleListSalaryStructures);
router.put('/salary-structures/:salary_structure_id', requireClientAdmin, validate(createSalaryStructureSchema), handleUpdateSalaryStructure);

// --- Employee Salary Assignments (Admin Only) ---
router.post('/employees/:employee_id/salary', requireClientAdmin, validate(assignSalarySchema), handleAssignSalary);
router.get('/employees/:employee_id/salary', requireClientAdmin, handleListSalaryAssignments);

// --- Dynamic Payroll Components (Admin Only) ---
router.get('/components', requireClientAdmin, handleListPayrollComponents);
router.get('/components/:id', requireClientAdmin, handleGetPayrollComponentById);
router.post('/components', requireClientAdmin, validate(createPayrollComponentSchema), handleCreatePayrollComponent);
router.put('/components/:id', requireClientAdmin, validate(createPayrollComponentSchema), handleUpdatePayrollComponent);
router.delete('/components/:id', requireClientAdmin, handleDeletePayrollComponent);

// --- Employee Salary Configuration (Admin Only) ---
router.get('/employees/:employee_id/salary-config', requireClientAdmin, handleGetEmployeeSalaryConfig);
router.post('/employees/:employee_id/salary-config', requireClientAdmin, validate(saveEmployeeSalaryConfigSchema), handleSaveEmployeeSalaryConfig);
router.post('/employees/salary-config/preview', requireClientAdmin, handlePreviewSalaryConfig);

// --- Salary Revisions & Increments (Admin Only) ---
router.get('/revisions', requireClientAdmin, handleListRevisions);
router.get('/revisions/:id', requireClientAdmin, handleGetRevisionById);
router.get('/revisions/employee/:employeeId', requireClientAdmin, handleGetRevisionHistory);
router.post('/revisions', requireClientAdmin, handleCreateRevision);
router.post('/revisions/:id/cancel', requireClientAdmin, handleCancelRevision);

// --- Weekly Off Configuration (Admin Only) ---
router.get('/settings/week-off', requireClientAdmin, handleGetWeekOff);
router.put('/settings/week-off/toggles', requireClientAdmin, handleUpdateWeekOffToggles);
router.put('/settings/week-off', requireClientAdmin, handleUpsertWeekOffSetting);
router.delete('/settings/week-off/:id', requireClientAdmin, handleDeleteWeekOffSetting);

// --- Payroll Runs Management (Admin Only) ---
router.post('/runs/generate', requireClientAdmin, validate(generatePayrollSchema), handleGeneratePayroll);
router.get('/runs', requireClientAdmin, handleListPayrollRuns);
router.get('/runs/:id', requireClientAdmin, handleGetPayrollRunDetails);
router.post('/runs/:id/approve', requireClientAdmin, handleApprovePayroll);
router.post('/runs/:id/lock', requireClientAdmin, handleLockPayroll);

// --- Manual Adjustments (Admin Only) ---
router.post('/runs/:id/adjustments', requireClientAdmin, validate(createAdjustmentSchema), handleCreateAdjustment);
router.post('/runs/:id/adjustments/bulk', requireClientAdmin, handleBulkImportAdjustments);
router.delete('/runs/:id/adjustments/:adjustment_id', requireClientAdmin, handleDeleteAdjustment);

// --- Payslips (Employees / Admins) ---
// Note: handleGetPayslipDetails performs internally proper role checks
router.get('/my-payslips', requireEmployee, handleGetMyPayslips);
router.get('/my-payslips/:id', requireEmployee, handleGetPayslipDetails);
router.get('/my-payslips/:id/download', requireEmployee, handleGetPayslipDownload);

// --- Overtime Configuration & Workflow ---
router.get('/overtime/settings', requireClientAdmin, handleGetOvertimeSettings);
router.put('/overtime/settings', requireClientAdmin, validate(upsertOvertimeSettingsSchema), handleUpdateOvertimeSettings);

router.get('/overtime/eligible-dates', requireEmployee, handleGetEligibleOvertimeDates);
router.post('/overtime/request', requireEmployee, validate(createOvertimeRequestSchema), handleCreateOvertimeRequest);
router.get('/overtime/my-requests', requireEmployee, handleGetMyOvertimeRequests);

router.get('/overtime/pending', requireEmployee, handleGetPendingOvertimeRequests);
router.post('/overtime/:id/approve', requireEmployee, handleApproveOvertimeRequest);
router.post('/overtime/:id/reject', requireEmployee, handleRejectOvertimeRequest);
router.get('/overtime/history', requireEmployee, handleGetOvertimeHistory);

module.exports = router;
