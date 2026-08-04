const router = require('express').Router();
const { requireClientAdmin } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createEmployeeSchema, updateEmployeeSchema } = require('./employee.validation');
const {
  handleGetNextCode,
  handleGetOrgChart,
  handleGetManagers,
  handleGetEmployees,
  handleGetEmployee,
  handleCreateEmployee,
  handleUpdateEmployee,
  handlePatchEmployeeStatus,
  handleResetPassword,
  handleBulkImport,
} = require('./employee.controller');

router.use(requireClientAdmin);

router.get('/next-code', handleGetNextCode);
router.get('/org-chart', handleGetOrgChart);
router.get('/managers', handleGetManagers);
router.get('/', handleGetEmployees);
router.get('/:id', handleGetEmployee);
router.post('/', validate(createEmployeeSchema), handleCreateEmployee);
router.put('/:id', validate(updateEmployeeSchema), handleUpdateEmployee);
router.patch('/:id/status', handlePatchEmployeeStatus);
router.post('/:id/reset-password', handleResetPassword);
router.post('/bulk-import', handleBulkImport);

module.exports = router;
