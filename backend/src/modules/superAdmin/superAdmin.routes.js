const router = require('express').Router();
const { requireSuperAdmin } = require('../../middlewares/auth.middleware');
const {
  handleGetDashboard,
  handleGetSmtp,
  handleSaveSmtp,
  handleTestSmtp,
  handleGetSecurity,
  handleSaveSecurity,
  handleGetAuditLogs,
  handleGetPasswordPolicy,
  handleSavePasswordPolicy,
  handleGetSessionTimeout,
  handleSaveSessionTimeout,
  handleGetNotificationSettings,
  handleSaveNotificationSettings,
} = require('./superAdmin.controller');

router.use(requireSuperAdmin);

router.get('/dashboard', handleGetDashboard);

router.get('/smtp', handleGetSmtp);
router.put('/smtp', handleSaveSmtp);
router.post('/smtp/test', handleTestSmtp);

router.get('/audit-logs', handleGetAuditLogs);

router.get('/security', handleGetSecurity);
router.put('/security', handleSaveSecurity);

router.get('/password-policy', handleGetPasswordPolicy);
router.put('/password-policy', handleSavePasswordPolicy);

router.get('/session-timeout', handleGetSessionTimeout);
router.put('/session-timeout', handleSaveSessionTimeout);

router.get('/notification-settings', handleGetNotificationSettings);
router.put('/notification-settings', handleSaveNotificationSettings);

module.exports = router;
