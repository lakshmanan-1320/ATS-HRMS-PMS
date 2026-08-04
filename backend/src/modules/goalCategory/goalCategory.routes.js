const router = require('express').Router();
const { requireAuth, requireClientAdmin } = require('../../middlewares/auth.middleware');
const c = require('./goalCategory.controller');

router.use(requireAuth);

// Expose active list to all authenticated users (employees, managers, etc.)
router.get('/active', c.handleListActive);

// Client Admin restrictions for modifying goal categories
router.get('/', requireClientAdmin, c.handleList);
router.post('/', requireClientAdmin, c.handleCreate);
router.put('/:id', requireClientAdmin, c.handleUpdate);
router.delete('/:id', requireClientAdmin, c.handleDelete);

module.exports = router;
