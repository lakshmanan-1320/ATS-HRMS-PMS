const router = require('express').Router();

// Rewrite legacy /v1 prefixes internally to preserve frontend backward-compatibility
router.use((req, res, next) => {
  if (req.url.startsWith('/v1/')) {
    req.url = req.url.slice(3);
  }
  next();
});

const authRoutes = require('../modules/auth');
const superAdminRoutes = require('../modules/superAdmin');
const companyRoutes = require('../modules/company');
const clientAdminRoutes = require('../modules/clientAdmin');
const { requireClientAdmin, requireAuth, requireRoles } = require('../middlewares/auth.middleware');
const { requireModule } = require('../middlewares/module.middleware');
const { handleGetMyModules, handleGetOrganizationModules } = require('../modules/clientModule/clientModule.controller');
const { handleGetClientAdminAuditLogs } = require('../modules/superAdmin/superAdmin.controller')
const { handleGetSessionTimeout } = require('../modules/auth/auth.controller');
const { enforceSessionTimeout } = require('../middlewares/sessionTimeout.middleware');
const { handleGetCompanyName } = require('../modules/company/company.controller');
const departmentRoutes = require('../modules/department');
const hierarchyLevelRoutes = require('../modules/hierarchyLevel');
const employeeRoutes = require('../modules/employee');
const attendanceRoutes = require('../modules/attendance');
const clientModuleRoutes = require('../modules/clientModule');
const employeePortalRoutes = require('../modules/employeePortal');
const goalRoutes = require('../modules/goal');
const employeeGoalRoutes = require('../modules/employeeGoal');
const managerGoalRoutes  = require('../modules/managerGoal');
const appraisalRoutes    = require('../modules/appraisal');
const kpiRoutes          = require('../modules/kpi');
const dashboardRoutes    = require('../modules/dashboard');
const leaveRoutes = require('../modules/leave');
const holidayRoutes = require('../modules/holidays');
const regularizationRoutes = require('../modules/regularizations');
const payrollRoutes = require('../modules/payroll/payroll.routes');
const reportsRoutes = require('../modules/reports');
const permissionRoutes = require('../modules/permission');
const notificationRoutes = require('../modules/inAppNotification/inAppNotification.routes');

const goalCompletionRoutes = require('../modules/goalCompletion');
const goalCategoryRoutes = require('../modules/goalCategory');
const profileRoutes = require('../modules/profile');

const auditLogRoutes = require('../modules/auditLog');
const financialYearRoutes = require('../modules/financialYear');
const continuousFeedbackRoutes = require('../modules/continuousFeedback/continuousFeedback.routes');
const competencyAssessmentRoutes = require('../modules/competencyAssessment');
const selfAssessmentRoutes = require('../modules/selfAssessment');
const feedback360Routes = require('../modules/feedback360');
const masterDataRoutes = require('../modules/masterData');
const bellCurveRoutes = require('../modules/bellCurve');
const nineBoxRoutes = require('../modules/masterData/nineBox');
router.use('/auth', authRoutes.routes);
router.use('/master-data', masterDataRoutes.routes);

// Enforce session timeout on all subsequent authenticated routes
router.use(enforceSessionTimeout);

router.use('/super-admin', superAdminRoutes.routes);
router.use('/super-admin/company', companyRoutes.routes);
router.use('/super-admin/client-admins', clientAdminRoutes.routes);
router.use('/super-admin/modules', clientModuleRoutes.routes);
router.use('/client-admin/departments', departmentRoutes.routes);
router.use('/client-admin/hierarchy-levels', hierarchyLevelRoutes.routes);
router.use('/client-admin/employees', employeeRoutes.routes);
router.use('/client-admin/goals', requireAuth, requireModule('goals'), goalRoutes.routes);
router.use('/client-admin/goal-categories', requireAuth, requireModule('goals'), goalCategoryRoutes.routes);
router.use('/client-admin/financial-years', requireAuth, requireModule('performance'), financialYearRoutes.routes);
router.use('/client-admin/competency-assessment', requireAuth, requireModule('goals'), competencyAssessmentRoutes.routes);
router.use('/employee', employeePortalRoutes.routes);
router.use('/goals', requireAuth, requireModule('goals'), goalCompletionRoutes.routes);
router.use('/employee/goals',   requireAuth, requireModule('goals'),       employeeGoalRoutes.routes);
router.use('/employee/goals',   requireAuth, requireModule('goals'),       goalCompletionRoutes.routes);
router.use('/employee/manager', requireAuth, requireModule('goals'),       managerGoalRoutes.routes);
router.use('/employee/manager', requireAuth, requireModule('goals'),       goalCompletionRoutes.routes);
router.use('/client-admin/dashboard', dashboardRoutes.routes);
router.use('/', requireAuth, requireModule('goals'), kpiRoutes.routes);
router.use('/client-admin/appraisal', requireAuth, requireModule('performance'), appraisalRoutes.adminRouter);
router.use('/employee/appraisal',     requireAuth, requireModule('performance'), appraisalRoutes.employeeRouter);
router.use('/attendance', requireAuth, requireModule('attendance'), attendanceRoutes.routes);
router.use('/leave',         requireAuth, requireModule('leave'), leaveRoutes.routes);
router.use('/holidays',      requireAuth, requireModule('leave'), holidayRoutes.routes);
router.use('/regularizations',         requireAuth, requireModule('attendance'), regularizationRoutes.employeeRoutes);
router.use('/manager/regularizations', requireAuth, requireModule('attendance'), regularizationRoutes.managerRoutes);
router.use('/admin/regularizations',   requireAuth, requireModule('attendance'), regularizationRoutes.adminRoutes);
router.use('/payroll', requireAuth, requireModule('payroll'), payrollRoutes);
router.use('/reports', requireAuth, reportsRoutes.routes);
router.use('/permissions', permissionRoutes.routes);
router.use('/notifications', notificationRoutes);
router.use('/client-admin/bell-curve', requireAuth, requireModule('performance'), requireRoles('client_admin', 'hr'), bellCurveRoutes.routes);
router.use('/client-admin/nine-box', nineBoxRoutes.routes);
const pipRoutes = require('../modules/pip');
const policyRoutes = require('../modules/policy/policy.routes');
router.use('/pip', requireAuth, requireModule('performance'), pipRoutes.routes);
router.use('/policies', requireAuth, policyRoutes.routes);
const aiRoutes = require('../ai/ai.routes');
router.use('/profile', profileRoutes.routes);
router.use('/audit-logs', auditLogRoutes.routes);

const cfController = require('../modules/continuousFeedback/continuousFeedback.controller');
router.get('/performance-technique-configurations/:technique', requireAuth, requireModule('goals'), (req, res, next) => cfController.getTechniqueConfiguration(req, res, next));
router.post('/performance-technique-configurations/:technique', requireAuth, requireModule('goals'), (req, res, next) => cfController.saveTechniqueConfiguration(req, res, next));

const goalController = require('../modules/goal/goal.controller');
router.get('/client-admin/performance-configurations', requireAuth, (req, res, next) => goalController.handleGetActiveConfig(req, res, next));

router.use('/', continuousFeedbackRoutes);
router.use('/', selfAssessmentRoutes.routes);
router.use('/', feedback360Routes.routes);
router.use('/ai', aiRoutes);
// ─── Shared Employee Search (any authenticated role) ─────────────────────
router.get('/employees/search', requireAuth, async (req, res, next) => {
  try {
    const employeeService = require('../modules/employee/employee.service');
    const filter = {
      search: req.query.search || '',
      department_id: (req.query.department_id && req.query.department_id !== 'undefined' && req.query.department_id !== 'null' && req.query.department_id !== '') ? req.query.department_id : null,
      status: req.query.status || 'active',
    };
    const list = await employeeService.listEmployees(req.user.organizationId, filter);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.get('/modules/my', requireAuth, handleGetMyModules);
router.get('/client-admin/organization/modules', requireAuth, handleGetOrganizationModules);
router.get('/client-admin/audit-logs', requireClientAdmin, handleGetClientAdminAuditLogs);

router.get('/settings/session-timeout', requireAuth, handleGetSessionTimeout)
router.get('/settings/company-name', requireAuth, handleGetCompanyName);

router.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

module.exports = router;
