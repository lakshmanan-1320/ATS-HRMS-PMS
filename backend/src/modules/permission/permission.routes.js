const express = require('express');
const permissionController = require('./permission.controller');
const { requireAuth, requireRoles } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(requireAuth);

// ── Settings ─────────────────────────────────────────────────────
router.get('/settings', permissionController.handleGetSettings);
router.put('/settings', requireRoles('client_admin'), permissionController.handleSaveSettings);

// ── Employee Portal ───────────────────────────────────────────────
router.get('/balances/my',          permissionController.handleGetMyBalance);
router.get('/balances/my/all',      permissionController.handleGetMyBalances);
router.get('/requests/my',          permissionController.handleGetMyRequests);
router.post('/requests',            permissionController.handleApplyPermission);
router.post('/requests/:id/cancel', permissionController.handleCancelRequest);

// ── Admin / HR / Manager ──────────────────────────────────────────
router.get('/admin/requests',
  requireRoles('client_admin', 'hr', 'manager'),
  permissionController.handleAdminGetRequests
);
router.post('/admin/requests/:id/approve',
  requireRoles('client_admin', 'hr', 'manager'),
  permissionController.handleAdminApprove
);
router.post('/admin/requests/:id/reject',
  requireRoles('client_admin', 'hr', 'manager'),
  permissionController.handleAdminReject
);
router.get('/admin/balances',
  requireRoles('client_admin', 'hr'),
  permissionController.handleAdminGetBalances
);

module.exports = router;
