const repo = require('./competencyAssessment.repository');
const { logActivity } = require('../auditLog/auditLog.service');
const notifRepo = require('../inAppNotification/inAppNotification.repository');
const { query } = require('../../config/db');

// Helper to assert technique enabled
async function _assertCompetencyAssessmentEnabled(orgId) {
  const res = await query(
    `SELECT cm.is_enabled 
     FROM client_modules cm
     JOIN client_admins ca ON ca.client_admin_id = cm.client_admin_id
     WHERE ca.organization_id = $1 AND cm.module_key = 'competency_assessment'`,
    [orgId]
  );
  // Default to enabled if not configured, or if is_enabled is true
  if (res.rows.length > 0 && !res.rows[0].is_enabled) {
    const err = new Error('Competency Assessment performance technique is currently disabled for your organization.');
    err.statusCode = 403;
    throw err;
  }
}

// Helper to update parent goal stats
async function recalculateParentGoalStats(goalId) {
  const stats = await repo.getGoalAssignmentsOverview(goalId);
  
  // Update parent goal record with average progress
  await query(
    `UPDATE goals 
     SET progress = $2, updated_at = NOW()
     WHERE goal_id = $1`,
    [goalId, stats.avg_progress || 0.00]
  );

  return stats;
}

// --- Global Competency Library CRUD ---
async function getLibrary(orgId) {
  await _assertCompetencyAssessmentEnabled(orgId);
  return repo.listLibrary(orgId);
}

async function saveLibraryCompetency(orgId, data, actorUser) {
  await _assertCompetencyAssessmentEnabled(orgId);
  const { competency_id, name, description, indicators = [] } = data;

  if (!name || !name.trim()) {
    const err = new Error('Competency name is required.');
    err.statusCode = 400;
    throw err;
  }

  let savedComp;
  if (competency_id) {
    savedComp = await repo.updateLibraryComp(competency_id, orgId, name.trim(), description);
    if (!savedComp) {
      const err = new Error('Competency not found or unauthorized.');
      err.statusCode = 404;
      throw err;
    }
  } else {
    savedComp = await repo.createLibraryComp(orgId, name.trim(), description);
  }

  // Save behavioral indicators (1-5 rating levels)
  await repo.clearIndicators(savedComp.competency_id);
  for (const ind of indicators) {
    const ratingLevel = parseInt(ind.rating_level, 10);
    if (ratingLevel >= 1 && ratingLevel <= 5 && ind.behavioral_indicator?.trim()) {
      await repo.createIndicator(savedComp.competency_id, ratingLevel, ind.behavioral_indicator.trim());
    }
  }

  // Get full record back with indicators
  const fullRecord = await repo.getLibraryById(savedComp.competency_id, orgId);

  // Log activity
  await logActivity({
    organizationId: orgId,
    actorUserId: actorUser.userId,
    actorRole: actorUser.role,
    moduleName: 'competency_assessment',
    actionName: competency_id ? 'UPDATE_LIBRARY_COMPETENCY' : 'ADD_LIBRARY_COMPETENCY',
    entityName: 'competency_library',
    entityId: savedComp.competency_id,
    entityDisplayName: `Competency: ${name}`,
  });

  // Notify team
  const clientAdminRes = await query(`SELECT employee_id FROM users WHERE organization_id = $1`, [orgId]);
  const userIds = clientAdminRes.rows.map(u => u.employee_id).filter(Boolean);
  await notifRepo.createNotificationForMany(
    userIds,
    'COMPETENCY_LIBRARY_UPDATED',
    '📢 Competency Library updated by Client Admin',
    `The competency library was updated. Competency "${name}" is now available.`,
    savedComp.competency_id,
    'competency_library'
  );

  return fullRecord;
}

async function deleteLibraryCompetency(orgId, competencyId, actorUser) {
  await _assertCompetencyAssessmentEnabled(orgId);
  const deleted = await repo.deleteLibraryComp(competencyId, orgId);
  if (!deleted) {
    const err = new Error('Competency not found or unauthorized.');
    err.statusCode = 404;
    throw err;
  }

  // Log activity
  await logActivity({
    organizationId: orgId,
    actorUserId: actorUser.userId,
    actorRole: actorUser.role,
    moduleName: 'competency_assessment',
    actionName: 'DELETE_LIBRARY_COMPETENCY',
    entityName: 'competency_library',
    entityId: competencyId,
    entityDisplayName: `Deleted Competency ID: ${competencyId}`,
  });

  return deleted;
}

// --- Rating Scales ---
async function getRatingScales(orgId) {
  await _assertCompetencyAssessmentEnabled(orgId);
  return repo.listRatingScales(orgId);
}

async function saveRatingScales(orgId, scales = [], actorUser) {
  await _assertCompetencyAssessmentEnabled(orgId);
  for (const scale of scales) {
    const level = parseInt(scale.rating_level, 10);
    if (level >= 1 && level <= 5 && scale.label?.trim()) {
      await repo.updateRatingScale(orgId, level, scale.label.trim());
    }
  }

  // Log activity
  await logActivity({
    organizationId: orgId,
    actorUserId: actorUser.userId,
    actorRole: actorUser.role,
    moduleName: 'competency_assessment',
    actionName: 'UPDATE_RATING_SCALES',
    entityName: 'competency_rating_scales',
    entityId: orgId,
    entityDisplayName: 'Rating scale levels 1-5 updated',
  });

  return repo.listRatingScales(orgId);
}

// --- Goal Competency Template Config ---
async function getGoalCompetencies(goalId, orgId) {
  await _assertCompetencyAssessmentEnabled(orgId);
  return repo.listGoalCompetencies(goalId);
}

async function saveGoalCompetencies(goalId, orgId, competencies = [], actorUser) {
  await _assertCompetencyAssessmentEnabled(orgId);

  // Check goal technique
  const goalRes = await query(`SELECT performance_technique, title FROM goals WHERE goal_id = $1 AND organization_id = $2`, [goalId, orgId]);
  const goal = goalRes.rows[0];
  if (!goal) {
    const err = new Error('Goal not found.');
    err.statusCode = 404;
    throw err;
  }
  if (goal.performance_technique !== 'COMPETENCY_ASSESSMENT') {
    const err = new Error(`Goal uses technique '${goal.performance_technique}'. Template configuration is locked.`);
    err.statusCode = 400;
    throw err;
  }

  // Validate weights sum to 100%
  let totalWeight = 0;
  for (const comp of competencies) {
    totalWeight += parseFloat(comp.weight || 0);
  }
  if (Math.abs(totalWeight - 100) > 0.01) {
    const err = new Error('Total competency weight distribution must sum up to exactly 100%.');
    err.statusCode = 400;
    throw err;
  }

  await repo.clearGoalCompetencies(goalId);
  const savedList = [];
  let displayOrder = 0;
  for (const comp of competencies) {
    const saved = await repo.createGoalCompetency(
      goalId,
      comp.competency_library_id || null,
      comp.name.trim(),
      comp.description,
      parseFloat(comp.weight),
      displayOrder++
    );
    savedList.push(saved);
  }

  // Log activity
  await logActivity({
    organizationId: orgId,
    actorUserId: actorUser.userId,
    actorRole: actorUser.role,
    moduleName: 'competency_assessment',
    actionName: 'CONFIGURE_GOAL_COMPETENCIES',
    entityName: 'goal',
    entityId: goalId,
    entityDisplayName: `Configured Competencies for Goal: ${goal.title}`,
  });

  return savedList;
}

// --- Rating Workflow & Assessments ---
async function getCoachingDetails(goalId, assignmentId, orgId) {
  await _assertCompetencyAssessmentEnabled(orgId);

  // Fetch scales and template competencies
  const scales = await repo.listRatingScales(orgId);
  const competencies = await repo.listGoalCompetencies(goalId);
  const ratings = await repo.getAssessmentsByAssignment(assignmentId);
  
  // Fetch assignment info
  const assignRes = await query(
    `SELECT ga.*, e.first_name, e.last_name, e.employee_id
     FROM goal_assignments ga
     JOIN employees e ON e.employee_id = ga.employee_id
     WHERE ga.assignment_id = $1 AND ga.organization_id = $2`,
    [assignmentId, orgId]
  );
  const assignment = assignRes.rows[0];

  // Fetch competency indicator guides for assistance
  const compIds = competencies.map(c => c.competency_library_id).filter(Boolean);
  let indicators = [];
  if (compIds.length > 0) {
    const indRes = await query(
      `SELECT * FROM competency_indicators WHERE competency_id = ANY($1) ORDER BY rating_level`,
      [compIds]
    );
    indicators = indRes.rows;
  }

  return {
    assignment,
    scales,
    competencies,
    ratings,
    indicators
  };
}

async function saveRatings(goalId, assignmentId, orgId, payload = {}, actorUser) {
  await _assertCompetencyAssessmentEnabled(orgId);
  const { ratings = [], isSubmit = false, outcome = null } = payload;

  const goalRes = await query(`SELECT title, progress FROM goals WHERE goal_id = $1`, [goalId]);
  const goal = goalRes.rows[0];

  const assignRes = await query(
    `SELECT ga.*, e.first_name, e.last_name, e.employee_id
     FROM goal_assignments ga
     JOIN employees e ON e.employee_id = ga.employee_id
     WHERE ga.assignment_id = $1`,
    [assignmentId]
  );
  const assignment = assignRes.rows[0];
  if (!assignment) {
    const err = new Error('Assignment not found.');
    err.statusCode = 404;
    throw err;
  }

  // Get goal competencies configured
  const competencies = await repo.listGoalCompetencies(goalId);
  const compMap = new Map(competencies.map(c => [c.goal_competency_id, c]));

  // Save rating rows
  for (const item of ratings) {
    const comp = compMap.get(item.goal_competency_id);
    if (!comp) continue;

    const rating = parseInt(item.rating, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      const err = new Error(`Rating level for ${comp.name} must be between 1 and 5.`);
      err.statusCode = 400;
      throw err;
    }

    await repo.saveAssessmentRating(
      orgId,
      goalId,
      assignmentId,
      item.goal_competency_id,
      rating,
      item.comment,
      actorUser.userId
    );
  }

  // Recalculate progress & score
  const savedRatings = await repo.getAssessmentsByAssignment(assignmentId);
  const ratingsMap = new Map(savedRatings.map(r => [r.goal_competency_id, r.rating]));

  let progress = 0;
  let score = 0;
  if (competencies.length > 0) {
    const ratedCount = savedRatings.filter(r => r.rating !== null).length;
    progress = Math.round((ratedCount / competencies.length) * 100);

    let weightedScoreSum = 0;
    for (const comp of competencies) {
      const rateVal = ratingsMap.get(comp.goal_competency_id) || 0;
      // Convert to score percentage (e.g. 4 on a 5-scale contributes 4/5 * weight)
      weightedScoreSum += (rateVal / 5.0) * parseFloat(comp.weight);
    }
    score = Math.round(weightedScoreSum * 100) / 100;
  }

  let finalAssign = await repo.updateAssignmentScoreAndProgress(assignmentId, progress, score);

  // If submitting / finalizing assignment
  if (isSubmit) {
    if (progress < 100) {
      const err = new Error('All competencies must be rated before submitting the assessment.');
      err.statusCode = 400;
      throw err;
    }
    if (!outcome || !['ACHIEVED', 'NEEDS_DEVELOPMENT'].includes(outcome)) {
      const err = new Error('Completion outcome is required to finalise evaluation (ACHIEVED or NEEDS_DEVELOPMENT).');
      err.statusCode = 400;
      throw err;
    }

    // Set completed status
    await query(
      `UPDATE goal_assignments 
       SET status = 'COMPLETED', completion_outcome = $2, completed_at = NOW(), updated_at = NOW()
       WHERE assignment_id = $1`,
      [assignmentId, outcome]
    );

    // Recalculate stats on parent goal
    const oldGoalProgress = goal.progress || 0.00;
    const stats = await recalculateParentGoalStats(goalId);
    const newGoalProgress = stats.avg_progress || 0.00;

    // Log progress history
    await query(
      `INSERT INTO goal_progress_history (goal_id, organization_id, old_progress, new_progress, status, comment, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [goalId, orgId, oldGoalProgress, newGoalProgress, 'COMPLETED', `Competency assessment submitted for ${assignment.first_name} ${assignment.last_name}. Final Score: ${score}%`, actorUser.userId]
    );

    // Log Activity
    await logActivity({
      organizationId: orgId,
      actorUserId: actorUser.userId,
      actorRole: actorUser.role,
      moduleName: 'competency_assessment',
      actionName: 'COMPLETE_ASSESSMENT',
      entityName: 'goal_assignment',
      entityId: assignmentId,
      entityDisplayName: `Evaluation finalized for ${assignment.first_name} ${assignment.last_name}`,
    });

    // Notify employee
    await notifRepo.createNotification(
      assignment.employee_id,
      'COMPETENCY_ASSESSMENT_COMPLETED',
      `⭐ Manager completed Competency Assessment for ${goal.title}`,
      `Your assessment has been finalized with a score of ${score}% and outcome: ${outcome}.`,
      assignmentId,
      'goal_assignment'
    );
  } else {
    // Notify employee of pending / draft changes
    await notifRepo.createNotification(
      assignment.employee_id,
      'COMPETENCY_ASSESSMENT_PENDING',
      `⏳ Competency Assessment pending for ${goal.title}`,
      `Your manager has draft updates on your competency assessment progress (${progress}% rated).`,
      assignmentId,
      'goal_assignment'
    );
  }

  return getCoachingDetails(goalId, assignmentId, orgId);
}

async function acknowledgeAssessment(goalId, assignmentId, orgId, actorUser) {
  await _assertCompetencyAssessmentEnabled(orgId);

  const assignRes = await query(
    `SELECT ga.*, e.first_name, e.last_name, e.employee_id, u.employee_id AS user_emp_id
     FROM goal_assignments ga
     JOIN employees e ON e.employee_id = ga.employee_id
     JOIN users u ON u.user_id = ga.assigned_by
     WHERE ga.assignment_id = $1`,
    [assignmentId]
  );
  const assignment = assignRes.rows[0];
  if (!assignment) {
    const err = new Error('Assignment not found.');
    err.statusCode = 404;
    throw err;
  }

  const goalRes = await query(`SELECT title, progress FROM goals WHERE goal_id = $1`, [goalId]);
  const goal = goalRes.rows[0];

  // Acknowledge assignment
  await repo.acknowledgeAssignment(assignmentId);

  // Log progress history
  await query(
    `INSERT INTO goal_progress_history (goal_id, organization_id, old_progress, new_progress, status, comment, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [goalId, orgId, goal.progress || 0.00, goal.progress || 0.00, 'COMPLETED', `${assignment.first_name} ${assignment.last_name} acknowledged competency assessment`, actorUser.userId]
  );

  // Log activity
  await logActivity({
    organizationId: orgId,
    actorUserId: actorUser.userId,
    actorRole: actorUser.role,
    moduleName: 'competency_assessment',
    actionName: 'ACKNOWLEDGE_ASSESSMENT',
    entityName: 'goal_assignment',
    entityId: assignmentId,
    entityDisplayName: `${assignment.first_name} ${assignment.last_name} acknowledged competency assessment`,
  });

  // Notify manager
  if (assignment.user_emp_id) {
    await notifRepo.createNotification(
      assignment.user_emp_id,
      'COMPETENCY_ASSESSMENT_ACKNOWLEDGED',
      `✅ ${assignment.first_name} ${assignment.last_name} acknowledged Competency Assessment`,
      `The employee has acknowledged their final scores for "${goal.title}".`,
      assignmentId,
      'goal_assignment'
    );
  }

  return getCoachingDetails(goalId, assignmentId, orgId);
}

async function getCompetencyGapReport(orgId, filters = {}) {
  await _assertCompetencyAssessmentEnabled(orgId);
  return repo.getCompetencyGapReport(orgId, filters);
}

async function getRatingDistributionReport(orgId, filters = {}) {
  await _assertCompetencyAssessmentEnabled(orgId);
  return repo.getRatingDistributionReport(orgId, filters);
}

async function getAverageRatingReport(orgId, filters = {}) {
  await _assertCompetencyAssessmentEnabled(orgId);
  return repo.getAverageRatingReport(orgId, filters);
}

async function listAssessments(orgId, filters = {}) {
  await _assertCompetencyAssessmentEnabled(orgId);
  return repo.listAssessments(orgId, filters);
}

module.exports = {
  getLibrary,
  saveLibraryCompetency,
  deleteLibraryCompetency,
  getRatingScales,
  saveRatingScales,
  getGoalCompetencies,
  saveGoalCompetencies,
  getCoachingDetails,
  saveRatings,
  acknowledgeAssessment,
  recalculateParentGoalStats,
  getCompetencyGapReport,
  getRatingDistributionReport,
  getAverageRatingReport,
  listAssessments
};
