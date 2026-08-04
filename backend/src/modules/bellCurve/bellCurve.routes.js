const router = require('express').Router();
const c = require('./bellCurve.controller');
const v = require('./bellCurve.validator');

// Configurations
router.post('/configurations', v.validateConfiguration, c.handleCreateConfiguration);
router.get('/configurations', c.handleListConfigurations);
router.get('/configurations/:configId', c.handleGetConfiguration);
router.put('/configurations/:configId', v.validateConfiguration, c.handleUpdateConfiguration);
router.delete('/configurations/:configId', c.handleDeleteConfiguration);

// Buckets
router.post('/configurations/:configId/buckets', v.validateBuckets, c.handleSaveBuckets);
router.get('/configurations/:configId/buckets', c.handleGetBuckets);

// Operations / Calibration
router.post('/generate', c.handleGenerateBellCurve);
router.get('/cycles/:cycleId/runs', c.handleGetRuns);
router.get('/runs/:runId/results', c.handleGetResults);
router.patch('/runs/:runId/status', v.validateStatus, c.handleUpdateRunStatus);
router.patch('/results/:resultId/override', v.validateOverride, c.handleUpdateResultOverride);

module.exports = router;
