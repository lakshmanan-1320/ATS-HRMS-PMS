const router = require('express').Router();
const { requireAuth, requireClientAdmin } = require('../../middlewares/auth.middleware');
const { validatePunch, validatePolicy, validateAssignPolicy } = require('./attendance.validation');
const {
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
} = require('./attendance.controller');

const {
  handleGetSummaryReport,
  handleGetDailyReport,
  handleGetMonthlyReport,
  handleGetLateArrivalsReport,
  handleGetEarlyExitsReport,
  handleGetGeofenceReport,
  handleGetDepartmentsReport,
  handleGetEmployeeReport,
  handleGetPayrollReport,
  handleGetExceptionsReport,
  handleExportCSV,
  handleExportXLSX,
  handleExportPDF
} = require('./attendanceReports.controller');

const {
  handleGetSettings,
  handleUpdateSettings,
  handleCreateRequest,
  handleGetMyRequests,
  handleCancelRequest,
  handleGetPendingRequests,
  handleApproveRequest,
  handleRejectRequest
} = require('./attendanceRegularization.controller');

router.use(requireAuth);

router.get('/today', handleGetTodayStatus);
router.post('/check-in', validatePunch, handleCheckIn);
router.post('/check-out', validatePunch, handleCheckOut);
router.get('/my-history', handleGetMyHistory);
router.get('/my-policy', handleGetMyPolicy);
router.get('/team-members', handleGetTeamMembers);
router.get('/team-history', handleGetTeamHistory);

router.get('/admin/overview', requireClientAdmin, handleGetAdminOverview);
router.get('/admin/dashboard-summary', requireClientAdmin, handleGetAdminDashboardSummary);
router.get('/admin/trends', requireClientAdmin, handleGetAdminTrends);
router.get('/admin/departments-summary', requireClientAdmin, handleGetAdminDepartmentsSummary);
router.get('/admin/employee/:id/history', requireClientAdmin, handleGetEmployeeHistory);

// Attendance Reports (Client Admin & managers have check in services, role checks done in controller)
router.get('/reports/summary', handleGetSummaryReport);
router.get('/reports/daily', handleGetDailyReport);
router.get('/reports/monthly', handleGetMonthlyReport);
router.get('/reports/late-arrivals', handleGetLateArrivalsReport);
router.get('/reports/early-exits', handleGetEarlyExitsReport);
router.get('/reports/geofence', handleGetGeofenceReport);
router.get('/reports/departments', handleGetDepartmentsReport);
router.get('/reports/employee/:employeeId', handleGetEmployeeReport);
router.get('/reports/payroll', handleGetPayrollReport);
router.get('/reports/exceptions', handleGetExceptionsReport);
router.get('/reports/export/csv', handleExportCSV);
router.get('/reports/export/xlsx', handleExportXLSX);
router.get('/reports/export/pdf', handleExportPDF);

// Attendance Regularization & Settings Routes
router.get('/regularization/settings', handleGetSettings);
router.put('/regularization/settings', requireClientAdmin, handleUpdateSettings);
router.post('/regularization/request', handleCreateRequest);
router.get('/regularization/my-requests', handleGetMyRequests);
router.delete('/regularization/request/:id', handleCancelRequest);
router.get('/regularization/pending', handleGetPendingRequests);
router.post('/regularization/:id/approve', handleApproveRequest);
router.post('/regularization/:id/reject', handleRejectRequest);

// Office Location Routes
router.get('/office-locations', requireClientAdmin, handleListOfficeLocations);
router.get('/office-locations/:id', requireClientAdmin, handleGetOfficeLocationById);
router.post('/office-locations', requireClientAdmin, handleCreateOfficeLocation);
router.put('/office-locations/:id', requireClientAdmin, handleUpdateOfficeLocation);
router.delete('/office-locations/:id', requireClientAdmin, handleDeleteOfficeLocation);
router.put('/office-locations/:id/status', requireClientAdmin, handleToggleOfficeLocationStatus);

// Shift & Schedule Routes
router.get('/shifts', requireClientAdmin, handleListShifts);
router.get('/shifts/:id', requireClientAdmin, handleGetShiftById);
router.post('/shifts', requireClientAdmin, handleCreateShift);
router.put('/shifts/:id', requireClientAdmin, handleUpdateShift);
router.delete('/shifts/:id', requireClientAdmin, handleDeleteShift);
router.put('/shifts/:id/status', requireClientAdmin, handleToggleShiftStatus);
router.post('/shifts/:id/assign', requireClientAdmin, handleAssignShift);
router.get('/shifts/employees/:id/history', requireAuth, handleGetEmployeeShiftHistory);


// Attendance Policy Routes
router.get('/policies', requireClientAdmin, handleListPolicies);
router.get('/policies/:id', requireClientAdmin, handleGetPolicyById);
router.get('/policies/:id/members', requireClientAdmin, handleGetPolicyMembers);
router.get('/policies/:id/departments', requireClientAdmin, handleGetPolicyDepartments);
router.post('/policies', requireClientAdmin, validatePolicy, handleCreatePolicy);
router.put('/policies/:id', requireClientAdmin, validatePolicy, handleUpdatePolicy);
router.delete('/policies/:id', requireClientAdmin, handleDeletePolicy);
router.post('/policies/:id/assign', requireClientAdmin, validateAssignPolicy, handleAssignPolicy);

module.exports = router;
