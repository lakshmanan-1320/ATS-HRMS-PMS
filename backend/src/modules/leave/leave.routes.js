const express = require('express');
const leaveController = require('./leave.controller');
const { requireAuth, requireRoles } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Enforce auth on all leave endpoints
router.use(requireAuth);

// -------------------------------------------------------------
// Leave Policy Settings (CLIENT_ADMIN only)
// -------------------------------------------------------------
router.get('/settings', requireRoles('client_admin'), leaveController.handleGetLeaveSettings);
router.put('/settings', requireRoles('client_admin'), leaveController.handleSaveLeaveSettings);

// -------------------------------------------------------------
// Leave Types Config (CLIENT_ADMIN only)
// -------------------------------------------------------------
router.post('/leave-types', requireRoles('client_admin'), leaveController.handleCreateLeaveType);
router.put('/leave-types/:leave_type_id', requireRoles('client_admin'), leaveController.handleUpdateLeaveType);
router.get('/leave-types', leaveController.handleGetLeaveTypes); // Visible to all authenticated users

// -------------------------------------------------------------
// Employee Portal (All authenticated employees)
// -------------------------------------------------------------
router.get('/balances/my', leaveController.handleGetMyBalances);
router.post('/calculate-preview', leaveController.handleCalculateLeavePreview);
router.post('/leaves', leaveController.handleApplyLeave);
router.get('/leaves/my', leaveController.handleGetMyLeaves);
router.get('/leaves/:leave_request_id', leaveController.handleGetLeaveDetails);
router.post('/leaves/:leave_request_id/cancel', leaveController.handleCancelLeave);

// Optional Holiday Eligibility
router.get('/optional-holidays/my', leaveController.handleGetOptionalHolidayEligibility);
router.post('/optional-holidays/:holiday_id/toggle', leaveController.handleToggleOptionalHolidayAvail);

// -------------------------------------------------------------
// Manager/HR Actions (Managers, HR, Client Admins)
// -------------------------------------------------------------
router.get('/optional-holidays/manager/pending', requireRoles('manager', 'hr', 'client_admin'), leaveController.handleGetPendingOptionalHolidaysForManager);
router.post('/optional-holidays/manager/:request_id/decide', requireRoles('manager', 'hr', 'client_admin'), leaveController.handleDecideOptionalHoliday);
router.get('/manager/optional-holidays', requireRoles('manager', 'hr', 'client_admin'), leaveController.handleGetTeamOptionalHolidays);
router.get('/manager/leaves', requireRoles('manager', 'hr', 'client_admin'), leaveController.handleGetManagerLeaves);
router.post('/manager/leaves/:leave_request_id/approve', requireRoles('manager', 'hr', 'client_admin'), leaveController.handleApproveLeave);
router.post('/manager/leaves/:leave_request_id/reject', requireRoles('manager', 'hr', 'client_admin'), leaveController.handleRejectLeave);
router.post('/manager/leaves/:leave_request_id/cancel-approved', requireRoles('manager', 'hr', 'client_admin'), leaveController.handleCancelApprovedLeaveOverride);

// -------------------------------------------------------------
// Organization Level HR Actions (Client Admin / HR)
// -------------------------------------------------------------
router.get('/admin/leaves', requireRoles('client_admin', 'hr'), leaveController.handleGetAdminLeaves);
router.get('/admin/employee/:employee_id/balances', requireRoles('client_admin', 'hr'), leaveController.handleGetAdminEmployeeBalances);
router.post('/admin/leaves/:leave_request_id/approve', requireRoles('client_admin', 'hr'), leaveController.handleAdminApproveLeave);
router.post('/admin/leaves/:leave_request_id/reject', requireRoles('client_admin', 'hr'), leaveController.handleAdminRejectLeave);

// -------------------------------------------------------------
// Leave Plans & Administration (Client Admin / HR)
// -------------------------------------------------------------
router.get('/plans', requireRoles('client_admin', 'hr'), leaveController.handleGetPlans);
router.post('/plans', requireRoles('client_admin', 'hr'), leaveController.handleCreatePlan);
router.put('/plans/:id', requireRoles('client_admin', 'hr'), leaveController.handleUpdatePlan);
router.delete('/plans/:id', requireRoles('client_admin', 'hr'), leaveController.handleDeletePlan);

router.get('/plans/:planId/types', requireRoles('client_admin', 'hr'), leaveController.handleGetPlanTypes);
router.post('/plans/:planId/types', requireRoles('client_admin', 'hr'), leaveController.handleUpsertPlanType);
router.delete('/plans/:planId/types/:leaveTypeId', requireRoles('client_admin', 'hr'), leaveController.handleDeletePlanType);

router.get('/plans/:planId/employees', requireRoles('client_admin', 'hr'), leaveController.handleGetPlanEmployees);
router.post('/plans/:planId/employees', requireRoles('client_admin', 'hr'), leaveController.handleAssignEmployeesToPlan);
router.get('/plans-unassigned-employees', requireRoles('client_admin', 'hr'), leaveController.handleGetUnassignedEmployees);

router.post('/plans/:planId/year-end/process', requireRoles('client_admin', 'hr'), leaveController.handleProcessPlanYearEnd);
router.get('/plans/:planId/year-end/status/:year', requireRoles('client_admin', 'hr'), leaveController.handleGetPlanYearEndStatus);
router.post('/admin/adjust-balance', requireRoles('client_admin', 'hr'), leaveController.handleAdjustBalance);
router.post('/admin/run-accruals', requireRoles('client_admin', 'hr'), leaveController.handleRunAccruals);

module.exports = router;
