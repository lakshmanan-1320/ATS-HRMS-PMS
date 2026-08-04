const repo = require('./selfAssessment.repository');
const goalRepo = require('../goal/goal.repository');
const { logActivity } = require('../auditLog/auditLog.service');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { query } = require('../../config/db');

// Supported rating question types and their maximum values
const RATING_TYPES = {
  RATING_1_5: 5,
  SCALE_1_10: 10,
  PERCENTAGE: 100,
  YES_NO: 100 // We will treat Yes as 100, No as 0
};

function getQuestionMaxRating(questionType) {
  return RATING_TYPES[questionType] || null;
}

function calculateWeightedScore(answers, ratingField, fallbackMaxRating = null) {
  // Normalize using only the questions that actually have a numeric rating.
  // This preserves enterprise-standard scoring for mixed questionnaire types.
  // Example:
  //   scored = Σ((rating / max_rating) * weight)
  //   final = (scored / total_rated_weight) * 100
  // Non-ratable text/evidence questions are ignored in numeric score calculation.
  let totalRatingWeight = 0;
  let weightedScoreSum = 0;

  for (const ans of answers) {
    const maxVal = getQuestionMaxRating(ans.question_type) || fallbackMaxRating;
    const weight = parseFloat(ans.weight || 0);
    const val = ans[ratingField] !== null && ans[ratingField] !== undefined ? parseFloat(ans[ratingField]) : null;

    if (maxVal && weight > 0 && val !== null) {
      const normalized = (val / maxVal) * 100;
      weightedScoreSum += normalized * (weight / 100);
      totalRatingWeight += weight;
    }
  }

  if (totalRatingWeight === 0) return 0.00;
  // Normalize score in case only some questions have ratings
  return parseFloat(((weightedScoreSum / (totalRatingWeight / 100))).toFixed(2));
}

function isRatableQuestion(questionType) {
  return getQuestionMaxRating(questionType) !== null;
}

function buildManagerReviewPayload(existingAnswers, providedAnswers) {
  return existingAnswers.map(ans => {
    const provided = providedAnswers.find(item => item.template_id === ans.template_id) || {};
    const rating = provided.manager_rating !== undefined && provided.manager_rating !== null
      ? Number(provided.manager_rating)
      : null;
    const maxVal = getQuestionMaxRating(ans.question_type) || null;
    const weight = parseFloat(ans.weight || 0);
    const weightedScore = (maxVal && weight > 0 && rating !== null && Number.isFinite(rating))
      ? parseFloat((((rating / maxVal) * 100) * (weight / 100)).toFixed(2))
      : null;

    return {
      template_id: ans.template_id,
      manager_rating: rating,
      manager_comment: provided.manager_comment || ans.manager_comment || null,
      weighted_score: weightedScore
    };
  });
}

async function reconcileSubmissionScores(submissionId, submission, answers) {
  const employeeScore = calculateWeightedScore(answers, 'employee_rating');
  const managerScore = calculateWeightedScore(answers, 'manager_rating', 5);
  const finalScore = submission.status === 'APPROVED' ? managerScore : null;

  const needsUpdate = (
    parseFloat(submission.overall_employee_score || 0) !== employeeScore ||
    (submission.status === 'APPROVED' && parseFloat(submission.overall_manager_score || 0) !== managerScore) ||
    (submission.status === 'APPROVED' && parseFloat(submission.final_score || 0) !== finalScore)
  );

  if (needsUpdate) {
    await query(
      `UPDATE self_assessment_submissions
       SET overall_employee_score = $1,
           overall_manager_score = $2,
           final_score = $3,
           updated_at = NOW()
       WHERE submission_id = $4`,
      [employeeScore, submission.status === 'APPROVED' ? managerScore : null, finalScore, submissionId]
    );
    submission.overall_employee_score = employeeScore;
    submission.overall_manager_score = submission.status === 'APPROVED' ? managerScore : null;
    submission.final_score = finalScore;
  }

  return submission;
}

async function getSelfAssessmentTemplate(goalId, orgId) {
  const goal = await goalRepo.getGoalById(orgId, goalId);
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.');
  if (goal.performance_technique !== 'SELF_ASSESSMENT') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Goal is not configured for Self Assessment.');
  }
  return repo.getSelfAssessmentTemplate(goalId, orgId);
}

async function saveSelfAssessmentTemplate(orgId, goalId, questions, createdBy) {
  const goal = await goalRepo.getGoalById(orgId, goalId);
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.');
  if (goal.performance_technique !== 'SELF_ASSESSMENT') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Goal is not configured for Self Assessment.');
  }

  // Check lock
  const locked = await repo.isTemplateLocked(goalId, orgId);
  if (locked) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Self Assessment template is locked because responses exist.');
  }

  // Validate weights sum to 100%
  let totalWeight = 0;
  for (const q of questions) {
    totalWeight += parseFloat(q.weight || 0);
  }
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Total question weight must sum to exactly 100%. Current total: ${totalWeight.toFixed(2)}%`);
  }

  const saved = await repo.saveSelfAssessmentTemplate(orgId, goalId, questions, createdBy);

  await logActivity({
    organizationId: orgId,
    actorUserId: createdBy,
    actorRole: 'client_admin',
    moduleName: 'self_assessment',
    actionName: 'SAVE_TEMPLATE',
    entityName: 'self_assessment_template',
    entityId: goalId,
    entityDisplayName: `Self Assessment Template: ${goal.title}`
  });

  return saved;
}

async function resolveSubmission(goalId, assignmentId, orgId, actor) {
  const assignmentRes = await query(
    `SELECT employee_id
     FROM goal_assignments
     WHERE assignment_id = $1 AND goal_id = $2 AND organization_id = $3`,
    [assignmentId, goalId, orgId]
  );
  const assignment = assignmentRes.rows[0];
  if (!assignment) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal assignment not found.');
  }

  const privilegedRoles = ['manager', 'hr', 'client_admin', 'super_admin'];
  if (!privilegedRoles.includes(actor.role) && actor.employeeId !== assignment.employee_id) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You can only access your own self assessment.');
  }

  let submission = await repo.getSubmissionByAssignmentId(assignmentId, orgId);
  if (!submission) {
    submission = await repo.createSubmission({
      organization_id: orgId,
      goal_id: goalId,
      assignment_id: assignmentId,
      employee_id: assignment.employee_id
    });
  }

  return submission;
}

async function getSubmissionAndAnswers(goalId, assignmentId, orgId, actor) {
  const submission = await resolveSubmission(goalId, assignmentId, orgId, actor);

  const templateQuestions = await repo.getSelfAssessmentTemplate(goalId, orgId);
  const answers = await repo.getAnswersForSubmission(submission.submission_id);

  // Auto-insert any missing answers for templates
  const missingQuestions = templateQuestions.filter(
    q => !answers.some(a => a.template_id === q.template_id)
  );

  if (missingQuestions.length > 0) {
    const missingAnswersPayload = missingQuestions.map(q => ({
      template_id: q.template_id,
      answer: '',
      employee_rating: null,
      employee_comment: '',
      weight: q.weight
    }));
    await repo.saveDraftAnswers(submission.submission_id, missingAnswersPayload);
  }

  const refreshedAnswers = await repo.getAnswersForSubmission(submission.submission_id);
  const attachments = await repo.getAttachmentsForSubmission(submission.submission_id);

  const reconciledSubmission = await reconcileSubmissionScores(submission.submission_id, submission, refreshedAnswers);

  return {
    submission: {
      ...reconciledSubmission,
      employee_score: reconciledSubmission.overall_employee_score,
      manager_score: reconciledSubmission.overall_manager_score
    },
    answers: refreshedAnswers,
    attachments
  };
}

async function saveDraftAnswers(orgId, submissionId, answers, userId, role) {
  const subRes = await query(`SELECT goal_id, assignment_id, employee_id FROM self_assessment_submissions WHERE submission_id = $1`, [submissionId]);
  if (subRes.rows.length === 0) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Submission not found.');
  const { goal_id, assignment_id, employee_id } = subRes.rows[0];

  // Save drafts
  await repo.saveDraftAnswers(submissionId, answers);

  // Recalculate progress
  const goalAssignmentService = require('../goal/goalAssignment.service');
  await goalAssignmentService.recalculateGoalProgress(orgId, goal_id, employee_id);

  return { success: true };
}

async function submitAssessment(orgId, submissionId, employeeComments, answers, userId, role) {
  const subRes = await query(`SELECT goal_id, assignment_id, employee_id FROM self_assessment_submissions WHERE submission_id = $1`, [submissionId]);
  if (subRes.rows.length === 0) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Submission not found.');
  const { goal_id, assignment_id, employee_id } = subRes.rows[0];

  // Validate required questions
  const templateQuestions = await repo.getSelfAssessmentTemplate(goal_id, orgId);
  const attachments = await repo.getAttachmentsForSubmission(submissionId);
  for (const q of templateQuestions) {
    if (q.required) {
      const ans = answers.find(a => a.template_id === q.template_id);
      const val = ans ? (ans.answer || '').trim() : '';
      const rating = ans ? ans.employee_rating : null;
      const hasAttachment = attachments.some(attachment => attachment.template_id === q.template_id);
      if (!val && rating === null && !hasAttachment) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Answer to question "${q.question}" is required.`);
      }
    }
  }

  // Save final draft
  await repo.saveDraftAnswers(submissionId, answers);

  // Fetch answers to calculate score
  const dbAnswers = await repo.getAnswersForSubmission(submissionId);
  const employeeScore = calculateWeightedScore(dbAnswers, 'employee_rating');

  const submission = await repo.submitAssessment(submissionId, employeeComments, employeeScore);

  const responseSubmission = {
    ...submission,
    employee_score: submission.overall_employee_score,
    manager_score: submission.overall_manager_score
  };

  // Recalculate progress (locks to 70%)
  const gaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [assignment_id]);
  const oldProgress = gaRes.rows[0]?.progress || 0.00;

  const goalAssignmentService = require('../goal/goalAssignment.service');
  await goalAssignmentService.recalculateGoalProgress(orgId, goal_id, employee_id);

  const newGaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [assignment_id]);
  const newProgress = newGaRes.rows[0]?.progress || 70.00;

  // Log Timeline
  await query(
    `INSERT INTO goal_progress_history (goal_id, organization_id, old_progress, new_progress, status, comment, updated_by) 
     VALUES ($1, $2, $3, $4, 'ACTIVE', 'Self assessment submitted by employee', $5)`,
    [goal_id, orgId, oldProgress, newProgress, userId]
  );

  // Trigger notification to manager
  const empRes = await query(`SELECT manager_employee_id, first_name, last_name FROM employees WHERE employee_id = $1`, [employee_id]);
  if (empRes.rows.length > 0 && empRes.rows[0].manager_employee_id) {
    const managerEmpId = empRes.rows[0].manager_employee_id;
    const notifRepo = require('../inAppNotification/inAppNotification.repository');
    try {
      await notifRepo.createNotification(
        managerEmpId,
        'GOAL',
        'Evaluation Submitted',
        `🙋 ${empRes.rows[0].first_name} ${empRes.rows[0].last_name} submitted their Self Assessment.`,
        goal_id,
        'GOAL'
      );
    } catch (_) {}
  }

  return submission;
}

async function reviewAssessment(orgId, submissionId, reviewerId, role, { status, managerComments, answers }) {
  if (!['APPROVED', 'RETURNED'].includes(status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid review status decision.');
  }

  const subRes = await query(`SELECT goal_id, assignment_id, employee_id FROM self_assessment_submissions WHERE submission_id = $1`, [submissionId]);
  if (subRes.rows.length === 0) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Submission not found.');
  const { goal_id, assignment_id, employee_id } = subRes.rows[0];

  if (status === 'APPROVED') {
    const existingAnswers = await repo.getAnswersForSubmission(submissionId);
    const reviewPayload = buildManagerReviewPayload(existingAnswers, answers);

    const ratingQuestions = existingAnswers.filter(ans => isRatableQuestion(ans.question_type));
    if (ratingQuestions.length === 0) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot approve self assessment without at least one rating-based question.');
    }

    const missingManagerRating = ratingQuestions.find(answer => {
      const provided = reviewPayload.find(item => item.template_id === answer.template_id) || {};
      const rating = provided.manager_rating;
      const maxVal = getQuestionMaxRating(answer.question_type);
      return rating === null || rating === undefined || !Number.isFinite(Number(rating)) || rating < 0 || rating > maxVal;
    });
    if (missingManagerRating) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, `Manager rating is required and must be within the allowed range for question "${missingManagerRating.question}".`);
    }

    // Save manager review ratings and comments with per-question weighted values
    await repo.saveManagerAnswers(submissionId, reviewPayload);

    const dbAnswers = await repo.getAnswersForSubmission(submissionId);
    const managerScore = calculateWeightedScore(dbAnswers, 'manager_rating', 5);
    const finalScore = managerScore;

    console.debug('[SelfAssessment] computed managerScore=%s finalScore=%s answers=%o', managerScore, finalScore, dbAnswers.map(a => ({ template_id: a.template_id, question: a.question, manager_rating: a.manager_rating, weight: a.weight })));

    const submission = await repo.reviewAssessment(submissionId, {
      status: 'APPROVED',
      managerComments,
      managerScore,
      finalScore,
      reviewerId
    });

    const reconciledSubmission = await reconcileSubmissionScores(submissionId, submission, dbAnswers);
    const responseSubmission = {
      ...reconciledSubmission,
      employee_score: reconciledSubmission.overall_employee_score,
      manager_score: reconciledSubmission.overall_manager_score
    };

    // Update assignment final score
    await query(
      `UPDATE goal_assignments SET weighted_score = $1 WHERE assignment_id = $2`,
      [finalScore, assignment_id]
    );

    // Recalculate progress (100%)
    const gaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [assignment_id]);
    const oldProgress = gaRes.rows[0]?.progress || 70.00;

    const goalAssignmentService = require('../goal/goalAssignment.service');
    await goalAssignmentService.recalculateGoalProgress(orgId, goal_id, employee_id);

    const newGaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [assignment_id]);
    const newProgress = newGaRes.rows[0]?.progress || 100.00;

    // Log timeline
    await query(
      `INSERT INTO goal_progress_history (goal_id, organization_id, old_progress, new_progress, status, comment, updated_by) 
       VALUES ($1, $2, $3, $4, 'ACTIVE', 'Self assessment approved by manager', $5)`,
      [goal_id, orgId, oldProgress, newProgress, reviewerId]
    );

    // Notify employee
    const notifRepo = require('../inAppNotification/inAppNotification.repository');
    try {
      await notifRepo.createNotification(
        employee_id,
        'GOAL',
        'Assessment Approved',
        `🎉 Your Self Assessment has been approved. Final Score: ${finalScore}%`,
        goal_id,
        'GOAL'
      );
    } catch (_) {}

    return responseSubmission;
  } else {
    // RETURNED
    const submission = await repo.reviewAssessment(submissionId, {
      status: 'RETURNED',
      managerComments,
      managerScore: null,
      finalScore: null,
      reviewerId
    });

    // Recalculate progress back to draft ratio
    const gaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [assignment_id]);
    const oldProgress = gaRes.rows[0]?.progress || 70.00;

    const goalAssignmentService = require('../goal/goalAssignment.service');
    await goalAssignmentService.recalculateGoalProgress(orgId, goal_id, employee_id);

    const newGaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [assignment_id]);
    const newProgress = newGaRes.rows[0]?.progress || 0.00;

    // Log timeline
    await query(
      `INSERT INTO goal_progress_history (goal_id, organization_id, old_progress, new_progress, status, comment, updated_by) 
       VALUES ($1, $2, $3, $4, 'ACTIVE', 'Self assessment returned for changes', $5)`,
      [goal_id, orgId, oldProgress, newProgress, reviewerId]
    );

    // Notify employee
    const notifRepo = require('../inAppNotification/inAppNotification.repository');
    try {
      await notifRepo.createNotification(
        employee_id,
        'GOAL',
        'Assessment Returned',
        `⚠️ Your Self Assessment has been returned for changes by manager.`,
        goal_id,
        'GOAL'
      );
    } catch (_) {}

    const responseSubmission = {
      ...submission,
      employee_score: submission.overall_employee_score,
      manager_score: submission.overall_manager_score
    };

    return responseSubmission;
  }
}

async function acknowledgeAssessment(orgId, submissionId, userId) {
  const submission = await repo.acknowledgeAssessment(submissionId);

  // Log timeline
  const gaRes = await query(`SELECT goal_id, progress FROM goal_assignments WHERE assignment_id = $1`, [submission.assignment_id]);
  const goal_id = gaRes.rows[0]?.goal_id;
  const currentProgress = gaRes.rows[0]?.progress || 100.00;

  await query(
    `INSERT INTO goal_progress_history (goal_id, organization_id, old_progress, new_progress, status, comment, updated_by) 
     VALUES ($1, $2, $3, $4, 'ACTIVE', 'Self assessment review acknowledged by employee', $5)`,
    [goal_id, orgId, currentProgress, currentProgress, userId]
  );

  return submission;
}

async function uploadAttachment(orgId, answerId, file) {
  return repo.createAttachment({
    organization_id: orgId,
    answer_id: answerId,
    file_name: file.filename,
    original_name: file.originalname,
    file_type: file.mimetype,
    file_size: file.size,
    storage_path: file.path
  });
}

async function verifyEvidence(orgId, attachmentId, status, managerFeedback) {
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid verification status decision.');
  }
  return repo.updateAttachmentStatus(attachmentId, orgId, status, managerFeedback);
}

async function getSelfAssessmentConfiguration(orgId) {
  const res = await query(
    `SELECT configuration_json FROM performance_technique_configurations 
     WHERE organization_id = $1 AND technique = 'SELF_ASSESSMENT'`,
    [orgId]
  );
  return res.rows[0]?.configuration_json || { employee_weight: 40, manager_weight: 60 };
}

async function saveSelfAssessmentConfiguration(orgId, configJson) {
  const empWeight = parseFloat(configJson.employee_weight || 0);
  const mWeight = parseFloat(configJson.manager_weight || 0);

  if (Math.abs(empWeight + mWeight - 100) > 0.01) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Total score weights configuration must sum to exactly 100%.');
  }

  const res = await query(
    `INSERT INTO performance_technique_configurations (organization_id, technique, configuration_json, updated_at)
     VALUES ($1, 'SELF_ASSESSMENT', $2, NOW())
     ON CONFLICT (organization_id, technique)
     DO UPDATE SET configuration_json = EXCLUDED.configuration_json, updated_at = NOW()
     RETURNING *`,
    [orgId, JSON.stringify(configJson)]
  );
  return res.rows[0].configuration_json;
}

async function getSummaryReport(orgId, filters) {
  return repo.getSummaryReport(orgId, filters);
}

async function getComparisonReport(orgId, filters) {
  return repo.getComparisonReport(orgId, filters);
}

module.exports = {
  getSelfAssessmentTemplate,
  saveSelfAssessmentTemplate,
  resolveSubmission,
  getSubmissionAndAnswers,
  saveDraftAnswers,
  submitAssessment,
  reviewAssessment,
  acknowledgeAssessment,
  uploadAttachment,
  verifyEvidence,
  getSelfAssessmentConfiguration,
  saveSelfAssessmentConfiguration,
  getSummaryReport,
  getComparisonReport
};
