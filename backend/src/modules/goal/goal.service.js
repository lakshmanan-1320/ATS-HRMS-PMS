const repo = require('./goal.repository');
const financialYearService = require('../financialYear/financialYear.service');
const goalSettingsService = require('../goalSettings/goalSettings.service');
const goalAssignmentService = require('./goalAssignment.service');
const continuousFeedbackRepo = require('../continuousFeedback/continuousFeedback.repository');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');
const { STATUSES } = require('./goal.schema');

async function getActiveFy(orgId) {
  const activeFy = await financialYearService.getActiveFinancialYear(orgId);
  if (!activeFy) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'No active Financial Year found for this organization.');
  }
  return activeFy;
}

async function getActiveConfig(orgId) {
  try {
    const activeFy = await financialYearService.getActiveFinancialYear(orgId);
    if (!activeFy) return null;
    const settings = await goalSettingsService.getGoalSettings(activeFy.financial_year_id, orgId);
    return {
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

async function checkGoalLock(orgId, financialYearId) {
  const fy = await financialYearService.getFinancialYearById(financialYearId, orgId);
  if (fy && ['CLOSED', 'ARCHIVED'].includes(fy.status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Goal is locked: parent Financial Year "${fy.name}" is ${fy.status}.`);
  }
}

async function listGoals(orgId, filters) {
  return repo.listGoals(orgId, filters);
}

async function getGoal(orgId, id, userContext = null) {
  const goal = await repo.getGoalById(orgId, id);
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.');

  // Enforce department access restriction for department-assigned goals:
  if (goal.assigned_to_department_id && userContext?.employeeId) {
    const { query } = require('../../config/db');
    const userDeptRes = await query(
      `SELECT department_id FROM employees WHERE employee_id = $1`,
      [userContext.employeeId]
    );
    const userDeptId = userDeptRes.rows[0]?.department_id;
    if (userDeptId && userDeptId !== goal.assigned_to_department_id) {
      throw new ApiError(STATUS_CODES.FORBIDDEN, 'Access denied. You do not belong to the department this goal is assigned to.');
    }
  }

  const subGoals = await repo.getSubGoals(orgId, id);
  const result = { ...goal, sub_goals: subGoals };

  if (goal.performance_technique === 'COMPETENCY_ASSESSMENT') {
    const competencyRepo = require('../competencyAssessment/competencyAssessment.repository');
    result.competencies = await competencyRepo.listGoalCompetencies(id);
    result.competency_stats = await competencyRepo.getGoalAssignmentsOverview(id);
  }
  if (goal.performance_technique === '360_FEEDBACK') {
    const feedback360Repo = require('../feedback360/feedback360.repository');
    result.feedback360_config = await feedback360Repo.getGoalConfig(id);
    result.feedback360_stats = await feedback360Repo.getAssignmentOverview(id);
  }
  if (goal.performance_technique === 'KPI') {
    const kpiRepo = require('../kpi/kpi.repository');
    result.kpis = await kpiRepo.getKpisForGoal(orgId, id);
  }
  return result;
}

async function checkCircularReference(orgId, goalId, parentGoalId) {
  let currentParentId = parentGoalId;
  while (currentParentId) {
    if (currentParentId === goalId) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Circular reference detected in parent goal hierarchy.');
    }
    const parent = await repo.getGoalById(orgId, currentParentId);
    if (!parent) break;
    currentParentId = parent.parent_goal_id;
  }
}

async function validateGoalDatesAndDeadline(activeFy, start_date, due_date, userContext = {}) {
  const fyStart = new Date(activeFy.start_date);
  const fyEnd = new Date(activeFy.end_date);

  if (start_date) {
    const start = new Date(start_date);
    if (start < fyStart || start > fyEnd) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Start date must fall within the active Financial Year dates.');
    }
  }

  if (due_date) {
    const due = new Date(due_date);
    if (due < fyStart || due > fyEnd) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Due date must fall within the active Financial Year dates.');
    }
  }
}

async function validateGoalWeight(orgId, targetGoalId, targetWeight, payloadGoalType, financialYearId, goalSettings) {
  if (!goalSettings.require_goal_weight_validation) return;

  const targetGoal = targetGoalId ? await repo.getGoalById(orgId, targetGoalId) : null;
  
  // Skip if it is a child goal
  const parentId = targetGoal ? targetGoal.parent_goal_id : null;
  if (parentId) return;

  const type = payloadGoalType || targetGoal?.goal_type || 'individual';

  // Determine filtering keys
  const filter = {
    financial_year_id: financialYearId,
    parent_goal_id: null,
    goal_type: type
  };

  if (type === 'individual') {
    filter.employee_id = targetGoal ? targetGoal.assigned_to_employee_id : null;
    if (!filter.employee_id) return;
  } else if (type === 'department') {
    filter.department_id = targetGoal ? targetGoal.assigned_to_department_id : null;
    if (!filter.department_id) return;
  } else if (type === 'team') {
    filter.employee_id = targetGoal ? targetGoal.assigned_to_employee_id : null;
    if (!filter.employee_id) return;
  }

  const goals = await repo.listGoals(orgId, filter);

  let sum = 0;
  let found = false;

  for (const g of goals) {
    if (g.status === STATUSES.REJECTED) continue;
    if (g.goal_id === targetGoalId) {
      sum += parseFloat(targetWeight);
      found = true;
    } else {
      sum += parseFloat(g.weight);
    }
  }

  if (!found) {
    sum += parseFloat(targetWeight);
  }

  if (Math.round(sum) !== 100) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      `Total weight of top-level ${type} goals within this financial year must equal exactly 100%. Current total: ${sum}%.`
    );
  }
}

async function validatePerformanceTechniqueEnabled(orgId, technique) {
  const moduleKey = {
    KPI: 'kpi',
    CONTINUOUS_FEEDBACK: 'continuous_feedback',
    COMPETENCY_ASSESSMENT: 'competency_assessment',
    SELF_ASSESSMENT: 'self_assessment',
    '360_FEEDBACK': '360_feedback',
  }[technique];

  if (moduleKey) {
    const { query } = require('../../config/db');
    const modulesRes = await query(
      `SELECT cm.is_enabled 
       FROM client_modules cm
       JOIN client_admins ca ON ca.client_admin_id = cm.client_admin_id
       WHERE ca.organization_id = $1 AND cm.module_key = $2`,
      [orgId, moduleKey]
    );
    if (modulesRes.rows.length > 0 && !modulesRes.rows[0].is_enabled) {
      throw new ApiError(STATUS_CODES.FORBIDDEN, `The performance technique "${technique}" has been disabled for your organization.`);
    }
  }
}

async function createGoal(orgId, data, userContext) {
  const activeFy = await getActiveFy(orgId);
  const goalSettings = await goalSettingsService.getGoalSettings(activeFy.financial_year_id, orgId);

  // Validate performance technique is enabled
  await validatePerformanceTechniqueEnabled(orgId, data.performance_technique || 'KPI');

  // Validate dates and deadline
  await validateGoalDatesAndDeadline(activeFy, data.start_date, data.due_date, userContext);

  const isEmployee = userContext.role === 'employee';
  const isManager = ['manager', 'hr', 'client_admin'].includes(userContext.role);

  // Enforce Goal Setting Direction
  if (goalSettings.goal_setting_direction === 'TOP_DOWN') {
    if (isEmployee) {
      throw new ApiError(STATUS_CODES.FORBIDDEN, 'Employees are not permitted to create goals under TOP_DOWN configuration.');
    }
  } else if (goalSettings.goal_setting_direction === 'BOTTOM_UP') {
    if (isManager && data.assigned_to_employee_id && data.assigned_to_employee_id !== userContext.employeeId) {
      throw new ApiError(STATUS_CODES.FORBIDDEN, 'Managers cannot assign goals to employees under BOTTOM_UP configuration.');
    }
  }

  // Validate creation flags
  if (isEmployee && !goalSettings.allow_employee_goal_creation) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Employee goal creation is disabled by configuration settings.');
  }
  if (isManager && !goalSettings.allow_manager_goal_creation) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Manager goal creation is disabled by configuration settings.');
  }

  // Validate max goals per employee by goal type
  const targetEmployeeId = data.assigned_to_employee_id || userContext.employeeId;
  const goalType = (data.goal_type || 'individual').toLowerCase();
  if (targetEmployeeId) {
    const goalCount = await repo.getGoalCountForEmployee(orgId, targetEmployeeId, activeFy.financial_year_id, goalType);
    if (goalCount >= goalSettings.max_goals_per_employee) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, `Goal limit reached: maximum goals per employee for type "${goalType}" is ${goalSettings.max_goals_per_employee}.`);
    }
  }

  // Validate parent goal exists and dates are bounded
  if (data.parent_goal_id) {
    const parent = await repo.getGoalById(orgId, data.parent_goal_id);
    if (!parent) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Parent goal not found.');
    }
    if (data.start_date && parent.start_date) {
      const start = new Date(data.start_date);
      const parentStart = new Date(parent.start_date);
      if (start < parentStart) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Sub-goal start date (${data.start_date.split('T')[0]}) cannot be before parent goal start date (${new Date(parent.start_date).toISOString().split('T')[0]}).`);
      }
    }
    if (data.due_date && parent.due_date) {
      const due = new Date(data.due_date);
      const parentDue = new Date(parent.due_date);
      if (due > parentDue) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Sub-goal due date (${data.due_date.split('T')[0]}) cannot be after parent goal due date (${new Date(parent.due_date).toISOString().split('T')[0]}).`);
      }
    }
  }

  const isSelfAssigned = !data.assigned_to_employee_id || data.assigned_to_employee_id === userContext.employeeId;
  let initialStatus;
  if (userContext.role === 'client_admin' || userContext.role === 'hr') {
    initialStatus = STATUSES.ACTIVE;
  } else if ((userContext.role === 'manager') && isSelfAssigned) {
    initialStatus = STATUSES.ACTIVE;
  } else {
    initialStatus = STATUSES.DRAFT;
  }

  const payload = {
    ...data,
    goal_type: goalType,
    financial_year_id: activeFy.financial_year_id,
    created_by: userContext.id,
    assigned_by: isManager ? userContext.id : null,
    assigned_to_employee_id: targetEmployeeId,
    status: initialStatus,
    ...(initialStatus === STATUSES.ACTIVE ? {
      approved_by: userContext.id,
      approved_at: new Date().toISOString()
    } : {})
  };

  const createdGoal = await repo.createGoal(orgId, payload);

  // Save reflection template questions if provided (for Continuous Feedback goals)
  if (data.reflection_template && Array.isArray(data.reflection_template) && data.reflection_template.length > 0) {
    await continuousFeedbackRepo.saveReflectionTemplate(orgId, createdGoal.goal_id, data.reflection_template);
  }

  // Save competencies template if provided (for Competency Assessment goals)
  if (data.performance_technique === 'COMPETENCY_ASSESSMENT' && data.competencies && Array.isArray(data.competencies)) {
    const competencyService = require('../competencyAssessment/competencyAssessment.service');
    await competencyService.saveGoalCompetencies(createdGoal.goal_id, orgId, data.competencies, userContext);
  }

  // Save self assessment template if provided (for Self Assessment goals)
  if (data.performance_technique === 'SELF_ASSESSMENT' && data.self_assessment_template && Array.isArray(data.self_assessment_template)) {
    const selfAssessmentService = require('../selfAssessment/selfAssessment.service');
    await selfAssessmentService.saveSelfAssessmentTemplate(orgId, createdGoal.goal_id, data.self_assessment_template, userContext.id);
  }

  // Save 360 feedback config & template if provided
  if (data.performance_technique === '360_FEEDBACK') {
    const feedback360Service = require('../feedback360/feedback360.service');
    const cfRepo = require('../continuousFeedback/continuousFeedback.repository');
    const defaultConfig = await cfRepo.getTechniqueConfiguration(orgId, '360_FEEDBACK');
    const finalConfig = data.feedback360_config || defaultConfig;
    await feedback360Service.saveGoalConfig(orgId, createdGoal.goal_id, finalConfig, userContext);

    if (data.feedback360_template && Array.isArray(data.feedback360_template)) {
      await feedback360Service.saveTemplates(orgId, createdGoal.goal_id, data.feedback360_template, userContext);
    }
  }

  // Save KPIs if provided (for KPI goals)
  if (data.performance_technique === 'KPI' && data.kpis && Array.isArray(data.kpis)) {
    const kpiRepo = require('../kpi/kpi.repository');
    for (const k of data.kpis) {
      await kpiRepo.createKpi(orgId, {
        ...k,
        goal_id: createdGoal.goal_id,
        financial_year_id: activeFy.financial_year_id,
        start_date: k.start_date || createdGoal.start_date,
        due_date: k.due_date || createdGoal.due_date,
        status: createdGoal.status === STATUSES.ACTIVE ? 'ACTIVE' : 'DRAFT'
      });
    }
  }

  // Delegate department / company goal assignment to GoalAssignmentService
  await goalAssignmentService.assignGoal(orgId, createdGoal);

  if (createdGoal.performance_technique === '360_FEEDBACK') {
    const feedback360Service = require('../feedback360/feedback360.service');
    await feedback360Service.autoPopulateAllAssignments(orgId, createdGoal.goal_id).catch(err => {
      console.error('Failed to auto-populate 360 reviewers at goal creation:', err);
    });
  }

  return createdGoal;
}

async function updateGoal(orgId, id, data, userContext) {
  const existing = await repo.getGoalById(orgId, id);
  if (!existing) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.');

  await checkGoalLock(orgId, existing.financial_year_id);

  const activeFy = await getActiveFy(orgId);
  const goalSettings = await goalSettingsService.getGoalSettings(activeFy.financial_year_id, orgId);

  // If the target technique is CONTINUOUS_FEEDBACK, it must be enabled.
  const targetTechnique = data.performance_technique || existing.performance_technique;
  if (targetTechnique === 'CONTINUOUS_FEEDBACK') {
    await validatePerformanceTechniqueEnabled(orgId, 'CONTINUOUS_FEEDBACK');
  } else if (data.performance_technique && data.performance_technique !== existing.performance_technique) {
    await validatePerformanceTechniqueEnabled(orgId, data.performance_technique);
  }

  // Validate edit lock
  if (!goalSettings.allow_goal_edit_after_approval && [STATUSES.ACTIVE, STATUSES.IN_PROGRESS, STATUSES.COMPLETED].includes(existing.status)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Goal modifications are blocked: configuration restricts editing after approval.');
  }

  if (existing.status === STATUSES.ACTIVE && data.weight !== undefined && parseFloat(data.weight) !== parseFloat(existing.weight)) {
    await validateGoalWeight(orgId, id, data.weight, data.goal_type || existing.goal_type, activeFy.financial_year_id, goalSettings);
  }

  // Validate dates and deadline
  await validateGoalDatesAndDeadline(activeFy, data.start_date, data.due_date);

  // Circular reference validation
  if (data.parent_goal_id) {
    await checkCircularReference(orgId, id, data.parent_goal_id);
  }

  // Validate parent goal date boundaries
  const parentId = data.parent_goal_id !== undefined ? data.parent_goal_id : existing.parent_goal_id;
  if (parentId) {
    const parent = await repo.getGoalById(orgId, parentId);
    if (!parent) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Parent goal not found.');
    }
    const startVal = data.start_date || existing.start_date;
    const dueVal = data.due_date || existing.due_date;
    if (startVal && parent.start_date) {
      const start = new Date(startVal);
      const parentStart = new Date(parent.start_date);
      if (start < parentStart) {
        const dateStr = typeof startVal === 'string' ? startVal.split('T')[0] : new Date(startVal).toISOString().split('T')[0];
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Sub-goal start date (${dateStr}) cannot be before parent goal start date (${new Date(parent.start_date).toISOString().split('T')[0]}).`);
      }
    }
    if (dueVal && parent.due_date) {
      const due = new Date(dueVal);
      const parentDue = new Date(parent.due_date);
      if (due > parentDue) {
        const dateStr = typeof dueVal === 'string' ? dueVal.split('T')[0] : new Date(dueVal).toISOString().split('T')[0];
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Sub-goal due date (${dateStr}) cannot be after parent goal due date (${new Date(parent.due_date).toISOString().split('T')[0]}).`);
      }
    }
  }

  const updated = {
    ...existing,
    ...data
  };

  const savedGoal = await repo.updateGoal(orgId, id, updated);

  // Update competencies template if provided (for Competency Assessment goals)
  if (updated.performance_technique === 'COMPETENCY_ASSESSMENT' && data.competencies && Array.isArray(data.competencies)) {
    const competencyService = require('../competencyAssessment/competencyAssessment.service');
    await competencyService.saveGoalCompetencies(id, orgId, data.competencies, userContext);
  }

  // Update self assessment template if provided (for Self Assessment goals)
  if (updated.performance_technique === 'SELF_ASSESSMENT' && data.self_assessment_template && Array.isArray(data.self_assessment_template)) {
    const selfAssessmentService = require('../selfAssessment/selfAssessment.service');
    await selfAssessmentService.saveSelfAssessmentTemplate(orgId, id, data.self_assessment_template, userContext.id);
  }

  // Update 360 feedback config & template if provided
  if (updated.performance_technique === '360_FEEDBACK') {
    const feedback360Service = require('../feedback360/feedback360.service');
    const cfRepo = require('../continuousFeedback/continuousFeedback.repository');
    const defaultConfig = await cfRepo.getTechniqueConfiguration(orgId, '360_FEEDBACK');
    const finalConfig = data.feedback360_config || defaultConfig;
    await feedback360Service.saveGoalConfig(orgId, id, finalConfig, userContext);

    if (data.feedback360_template && Array.isArray(data.feedback360_template)) {
      await feedback360Service.saveTemplates(orgId, id, data.feedback360_template, userContext);
    }
  }

  // Update KPIs if provided (for KPI goals)
  if (updated.performance_technique === 'KPI' && data.kpis && Array.isArray(data.kpis)) {
    const { query } = require('../../config/db');
    await query('DELETE FROM goal_kpis WHERE goal_id = $1', [id]);
    const kpiRepo = require('../kpi/kpi.repository');
    for (const k of data.kpis) {
      await kpiRepo.createKpi(orgId, {
        ...k,
        goal_id: id,
        financial_year_id: activeFy.financial_year_id,
        start_date: k.start_date || savedGoal.start_date,
        due_date: k.due_date || savedGoal.due_date,
        status: savedGoal.status === STATUSES.ACTIVE ? 'ACTIVE' : 'DRAFT'
      });
    }
  }

  return savedGoal;
}

async function deleteGoal(orgId, id, role) {
  const existing = await repo.getGoalById(orgId, id);
  if (!existing) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.');

  await checkGoalLock(orgId, existing.financial_year_id);

  if (!['client_admin', 'hr'].includes(role) && existing.status !== STATUSES.DRAFT) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Deletion blocked: only goals in DRAFT status can be deleted.');
  }

  const result = await repo.deleteGoal(orgId, id);
  return result;
}

const VALID_TRANSITIONS = {
  [STATUSES.DRAFT]: [STATUSES.PENDING_APPROVAL, STATUSES.ACTIVE],
  [STATUSES.PENDING_APPROVAL]: [STATUSES.ACTIVE, STATUSES.CHANGES_REQUESTED, STATUSES.REJECTED],
  [STATUSES.CHANGES_REQUESTED]: [STATUSES.PENDING_APPROVAL],
  [STATUSES.ACTIVE]: [STATUSES.IN_PROGRESS, STATUSES.COMPLETED],
  [STATUSES.IN_PROGRESS]: [STATUSES.COMPLETED],
  [STATUSES.COMPLETED]: [],
  [STATUSES.REJECTED]: []
};

async function updateGoalStatus(orgId, id, targetStatus, statusPayload = {}, userContext) {
  const existing = await repo.getGoalById(orgId, id);
  if (!existing) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.');

  await checkGoalLock(orgId, existing.financial_year_id);

  const currentStatus = existing.status;

  // Enforce workflow state transitions
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid status transition from ${currentStatus} to ${targetStatus}.`);
  }

  const activeConfig = await getActiveConfig(orgId);
  const goalSettings = await goalSettingsService.getGoalSettings(existing.financial_year_id, orgId);

  // Weight validation on activation/submission
  if ([STATUSES.PENDING_APPROVAL, STATUSES.ACTIVE].includes(targetStatus) && !existing.parent_goal_id) {
    await validateGoalWeight(orgId, id, existing.weight, existing.goal_type, existing.financial_year_id, goalSettings);
  }

  // Defer approval details if transitioning to active or rejected
  const updatedPayload = {
    ...existing,
    status: targetStatus
  };

  if (targetStatus === STATUSES.ACTIVE) {
    updatedPayload.approved_by = userContext.id;
    updatedPayload.approved_at = new Date().toISOString();

    const { query } = require('../../config/db');
    await query(`UPDATE goal_assignments SET status = 'ACTIVE', updated_at = NOW() WHERE goal_id = $1`, [id]).catch(err => {
      console.error('Failed to activate goal assignments on goal status update:', err);
    });

    if (existing.performance_technique === '360_FEEDBACK') {
      const feedback360Service = require('../feedback360/feedback360.service');
      await feedback360Service.autoPopulateAllAssignments(orgId, id).catch(err => {
        console.error('Failed to auto-populate 360 reviewers at goal activation:', err);
      });
    }
  } else if (targetStatus === STATUSES.REJECTED || targetStatus === STATUSES.CHANGES_REQUESTED) {
    updatedPayload.rejected_by = userContext.id;
    updatedPayload.rejected_at = new Date().toISOString();
    updatedPayload.rejection_reason = statusPayload.reason || null;
  }

  return await repo.updateGoal(orgId, id, updatedPayload);
}

async function getGoalDashboardSummary(orgId, userContext = null) {
  let activeFy;
  try {
    activeFy = await financialYearService.getActiveFinancialYear(orgId);
  } catch (_) {
    return {
      total: 0, draft: 0, pending_approval: 0, changes_requested: 0,
      active: 0, in_progress: 0, completed: 0, rejected: 0, averageProgress: 0, weightedKpiProgress: 0
    };
  }
  return await repo.getGoalDashboardSummary(orgId, activeFy.financial_year_id, userContext);
}

async function getGoalDocuments(orgId, goalId) {
  return await repo.getGoalDocuments(orgId, goalId);
}

async function getGoalActivityLogs(orgId, goalId) {
  return await repo.getGoalActivityLogs(orgId, goalId);
}

module.exports = {
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  updateGoalStatus,
  getGoalDashboardSummary,
  getGoalDocuments,
  getGoalActivityLogs,
  getActiveConfig
};
