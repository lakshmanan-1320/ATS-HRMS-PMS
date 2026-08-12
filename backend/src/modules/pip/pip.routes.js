const express = require('express');
const router = express.Router();
const c = require('./pip.controller');
const v = require('./pip.validator');

// Settings
router.get('/settings', c.handleGetSettings);
router.post('/settings', v.validateSettings, c.handleSaveSettings);

// Templates
router.get('/templates', c.handleListTemplates);
router.post('/templates', v.validateTemplate, c.handleCreateTemplate);
router.get('/templates/:id', c.handleGetTemplate);
router.put('/templates/:id', v.validateTemplate, c.handleUpdateTemplate);
router.delete('/templates/:id', c.handleDeleteTemplate);

// Candidates
router.get('/candidates', c.handleListCandidates);
router.post('/candidates', v.validateCreateCandidate, c.handleCreateCandidate);
router.get('/candidates/:id', c.handleGetCandidate);
router.post('/candidates/:id/action', v.validateCandidateAction, c.handleReviewCandidate);
router.get('/employees/:employeeId/latest-appraisal', c.handleGetLatestEmployeeAppraisal);

// Active PIPs
router.get('/active', c.handleListPips);
router.get('/active/:id', c.handleGetPip);
router.post('/active/:id/confirm-read', c.handleConfirmRead);
router.post('/active/:id/refresh-metrics', c.handleRefreshMetrics);
router.post('/active/:id/decision', c.handleProcessHrDecision);
router.post('/active/:id/convert', v.validateConvertPip, c.handleConvertPip);
router.get('/active/:id/metric-snapshots', c.handleGetMetricTrendSnapshots);

// Check-ins
router.post('/checkins/:id/complete', v.validateCheckin, c.handleCompleteCheckin);
router.post('/checkins/:id/comment', c.handleAddEmployeeComment);

// Reports
router.get('/reports/detailed', c.handleGetDetailedReport);
router.get('/reports/statistics', c.handleGetPipStatistics);

module.exports = router;
