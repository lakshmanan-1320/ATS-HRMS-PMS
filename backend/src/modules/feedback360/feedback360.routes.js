const router = require('express').Router();
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireModule } = require('../../middlewares/module.middleware');
const c = require('./feedback360.controller');

router.use(requireAuth);

const feedback360Gate = requireModule('360_feedback');
router.use((req, res, next) => {
  const path = req.path;
  const matches = path.includes('/360-feedback') || 
                  (path.includes('/goals/') && path.includes('/360-feedback'));
  if (matches) {
    return feedback360Gate(req, res, next);
  }
  next();
});

// ─── Goal-Level Configuration ───────────────────────────────────────────────
router.get('/goals/:goalId/360-feedback/config', (req, res, next) => c.getGoalConfig(req, res, next));
router.post('/goals/:goalId/360-feedback/config', (req, res, next) => c.saveGoalConfig(req, res, next));

// ─── Questionnaire Templates ────────────────────────────────────────────────
router.get('/goals/:goalId/360-feedback/templates', (req, res, next) => c.getTemplates(req, res, next));
router.post('/goals/:goalId/360-feedback/templates', (req, res, next) => c.saveTemplates(req, res, next));

// ─── Assignment-Level Assessment ────────────────────────────────────────────
router.get('/goals/:goalId/assignments/:assignmentId/360-feedback', (req, res, next) => c.getAssessmentData(req, res, next));
router.post('/goals/:goalId/assignments/:assignmentId/360-feedback/participants', (req, res, next) => c.addParticipant(req, res, next));
router.delete('/goals/:goalId/assignments/:assignmentId/360-feedback/participants/:participantId', (req, res, next) => c.removeParticipant(req, res, next));
router.post('/goals/:goalId/assignments/:assignmentId/360-feedback/finalize', (req, res, next) => c.finalizeFeedback(req, res, next));
router.post('/goals/:goalId/assignments/:assignmentId/360-feedback/view-results', (req, res, next) => c.viewResults(req, res, next));

// ─── Reviewer Actions ───────────────────────────────────────────────────────
router.post('/360-feedback/participants/:participantId/accept', (req, res, next) => c.acceptInvitation(req, res, next));
router.post('/360-feedback/participants/:participantId/answers', (req, res, next) => c.saveAnswers(req, res, next));
router.post('/360-feedback/participants/:participantId/submit', (req, res, next) => c.submitReview(req, res, next));
router.post('/360-feedback/participants/:participantId/decline', (req, res, next) => c.declineReview(req, res, next));

// ─── Org-Level Configuration ────────────────────────────────────────────────
router.get('/360-feedback-config', (req, res, next) => c.getOrgConfig(req, res, next));
router.put('/360-feedback-config', (req, res, next) => c.saveOrgConfig(req, res, next));

// ─── Admin Reports ──────────────────────────────────────────────────────────
router.get('/client-admin/360-feedback/submissions', (req, res, next) => c.getSummaryReport(req, res, next));

module.exports = router;
