const repo = require('./pip.repository');
const metricService = require('./pipMetric.service');
const recommendationService = require('./pipRecommendation.service');
const notificationService = require('./pipNotification.service');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { logAudit } = require('../../utils/auditLog');

// Settings
async function getSettings(orgId) {
  let settings = await repo.getSettings(orgId);
  if (!settings) {
    settings = await repo.saveSettings(orgId, {
      enable_pip: true,
      allow_manager_initiation: true,
      require_hr_approval: true,
      allow_manual_creation: true,
      enable_monitoring: true,
      allow_extension: true,
      max_extension_count: 2,
      default_duration_days: 60,
      default_checkin_frequency: 'WEEKLY',
      reminder_frequency_days: 7,
      enable_recommendation_engine: true,
      close_threshold_pct: 80.00,
      extend_threshold_pct: 50.00,
      escalate_threshold_pct: 50.00
    });
  }
  const buckets = await repo.getBellCurveSettings(orgId);
  return { ...settings, bellCurveSettings: buckets };
}

async function saveSettings(orgId, data, userContext) {
  const settings = await repo.saveSettings(orgId, data);
  
  if (Array.isArray(data.bellCurveSettings)) {
    const buckets = await repo.saveBellCurveSettings(orgId, data.bellCurveSettings);
    settings.bellCurveSettings = buckets;
  }

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: 'SAVE_PIP_SETTINGS',
    module: 'pip',
    target: 'pip_settings',
    entityId: orgId,
    metadata: settings
  });

  return settings;
}

// Candidates
async function getCandidate(orgId, candidateId) {
  const candidate = await repo.getCandidate(orgId, candidateId);
  if (!candidate) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Candidate not found.');
  return candidate;
}

async function listCandidates(orgId, filters) {
  return await repo.listCandidates(orgId, filters);
}

async function createCandidate(orgId, data, userContext) {
  // Checks if active PIP or active candidate already exists
  const existingPipList = await repo.listPips(orgId, { employee_id: data.employee_id });
  const activePip = existingPipList.find(p => ['ACTIVE', 'MONITORING'].includes(p.status));
  if (activePip) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Employee already has an active PIP or Monitoring plan.');
  }

  const existingCandList = await repo.listCandidates(orgId, { employee_id: data.employee_id });
  const activeCand = existingCandList.find(c => c.status === 'PENDING');
  if (activeCand) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Employee is already in the PIP candidate queue.');
  }

  let appraisalScore = null;
  const appraisalRes = await repo.getLatestEmployeeAppraisal(orgId, data.employee_id);
  if (appraisalRes) {
    appraisalScore = parseFloat(appraisalRes.final_score);
  }

  const candidate = await repo.createCandidate(orgId, {
    ...data,
    appraisal_score: appraisalScore,
    created_by: userContext.id
  });

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: 'CREATE_PIP_CANDIDATE',
    module: 'pip',
    target: 'pip_candidates',
    entityId: candidate.candidate_id,
    metadata: candidate
  });

  if (candidate.source === 'MANAGER_RECOMMENDATION') {
    await notificationService.notifyApprovalPending(orgId, candidate.employee_id, candidate.candidate_id);
  } else {
    await notificationService.notifyCandidateIdentified(orgId, candidate.employee_id, source);
  }

  return candidate;
}

async function reviewCandidate(orgId, candidateId, data, userContext) {
  const { status, remarks, template_id, reason, start_date, end_date, checkin_frequency, metrics } = data;
  const candidate = await repo.getCandidate(orgId, candidateId);
  if (!candidate) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Candidate not found.');
  if (candidate.status !== 'PENDING') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Candidate record has already been reviewed.');
  }

  const updatedCandidate = await repo.updateCandidateStatus(orgId, candidateId, status, remarks, userContext.id);

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: `REVIEW_PIP_CANDIDATE_${status}`,
    module: 'pip',
    target: 'pip_candidates',
    entityId: candidateId,
    metadata: { candidate: updatedCandidate, remarks }
  });

  if (status === 'APPROVED_PIP') {
    // Launch PIP
    const pipData = {
      employee_id: candidate.employee_id,
      candidate_id: candidateId,
      template_id,
      status: 'ACTIVE',
      start_date,
      end_date,
      checkin_frequency,
      reason: reason || candidate.recommendation_reason || 'Performance Improvement Plan required.',
      created_by: userContext.id,
      is_monitoring: false
    };

    const pip = await launchPip(orgId, pipData, metrics, userContext);
    return { candidate: updatedCandidate, pip };
  } else if (status === 'MONITORING') {
    // Launch Monitoring Stage instead of full PIP
    const pipData = {
      employee_id: candidate.employee_id,
      candidate_id: candidateId,
      template_id,
      status: 'MONITORING',
      start_date,
      end_date,
      checkin_frequency,
      reason: reason || candidate.recommendation_reason || 'Performance Monitoring stage.',
      created_by: userContext.id,
      is_monitoring: true
    };

    const pip = await launchPip(orgId, pipData, metrics, userContext);
    return { candidate: updatedCandidate, pip };
  }

  return { candidate: updatedCandidate };
}

// Active PIPs
async function launchPip(orgId, pipData, metrics, userContext) {
  const pip = await repo.createPip(orgId, pipData);

  // Save specific metrics
  const savedMetrics = await repo.savePipMetrics(pip.pip_id, metrics);
  pip.metrics = savedMetrics;

  // Generate blank check-ins based on dates and frequency
  await generateCheckinTimeline(orgId, pip);

  // Recalculate initial completion percentages and overall progress
  const refreshed = await refreshMetricValues(orgId, pip.pip_id);
  if (refreshed) {
    pip.metrics = refreshed.metrics;
    pip.overall_progress = refreshed.overallProgress;
  }

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: `LAUNCH_PIP_${pipData.status}`,
    module: 'pip',
    target: 'pips',
    entityId: pip.pip_id,
    metadata: pip
  });

  await notificationService.notifyPipStarted(orgId, pip.employee_id, pip.pip_id);

  return pip;
}

async function getPip(orgId, pipId) {
  const pip = await repo.getPip(orgId, pipId);
  if (!pip) throw new ApiError(STATUS_CODES.NOT_FOUND, 'PIP not found.');
  
  const metrics = await repo.getPipMetrics(pipId);
  const checkins = await repo.listCheckins(pipId);
  const history = await repo.getPipHistory(orgId, pip.employee_id);
  const evidence = await repo.getEvidence(pipId);

  return {
    ...pip,
    metrics,
    checkins,
    evidence,
    history: history.filter(h => h.pip_id !== pipId)
  };
}

async function listPips(orgId, filters) {
  return await repo.listPips(orgId, filters);
}

async function confirmRead(orgId, pipId, userContext) {
  const pip = await repo.getPip(orgId, pipId);
  if (!pip) throw new ApiError(STATUS_CODES.NOT_FOUND, 'PIP not found.');
  
  // Strict employee identity match
  if (userContext.role === 'employee' && pip.employee_id !== userContext.employeeId) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You do not have access to acknowledge this PIP.');
  }

  const updated = await repo.confirmRead(orgId, pipId);

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: 'CONFIRM_READ_PIP',
    module: 'pip',
    target: 'pips',
    entityId: pipId
  });

  return updated;
}

// Background / Dynamic refresh of current metrics values
async function refreshMetricValues(orgId, pipId) {
  const pip = await repo.getPip(orgId, pipId);
  if (!pip) throw new ApiError(STATUS_CODES.NOT_FOUND, 'PIP not found.');
  if (!['ACTIVE', 'MONITORING', 'EXTENDED'].includes(pip.status)) {
    return; // Do not recalculate closed PIPs
  }

  const metrics = await repo.getPipMetrics(pipId);
  const updatedMetrics = [];

  for (const m of metrics) {
    // Dynamic sources are fetched automatically, MANUAL / CUSTOM are left intact
    const liveVal = await metricService.getLiveMetricValue(
      orgId,
      pip.employee_id,
      m.metric_source,
      m.metric_key,
      pip.start_date,
      pip.end_date
    );

    let valToUse = liveVal;
    let isManualOrCustom = false;
    if (liveVal === null) {
      valToUse = parseFloat(m.current_value) || 0;
      isManualOrCustom = true;
    }

    let completion = 0.00;
    const target = parseFloat(m.target_value) || 0;
    const calcType = m.calculation_type || 'HIGHER_IS_BETTER';

    if (calcType === 'LOWER_IS_BETTER') {
      completion = valToUse <= target ? 100.00 : Math.max(0.00, (1 - ((valToUse - target) / (target || 1))) * 100);
    } else if (calcType === 'BOOLEAN') {
      completion = valToUse >= target ? 100.00 : 0.00;
    } else if (calcType === 'PERCENTAGE') {
      completion = Math.min(100.00, valToUse);
    } else if (calcType === 'RATING') {
      completion = Math.min(100.00, (valToUse / (target || 5.00)) * 100);
    } else {
      if (target > 0) {
        completion = Math.min(100.00, (valToUse / target) * 100);
      } else {
        completion = 0.00;
      }
    }

    completion = parseFloat(completion.toFixed(2));

    const updated = await repo.updateMetricProgress(
      m.pip_metric_id, 
      isManualOrCustom ? m.current_value : valToUse, 
      completion
    );
    updatedMetrics.push(updated);
  }

  // Recalculate overall progress
  const overallProgress = recommendationService.calculateOverallProgress(updatedMetrics);
  await repo.updateOverallProgress(orgId, pipId, overallProgress);

  return { metrics: updatedMetrics, overallProgress };
}

// Check-ins
async function completeCheckin(orgId, checkinId, checkinData, userContext) {
  const checkin = await repo.getCheckin(checkinId);
  if (!checkin) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Check-in slot not found.');

  const pip = await repo.getPip(orgId, checkin.pip_id);
  if (!pip) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Associated PIP not found.');

  // Store metric values at the check-in time
  if (Array.isArray(checkinData.metric_values)) {
    // Compute completion_pct for each value before saving
    for (const val of checkinData.metric_values) {
      const targetMetricRes = await query(`SELECT target_value, calculation_type FROM pip_metrics WHERE pip_metric_id = $1`, [val.pip_metric_id]);
      const targetMetric = targetMetricRes.rows[0];
      const targetVal = parseFloat(targetMetric?.target_value) || 0;
      const calcType = targetMetric?.calculation_type || 'HIGHER_IS_BETTER';

      let completion = 0.00;
      if (calcType === 'LOWER_IS_BETTER') {
        completion = val.current_value <= targetVal ? 100.00 : Math.max(0.00, (1 - ((val.current_value - targetVal) / (targetVal || 1))) * 100);
      } else if (calcType === 'BOOLEAN') {
        completion = val.current_value >= targetVal ? 100.00 : 0.00;
      } else if (calcType === 'PERCENTAGE') {
        completion = Math.min(100.00, val.current_value);
      } else if (calcType === 'RATING') {
        completion = Math.min(100.00, (val.current_value / (targetVal || 5.00)) * 100);
      } else {
        if (targetVal > 0) {
          completion = Math.min(100.00, (val.current_value / targetVal) * 100);
        } else {
          completion = 0.00;
        }
      }
      val.completion_pct = parseFloat(completion.toFixed(2));
      await repo.updateMetricProgress(val.pip_metric_id, val.current_value, val.completion_pct);
    }

    await repo.saveCheckinMetricValues(checkinId, checkinData.metric_values);
  }

  // Re-fetch progress
  const { overallProgress } = await refreshMetricValues(orgId, pip.pip_id);

  const completed = await repo.completeCheckin(checkinId, {
     ...checkinData,
     overall_progress_at_checkin: overallProgress
  });

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: 'COMPLETE_PIP_CHECKIN',
    module: 'pip',
    target: 'pip_checkins',
    entityId: checkinId,
    metadata: completed
  });

  // Calculate and trigger final suggestions if this was the last check-in
  const checkins = await repo.listCheckins(pip.pip_id);
  const allDone = checkins.every(c => c.checkin_id === checkinId || c.status === 'COMPLETED');
  if (allDone) {
    const settings = await repo.getSettings(orgId);
    const suggestion = recommendationService.generateRecommendation(overallProgress, settings);
    await notificationService.notifyRecommendationReady(orgId, pip.employee_id, pip.pip_id, suggestion.recommendation);
  }

  return completed;
}

async function addEmployeeComment(orgId, checkinId, comments, userContext) {
  const checkin = await repo.getCheckin(checkinId);
  if (!checkin) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Check-in slot not found.');

  const pip = await repo.getPip(orgId, checkin.pip_id);
  if (!pip) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Associated PIP not found.');

  if (pip.employee_id !== userContext.employeeId) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You can only comment on your own check-ins.');
  }

  const updated = await repo.updateEmployeeCheckinComments(checkinId, comments);

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: 'ADD_EMPLOYEE_CHECKIN_COMMENT',
    module: 'pip',
    target: 'pip_checkins',
    entityId: checkinId
  });

  return updated;
}

// HR final decision
async function processHrDecision(orgId, pipId, decisionData, userContext) {
  const { status, remarks, extension_end_date } = decisionData;
  const pip = await repo.getPip(orgId, pipId);
  if (!pip) throw new ApiError(STATUS_CODES.NOT_FOUND, 'PIP not found.');
  if (!['ACTIVE', 'MONITORING', 'EXTENDED'].includes(pip.status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'PIP is already in a completed/closed state.');
  }

  let result;
  if (status === 'EXTENDED') {
    if (!extension_end_date) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Extension end date must be specified.');
    }
    const settings = await repo.getSettings(orgId);
    if (pip.extension_count >= settings.max_extension_count) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, `Maximum extensions count reached (${settings.max_extension_count}). Cannot extend.`);
    }

    result = await repo.extendPip(orgId, pipId, extension_end_date, remarks);
    // Re-generate future check-in timelines
    await generateCheckinTimeline(orgId, result, true);
  } else {
    result = await repo.updatePipStatus(orgId, pipId, status, remarks, userContext.id);
  }

  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: `PROCESS_HR_PIP_DECISION_${status}`,
    module: 'pip',
    target: 'pips',
    entityId: pipId,
    metadata: { decision: status, remarks }
  });

  await notificationService.notifyPipClosed(orgId, pip.employee_id, pipId, status);

  return result;
}

// Evidence uploads
async function uploadEvidence(orgId, pipId, checkinId, uploadedBy, file, description) {
  const path = `/uploads/pip/${Date.now()}_${file.name}`;
  const evidence = await repo.createEvidence(pipId, checkinId, uploadedBy, file.name, path, description);
  return evidence;
}

// Helper to generate checkin slot schedules dynamically
async function generateCheckinTimeline(orgId, pip, isExtension = false) {
  const start = new Date(pip.start_date);
  const end = new Date(pip.end_date);
  let intervalDays = 7;

  if (pip.checkin_frequency === 'BIWEEKLY') intervalDays = 14;
  else if (pip.checkin_frequency === 'MONTHLY') intervalDays = 30;

  let current = new Date(start);
  if (isExtension) {
    // If extending, start generating from the current day onwards
    current = new Date();
  } else {
    current.setDate(current.getDate() + intervalDays);
  }

  while (current <= end) {
    const checkinDateStr = current.toISOString().split('T')[0];
    await repo.createCheckin(pip.pip_id, {
      checkin_date: checkinDateStr,
      status: 'PENDING'
    });
    current.setDate(current.getDate() + intervalDays);
  }
}

// Helper query function for transaction actions
async function query(sql, params) {
  const db = require('../../config/db');
  return db.query(sql, params);
}

async function getLatestEmployeeAppraisal(orgId, employeeId) {
  return await repo.getLatestEmployeeAppraisal(orgId, employeeId);
}

async function convertToPip(orgId, monitoringPipId, conversionData, userContext) {
  const { template_id, start_date, end_date, checkin_frequency, reason, metrics } = conversionData;

  const monitoringPip = await repo.getPip(orgId, monitoringPipId);
  if (!monitoringPip) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Monitoring plan not found.');
  if (!['MONITORING', 'EXTENDED'].includes(monitoringPip.status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only plans in MONITORING or EXTENDED status can be converted.');
  }

  // Create new active PIP linked via parent_pip_id
  const newPip = await repo.createPip(orgId, {
    employee_id: monitoringPip.employee_id,
    template_id: template_id || monitoringPip.template_id,
    status: 'ACTIVE',
    start_date,
    end_date,
    checkin_frequency: checkin_frequency || 'WEEKLY',
    reason: reason || `Converted from Monitoring Plan. Original reason: ${monitoringPip.reason}`,
    parent_pip_id: monitoringPipId,
    created_by: userContext.id
  });

  // Save metrics for the new PIP
  if (Array.isArray(metrics)) {
    await repo.savePipMetrics(newPip.pip_id, metrics);
  }

  // Update monitoring plan status to ESCALATED
  await repo.updatePipStatus(orgId, monitoringPipId, 'ESCALATED', `Converted to Active PIP on ${new Date().toLocaleDateString()}. Reason: ${reason}`, userContext.id);

  // Generate checkin schedule for the new PIP
  await generateCheckinTimeline(orgId, newPip);

  // Recalculate converted PIP progress
  await refreshMetricValues(orgId, newPip.pip_id);

  // Log audit
  await logAudit({
    organizationId: orgId,
    actorId: userContext.id,
    actorEmail: userContext.email,
    actorRole: userContext.role,
    action: 'CONVERT_MONITORING_TO_PIP',
    module: 'pip',
    target: 'pips',
    entityId: newPip.pip_id,
    metadata: { parent_pip_id: monitoringPipId, reason }
  });

  return newPip;
}

async function getMetricTrendSnapshots(orgId, pipId) {
  const pip = await repo.getPip(orgId, pipId);
  if (!pip) throw new ApiError(STATUS_CODES.NOT_FOUND, 'PIP not found.');
  return await repo.getMetricTrendSnapshots(pipId);
}

module.exports = {
  getLatestEmployeeAppraisal,
  getSettings,
  saveSettings,
  getCandidate,
  listCandidates,
  createCandidate,
  reviewCandidate,
  getPip,
  listPips,
  confirmRead,
  refreshMetricValues,
  completeCheckin,
  addEmployeeComment,
  processHrDecision,
  uploadEvidence,
  convertToPip,
  getMetricTrendSnapshots
};
