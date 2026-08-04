const router = require('express').Router();
const { requireAuth, requireRoles } = require('../../middlewares/auth.middleware');
const controller = require('./auditLog.controller');

router.use(requireAuth);
router.use(requireRoles('super_admin', 'client_admin'));

router.get('/', controller.handleGetAuditLogs);
router.get('/:auditLogId', controller.handleGetAuditLogById);

module.exports = { routes: router };
