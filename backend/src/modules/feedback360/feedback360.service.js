const repo = require('./feedback360.repository');
const goalRepo = require('../goal/goal.repository');
const { logActivity } = require('../auditLog/auditLog.service');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { query } = require('../../config/db');

// ─── Rating Helpers ─────────────────────────────────────────────────────────

const RATING_TYPES = {
  RATING_1_5: 5,
  SCALE_1_10: 10,
  PERCENTAGE: 100,
  YES_NO: 100
};

function getQuestionMaxRating(questionType) {
  return RATING_TYPES[questionType] || null;
}

// ─── Validation Helpers ─────────────────────────────────────────────────────

async function requireGoalTechnique(goalId, orgId) {
  const goal = await goalRepo.getGoalById(orgId, goalId);
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.');
  if (goal.performance_technique !== '360_FEEDBACK') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Goal is not configured for 360° Feedback.');
  }
  return goal;
}

function requirePrivilegedRole(user) {
  if (!['manager', 'hr', 'client_admin', 'super_admin'].includes(user.role)) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Only a manager or administrator can perform this action.');
  }
}

// ─── Timeline Helper ────────────────────────────────────────────────────────

async function logTimeline(goalId, orgId, oldProgress, newProgress, comment, userId) {
  await query(
    `INSERT INTO goal_progress_history (goal_id, organization_id, old_progress, new_progress, status, comment, updated_by)
     VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6)`,
    [goalId, orgId, oldProgress, newProgress, comment, userId]
  );
}

// ─── Notification Helper ────────────────────────────────────────────────────

async function notify(recipientEmployeeId, title, message, goalId) {
  const notifRepo = require('../inAppNotification/inAppNotification.repository');
  try {
    await notifRepo.createNotification(recipientEmployeeId, 'GOAL', title, message, goalId, 'GOAL');
  } catch (_) {}
}

async function getEmployeeName(employeeId) {
  const res = await query(
    `SELECT TRIM(CONCAT(first_name, ' ', last_name)) AS name FROM employees WHERE employee_id = $1`,
    [employeeId]
  );
  return res.rows[0]?.name || 'Unknown';
}

async function findManagerInSameDepartment(orgId, employeeId, departmentId) {
  let currentId = employeeId;
  const visited = new Set();
  
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    
    const res = await query(
      `SELECT manager_employee_id FROM employees WHERE employee_id = $1 AND organization_id = $2`,
      [currentId, orgId]
    );
    const managerId = res.rows[0]?.manager_employee_id;
    if (!managerId) break;
    
    const mgrDeptRes = await query(
      `SELECT department_id FROM employees WHERE employee_id = $1 AND organization_id = $2`,
      [managerId, orgId]
    );
    const mgrDeptId = mgrDeptRes.rows[0]?.department_id;
    
    if (mgrDeptId === departmentId) {
      return managerId;
    }
    currentId = managerId;
  }
  return null;
}

// ─── Goal Config ────────────────────────────────────────────────────────────

async function getGoalConfig(goalId, orgId) {
  await requireGoalTechnique(goalId, orgId);
  const config = await repo.getGoalConfig(goalId);
  if (!config) {
    // Return defaults
    return {
      goal_id: goalId,
      allow_manager: true, manager_count: 1,
      allow_peers: true, peer_count: 3,
      allow_direct_reports: true, direct_report_count: 2,
      anonymous_enabled: false, reviewer_deadline: null,
      reminder_interval_days: 3, late_submission_policy: 'BLOCK',
      manager_weight: 40, peer_weight: 40,
      direct_report_weight: 20,
      minimum_completion_percentage: 100
    };
  }
  return config;
}

async function saveGoalConfig(orgId, goalId, config, user) {
  const goal = await requireGoalTechnique(goalId, orgId);
  const isOwner = (goal.assigned_to_employee_id && goal.assigned_to_employee_id === user.employeeId) || 
                  (goal.created_by && goal.created_by === user.id);
  if (!isOwner) {
    requirePrivilegedRole(user);
  }

  // Validate weights sum to 100 (only for enabled types)
  let totalWeight = 0;
  if (config.allow_manager) totalWeight += parseFloat(config.manager_weight || 0);
  if (config.allow_peers) totalWeight += parseFloat(config.peer_weight || 0);
  if (config.allow_direct_reports) totalWeight += parseFloat(config.direct_report_weight || 0);

  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Enabled reviewer type weights must sum to 100%. Current total: ${totalWeight.toFixed(2)}%`);
  }

  const saved = await repo.saveGoalConfig(orgId, goalId, config);

  await logActivity({
    organizationId: orgId,
    actorUserId: user.id,
    actorRole: user.role,
    moduleName: '360_feedback',
    actionName: 'SAVE_CONFIG',
    entityName: 'feedback_goal_config',
    entityId: goalId,
    entityDisplayName: `360° Feedback Config`
  });

  return saved;
}

// ─── Questionnaire Templates ────────────────────────────────────────────────

async function getTemplates(goalId, orgId) {
  await requireGoalTechnique(goalId, orgId);
  return repo.getTemplates(goalId, orgId);
}

async function saveTemplates(orgId, goalId, questions, user) {
  const goal = await requireGoalTechnique(goalId, orgId);
  const isOwner = (goal.assigned_to_employee_id && goal.assigned_to_employee_id === user.employeeId) || 
                  (goal.created_by && goal.created_by === user.id);
  if (!isOwner) {
    requirePrivilegedRole(user);
  }

  const locked = await repo.isTemplateLocked(goalId, orgId);
  if (locked) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Questionnaire is locked. Reviewers have already accepted or submitted responses.');
  }

  // Validate weights sum to 100
  let totalWeight = 0;
  for (const q of questions) {
    totalWeight += parseFloat(q.weight || 0);
  }
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Total question weight must sum to 100%. Current total: ${totalWeight.toFixed(2)}%`);
  }

  const saved = await repo.saveTemplates(orgId, goalId, questions);

  await logActivity({
    organizationId: orgId,
    actorUserId: user.id,
    actorRole: user.role,
    moduleName: '360_feedback',
    actionName: 'SAVE_TEMPLATE',
    entityName: 'feedback_templates',
    entityId: goalId,
    entityDisplayName: `360° Feedback Questionnaire`
  });

  return saved;
}

// ─── Bulk Auto-Populate Reviewers for All Assignments ───────────────────────

async function autoPopulateAllAssignments(orgId, goalId) {
  const config = await getGoalConfig(goalId, orgId);
  const goal = await goalRepo.getGoalById(orgId, goalId);
  const assignedDeptId = goal?.assigned_to_department_id;

  // Get all assignments for this goal
  const assignmentsRes = await query(
    `SELECT assignment_id, employee_id FROM goal_assignments WHERE goal_id = $1 AND organization_id = $2`,
    [goalId, orgId]
  );

  for (const asg of assignmentsRes.rows) {
    // Skip if participants already exist for this assignment
    const existing = await repo.getParticipants(asg.assignment_id);
    if (existing.length > 0) continue;

    // Fetch the employee's own department
    const empDeptRes = await query(
      `SELECT department_id FROM employees WHERE employee_id = $1`,
      [asg.employee_id]
    );
    const empDeptId = empDeptRes.rows[0]?.department_id;

    // If goal is assigned to a department, skip users outside that department
    if (assignedDeptId && empDeptId !== assignedDeptId) {
      continue;
    }

    const hierarchy = await repo.getAutoPopulateReviewers(orgId, asg.employee_id);

    let managerReviewerId = null;
    if (empDeptId) {
      // Resolve manager inside the same department using reporting hierarchy traversal
      managerReviewerId = await findManagerInSameDepartment(orgId, asg.employee_id, empDeptId);
    } else {
      managerReviewerId = hierarchy.managerId;
    }

    // Add manager
    if (config.allow_manager && managerReviewerId) {
      await repo.addParticipant(orgId, asg.assignment_id, managerReviewerId, 'MANAGER');
    }

    // Filter peers and direct reports to be within the same department as the employee
    let peers = hierarchy.peers || [];
    let directReports = hierarchy.directReports || [];

    if (empDeptId) {
      const filteredPeers = [];
      for (const peerId of peers) {
        const peerDeptRes = await query(
          `SELECT department_id FROM employees WHERE employee_id = $1`,
          [peerId]
        );
        if (peerDeptRes.rows[0]?.department_id === empDeptId) {
          filteredPeers.push(peerId);
        }
      }
      peers = filteredPeers;

      const filteredDirects = [];
      for (const reportId of directReports) {
        const reportDeptRes = await query(
          `SELECT department_id FROM employees WHERE employee_id = $1`,
          [reportId]
        );
        if (reportDeptRes.rows[0]?.department_id === empDeptId) {
          filteredDirects.push(reportId);
        }
      }
      directReports = filteredDirects;
    }

    // Add peers
    if (config.allow_peers && peers.length > 0) {
      for (const peerId of peers) {
        await repo.addParticipant(orgId, asg.assignment_id, peerId, 'PEER');
      }
    }

    // Add direct reports
    if (config.allow_direct_reports && directReports.length > 0) {
      for (const reportId of directReports) {
        await repo.addParticipant(orgId, asg.assignment_id, reportId, 'DIRECT_REPORT');
      }
    }

    // Send invitation notifications
    const refreshed = await repo.getParticipants(asg.assignment_id);
    const subjectName = await getEmployeeName(asg.employee_id);
    for (const p of refreshed) {
      await notify(p.reviewer_employee_id, 'Feedback Invitation', `🔄 You've been invited to provide 360° feedback for ${subjectName}`, goalId);
    }
  }
}

// ─── Assessment Data ────────────────────────────────────────────────────────

async function getAssessmentData(goalId, assignmentId, orgId, user) {
  await requireGoalTechnique(goalId, orgId);

  const assignmentRes = await query(
    `SELECT ga.employee_id, e.department_id 
     FROM goal_assignments ga
     JOIN employees e ON e.employee_id = ga.employee_id
     WHERE ga.assignment_id = $1 AND ga.goal_id = $2 AND ga.organization_id = $3`,
    [assignmentId, goalId, orgId]
  );
  if (assignmentRes.rows.length === 0) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal assignment not found.');
  }
  const subjectEmployeeId = assignmentRes.rows[0].employee_id;
  const subjectDepartmentId = assignmentRes.rows[0].department_id;

  // Auto-populate reviewers for all assignments under this goal if none exist
  await autoPopulateAllAssignments(orgId, goalId).catch(err => {
    console.error('Failed to auto-populate reviewers in getAssessmentData:', err);
  });
  let participants = await repo.getParticipants(assignmentId);

  const templates = await repo.getTemplates(goalId, orgId);
  const summary = await repo.getSummary(assignmentId);
  const goalConfig = await repo.getGoalConfig(goalId);

  // For the current user, check if they are a participant
  let myParticipant = null;
  let myAnswers = [];
  if (user.employeeId) {
    myParticipant = await repo.getParticipantByReviewer(assignmentId, user.employeeId);
    if (myParticipant) {
      myAnswers = await repo.getParticipantAnswers(myParticipant.feedback_participant_id);
    }
  }

  // For manager/admin, include all participant answers (respecting anonymity)
  let allParticipantAnswers = {};
  const isActualManagerOrAdmin = ['client_admin', 'hr', 'super_admin'].includes(user.role)
    || (user.role === 'manager' && (
         (await query(
           `SELECT 1 FROM employees WHERE employee_id = $1 AND (manager_employee_id = $2 OR secondary_manager_id = $2)`,
           [subjectEmployeeId, user.employeeId]
         )).rows.length > 0
       ));
  const isSubject = user.employeeId === subjectEmployeeId;

  if (isActualManagerOrAdmin || (isSubject && summary?.final_score != null)) {
    // Managers always see individual answers; employee sees aggregated only if anonymous
    for (const p of participants) {
      if (p.status === 'SUBMITTED') {
        const answers = await repo.getParticipantAnswers(p.feedback_participant_id);
        allParticipantAnswers[p.feedback_participant_id] = {
          relationship_type: p.relationship_type,
          reviewer_name: (goalConfig?.anonymous_enabled && isSubject) ? null : p.reviewer_name,
          status: p.status,
          answers
        };
      }
    }
  }

  // Check if finalize is allowed based on minimum required reviewer responses per group
  let meetsMinRequirements = true;
  let submittedCount = 0;
  if (goalConfig) {
    if (goalConfig.allow_manager) {
      const assigned = participants.filter(p => p.relationship_type === 'MANAGER').length;
      const sub = participants.filter(p => p.relationship_type === 'MANAGER' && p.status === 'SUBMITTED').length;
      submittedCount += sub;
      const minReq = goalConfig.manager_count || 1;
      if (sub < Math.min(minReq, assigned)) meetsMinRequirements = false;
    }
    if (goalConfig.allow_peers) {
      const assigned = participants.filter(p => p.relationship_type === 'PEER').length;
      const sub = participants.filter(p => p.relationship_type === 'PEER' && p.status === 'SUBMITTED').length;
      submittedCount += sub;
      const minReq = goalConfig.peer_count || 2;
      if (sub < Math.min(minReq, assigned)) meetsMinRequirements = false;
    }
    if (goalConfig.allow_direct_reports) {
      const assigned = participants.filter(p => p.relationship_type === 'DIRECT_REPORT').length;
      const sub = participants.filter(p => p.relationship_type === 'DIRECT_REPORT' && p.status === 'SUBMITTED').length;
      submittedCount += sub;
      const minReq = goalConfig.direct_report_count || 1;
      if (sub < Math.min(minReq, assigned)) meetsMinRequirements = false;
    }
  }

  const totalEnabled = participants.length;
  const submitted = participants.filter(p => p.status === 'SUBMITTED').length;
  const completionPct = totalEnabled > 0 ? (submitted / totalEnabled) * 100 : 0;
  const canFinalize = meetsMinRequirements && submittedCount > 0;

  return {
    config: goalConfig || {},
    templates,
    participants,
    summary,
    myParticipant,
    myAnswers,
    allParticipantAnswers,
    canFinalize,
    completionPercentage: parseFloat(completionPct.toFixed(2)),
    subjectEmployeeId,
    subjectDepartmentId
  };
}

// ─── Participant Management ─────────────────────────────────────────────────

async function addParticipant(orgId, goalId, assignmentId, reviewerEmployeeId, relationshipType, user) {
  const goal = await requireGoalTechnique(goalId, orgId);
  const isOwner = (goal.assigned_to_employee_id && goal.assigned_to_employee_id === user.employeeId) || 
                  (goal.created_by && goal.created_by === user.id);
  if (!isOwner) {
    requirePrivilegedRole(user);
  }

  // Cannot add the subject as their own reviewer
  const assignmentRes = await query(
    `SELECT employee_id FROM goal_assignments WHERE assignment_id = $1`,
    [assignmentId]
  );
  if (assignmentRes.rows[0]?.employee_id === reviewerEmployeeId) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'An employee cannot review themselves in 360° Feedback.');
  }

  // Validate department constraints for manually added reviewers:
  const subjectEmpId = assignmentRes.rows[0]?.employee_id;
  const subjectDeptRes = await query(
    `SELECT department_id FROM employees WHERE employee_id = $1`,
    [subjectEmpId]
  );
  const subjectDeptId = subjectDeptRes.rows[0]?.department_id;
  if (subjectDeptId) {
    const reviewerDeptRes = await query(
      `SELECT department_id FROM employees WHERE employee_id = $1`,
      [reviewerEmployeeId]
    );
    const reviewerDeptId = reviewerDeptRes.rows[0]?.department_id;
    if (reviewerDeptId !== subjectDeptId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cross-department reviewer assignments are not allowed.');
    }
  }

  const participant = await repo.addParticipant(orgId, assignmentId, reviewerEmployeeId, relationshipType);
  if (!participant) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'This reviewer is already assigned to this feedback cycle.');
  }

  // Notification
  const subjectName = await getEmployeeName(subjectEmpId);
  const reviewerName = await getEmployeeName(reviewerEmployeeId);

  await notify(reviewerEmployeeId, 'Feedback Invitation', `🔄 You've been invited to provide 360° feedback for ${subjectName}`, goalId);

  // Timeline
  const gaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [assignmentId]);
  const progress = gaRes.rows[0]?.progress || 0;
  await logTimeline(goalId, orgId, progress, progress, `Reviewer ${reviewerName} (${relationshipType}) added to 360° feedback`, user.id);

  return participant;
}

async function removeParticipant(orgId, goalId, participantId, user) {
  const goal = await requireGoalTechnique(goalId, orgId);
  const isOwner = (goal.assigned_to_employee_id && goal.assigned_to_employee_id === user.employeeId) || 
                  (goal.created_by && goal.created_by === user.id);
  if (!isOwner) {
    requirePrivilegedRole(user);
  }

  const participant = await repo.getParticipantById(participantId);
  if (!participant) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Participant not found.');
  if (!['INVITED', 'PENDING'].includes(participant.status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot remove a reviewer who has already accepted or submitted.');
  }

  const removed = await repo.removeParticipant(participantId);
  if (!removed) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Could not remove participant.');

  const reviewerName = await getEmployeeName(participant.reviewer_employee_id);
  const gaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [participant.assignment_id]);
  const progress = gaRes.rows[0]?.progress || 0;
  await logTimeline(participant.goal_id, orgId, progress, progress, `Reviewer ${reviewerName} removed from 360° feedback`, user.id);

  return removed;
}

// ─── Reviewer Actions ───────────────────────────────────────────────────────

async function acceptInvitation(participantId, user) {
  const participant = await repo.getParticipantById(participantId);
  if (!participant) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Participation record not found.');
  if (participant.reviewer_employee_id !== user.employeeId) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You are not the assigned reviewer.');
  }
  if (participant.status !== 'INVITED') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Cannot accept invitation. Current status: ${participant.status}`);
  }

  const updated = await repo.updateParticipantStatus(participantId, 'ACCEPTED');

  // Notify manager
  const subjectEmpRes = await query(`SELECT manager_employee_id FROM employees WHERE employee_id = $1`, [participant.subject_employee_id]);
  const managerEmpId = subjectEmpRes.rows[0]?.manager_employee_id;
  const reviewerName = await getEmployeeName(user.employeeId);
  const subjectName = await getEmployeeName(participant.subject_employee_id);

  if (managerEmpId) {
    await notify(managerEmpId, 'Reviewer Accepted', `✅ ${reviewerName} accepted the 360° feedback invitation for ${subjectName}`, participant.goal_id);
  }

  const gaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [participant.assignment_id]);
  const progress = gaRes.rows[0]?.progress || 0;
  await logTimeline(participant.goal_id, participant.organization_id, progress, progress, `Reviewer ${reviewerName} accepted 360° feedback invitation`, user.id);

  return updated;
}

async function saveReviewerAnswers(participantId, answers, user) {
  const participant = await repo.getParticipantById(participantId);
  if (!participant) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Participation record not found.');
  if (participant.reviewer_employee_id !== user.employeeId) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You are not the assigned reviewer.');
  }
  if (!['INVITED', 'ACCEPTED'].includes(participant.status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Cannot save answers. Current status: ${participant.status}`);
  }

  // Auto-accept if currently INVITED
  if (participant.status === 'INVITED') {
    await repo.updateParticipantStatus(participantId, 'ACCEPTED');
  }

  await repo.saveParticipantAnswers(participantId, answers);

  const reviewerName = await getEmployeeName(user.employeeId);
  const gaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [participant.assignment_id]);
  const progress = gaRes.rows[0]?.progress || 0;
  await logTimeline(participant.goal_id, participant.organization_id, progress, progress, `Reviewer ${reviewerName} saved draft feedback`, user.id);

  return { success: true };
}

async function submitReview(participantId, user) {
  const participant = await repo.getParticipantById(participantId);
  if (!participant) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Participation record not found.');
  if (participant.reviewer_employee_id !== user.employeeId) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You are not the assigned reviewer.');
  }
  if (!['INVITED', 'ACCEPTED'].includes(participant.status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Cannot submit review. Current status: ${participant.status}`);
  }

  // Validate required questions are answered
  const templates = await repo.getTemplates(participant.goal_id, participant.organization_id);
  const answers = await repo.getParticipantAnswers(participantId);

  for (const t of templates) {
    if (t.required) {
      const ans = answers.find(a => a.question_id === t.feedback_template_id);
      if (!ans || (ans.rating === null && (!ans.comment || !ans.comment.trim()))) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Answer to question "${t.question}" is required.`);
      }
    }
  }

  const updated = await repo.updateParticipantStatus(participantId, 'SUBMITTED');

  // Recalculate summary
  await calculateAndStoreSummary(participant.assignment_id, participant.goal_id, participant.organization_id);

  // Recalculate progress
  const goalAssignmentService = require('../goal/goalAssignment.service');
  await goalAssignmentService.recalculateGoalProgress(participant.organization_id, participant.goal_id, participant.subject_employee_id);

  // Notify manager
  const subjectEmpRes = await query(`SELECT manager_employee_id FROM employees WHERE employee_id = $1`, [participant.subject_employee_id]);
  const managerEmpId = subjectEmpRes.rows[0]?.manager_employee_id;
  const reviewerName = await getEmployeeName(user.employeeId);
  const subjectName = await getEmployeeName(participant.subject_employee_id);

  if (managerEmpId) {
    await notify(managerEmpId, 'Review Submitted', `📝 ${reviewerName} submitted their 360° feedback for ${subjectName}`, participant.goal_id);
  }

  const gaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [participant.assignment_id]);
  const progress = gaRes.rows[0]?.progress || 0;
  await logTimeline(participant.goal_id, participant.organization_id, progress, progress, `Reviewer ${reviewerName} submitted 360° feedback`, user.id);

  return updated;
}

async function declineReview(participantId, user) {
  const participant = await repo.getParticipantById(participantId);
  if (!participant) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Participation record not found.');
  if (participant.reviewer_employee_id !== user.employeeId) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You are not the assigned reviewer.');
  }
  if (!['INVITED', 'ACCEPTED'].includes(participant.status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Cannot decline. Current status: ${participant.status}`);
  }

  const updated = await repo.updateParticipantStatus(participantId, 'DECLINED');

  // Notify manager
  const subjectEmpRes = await query(`SELECT manager_employee_id FROM employees WHERE employee_id = $1`, [participant.subject_employee_id]);
  const managerEmpId = subjectEmpRes.rows[0]?.manager_employee_id;
  const reviewerName = await getEmployeeName(user.employeeId);
  const subjectName = await getEmployeeName(participant.subject_employee_id);

  if (managerEmpId) {
    await notify(managerEmpId, 'Reviewer Declined', `❌ ${reviewerName} declined the 360° feedback invitation for ${subjectName}`, participant.goal_id);
  }

  const gaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [participant.assignment_id]);
  const progress = gaRes.rows[0]?.progress || 0;
  await logTimeline(participant.goal_id, participant.organization_id, progress, progress, `Reviewer ${reviewerName} declined 360° feedback invitation`, user.id);

  return updated;
}

// ─── Scoring Engine ─────────────────────────────────────────────────────────

async function calculateAndStoreSummary(assignmentId, goalId, orgId) {
  const participants = await repo.getParticipants(assignmentId);
  const config = await repo.getGoalConfig(goalId);

  const typeWeights = {
    MANAGER: parseFloat(config?.manager_weight || 40),
    PEER: parseFloat(config?.peer_weight || 40),
    DIRECT_REPORT: parseFloat(config?.direct_report_weight || 20)
  };

  const typeAverages = { MANAGER: null, PEER: null, DIRECT_REPORT: null };

  for (const type of ['MANAGER', 'PEER', 'DIRECT_REPORT']) {
    const submittedOfType = participants.filter(p => p.relationship_type === type && p.status === 'SUBMITTED');
    if (submittedOfType.length === 0) continue;

    let allRatings = [];
    for (const p of submittedOfType) {
      const answers = await repo.getParticipantAnswers(p.feedback_participant_id);
      for (const ans of answers) {
        if (ans.rating !== null && ans.rating !== undefined) {
          const maxVal = getQuestionMaxRating(ans.question_type) || 5;
          const normalized = (parseFloat(ans.rating) / maxVal) * 100;
          allRatings.push(normalized);
        }
      }
    }

    if (allRatings.length > 0) {
      typeAverages[type] = parseFloat((allRatings.reduce((s, v) => s + v, 0) / allRatings.length).toFixed(2));
    }
  }

  // Weighted overall score
  let weightedSum = 0;
  let activeWeightSum = 0;

  for (const type of ['MANAGER', 'PEER', 'DIRECT_REPORT']) {
    if (typeAverages[type] !== null) {
      weightedSum += typeAverages[type] * (typeWeights[type] / 100);
      activeWeightSum += typeWeights[type];
    }
  }

  const overallScore = activeWeightSum > 0 ? parseFloat(((weightedSum / (activeWeightSum / 100))).toFixed(2)) : 0;

  // Completion %
  const totalParticipants = participants.length;
  const submittedCount = participants.filter(p => p.status === 'SUBMITTED').length;
  const completionPct = totalParticipants > 0 ? parseFloat(((submittedCount / totalParticipants) * 100).toFixed(2)) : 0;

  const scores = {
    manager_average: typeAverages.MANAGER,
    peer_average: typeAverages.PEER,
    direct_report_average: typeAverages.DIRECT_REPORT,
    external_average: null,
    overall_score: overallScore,
    completion_percentage: completionPct,
    final_score: null // Set only on finalization
  };

  return repo.upsertSummary(orgId, assignmentId, scores);
}

// ─── Finalization ───────────────────────────────────────────────────────────

async function finalizeFeedback(goalId, assignmentId, orgId, user) {
  await requireGoalTechnique(goalId, orgId);
  requirePrivilegedRole(user);

  const participants = await repo.getParticipants(assignmentId);
  const config = await repo.getGoalConfig(goalId);

  // Validate finalization readiness based on minimum required reviewer responses per group
  let meetsMinRequirements = true;
  let submittedCount = 0;
  if (config) {
    if (config.allow_manager) {
      const assigned = participants.filter(p => p.relationship_type === 'MANAGER').length;
      const sub = participants.filter(p => p.relationship_type === 'MANAGER' && p.status === 'SUBMITTED').length;
      submittedCount += sub;
      const minReq = config.manager_count || 1;
      if (sub < Math.min(minReq, assigned)) meetsMinRequirements = false;
    }
    if (config.allow_peers) {
      const assigned = participants.filter(p => p.relationship_type === 'PEER').length;
      const sub = participants.filter(p => p.relationship_type === 'PEER' && p.status === 'SUBMITTED').length;
      submittedCount += sub;
      const minReq = config.peer_count || 2;
      if (sub < Math.min(minReq, assigned)) meetsMinRequirements = false;
    }
    if (config.allow_direct_reports) {
      const assigned = participants.filter(p => p.relationship_type === 'DIRECT_REPORT').length;
      const sub = participants.filter(p => p.relationship_type === 'DIRECT_REPORT' && p.status === 'SUBMITTED').length;
      submittedCount += sub;
      const minReq = config.direct_report_count || 1;
      if (sub < Math.min(minReq, assigned)) meetsMinRequirements = false;
    }
  }

  if (!meetsMinRequirements || submittedCount === 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot finalize: minimum required reviewer responses have not been submitted.');
  }

  // Update all pending invitations to EXPIRED automatically
  await query(
    `UPDATE feedback_participants
     SET status = 'EXPIRED', updated_at = NOW()
     WHERE assignment_id = $1 AND status NOT IN ('SUBMITTED', 'DECLINED', 'EXPIRED')`,
    [assignmentId]
  );

  // Calculate final summary
  const summary = await calculateAndStoreSummary(assignmentId, goalId, orgId);

  // Set final_score
  const finalScore = summary.overall_score;
  await query(
    `UPDATE feedback_summary SET final_score = $1, updated_at = NOW() WHERE assignment_id = $2`,
    [finalScore, assignmentId]
  );

  // Update assignment weighted_score
  await query(
    `UPDATE goal_assignments SET weighted_score = $1, updated_at = NOW() WHERE assignment_id = $2`,
    [finalScore, assignmentId]
  );

  // Recalculate progress to 100%
  const assignmentRes = await query(`SELECT employee_id, progress FROM goal_assignments WHERE assignment_id = $1`, [assignmentId]);
  const subjectEmployeeId = assignmentRes.rows[0]?.employee_id;
  const oldProgress = assignmentRes.rows[0]?.progress || 0;

  const goalAssignmentService = require('../goal/goalAssignment.service');
  await goalAssignmentService.recalculateGoalProgress(orgId, goalId, subjectEmployeeId);

  const newGaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [assignmentId]);
  const newProgress = newGaRes.rows[0]?.progress || 100;

  // Timeline
  await logTimeline(goalId, orgId, oldProgress, newProgress, `360° feedback finalized. Overall Score: ${finalScore}%`, user.id);

  // Notify employee
  const subjectName = await getEmployeeName(subjectEmployeeId);
  await notify(subjectEmployeeId, 'Results Published', `🎉 Your 360° Feedback results are ready. Overall Score: ${finalScore}%`, goalId);

  // Notify all reviewers
  for (const p of participants.filter(pr => pr.status === 'SUBMITTED')) {
    await notify(p.reviewer_employee_id, 'Feedback Finalized', `📊 360° Feedback for ${subjectName} has been finalized`, goalId);
  }

  return { ...summary, final_score: finalScore };
}

// ─── Org-Level Configuration ────────────────────────────────────────────────

async function getOrgConfig(orgId) {
  const res = await query(
    `SELECT configuration_json FROM performance_technique_configurations
     WHERE organization_id = $1 AND technique = '360_FEEDBACK'`,
    [orgId]
  );
  return res.rows[0]?.configuration_json || {
    manager_weight: 40, peer_weight: 40,
    direct_report_weight: 20,
    anonymous_default: false, reminder_interval_days: 3,
    late_submission_policy: 'BLOCK', minimum_completion_percentage: 100
  };
}

async function saveOrgConfig(orgId, configJson) {
  const res = await query(
    `INSERT INTO performance_technique_configurations (organization_id, technique, configuration_json, updated_at)
     VALUES ($1, '360_FEEDBACK', $2, NOW())
     ON CONFLICT (organization_id, technique)
     DO UPDATE SET configuration_json = EXCLUDED.configuration_json, updated_at = NOW()
     RETURNING *`,
    [orgId, JSON.stringify(configJson)]
  );
  return res.rows[0].configuration_json;
}

// ─── Reports ────────────────────────────────────────────────────────────────

async function getSummaryReport(orgId, filters, user) {
  const isManagerOrAdmin = ['client_admin', 'hr', 'manager', 'super_admin'].includes(user.role);
  if (!isManagerOrAdmin) {
    filters.reviewer_employee_id = user.employeeId;
  }

  // Retroactively auto-populate reviewers for any active 360 goals
  const active360Goals = await query(
    `SELECT goal_id FROM goals WHERE organization_id = $1 AND performance_technique = '360_FEEDBACK' AND status = 'ACTIVE'`,
    [orgId]
  ).catch(() => ({ rows: [] }));

  for (const g of active360Goals.rows) {
    await autoPopulateAllAssignments(orgId, g.goal_id).catch(err => {
      console.error('Failed to retroactively auto-populate 360 reviewers:', err);
    });
  }

  return repo.getSummaryReport(orgId, filters, user?.employeeId || null);
}

async function viewResults(goalId, assignmentId, orgId, user) {
  await requireGoalTechnique(goalId, orgId);

  const assignmentRes = await query(
    `SELECT employee_id FROM goal_assignments WHERE assignment_id = $1`,
    [assignmentId]
  );
  if (assignmentRes.rows[0]?.employee_id === user.employeeId) {
    await repo.markResultsViewed(assignmentId);
    const gaRes = await query(`SELECT progress FROM goal_assignments WHERE assignment_id = $1`, [assignmentId]);
    const progress = gaRes.rows[0]?.progress || 0;
    await logTimeline(goalId, orgId, progress, progress, 'Employee viewed 360° feedback results', user.id);
  }

  return { success: true };
}

module.exports = {
  getGoalConfig,
  saveGoalConfig,
  getTemplates,
  saveTemplates,
  getAssessmentData,
  addParticipant,
  removeParticipant,
  acceptInvitation,
  saveReviewerAnswers,
  submitReview,
  declineReview,
  calculateAndStoreSummary,
  finalizeFeedback,
  getOrgConfig,
  saveOrgConfig,
  getSummaryReport,
  viewResults,
  autoPopulateAllAssignments
};
