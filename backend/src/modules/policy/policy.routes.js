const express = require('express');
const router = express.Router();
const policyController = require('./policy.controller');
const { requireAuth, requireRoles } = require('../../middlewares/auth.middleware');
const { uploadPolicyDoc } = require('../../middlewares/upload.middleware');

// Public to authenticated users within tenant
router.get('/', requireAuth, policyController.getPolicies);
router.get('/:id', requireAuth, policyController.getPolicyById);
router.get('/:id/document', requireAuth, policyController.getPolicyDocument);

// Admin-only endpoints
router.post(
  '/',
  requireAuth,
  requireRoles('client_admin', 'super_admin', 'hr'),
  uploadPolicyDoc,
  policyController.createPolicy
);

router.put(
  '/:id',
  requireAuth,
  requireRoles('client_admin', 'super_admin', 'hr'),
  uploadPolicyDoc,
  policyController.updatePolicy
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRoles('client_admin', 'super_admin', 'hr'),
  policyController.updatePolicyStatus
);

router.delete(
  '/:id',
  requireAuth,
  requireRoles('client_admin', 'super_admin', 'hr'),
  policyController.deletePolicy
);

module.exports = {
  routes: router
};
