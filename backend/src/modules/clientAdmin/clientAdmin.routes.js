const router = require('express').Router();
const { requireSuperAdmin } = require('../../middlewares/auth.middleware');
const {
  handleGetClientAdmins,
  handleCreateClientAdmin,
  handleUpdateClientAdmin,
  handlePatchClientAdminStatus,
  handlePatchClientAdminGoalMode,
  handleGetGoalConfig,
  handleUpdateGoalConfig,
  handleDeleteClientAdmin,
  handleGetCompanies,
  handleCreateCompany,
  handleDeleteCompany,
} = require('./clientAdmin.controller');

router.use(requireSuperAdmin);

// --- Company / Organization Management ---
router.get('/companies', handleGetCompanies);
router.post('/companies', handleCreateCompany);
router.delete('/companies/:id', handleDeleteCompany);

// --- Client Admins ---
router.get('/', handleGetClientAdmins);
router.post('/', handleCreateClientAdmin);
router.put('/:id', handleUpdateClientAdmin);
router.patch('/:id/status', handlePatchClientAdminStatus);
router.patch('/:id/goal-mode', handlePatchClientAdminGoalMode);
router.get('/:id/goal-config', handleGetGoalConfig);
router.put('/:id/goal-config', handleUpdateGoalConfig);
router.delete('/:id', handleDeleteClientAdmin);

module.exports = router;
