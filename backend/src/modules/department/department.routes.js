const router = require('express').Router();
const { requireClientAdmin } = require('../../middlewares/auth.middleware');
const {
  handleGetDepartments,
  handleGetSubDepartments,
  handleCreateDepartment,
  handleCreateSubDepartment,
  handleUpdateDepartment,
  handlePatchDepartmentStatus,
  handleDeleteDepartment,
} = require('./department.controller');

router.use(requireClientAdmin);

router.get('/', handleGetDepartments);
router.get('/:id/sub-departments', handleGetSubDepartments);
router.post('/', handleCreateDepartment);
router.post('/:id/sub-departments', handleCreateSubDepartment);
router.put('/:id', handleUpdateDepartment);
router.patch('/:id/status', handlePatchDepartmentStatus);
router.delete('/:id', handleDeleteDepartment);

module.exports = router;
