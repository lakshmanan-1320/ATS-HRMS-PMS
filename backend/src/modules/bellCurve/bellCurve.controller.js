const service = require('./bellCurve.service');

async function handleCreateConfiguration(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const data = await service.createConfiguration(orgId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateConfiguration(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const configId = req.params.configId;
    const data = await service.updateConfiguration(orgId, configId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleDeleteConfiguration(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const configId = req.params.configId;
    await service.deleteConfiguration(orgId, configId, req.user);
    res.json({ success: true, message: 'Configuration template deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

async function handleGetConfiguration(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const configId = req.params.configId;
    const data = await service.getConfiguration(orgId, configId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleListConfigurations(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const data = await service.listConfigurations(orgId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleSaveBuckets(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const configId = req.params.configId;
    const data = await service.saveBuckets(orgId, configId, req.body.buckets, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetBuckets(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const configId = req.params.configId;
    const data = await service.getBuckets(orgId, configId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGenerateBellCurve(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const { cycleId, configId, scopeType, scopeReferenceId } = req.body;
    const data = await service.generateBellCurve(orgId, { cycleId, configurationId: configId, scopeType, scopeReferenceId }, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetRuns(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const cycleId = req.params.cycleId;
    const data = await service.getRunsByCycle(orgId, cycleId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetResults(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const runId = req.params.runId;
    const data = await service.getResultsByRun(orgId, runId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateRunStatus(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const runId = req.params.runId;
    const { status } = req.body;
    const data = await service.updateRunStatus(orgId, runId, status, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleUpdateResultOverride(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const resultId = req.params.resultId;
    const { currentBucketId, reason } = req.body;
    const data = await service.updateResultOverride(orgId, resultId, currentBucketId, reason, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleCreateConfiguration,
  handleUpdateConfiguration,
  handleDeleteConfiguration,
  handleGetConfiguration,
  handleListConfigurations,
  handleSaveBuckets,
  handleGetBuckets,
  handleGenerateBellCurve,
  handleGetRuns,
  handleGetResults,
  handleUpdateRunStatus,
  handleUpdateResultOverride
};
