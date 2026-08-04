const router = require('express').Router();
const { requireAuth } = require('../../middlewares/auth.middleware');
const c = require('./goal.controller');

router.use(requireAuth);

router.get('/', c.handleList);
router.get('/dashboard', c.handleDashboardSummary);
router.get('/:goalId', c.handleGet);
router.get('/:goalId/documents', c.handleGetDocuments);
router.get('/:goalId/activity', c.handleGetActivityLogs);
router.get('/:goalId/assignments', c.handleGetAssignments);
router.post('/', c.handleCreate);
router.put('/:goalId', c.handleUpdate);
router.delete('/:goalId', c.handleDelete);
router.patch('/:goalId/status', c.handleUpdateStatus);
router.patch('/:goalId/assignments/:assignmentId/status', c.handleUpdateAssignmentStatus);

module.exports = router;
