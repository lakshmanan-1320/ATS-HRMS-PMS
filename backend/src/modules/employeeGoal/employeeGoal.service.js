const repo = require('./employeeGoal.repository')
const ApiError = require('../../utils/apiError')
const { STATUS_CODES } = require('../../constants/statusCodes')
const notifRepo = require('../inAppNotification/inAppNotification.repository')
const notifSettings = require('../notification/notificationSettings.repository')
const financialYearService = require('../financialYear/financialYear.service');
const goalSettingsService = require('../goalSettings/goalSettings.service');

async function resolveClient(orgId) {
  const clientAdminId = await repo.getClientAdminIdByOrg(orgId)
  if (!clientAdminId) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Organisation not found.')
  return clientAdminId
}

async function getActiveConfig(orgId) {
  try {
    const activeFy = await financialYearService.getActiveFinancialYear(orgId);
    const settings = await goalSettingsService.getGoalSettings(activeFy.financial_year_id, orgId);
    return {
      financial_year_id: activeFy.financial_year_id,
      goal_setting_direction: settings.goal_setting_direction,
      allow_employee_goal_creation: settings.allow_employee_goal_creation,
      max_goals_per_employee: settings.max_goals_per_employee,
      goal_approval_required: settings.goal_approval_required
    };
  } catch (_) {
    return null;
  }
}

async function getGoalConfig(orgId) {
  const clientAdminId = await resolveClient(orgId)
  const config = await repo.getGoalConfig(clientAdminId)
  return config || { allow_employee_goal: true, allow_manager_goal: true, allow_admin_goal: true }
}

async function createEmployeeGoal(employeeId, orgId, data) {
  if (!data.title?.trim()) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Title is required.')

  const clientAdminId = await resolveClient(orgId)
  const activeConfig = await getActiveConfig(orgId)

  if (!activeConfig) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'No active Financial Year found for this organization.');
  }

  if (data.parent_goal_id) {
    const parent = await repo.getEmployeeGoalById(clientAdminId, data.parent_goal_id)
    if (!parent) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Parent goal not found.')

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

    const weight = Number(data.weight)
    if (!weight || weight <= 0 || weight > 100)
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Weight must be between 1 and 100.')

    const usedWeight = await repo.getSubGoalWeightSum(data.parent_goal_id)
    if (usedWeight + weight > 100)
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        `Total sub-goal weight would exceed 100%. Remaining: ${100 - usedWeight}%.`
      )
  } else {
    if (activeConfig.goal_setting_direction === 'TOP_DOWN') {
      throw new ApiError(STATUS_CODES.FORBIDDEN, 'Goal creation by employee is disabled under TOP_DOWN direction.');
    }
    if (!activeConfig.allow_employee_goal_creation) {
      throw new ApiError(STATUS_CODES.FORBIDDEN, 'Employee goal creation is disabled for this organization.');
    }

    const count = await repo.getGoalCountForEmployee(clientAdminId, employeeId, activeConfig.financial_year_id, 'individual');
    if (count >= activeConfig.max_goals_per_employee) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        `You have reached the maximum configured goal limit of ${activeConfig.max_goals_per_employee}.`
      );
    }
  }

  const payload = {
    ...data,
    financial_year_id: activeConfig.financial_year_id
  };

  const createdGoal = await repo.createEmployeeGoal(clientAdminId, employeeId, payload)

  if (!activeConfig.goal_approval_required) {
    const db = require('../../config/db');
    await db.query(`UPDATE goals SET status = 'active' WHERE goal_id = $1`, [createdGoal.goal_id]);
    createdGoal.status = 'active';
  }

  if (createdGoal) {
    createdGoal.id = createdGoal.goal_id;
  }

  return createdGoal;
}

async function getCreatedGoals(employeeId, orgId) {
  const clientAdminId = await resolveClient(orgId)
  const goals = await repo.getGoalsByCreator(clientAdminId, employeeId)
  const withSubs = await Promise.all(
    goals.map(async g => {
      const subGoals = await repo.getSubGoalsByParent(clientAdminId, g.goal_id)
      const mappedSubs = subGoals.map(sg => ({ ...sg, id: sg.goal_id }))
      return { ...g, id: g.goal_id, subGoals: mappedSubs }
    })
  )
  return withSubs
}

async function updateCreatedGoal(employeeId, orgId, goalId, data) {
  if (!data.title?.trim()) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Title is required.')

  const clientAdminId = await resolveClient(orgId)
  const goal = await repo.getEmployeeGoalById(clientAdminId, goalId)
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.')
  if (goal.created_by_employee_id !== employeeId)
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You can only edit your own goals.')

  // Validate parent goal date boundaries
  const parentId = data.parent_goal_id !== undefined ? data.parent_goal_id : goal.parent_goal_id;
  if (parentId) {
    const parent = await repo.getEmployeeGoalById(clientAdminId, parentId);
    if (!parent) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Parent goal not found.');
    }
    const startVal = data.start_date || goal.start_date;
    const dueVal = data.due_date || goal.due_date;
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

  const activeConfig = await getActiveConfig(orgId)
  if (activeConfig) {
    if (!activeConfig.allow_goal_edit_after_approval && ['approved', 'completed', 'active'].includes(goal.status)) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot edit an approved, completed, or active goal.');
    }
  }

  if (!['draft', 'in_progress'].includes(goal.status)) {
    if (!activeConfig || !activeConfig.allow_goal_edit_after_approval) {
      throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only draft or in-progress goals can be edited.')
    }
  }

  const updated = await repo.updateEmployeeGoal(clientAdminId, goalId, employeeId, data)
  if (updated) {
    updated.id = updated.goal_id;
  }
  return updated
}

async function deleteCreatedGoal(employeeId, orgId, goalId) {
  const clientAdminId = await resolveClient(orgId)
  const goal = await repo.getEmployeeGoalById(clientAdminId, goalId)
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.')
  if (goal.created_by_employee_id !== employeeId)
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You can only delete your own goals.')
  if (goal.status !== 'draft')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only draft goals can be deleted.')

  const deleted = await repo.deleteEmployeeGoal(clientAdminId, goalId, employeeId)
  if (!deleted) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.')
  return deleted
}

async function submitCreatedGoal(employeeId, orgId, goalId) {
  const clientAdminId = await resolveClient(orgId)
  const goal = await repo.getEmployeeGoalById(clientAdminId, goalId)
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.')
  if (goal.created_by_employee_id !== employeeId)
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You can only submit your own goals.')

  const activeConfig = await getActiveConfig(orgId)
  if (activeConfig) {
    if (activeConfig.goal_submission_deadline) {
      const deadline = new Date(activeConfig.goal_submission_deadline);
      deadline.setHours(23, 59, 59, 999);
      if (Date.now() > deadline.getTime()) {
        throw new ApiError(STATUS_CODES.BAD_REQUEST, `Goal submission deadline has passed (${activeConfig.goal_submission_deadline}).`);
      }
    }
  }

  if (!['draft', 'in_progress'].includes(goal.status))
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only draft or in-progress goals can be submitted.')

  if (activeConfig && !activeConfig.goal_approval_required) {
    const db = require('../../config/db');
    await db.query(`UPDATE goals SET status = 'active' WHERE goal_id = $1`, [goalId]);
    goal.status = 'active';
    goal.id = goal.goal_id;
    return goal;
  }

  const updated = await repo.submitEmployeeGoal(clientAdminId, goalId, employeeId)
  if (updated) {
    updated.id = updated.goal_id;
  }

  // notify manager (only if goal_submitted is enabled in notification settings)
  try {
    const settings = await notifSettings.getSettings()
    if (settings.goal_submitted !== false) {
      const [managerId, employeeName] = await Promise.all([
        notifRepo.getManagerIdForEmployee(employeeId),
        notifRepo.getEmployeeName(employeeId),
      ])
      if (managerId) {
        const isSubGoal = !!goal.parent_goal_id
        const label = isSubGoal ? 'sub-goal' : 'goal'
        await notifRepo.createNotification(
          managerId,
          'goal_submitted',
          isSubGoal ? 'Sub-Goal Submitted for Approval' : 'Goal Submitted for Approval',
          `${employeeName} submitted the ${label} "${goal.title}" for your approval.`,
          goal.id,
          'goal'
        )
      }
    }
  } catch (_) { /* non-fatal */ }

  return updated
}

async function submitCompletion(employeeId, orgId, goalId, note) {
  const clientAdminId = await resolveClient(orgId)
  const goal = await repo.getEmployeeGoalById(clientAdminId, goalId)
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.')
  if (goal.assigned_to_employee_id !== employeeId)
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You can only mark goals assigned to you as complete.')
  if (!['active', 'in_progress', 'approved'].includes(goal.status))
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Goal must be active or in-progress to mark as complete.')
  if (goal.pending_completion)
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'A completion request is already pending manager approval.')

  const updated = await repo.markCompleted(goalId, employeeId, note)
  if (!updated) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Unable to submit completion request.')

  updated.id = updated.goal_id;

  // notify manager of completion request
  try {
    const settings = await notifSettings.getSettings()
    if (settings.goal_submitted !== false) {
      const [managerId, employeeName] = await Promise.all([
        notifRepo.getManagerIdForEmployee(employeeId),
        notifRepo.getEmployeeName(employeeId),
      ])
      if (managerId) {
        const isSubGoal = !!goal.parent_goal_id
        const label = isSubGoal ? 'sub-goal' : 'goal'
        await notifRepo.createNotification(
          managerId,
          'goal_submitted',
          isSubGoal ? 'Sub-Goal Completion Requested' : 'Goal Completion Requested',
          `${employeeName} has requested completion approval for the ${label} "${goal.title}".`,
          goal.id,
          'goal'
        )
      }
    }
  } catch (_) { /* non-fatal */ }

  return updated
}

async function withdrawCompletion(employeeId, orgId, goalId) {
  const clientAdminId = await resolveClient(orgId)
  const goal = await repo.getEmployeeGoalById(clientAdminId, goalId)
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.')
  if (goal.assigned_to_employee_id !== employeeId)
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Access denied.')
  if (!goal.pending_completion)
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'No pending completion request to withdraw.')

  const updated = await repo.withdrawCompletionRequest(goalId, employeeId)
  if (updated) {
    updated.id = updated.goal_id;
  }
  return updated
}

async function getGoalHistory(orgId, goalId) {
  await resolveClient(orgId)
  return repo.getGoalHistory(goalId)
}

module.exports = {
  getGoalConfig,
  createEmployeeGoal,
  getCreatedGoals,
  updateCreatedGoal,
  deleteCreatedGoal,
  submitCreatedGoal,
  submitCompletion,
  withdrawCompletion,
  getGoalHistory,
}
