const employeeRoutes = require('express').Router();
const managerRoutes  = require('express').Router();
const adminRoutes    = require('express').Router();

const { requireEmployee, requireClientAdmin } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');

const {
  createRegularizationSchema,
  reviewRegularizationSchema,
  updateSettingsSchema
} = require('./regularization.validation');

const {
  handleGetSettings,
  handleUpdateSettings,
  handleCreateRequest,
  handleGetMyRequests,
  handleGetRequestById,
  handleGetManagerRequests,
  handleApproveRequest,
  handleRejectRequest,
  handleGetAllRequests,
  handleAdminApproveRequest,
  handleAdminRejectRequest
} = require('./regularization.controller');

// --- Employee Enpoints (Mounts on /api/v1/regularizations) ---
employeeRoutes.use(requireEmployee);
employeeRoutes.post('/', validate(createRegularizationSchema), handleCreateRequest);
employeeRoutes.get('/my', handleGetMyRequests);
employeeRoutes.get('/pending', handleGetManagerRequests);
employeeRoutes.get('/:id', handleGetRequestById);

// --- Manager Enpoints (Mounts on /api/v1/manager/regularizations) ---
managerRoutes.use(requireEmployee);
managerRoutes.get('/', handleGetManagerRequests);
managerRoutes.post('/:id/approve', handleApproveRequest);
managerRoutes.post('/:id/reject', validate(reviewRegularizationSchema), handleRejectRequest);

// --- Admin Enpoints (Mounts on /api/v1/admin/regularizations) ---
adminRoutes.use(requireClientAdmin);
adminRoutes.get('/', handleGetAllRequests);
adminRoutes.get('/settings', handleGetSettings);
adminRoutes.put('/settings', validate(updateSettingsSchema), handleUpdateSettings);
adminRoutes.post('/:id/approve', handleAdminApproveRequest);
adminRoutes.post('/:id/reject', handleAdminRejectRequest);

module.exports = {
  employeeRoutes,
  managerRoutes,
  adminRoutes
};
