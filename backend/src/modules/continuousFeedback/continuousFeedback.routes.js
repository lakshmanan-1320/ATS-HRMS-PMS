const express = require('express');
const router = express.Router();
const controller = require('./continuousFeedback.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireModule } = require('../../middlewares/module.middleware');

router.use(requireAuth);

const continuousFeedbackGate = requireModule('continuous_feedback');
router.use((req, res, next) => {
  const path = req.path;
  const matches = path.includes('/continuous-feedback') || 
                  path.includes('/action-items') || 
                  path.includes('/reflection-template') || 
                  (path.includes('/goals/') && (
                    path.includes('/feedback') || 
                    path.includes('/reflections') || 
                    path.includes('/praise') || 
                    path.includes('/coaching-timeline') || 
                    path.includes('/reflection-template') || 
                    path.includes('/reflection-answers')
                  ));
  if (matches) {
    return continuousFeedbackGate(req, res, next);
  }
  next();
});

// --- Dashboard & Overview ---
router.get('/continuous-feedback/dashboard', (req, res, next) => controller.getDashboardStats(req, res, next));
router.get('/continuous-feedback/overview', (req, res, next) => controller.getOrganizationCoachingOverview(req, res, next));

// --- Dynamic Reflection Templates ---
router.post('/goals/:goalId/reflection-template', (req, res, next) => controller.saveReflectionTemplate(req, res, next));
router.get('/goals/:goalId/reflection-template', (req, res, next) => controller.getReflectionTemplate(req, res, next));
router.put('/reflection-template/:templateId', (req, res, next) => controller.updateReflectionQuestion(req, res, next));
router.delete('/reflection-template/:templateId', (req, res, next) => controller.deleteReflectionQuestion(req, res, next));

// --- Dynamic Reflection Answers ---
router.post('/goals/:goalId/reflection-answers', (req, res, next) => controller.submitReflectionAnswers(req, res, next));

// --- Feedback ---
router.post('/goals/:goalId/feedback', (req, res, next) => controller.addFeedback(req, res, next));
router.get('/goals/:goalId/feedback', (req, res, next) => controller.getGoalFeedbacks(req, res, next));

// --- Reflections ---
router.post('/goals/:goalId/reflections', (req, res, next) => controller.addReflection(req, res, next));
router.get('/goals/:goalId/reflections', (req, res, next) => controller.getGoalReflections(req, res, next));

// --- Action Items ---
router.post('/goals/:goalId/action-items', (req, res, next) => controller.addActionItem(req, res, next));
router.get('/goals/:goalId/action-items', (req, res, next) => controller.getGoalActionItems(req, res, next));
router.patch('/action-items/:actionItemId', (req, res, next) => controller.markActionItemCompleted(req, res, next));
router.patch('/action-items/:actionItemId/verify', (req, res, next) => controller.verifyActionItem(req, res, next));

// --- Praise ---
router.post('/goals/:goalId/praise', (req, res, next) => controller.addPraise(req, res, next));
router.get('/goals/:goalId/praise', (req, res, next) => controller.getGoalPraises(req, res, next));

// --- Unified Timeline ---
router.get('/goals/:goalId/coaching-timeline', (req, res, next) => controller.getGoalCoachingTimeline(req, res, next));

module.exports = router;
