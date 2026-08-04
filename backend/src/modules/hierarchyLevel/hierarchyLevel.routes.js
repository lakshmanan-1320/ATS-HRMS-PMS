const router = require('express').Router();
const { requireClientAdmin } = require('../../middlewares/auth.middleware');
const {
  handleGetHierarchyLevels,
  handlePatchHierarchyLevelsReorder,
  handleCreateHierarchyLevel,
  handleUpdateHierarchyLevel,
  handleDeleteHierarchyLevel,
} = require('./hierarchyLevel.controller');

router.use(requireClientAdmin);

router.get('/', handleGetHierarchyLevels);
router.patch('/reorder', handlePatchHierarchyLevelsReorder);
router.post('/', handleCreateHierarchyLevel);
router.put('/:id', handleUpdateHierarchyLevel);
router.delete('/:id', handleDeleteHierarchyLevel);

module.exports = router;
