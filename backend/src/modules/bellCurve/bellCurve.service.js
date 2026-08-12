const repo = require('./bellCurve.repository');
const { query } = require('../../config/db');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { logAudit } = require('../../utils/auditLog');

async function createConfiguration(orgId, data, userContext) {
  const config = await repo.createConfiguration(orgId, data);
  
  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: 'CREATE_BELL_CURVE_CONFIG',
    module: 'bell_curve',
    target: 'bell_curve_configurations',
    entityId: config.configuration_id,
    metadata: config
  });

  return config;
}

async function updateConfiguration(orgId, configId, data, userContext) {
  const config = await repo.updateConfiguration(orgId, configId, data);

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: 'UPDATE_BELL_CURVE_CONFIG',
    module: 'bell_curve',
    target: 'bell_curve_configurations',
    entityId: configId,
    metadata: config
  });

  return config;
}

async function deleteConfiguration(orgId, configId, userContext) {
  await repo.deleteConfiguration(orgId, configId);

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: 'DELETE_BELL_CURVE_CONFIG',
    module: 'bell_curve',
    target: 'bell_curve_configurations',
    entityId: configId
  });

  return true;
}

async function getConfiguration(orgId, configId) {
  const config = await repo.getConfiguration(orgId, configId);
  if (!config) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Configuration not found.');
  return config;
}

async function listConfigurations(orgId) {
  return await repo.listConfigurations(orgId);
}

async function saveBuckets(orgId, configId, buckets, userContext) {
  const config = await repo.getConfiguration(orgId, configId);
  if (!config) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Configuration template not found.');

  // Validate count
  if (buckets.length < 2 || buckets.length > 10) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Buckets size must be between 2 and 10.');
  }

  // Validate percentages sum
  const sumPct = buckets.reduce((s, b) => s + parseFloat(b.percentage), 0);
  if (Math.abs(sumPct - 100.0) > 0.01) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Total bucket percentages must equal exactly 100%.');
  }

  const saved = await repo.saveBuckets(configId, buckets);

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: 'SAVE_BELL_CURVE_BUCKETS',
    module: 'bell_curve',
    target: 'bell_curve_buckets',
    entityId: configId,
    metadata: { buckets: saved }
  });

  return saved;
}

async function getBuckets(orgId, configId) {
  const config = await repo.getConfiguration(orgId, configId);
  if (!config) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Configuration template not found.');
  return await repo.getBuckets(configId);
}

async function generateBellCurve(orgId, { cycleId, configurationId, scopeType = 'ORGANIZATION', scopeReferenceId = null }, userContext) {
  // Validate department_id if scope_type is DEPARTMENT
  if (scopeType === 'DEPARTMENT') {
    if (!scopeReferenceId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Department ID is required for department-scoped calibration.');
    }
    const belongs = await repo.verifyDepartmentBelongsToOrg(orgId, scopeReferenceId);
    if (!belongs) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Selected department does not exist or belong to this organization.');
    }
  } else {
    scopeReferenceId = null; // Ensure null if organization scope
  }

  // 1. Fetch Cycle details and validate finalized status
  const cycle = await repo.getAppraisalCycleDetails(orgId, cycleId);
  if (!cycle) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Appraisal cycle not found.');
  if (cycle.status !== 'closed') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot generate Bell Curve unless Appraisal Cycle is Completed.');
  }

  // 2. Fetch Config & Buckets
  const configId = configurationId;
  const config = await repo.getConfiguration(orgId, configId);
  if (!config) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Bell Curve Configuration not found.');

  const buckets = await repo.getBuckets(configId);
  if (buckets.length < 2 || buckets.length > 10) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Configuration must have between 2 and 10 buckets.');
  }

  // Check sum of percentages
  const sumPct = buckets.reduce((s, b) => s + parseFloat(b.percentage), 0);
  if (Math.abs(sumPct - 100.0) > 0.01) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Total bucket percentages must equal exactly 100%.');
  }

  // 3. Fetch Final Appraisal Scores with scope filtering
  const scores = await repo.getEmployeesForCalibration({
    organizationId: orgId,
    appraisalCycleId: cycleId,
    scopeType,
    scopeReferenceId
  });
  
  if (scores.length < 5) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Calibration scope must contain at least 5 completed appraisals. Found: ${scores.length}`);
  }

  // 4. Sort scores descending
  scores.sort((a, b) => b.final_score - a.final_score);
  const N = scores.length;

  // 5. Allocation algorithm using cumulative cutoffs
  let cumPct = 0;
  const cutoffs = buckets.map(b => {
    cumPct += parseFloat(b.percentage);
    return Math.round((cumPct / 100) * N);
  });

  // Detect boundary scores for manual review
  const boundaryScores = new Set();
  if (config.tie_strategy === 'MANUAL_REVIEW') {
    cutoffs.forEach((cutoff) => {
      if (cutoff > 0 && cutoff < N) {
        const scoreBefore = scores[cutoff - 1].final_score;
        const scoreAfter = scores[cutoff].final_score;
        if (scoreBefore === scoreAfter) {
          boundaryScores.add(scoreBefore);
        }
      }
    });
  }

  const results = [];
  let prevScore = null;
  let prevOriginalBucketId = null;

  for (let i = 0; i < N; i++) {
    const score = scores[i].final_score;

    // Standard bucket lookup based on rank (i + 1)
    let bucketIndex = 0;
    while (bucketIndex < cutoffs.length && (i + 1) > cutoffs[bucketIndex]) {
      bucketIndex++;
    }
    const standardBucket = buckets[bucketIndex];
    let originalBucketId = standardBucket.bucket_id;
    let currentBucketId = originalBucketId;

    // Apply Tie strategies
    if (config.tie_strategy === 'INCLUDE_ALL') {
      if (i > 0 && score === prevScore) {
        originalBucketId = prevOriginalBucketId;
        currentBucketId = originalBucketId;
      }
    } else if (config.tie_strategy === 'MANUAL_REVIEW') {
      if (boundaryScores.has(score)) {
        currentBucketId = null; // Unresolved boundary tie
      }
    }

    prevScore = score;
    prevOriginalBucketId = originalBucketId;

    results.push({
      employee_id: scores[i].employee_id,
      appraisal_score: score,
      original_bucket_id: originalBucketId,
      current_bucket_id: currentBucketId
    });
  }

  // 6. Create run index version
  const nextRunNumber = (await repo.getLatestRunNumber(cycleId)) + 1;
  const run = await repo.createRun(configId, cycleId, nextRunNumber, 'DRAFT', userContext.id, scopeType, scopeReferenceId);

  // 7. Bulk Insert Results linked to run
  await repo.bulkInsertResults(orgId, run.run_id, results);

  // 8. Log Audit Trail
  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: 'GENERATE_BELL_CURVE_RUN',
    module: 'bell_curve',
    target: 'bell_curve_runs',
    entityId: run.run_id,
    metadata: { run_number: nextRunNumber, appraisal_cycle_id: cycleId }
  });

  return run;
}

async function getRunsByCycle(orgId, cycleId) {
  return await repo.getRunsByCycle(orgId, cycleId);
}

async function getResultsByRun(orgId, runId) {
  return await repo.getResultsByRun(orgId, runId);
}

async function updateRunStatus(orgId, runId, status, userContext) {
  const run = await repo.getRunById(orgId, runId);
  if (!run) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Bell Curve run version not found.');

  const updatedRun = await repo.updateRunStatus(runId, status);

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: `TRANSITION_BELL_CURVE_STATUS_${status}`,
    module: 'bell_curve',
    target: 'bell_curve_runs',
    entityId: runId,
    metadata: { old_status: run.status, new_status: status }
  });

  return updatedRun;
}

async function updateResultOverride(orgId, resultId, currentBucketId, reason, userContext) {
  // Fetch result first to check freeze constraints
  const resList = await query(
    `SELECT r.status, r.run_id 
     FROM bell_curve_results res 
     JOIN bell_curve_runs r ON res.run_id = r.run_id 
     WHERE res.result_id = $1 AND res.organization_id = $2`,
    [resultId, orgId]
  );
  
  const resultObj = resList.rows[0];
  if (!resultObj) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Calibration record not found.');
  if (resultObj.status === 'FROZEN' || resultObj.status === 'PUBLISHED') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot modify calibration records of a frozen or published run.');
  }

  const updated = await repo.updateResultOverride(orgId, resultId, currentBucketId, reason, userContext.id);

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: 'CALIBRATE_BELL_CURVE_RESULT',
    module: 'bell_curve',
    target: 'bell_curve_results',
    entityId: resultId,
    metadata: { result: updated, override_reason: reason }
  });

  return updated;
}

module.exports = {
  createConfiguration,
  updateConfiguration,
  deleteConfiguration,
  getConfiguration,
  listConfigurations,
  saveBuckets,
  getBuckets,
  generateBellCurve,
  getRunsByCycle,
  getResultsByRun,
  updateRunStatus,
  updateResultOverride
};
