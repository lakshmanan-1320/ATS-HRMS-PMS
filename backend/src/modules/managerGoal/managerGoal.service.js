const repo = require('./managerGoal.repository')
const ApiError = require('../../utils/apiError')
const { STATUS_CODES } = require('../../constants/statusCodes')

async function resolveClient(orgId) {
  const clientAdminId = await repo.getClientAdminIdByOrg(orgId)
  if (!clientAdminId) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Organisation not found.')
  return clientAdminId
}

async function getDirectReports(managerId, orgId) {
  return repo.getDirectReports(managerId, orgId)
}

async function getTeamSubmittedGoals(managerId, orgId, filters = {}) {
  const clientAdminId = await resolveClient(orgId)
  const reports = await repo.getDirectReports(managerId, orgId)
  const reportIds = reports.map(r => r.employee_id)
  const result = await repo.getTeamGoals(clientAdminId, reportIds, filters)
  if (result && result.goals) {
    result.goals = result.goals.map(g => ({ ...g, id: g.goal_id }))
  }
  return result
}

async function getCompletionRequests(managerId, orgId, filters = {}) {
  const clientAdminId = await resolveClient(orgId)
  const reports = await repo.getDirectReports(managerId, orgId)
  const reportIds = reports.map(r => r.employee_id)
  const result = await repo.getCompletionRequests(clientAdminId, reportIds, managerId, filters)
  if (result && result.requests) {
    result.requests = result.requests.map(g => ({ ...g, id: g.goal_id }))
  }
  return result
}

async function approveTeamGoal(managerId, orgId, goalId) {
  const clientAdminId = await resolveClient(orgId)
  const reports = await repo.getDirectReports(managerId, orgId)
  const reportIds = reports.map(r => r.employee_id)

  const goal = await repo.getGoalById(clientAdminId, goalId)
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.')
  if (!reportIds.includes(goal.created_by_employee_id))
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'This goal does not belong to one of your direct reports.')
  if (goal.status !== 'submitted')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only submitted goals can be approved.')

  const updated = await repo.approveGoalByManager(clientAdminId, goalId, managerId)
  if (updated) {
    updated.id = updated.goal_id;
  }
  return updated
}

async function rejectTeamGoal(managerId, orgId, goalId, reason) {
  const clientAdminId = await resolveClient(orgId)
  const reports = await repo.getDirectReports(managerId, orgId)
  const reportIds = reports.map(r => r.employee_id)

  const goal = await repo.getGoalById(clientAdminId, goalId)
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.')
  if (!reportIds.includes(goal.created_by_employee_id))
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'This goal does not belong to one of your direct reports.')
  if (goal.status !== 'submitted')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only submitted goals can be rejected.')

  const updated = await repo.rejectGoalByManager(clientAdminId, goalId, managerId, reason)
  if (updated) {
    updated.id = updated.goal_id;
  }
  return updated
}

async function approveCompletionRequest(managerId, orgId, goalId) {
  const clientAdminId = await resolveClient(orgId)
  const reports = await repo.getDirectReports(managerId, orgId)
  const reportIds = reports.map(r => r.employee_id)

  const goal = await repo.getGoalById(clientAdminId, goalId)
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.')
  const isDirectReportGoal = reportIds.includes(goal.assigned_to_employee_id)
  const isManagerCreated = goal.created_by_employee_id === managerId
  if (!isDirectReportGoal && !isManagerCreated)
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You are not authorised to approve this completion request.')
  if (!goal.pending_completion)
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'No pending completion request for this goal.')

  const updated = await repo.approveCompletion(clientAdminId, goalId, managerId)
  if (updated) {
    updated.id = updated.goal_id;
  }
  return updated
}

async function rejectCompletionRequest(managerId, orgId, goalId, reason) {
  const clientAdminId = await resolveClient(orgId)
  const reports = await repo.getDirectReports(managerId, orgId)
  const reportIds = reports.map(r => r.employee_id)

  const goal = await repo.getGoalById(clientAdminId, goalId)
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.')
  const isDirectReportGoal = reportIds.includes(goal.assigned_to_employee_id)
  const isManagerCreated = goal.created_by_employee_id === managerId
  if (!isDirectReportGoal && !isManagerCreated)
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You are not authorised to reject this completion request.')
  if (!goal.pending_completion)
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'No pending completion request for this goal.')

  const updated = await repo.rejectCompletion(clientAdminId, goalId, managerId, reason)
  if (updated) {
    updated.id = updated.goal_id;
  }
  return updated
}

async function createAssignedGoal(managerId, orgId, data) {
  if (!data.title?.trim()) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Title is required.')
  if (!data.assigned_to_employee_id) throw new ApiError(STATUS_CODES.BAD_REQUEST, 'assigned_to_employee_id is required.')

  const clientAdminId = await resolveClient(orgId)
  const config = await repo.getGoalConfig(clientAdminId)
  if (config && !config.allow_manager_goal)
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Manager goal assignment is disabled for this organisation.')

  const reports = await repo.getDirectReports(managerId, orgId)
  const reportIds = reports.map(r => r.employee_id)
  if (!reportIds.includes(data.assigned_to_employee_id))
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You can only assign goals to your direct reports.')

  // Validate parent goal date boundaries
  if (data.parent_goal_id) {
    const parent = await repo.getGoalById(clientAdminId, data.parent_goal_id);
    if (!parent) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Parent goal not found.');

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

  const assignedGoal = await repo.createAssignedGoal(clientAdminId, managerId, data)
  if (assignedGoal) {
    assignedGoal.id = assignedGoal.goal_id;
  }
  return assignedGoal;
}

async function activateAssignedGoal(managerId, orgId, goalId) {
  const clientAdminId = await resolveClient(orgId)
  const goal = await repo.getGoalById(clientAdminId, goalId)
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.')
  if (goal.created_by_employee_id !== managerId)
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You can only activate goals you assigned.')
  if (goal.status !== 'draft')
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only draft goals can be activated.')

  if (goal.assigned_to_employee_id && !goal.parent_goal_id) {
    const totalWeight = await repo.getTotalWeightForEmployee(clientAdminId, goal.assigned_to_employee_id)
    if (Math.round(totalWeight) !== 100)
      throw new ApiError(STATUS_CODES.BAD_REQUEST,
        `Goal weights for this employee must sum to 100% before activation. Current total: ${totalWeight}%.`)
  }

  const updated = await repo.activateAssignedGoal(clientAdminId, goalId, managerId)
  if (updated) {
    updated.id = updated.goal_id;
  }
  return updated
}

async function overrideProgress(managerId, orgId, goalId, progress, reason) {
  const p = parseFloat(progress)
  if (isNaN(p) || p < 0 || p > 100)
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Progress must be between 0 and 100.')

  const clientAdminId = await resolveClient(orgId)
  const reports = await repo.getDirectReports(managerId, orgId)
  const reportIds = reports.map(r => r.employee_id)

  const goal = await repo.getGoalById(clientAdminId, goalId)
  if (!goal) throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal not found.')
  if (!reportIds.includes(goal.assigned_to_employee_id) && goal.created_by_employee_id !== managerId)
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'You can only override progress on your team members\' goals.')

  const overridden = await repo.overrideGoalProgress(clientAdminId, goalId, managerId, p, reason)
  if (overridden) {
    overridden.id = overridden.goal_id;
  }
  return overridden;
}

async function getAssignedGoals(managerId, orgId) {
  const clientAdminId = await resolveClient(orgId)
  const goals = await repo.getAssignedByManager(clientAdminId, managerId)
  const withSubs = await Promise.all(
    goals.map(async g => {
      const subGoals = await repo.getSubGoalsByParent(clientAdminId, g.goal_id)
      const mappedSubs = subGoals.map(sg => ({ ...sg, id: sg.goal_id }))
      return { ...g, id: g.goal_id, subGoals: mappedSubs }
    })
  )
  return withSubs
}

module.exports = {
  getDirectReports,
  getTeamSubmittedGoals,
  getCompletionRequests,
  approveTeamGoal,
  rejectTeamGoal,
  approveCompletionRequest,
  rejectCompletionRequest,
  createAssignedGoal,
  activateAssignedGoal,
  getAssignedGoals,
  overrideProgress,
}
