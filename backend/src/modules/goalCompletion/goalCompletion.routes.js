const router = require('express').Router();
const { requireAuth } = require('../../middlewares/auth.middleware');
const { uploadEvidence } = require('../../middlewares/upload.middleware');
const c = require('./goalCompletion.controller');

router.use(requireAuth);

// --- Employee Completion Submission ---
router.post('/:goalId/submit-completion', uploadEvidence, c.handleSubmitCompletion);
router.get('/my-completion-requests', c.handleGetMyCompletionRequests);

// --- Manager Approval / Rejection ---
router.get('/completion-requests', c.handleGetManagerCompletionRequests);
router.post('/completion-requests/:requestId/approve', c.handleApproveCompletionRequest);
router.post('/completion-requests/:requestId/reject', c.handleRejectCompletionRequest);

// --- Audit Trail ---
router.get('/:goalId/completion-history', c.handleGetGoalCompletionHistory);

module.exports = router;
