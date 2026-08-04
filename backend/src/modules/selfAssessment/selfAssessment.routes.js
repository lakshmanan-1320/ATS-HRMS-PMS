const express = require('express');
const router = express.Router();
const controller = require('./selfAssessment.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');
const { requireModule } = require('../../middlewares/module.middleware');
const { uploadEvidence } = require('../../middlewares/upload.middleware');

router.use(requireAuth);

const selfAssessmentGate = requireModule('self_assessment');
router.use((req, res, next) => {
  const path = req.path;
  const matches = path.includes('/self-assessment') || 
                  path.includes('/attachments/') || 
                  (path.includes('/goals/') && path.includes('/self-assessment-template'));
  if (matches) {
    return selfAssessmentGate(req, res, next);
  }
  next();
});

// --- Configuration & Template Setup (Client Admin) ---
router.post('/goals/:goalId/self-assessment-template', (req, res, next) => controller.saveSelfAssessmentTemplate(req, res, next));
router.get('/goals/:goalId/self-assessment-template', (req, res, next) => controller.getSelfAssessmentTemplate(req, res, next));
router.put('/self-assessment-config', (req, res, next) => controller.saveSelfAssessmentConfiguration(req, res, next));
router.get('/self-assessment-config', (req, res, next) => controller.getSelfAssessmentConfiguration(req, res, next));
router.get('/client-admin/self-assessment/submissions', (req, res, next) => controller.getSummaryReport(req, res, next));

// --- Submissions & Evaluation (Employee / Manager) ---
router.get('/goals/:goalId/assignments/:assignmentId/self-assessment', (req, res, next) => controller.getSubmissionAndAnswers(req, res, next));
router.post('/goals/:goalId/assignments/:assignmentId/self-assessment/save-draft', (req, res, next) => controller.saveDraftAnswers(req, res, next));
router.post('/goals/:goalId/assignments/:assignmentId/self-assessment/submit', (req, res, next) => controller.submitAssessment(req, res, next));
router.post('/goals/:goalId/assignments/:assignmentId/self-assessment/review', (req, res, next) => controller.reviewAssessment(req, res, next));
router.post('/goals/:goalId/assignments/:assignmentId/self-assessment/acknowledge', (req, res, next) => controller.acknowledgeAssessment(req, res, next));

// --- Evidence Upload & Verification ---
router.post('/answers/:answerId/self-assessment/upload', uploadEvidence, (req, res, next) => controller.uploadAttachment(req, res, next));
router.put('/attachments/:attachmentId/verify', (req, res, next) => controller.verifyEvidence(req, res, next));

// --- Reports ---
router.get('/self-assessment/reports/summary', (req, res, next) => controller.getSummaryReport(req, res, next));
router.get('/self-assessment/reports/comparison', (req, res, next) => controller.getComparisonReport(req, res, next));

module.exports = router;
