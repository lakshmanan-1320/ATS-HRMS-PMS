const repo = require('./kpi.repository');
const ApiError = require('../../utils/apiError');
const financialYearService = require('../financialYear/financialYear.service');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { STATUSES, MEASUREMENT_TYPES, SUBMISSION_STATUSES, VALID_TRANSITIONS } = require('./kpi.schema');
const db = require('../../config/db');

// Strategy calculations for KPI completion percentage
const STRATEGIES = {
  [MEASUREMENT_TYPES.PERCENTAGE]: (approved, target) => {
    const t = parseFloat(target);
    const a = parseFloat(approved);
    if (isNaN(t) || t <= 0) return 0.00;
    return Math.min(100.00, Math.max(0.00, (a / t) * 100));
  },
  [MEASUREMENT_TYPES.NUMBER]: (approved, target) => {
    const t = parseFloat(target);
    const a = parseFloat(approved);
    if (isNaN(t) || t <= 0) return 0.00;
    return Math.min(100.00, Math.max(0.00, (a / t) * 100));
  },
  [MEASUREMENT_TYPES.CURRENCY]: (approved, target) => {
    const t = parseFloat(target);
    const a = parseFloat(approved);
    if (isNaN(t) || t <= 0) return 0.00;
    return Math.min(100.00, Math.max(0.00, (a / t) * 100));
  },
  [MEASUREMENT_TYPES.BOOLEAN]: (approved, target) => {
    const a = String(approved).toLowerCase().trim();
    const t = String(target).toLowerCase().trim();
    return a === t ? 100.00 : 0.00;
  },
  [MEASUREMENT_TYPES.TEXT]: (approved, target) => {
    return 100.00; // Text submission approval gives 100%
  },
  [MEASUREMENT_TYPES.CHECKLIST]: (completed, total) => {
    if (!total || total <= 0) return 0.00;
    return Math.min(100.00, Math.max(0.00, (completed / total) * 100));
  }
};

// Helper: check target and approved limits
function validateValueLimits(type, target, value) {
  if (type === MEASUREMENT_TYPES.BOOLEAN || type === MEASUREMENT_TYPES.TEXT || type === MEASUREMENT_TYPES.CHECKLIST) {
    return;
  }
  const tgt = parseFloat(target);
  const val = parseFloat(value);
  if (!isNaN(tgt) && !isNaN(val) && val > tgt) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Value (${val}) cannot exceed Target value (${tgt}) for type ${type}.`);
  }
}

// Helper: load active performance cycle config
async function getActiveConfig(orgId) {
  try {
    const activeFy = await financialYearService.getActiveFinancialYear(orgId);
    if (!activeFy) return null;
    const goalSettingsService = require('../goalSettings/goalSettings.service');
    const settings = await goalSettingsService.getGoalSettings(activeFy.financial_year_id, orgId);
    return {
      performance_configuration_id: activeFy.financial_year_id,
      financial_year_id: activeFy.financial_year_id,
      goal_setting_direction: settings.goal_setting_direction,
      allow_employee_goal_creation: settings.allow_employee_goal_creation,
      max_goals_per_employee: settings.max_goals_per_employee,
      goal_approval_required: settings.goal_approval_required
    };
  } catch (err) {
    return null;
  }
}

// Helper: check goal access
async function verifyGoalAccess(orgId, goalId, userContext, requiredPermission = 'read') {
  const goalRes = await db.query(
    `SELECT g.*, 
            e.manager_employee_id, 
            e.secondary_manager_id,
            g.created_by
     FROM goals g
     LEFT JOIN employees e ON g.assigned_to_employee_id = e.employee_id
     WHERE g.organization_id = $1 AND g.goal_id = $2`,
    [orgId, goalId]
  );
  const goal = goalRes.rows[0];
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.');

  if (requiredPermission === 'manage_kpi') {
    if (['COMPLETED', 'REJECTED'].includes(goal.status)) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, `KPI operations are blocked: Goal is already ${goal.status}.`);
    }
    const isCompanyOrDeptOrTeam = ['company', 'department', 'team'].includes(goal.goal_type);
    if (isCompanyOrDeptOrTeam && userContext.role === 'employee') {
      throw new ApiError(STATUS_CODES.FORBIDDEN, `Employees cannot create, edit, or delete KPIs for Company, Department, or Team Goals.`);
    }
  } else if (requiredPermission === 'write') {
    if (['COMPLETED', 'REJECTED'].includes(goal.status)) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, `KPI operations are blocked: Goal is already ${goal.status}.`);
    }
  }

  const isOwner = (goal.assigned_to_employee_id && goal.assigned_to_employee_id === userContext.employeeId) ||
                  (goal.created_by && goal.created_by === userContext.id);

  if (userContext.role === 'client_admin' || userContext.role === 'hr') {
    return goal;
  }

  // Check if it is a company-wide goal or department-wide goal for the user
  const isCompanyGoal = goal.goal_type === 'company';
  let isDepartmentGoal = false;
  if (goal.goal_type === 'department' && goal.assigned_to_department_id && userContext.employeeId) {
    const empRes = await db.query('SELECT department_id FROM employees WHERE employee_id = $1', [userContext.employeeId]);
    const empDeptId = empRes.rows[0]?.department_id;
    isDepartmentGoal = empDeptId && empDeptId === goal.assigned_to_department_id;
  }

  if (userContext.role === 'manager') {
    const isDirectReport = goal.manager_employee_id === userContext.employeeId || 
                           goal.secondary_manager_id === userContext.employeeId;
    if (isOwner || isDirectReport || goal.created_by === userContext.id || isCompanyGoal || isDepartmentGoal) {
      return goal;
    }
  }

  if (userContext.role === 'employee') {
    if (isOwner || isCompanyGoal || isDepartmentGoal) {
      return goal;
    }
  }

  throw new ApiError(STATUS_CODES.FORBIDDEN, 'You do not have permission to access this goal or its KPIs.');
}

async function validateKpiDatesAndBoundaries(activeConfig, goal, start_date, due_date) {
  const cycleStart = new Date(activeConfig.start_date);
  const cycleEnd = new Date(activeConfig.end_date);

  if (start_date) {
    const start = new Date(start_date);
    if (start < cycleStart || start > cycleEnd) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'KPI start date must fall within the active performance cycle dates.');
    }
  }
  if (due_date) {
    const due = new Date(due_date);
    if (due < cycleStart || due > cycleEnd) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'KPI due date must fall within the active performance cycle dates.');
    }
  }

  if (start_date && goal.start_date) {
    const kpiStart = new Date(start_date);
    const goalStart = new Date(goal.start_date);
    if (kpiStart < goalStart) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, `KPI start date (${start_date}) cannot be before Goal start date (${new Date(goal.start_date).toISOString().split('T')[0]}).`);
    }
  }
  if (due_date && goal.due_date) {
    const kpiDue = new Date(due_date);
    const goalDue = new Date(goal.due_date);
    if (kpiDue > goalDue) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, `KPI due date (${due_date}) cannot be after Goal due date (${new Date(goal.due_date).toISOString().split('T')[0]}).`);
    }
  }
}

// ── KPI Service Implementation ──

async function listGoalKpis(orgId, goalId, filters, userContext) {
  await verifyGoalAccess(orgId, goalId, userContext, 'read');
  const items = await repo.listKpis(orgId, { ...filters, goal_id: goalId });
  
  // Attach tasks if checklist and count pending reviews
  for (const kpi of items) {
    if (kpi.measurement_type === MEASUREMENT_TYPES.CHECKLIST) {
      kpi.tasks = await repo.getKpiTasks(kpi.kpi_id, orgId);
    }
    const reviewsRes = await db.query(
      `SELECT COUNT(*)::int FROM goal_kpi_submissions WHERE kpi_id = $1 AND status = 'PENDING'`,
      [kpi.kpi_id]
    );
    kpi.pending_reviews_count = reviewsRes.rows[0].count;
  }

  const total = await repo.countKpis(orgId, { ...filters, goal_id: goalId });
  return { items, total };
}

async function getKpiDetails(orgId, kpiId, userContext) {
  const kpi = await repo.getKpiById(orgId, kpiId);
  if (!kpi) throw new ApiError(STATUS_CODES.NOT_FOUND, 'KPI not found.');
  
  await verifyGoalAccess(orgId, kpi.goal_id, userContext, 'read');

  // Fetch sub-tasks if checklist
  let tasks = [];
  if (kpi.measurement_type === MEASUREMENT_TYPES.CHECKLIST) {
    tasks = await repo.getKpiTasks(kpiId, orgId);
  }

  // Fetch submissions history
  const submissions = await repo.getSubmissionsByKpiId(orgId, kpiId);
  for (const sub of submissions) {
    sub.attachments = await repo.getAttachmentsBySubmissionId(sub.submission_id);
    sub.links = await repo.getLinksBySubmissionId(sub.submission_id);
  }

  // Find latest approved submission and details
  const approvedSubs = submissions.filter(s => s.status === SUBMISSION_STATUSES.APPROVED);
  const latestApproved = approvedSubs[0] || null;
  const latestSubmission = submissions[0] || null;

  return { 
    ...kpi, 
    tasks, 
    submissions, 
    latestApproved, 
    latestSubmission 
  };
}

async function createKpi(orgId, goalId, kpiData, userContext) {
  const goal = await verifyGoalAccess(orgId, goalId, userContext, 'manage_kpi');
  
  if (goal.performance_technique && goal.performance_technique !== 'KPI') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `KPIs cannot be created for goals using '${goal.performance_technique}' technique.`);
  }

  const activeConfig = await getActiveConfig(orgId);

  await validateKpiDatesAndBoundaries(activeConfig, goal, kpiData.start_date, kpiData.due_date);

  // Validate total weight does not exceed 100%
  const existingKpis = await repo.listKpis(orgId, { goal_id: goalId });
  const currentTotalWeight = existingKpis
    .filter(k => k.status !== STATUSES.REJECTED)
    .reduce((sum, k) => sum + parseFloat(k.weight_percentage || 0), 0);

  const newWeight = parseFloat(kpiData.weight_percentage || 0);
  if (currentTotalWeight + newWeight > 100) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Total KPI weight under this goal cannot exceed 100%. Current total: ${currentTotalWeight}%, Remaining limit: ${100 - currentTotalWeight}%.`);
  }

  const type = kpiData.measurement_type;
  let target = null;
  let approvedVal = 0.0000;

  if (type === MEASUREMENT_TYPES.BOOLEAN) {
    target = kpiData.target_boolean;
  } else if (type === MEASUREMENT_TYPES.TEXT) {
    target = kpiData.target_text;
  } else if (type === MEASUREMENT_TYPES.CHECKLIST) {
    // For Checklist, target_value is calculated from checklist task count
    target = kpiData.tasks ? kpiData.tasks.length : 0;
  } else {
    target = parseFloat(kpiData.target_value);
  }

  const payload = {
    ...kpiData,
    goal_id: goalId,
    performance_configuration_id: activeConfig.performance_configuration_id,
    target_value: type !== MEASUREMENT_TYPES.BOOLEAN && type !== MEASUREMENT_TYPES.TEXT ? target : null,
    approved_value: approvedVal,
    target_text: type === MEASUREMENT_TYPES.TEXT ? target : null,
    target_boolean: type === MEASUREMENT_TYPES.BOOLEAN ? target : null,
    completion_percentage: 0.00,
    status: userContext.role === 'client_admin' || userContext.role === 'hr' ? STATUSES.ACTIVE : STATUSES.DRAFT,
    created_by: userContext.id,
    assigned_by: ['manager', 'hr', 'client_admin'].includes(userContext.role) ? userContext.id : null,
    owner_user_id: kpiData.owner_user_id || userContext.id
  };

  return await db.withTransaction(async (client) => {
    const created = await repo.createKpi(orgId, payload, client);

    // Insert tasks if checklist items are present
    if (type === MEASUREMENT_TYPES.CHECKLIST && kpiData.tasks && kpiData.tasks.length > 0) {
      for (const t of kpiData.tasks) {
        await repo.insertKpiTask(created.kpi_id, orgId, t.title, client);
      }
    }

    // Recalculate parent Goal Progress
    await repo.recalculateGoalProgress(orgId, goalId, userContext.id, `KPI (${created.kpi_code} - "${created.title}") created.`, client);

    return created;
  });
}

async function updateKpi(orgId, kpiId, kpiData, userContext) {
  const existing = await repo.getKpiById(orgId, kpiId);
  if (!existing) throw new ApiError(STATUS_CODES.NOT_FOUND, 'KPI not found.');

  const goal = await verifyGoalAccess(orgId, existing.goal_id, userContext, 'manage_kpi');
  
  if (userContext.role === 'employee' && existing.status !== STATUSES.DRAFT) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Employees can only edit KPIs in DRAFT status.');
  }

  const activeConfig = await getActiveConfig(orgId);
  await validateKpiDatesAndBoundaries(activeConfig, goal, kpiData.start_date, kpiData.due_date);

  // Validate total weight does not exceed 100%
  if (kpiData.weight_percentage !== undefined) {
    const existingKpis = await repo.listKpis(orgId, { goal_id: existing.goal_id });
    const currentTotalWeight = existingKpis
      .filter(k => k.kpi_id !== kpiId && k.status !== STATUSES.REJECTED)
      .reduce((sum, k) => sum + parseFloat(k.weight_percentage || 0), 0);

    const newWeight = parseFloat(kpiData.weight_percentage || 0);
    if (currentTotalWeight + newWeight > 100) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, `Total KPI weight under this goal cannot exceed 100%. Current total (excluding this KPI): ${currentTotalWeight}%, Remaining: ${100 - currentTotalWeight}%.`);
    }
  }

  const type = kpiData.measurement_type || existing.measurement_type;
  let target = null;

  if (type === MEASUREMENT_TYPES.BOOLEAN) {
    target = kpiData.target_boolean !== undefined ? kpiData.target_boolean : existing.target_boolean;
  } else if (type === MEASUREMENT_TYPES.TEXT) {
    target = kpiData.target_text !== undefined ? kpiData.target_text : existing.target_text;
  } else if (type === MEASUREMENT_TYPES.CHECKLIST) {
    // If checklist tasks are updated, check/update count
    target = kpiData.tasks ? kpiData.tasks.length : (await repo.getKpiTasks(kpiId, orgId)).length;
  } else {
    target = kpiData.target_value !== undefined ? parseFloat(kpiData.target_value) : parseFloat(existing.target_value);
  }

  const payload = {
    ...existing,
    ...kpiData,
    measurement_type: type,
    target_value: type !== MEASUREMENT_TYPES.BOOLEAN && type !== MEASUREMENT_TYPES.TEXT ? target : null,
    target_text: type === MEASUREMENT_TYPES.TEXT ? target : null,
    target_boolean: type === MEASUREMENT_TYPES.BOOLEAN ? target : null
  };

  return await db.withTransaction(async (client) => {
    // If checklist tasks updated, rebuild tasks list
    if (type === MEASUREMENT_TYPES.CHECKLIST && kpiData.tasks) {
      await repo.deleteKpiTasks(kpiId, client);
      for (const t of kpiData.tasks) {
        await repo.insertKpiTask(kpiId, orgId, t.title, client);
      }
      // Reset approved completed count cache to 0 since tasks completely refreshed
      payload.approved_value = 0.0000;
      payload.completion_percentage = 0.00;
    }

    const updated = await repo.updateKpi(orgId, kpiId, payload, client);
    await repo.recalculateGoalProgress(orgId, existing.goal_id, userContext.id, `KPI (${existing.kpi_code} - "${existing.title}") updated.`, client);

    return updated;
  });
}

async function deleteKpi(orgId, kpiId, userContext) {
  const existing = await repo.getKpiById(orgId, kpiId);
  if (!existing) throw new ApiError(STATUS_CODES.NOT_FOUND, 'KPI not found.');

  await verifyGoalAccess(orgId, existing.goal_id, userContext, 'manage_kpi');

  if (existing.status !== STATUSES.DRAFT) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Deletion blocked: only KPIs in DRAFT status can be deleted.');
  }

  return await db.withTransaction(async (client) => {
    const deleted = await repo.deleteKpi(orgId, kpiId, client);
    await repo.recalculateGoalProgress(orgId, existing.goal_id, userContext.id, `KPI (${existing.kpi_code} - "${existing.title}") deleted.`, client);
    return deleted;
  });
}

async function updateKpiStatus(orgId, kpiId, targetStatus, reason, userContext) {
  const existing = await repo.getKpiById(orgId, kpiId);
  if (!existing) throw new ApiError(STATUS_CODES.NOT_FOUND, 'KPI not found.');

  const goal = await verifyGoalAccess(orgId, existing.goal_id, userContext, 'write');

  const currentStatus = existing.status;
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid status transition from ${currentStatus} to ${targetStatus}.`);
  }

  if ([STATUSES.PENDING_APPROVAL, STATUSES.ACTIVE].includes(targetStatus)) {
    const kpis = await repo.getKpisForGoal(orgId, existing.goal_id);
    let sumWeights = 0;
    for (const k of kpis) {
      if (k.kpi_id === kpiId) {
        sumWeights += parseFloat(existing.weight_percentage);
      } else if (k.status !== STATUSES.REJECTED) {
        sumWeights += parseFloat(k.weight_percentage);
      }
    }
    if (['ACTIVE', 'PENDING_APPROVAL'].includes(goal.status) && Math.round(sumWeights) !== 100) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, `Total weight of Goal KPIs must equal exactly 100%. Current total: ${sumWeights}%.`);
    }
  }

  const payload = {
    ...existing,
    status: targetStatus,
    ...(targetStatus === STATUSES.ACTIVE ? { approved_by: userContext.id } : {})
  };

  return await db.withTransaction(async (client) => {
    const updated = await repo.updateKpi(orgId, kpiId, payload, client);

    // Auto generate approved history logging on status shift
    await repo.insertSubmission(orgId, {
      kpi_id: kpiId,
      submitted_value: existing.approved_value,
      submitted_text: existing.approved_text,
      submitted_boolean: existing.approved_boolean,
      comment: `Status updated to ${targetStatus}. Reason: ${reason || 'N/A'}`,
      status: SUBMISSION_STATUSES.APPROVED,
      submitted_by: userContext.id
    }, client);

    await repo.recalculateGoalProgress(orgId, existing.goal_id, userContext.id, `KPI (${existing.kpi_code} - "${existing.title}") status updated to ${targetStatus}.`, client);
    return updated;
  });
}

// ── Submission Workflow Operations ──

async function submitKpiCompletion(orgId, kpiId, submissionData, userContext) {
  const kpi = await repo.getKpiById(orgId, kpiId);
  if (!kpi) throw new ApiError(STATUS_CODES.NOT_FOUND, 'KPI not found.');

  // Validate Goal ownership
  await verifyGoalAccess(orgId, kpi.goal_id, userContext, 'write');

  // Verify KPI is active or in progress or changes requested before allowing progress submission
  if (![STATUSES.ACTIVE, STATUSES.IN_PROGRESS, STATUSES.CHANGES_REQUESTED].includes(kpi.status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Progress submissions blocked: KPI status is ${kpi.status}.`);
  }

  const type = kpi.measurement_type;
  let subValue = null;
  let subText = null;
  let subBool = null;

  if (type === MEASUREMENT_TYPES.BOOLEAN) {
    subBool = submissionData.submitted_boolean;
  } else if (type === MEASUREMENT_TYPES.TEXT) {
    subText = submissionData.submitted_text || '';
  } else if (type === MEASUREMENT_TYPES.CHECKLIST) {
    // For Checklist, serialize checklist completions into submitted_text as a JSON string
    if (submissionData.tasks) {
      subText = JSON.stringify(submissionData.tasks);
    }
  } else {
    // NUMBER, PERCENTAGE, CURRENCY
    subValue = parseFloat(submissionData.submitted_value);
    validateValueLimits(type, kpi.target_value, subValue);
  }

  const payload = {
    kpi_id: kpiId,
    submitted_value: subValue,
    submitted_text: subText,
    submitted_boolean: subBool,
    comment: submissionData.comment || '',
    status: SUBMISSION_STATUSES.PENDING,
    submitted_by: userContext.id
  };

  return await db.withTransaction(async (client) => {
    const submission = await repo.insertSubmission(orgId, payload, client);

    // If KPI status was CHANGES_REQUESTED, transition it back to ACTIVE or IN_PROGRESS on new submission
    if (kpi.status === STATUSES.CHANGES_REQUESTED) {
      const nextKpiStatus = parseFloat(kpi.completion_percentage || 0) > 0 ? STATUSES.IN_PROGRESS : STATUSES.ACTIVE;
      await repo.updateKpi(orgId, kpiId, {
        ...kpi,
        status: nextKpiStatus
      }, client);
    }

    // Save attachments proof
    if (submissionData.attachments && submissionData.attachments.length > 0) {
      for (const att of submissionData.attachments) {
        await repo.insertAttachment({
          submission_id: submission.submission_id,
          file_name: att.file_name,
          file_url: att.file_url,
          file_type: att.file_type
        }, client);
      }
    }

    // Save links proof
    if (submissionData.links && submissionData.links.length > 0) {
      for (const link of submissionData.links) {
        await repo.insertLink({
          submission_id: submission.submission_id,
          link_name: link.link_name,
          link_url: link.link_url
        }, client);
      }
    }

    return submission;
  });
}

async function reviewSubmission(orgId, submissionId, reviewData, userContext) {
  const submission = await repo.getSubmissionById(orgId, submissionId);
  if (!submission) throw new ApiError(STATUS_CODES.NOT_FOUND, 'KPI Submission not found.');

  const kpi = await repo.getKpiById(orgId, submission.kpi_id);
  if (!kpi) throw new ApiError(STATUS_CODES.NOT_FOUND, 'KPI not found.');

  // Access validation: Reviewer must not be the submitter
  if (submission.submitted_by === userContext.id) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You cannot review your own KPI submissions.');
  }

  // Validate Reviewer is Manager, HR or Admin
  const goal = await verifyGoalAccess(orgId, kpi.goal_id, userContext, 'write');
  if (userContext.role === 'employee') {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Employees do not have permissions to review submissions.');
  }

  if (submission.status !== SUBMISSION_STATUSES.PENDING) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Submission has already been reviewed (${submission.status}).`);
  }

  const { status, comment } = reviewData;
  if (!Object.values(SUBMISSION_STATUSES).includes(status) || status === SUBMISSION_STATUSES.PENDING) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid review status. Must be APPROVED, REJECTED, or CHANGES_REQUESTED.');
  }

  return await db.withTransaction(async (client) => {
    // 1. Update submission details
    const reviewed = await repo.updateSubmissionStatus(orgId, submissionId, status, userContext.id, comment, client);

    if (status === SUBMISSION_STATUSES.APPROVED) {
      const type = kpi.measurement_type;
      let nextApprovedValue = kpi.approved_value;
      let nextApprovedText = kpi.approved_text;
      let nextApprovedBool = kpi.approved_boolean;
      let calcCompletion = kpi.completion_percentage;

      if (type === MEASUREMENT_TYPES.CHECKLIST) {
        // Parse and update completed tasks
        if (submission.submitted_text) {
          const submittedTasks = JSON.parse(submission.submitted_text);
          for (const task of submittedTasks) {
            await repo.updateTaskCompletion(task.task_id, task.is_completed, client);
          }
        }
        // Calculate completion percentage
        const tasks = await repo.getKpiTasks(kpi.kpi_id, orgId, client);
        const completedTasksCount = tasks.filter(t => t.is_completed).length;
        nextApprovedValue = completedTasksCount;
        calcCompletion = STRATEGIES[type](completedTasksCount, tasks.length);
      } else if (type === MEASUREMENT_TYPES.BOOLEAN) {
        nextApprovedBool = submission.submitted_boolean;
        calcCompletion = STRATEGIES[type](nextApprovedBool, kpi.target_boolean);
      } else if (type === MEASUREMENT_TYPES.TEXT) {
        nextApprovedText = submission.submitted_text;
        calcCompletion = STRATEGIES[type](nextApprovedText, kpi.target_text);
      } else {
        // NUMBER, PERCENTAGE, CURRENCY
        nextApprovedValue = parseFloat(submission.submitted_value);
        calcCompletion = STRATEGIES[type](nextApprovedValue, kpi.target_value);
      }

      // Auto transition KPI status
      let nextKpiStatus = kpi.status;
      if (calcCompletion >= 100) {
        nextKpiStatus = STATUSES.COMPLETED;
      } else if (calcCompletion > 0) {
        nextKpiStatus = STATUSES.IN_PROGRESS;
      }

      // 2. Update KPI table cache
      await repo.updateKpi(orgId, kpi.kpi_id, {
        ...kpi,
        approved_value: nextApprovedValue,
        approved_text: nextApprovedText,
        approved_boolean: nextApprovedBool,
        completion_percentage: calcCompletion,
        status: nextKpiStatus
      }, client);

      // 3. Recalculate parent Goal Progress & record Goal history log
      let historyComment = `Progress derived from approved KPI (${kpi.kpi_code} - "${kpi.title}").`;
      const finalComment = comment || submission.comment;
      if (finalComment) {
        historyComment += ` Comment: "${finalComment}"`;
      }

      await repo.recalculateGoalProgress(
        orgId, 
        kpi.goal_id, 
        userContext.id, 
        historyComment, 
        client
      );
    } else if (status === SUBMISSION_STATUSES.CHANGES_REQUESTED || status === SUBMISSION_STATUSES.REJECTED) {
      // 2. Update KPI status to CHANGES_REQUESTED so frontend can highlight it
      await repo.updateKpi(orgId, kpi.kpi_id, {
        ...kpi,
        status: STATUSES.CHANGES_REQUESTED
      }, client);
    }

    return reviewed;
  });
}

async function listSubmissionHistory(orgId, kpiId, userContext) {
  const kpi = await repo.getKpiById(orgId, kpiId);
  if (!kpi) throw new ApiError(STATUS_CODES.NOT_FOUND, 'KPI not found.');
  await verifyGoalAccess(orgId, kpi.goal_id, userContext, 'read');

  const list = await repo.getSubmissionsByKpiId(orgId, kpiId);
  for (const s of list) {
    s.attachments = await repo.getAttachmentsBySubmissionId(s.submission_id);
    s.links = await repo.getLinksBySubmissionId(s.submission_id);
  }
  return list;
}

// ── PATCH /kpis/:kpiId/progress (Repurposed for Integrations) ──

async function updateKpiProgress(orgId, kpiId, progressData, userContext) {
  const kpi = await repo.getKpiById(orgId, kpiId);
  if (!kpi) throw new ApiError(STATUS_CODES.NOT_FOUND, 'KPI not found.');

  await verifyGoalAccess(orgId, kpi.goal_id, userContext, 'write');

  if (![STATUSES.ACTIVE, STATUSES.IN_PROGRESS].includes(kpi.status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Progress updates blocked: KPI status is ${kpi.status}.`);
  }

  const type = kpi.measurement_type;
  let nextVal = null;
  let nextText = null;
  let nextBool = null;

  if (type === MEASUREMENT_TYPES.BOOLEAN) {
    if (progressData.current_boolean === undefined) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'current_boolean is required.');
    }
    nextBool = progressData.current_boolean;
  } else if (type === MEASUREMENT_TYPES.TEXT) {
    if (progressData.current_text === undefined) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'current_text is required.');
    }
    nextText = progressData.current_text;
  } else if (type === MEASUREMENT_TYPES.CHECKLIST) {
    if (progressData.tasks === undefined) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'tasks array is required.');
    }
    nextText = JSON.stringify(progressData.tasks);
  } else {
    if (progressData.current_value === undefined) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'current_value is required.');
    }
    nextVal = parseFloat(progressData.current_value);
    if (isNaN(nextVal)) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'current_value must be numeric.');
    }
    validateValueLimits(type, kpi.target_value, nextVal);
  }

  return await db.withTransaction(async (client) => {
    // 1. Create auto-approved submission for integration audits
    const submission = await repo.insertSubmission(orgId, {
      kpi_id: kpiId,
      submitted_value: nextVal,
      submitted_text: nextText,
      submitted_boolean: nextBool,
      comment: progressData.comment || 'API System Integration sync.',
      status: SUBMISSION_STATUSES.APPROVED,
      submitted_by: userContext.id
    }, client);

    await repo.updateSubmissionStatus(orgId, submission.submission_id, SUBMISSION_STATUSES.APPROVED, userContext.id, 'Auto approved by system integration.', client);

    // 2. Perform updates
    let calcCompletion = kpi.completion_percentage;
    let nextApprovedVal = kpi.approved_value;
    let nextApprovedText = kpi.approved_text;
    let nextApprovedBool = kpi.approved_boolean;

    if (type === MEASUREMENT_TYPES.CHECKLIST) {
      const submittedTasks = progressData.tasks;
      for (const t of submittedTasks) {
        await repo.updateTaskCompletion(t.task_id, t.is_completed, client);
      }
      const tasks = await repo.getKpiTasks(kpiId, orgId, client);
      const completedTasksCount = tasks.filter(t => t.is_completed).length;
      nextApprovedVal = completedTasksCount;
      calcCompletion = STRATEGIES[type](completedTasksCount, tasks.length);
    } else if (type === MEASUREMENT_TYPES.BOOLEAN) {
      nextApprovedBool = nextBool;
      calcCompletion = STRATEGIES[type](nextApprovedBool, kpi.target_boolean);
    } else if (type === MEASUREMENT_TYPES.TEXT) {
      nextApprovedText = nextText;
      calcCompletion = STRATEGIES[type](nextApprovedText, kpi.target_text);
    } else {
      nextApprovedVal = nextVal;
      calcCompletion = STRATEGIES[type](nextApprovedVal, kpi.target_value);
    }

    let nextKpiStatus = kpi.status;
    if (calcCompletion >= 100) {
      nextKpiStatus = STATUSES.COMPLETED;
    } else if (calcCompletion > 0) {
      nextKpiStatus = STATUSES.IN_PROGRESS;
    }

    const updated = await repo.updateKpi(orgId, kpiId, {
      ...kpi,
      approved_value: nextApprovedVal,
      approved_text: nextApprovedText,
      approved_boolean: nextApprovedBool,
      completion_percentage: calcCompletion,
      status: nextKpiStatus
    }, client);

    let historyComment = `Goal progress recalculated derived from API integration sync.`;
    if (progressData.comment) {
      historyComment += ` Comment: "${progressData.comment}"`;
    }

    // 3. Recalculate parent Goal progress
    await repo.recalculateGoalProgress(
      orgId, 
      kpi.goal_id, 
      userContext.id, 
      historyComment, 
      client
    );

    return updated;
  });
}

async function getDashboardSummary(orgId, userContext) {
  const activeConfig = await getActiveConfig(orgId).catch(() => null);
  const activeConfigId = activeConfig ? activeConfig.financial_year_id : null;
  return await repo.getKpiDashboardStats(orgId, activeConfigId, userContext);
}

async function getGoalProgressHistory(orgId, goalId) {
  return await repo.getGoalProgressHistory(orgId, goalId);
}

async function listPendingSubmissions(orgId, userContext) {
  if (!['client_admin', 'manager', 'hr'].includes(userContext.role)) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Only managers and admins can review submissions.');
  }
  const submissions = await repo.getPendingSubmissions(orgId, userContext);
  for (const s of submissions) {
    s.attachments = await repo.getAttachmentsBySubmissionId(s.submission_id);
    s.links = await repo.getLinksBySubmissionId(s.submission_id);
  }
  return submissions;
}

module.exports = {
  listGoalKpis,
  getKpiDetails,
  createKpi,
  updateKpi,
  deleteKpi,
  updateKpiStatus,
  submitKpiCompletion,
  reviewSubmission,
  listSubmissionHistory,
  updateKpiProgress,
  getDashboardSummary,
  getGoalProgressHistory,
  listPendingSubmissions
};
