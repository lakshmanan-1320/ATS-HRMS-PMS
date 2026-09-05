const router = require('express').Router();
const c = require('./kpi.controller');
const { requireModule } = require('../../middlewares/module.middleware');
const kpiGate = requireModule('kpi');

router.use((req, res, next) => {
  const path = req.path;
  const matches = path.includes('/kpi') || (path.includes('/goals/') && (path.includes('/kpis') || path.includes('/progress-history')));
  if (matches) {
    return kpiGate(req, res, next);
  }
  next();
});

// Create KPI
router.post('/goals/:goalId/kpis', c.handleCreateKpi);

// List KPIs for a Goal
router.get('/goals/:goalId/kpis', c.handleListGoalKpis);

// KPI Dashboard (MUST be before :kpiId route to avoid param collision)
router.get('/kpis/dashboard', c.handleDashboardSummary);

// KPI Details
router.get('/kpis/:kpiId', c.handleGetKpi);

// Update KPI
router.put('/kpis/:kpiId', c.handleUpdateKpi);

// Delete KPI
router.delete('/kpis/:kpiId', c.handleDeleteKpi);

// Update KPI Status
router.patch('/kpis/:kpiId/status', c.handleUpdateStatus);

// Update KPI Progress (Preserved for integration APIs)
router.patch('/kpis/:kpiId/progress', c.handleUpdateProgress);

const { uploadEvidence } = require('../../middlewares/upload.middleware');

// ── KPI Submissions Routes ──
router.post('/kpis/:kpiId/submissions', uploadEvidence, c.handleCreateSubmission);
router.get('/kpi-submissions/pending', c.handleGetPendingSubmissions);
router.get('/kpis/:kpiId/submissions', c.handleListSubmissions);
router.patch('/kpi-submissions/:submissionId/review', c.handleReviewSubmission);
router.get('/goals/:goalId/progress-history', c.handleGetGoalProgressHistory);

// KPI submission proof file upload
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
router.post('/kpi-submissions/upload', uploadEvidence, (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'No files were uploaded.');
    }
    const file = req.files[0];
    const fileUrl = `/uploads/goal_evidence/${file.filename}`;
    res.json({
      success: true,
      fileUrl,
      fileName: file.originalname
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
