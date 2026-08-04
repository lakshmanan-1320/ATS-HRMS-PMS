const service = require('./managerGoal.service')
const { STATUS_CODES } = require('../../constants/statusCodes')

async function handleGetDirectReports(req, res, next) {
  try {
    const data = await service.getDirectReports(req.user.employeeId, req.user.organizationId)
    res.json(data)
  } catch (err) { next(err) }
}

async function handleGetTeamGoals(req, res, next) {
  try {
    const { status, employee_id, search, page = 1, limit = 10 } = req.query
    const data = await service.getTeamSubmittedGoals(
      req.user.employeeId, req.user.organizationId,
      { status, employeeId: employee_id, search, page, limit }
    )
    res.json(data)
  } catch (err) { next(err) }
}

async function handleGetCompletionRequests(req, res, next) {
  try {
    const { status, employee_id, search, page = 1, limit = 10 } = req.query
    const data = await service.getCompletionRequests(
      req.user.employeeId, req.user.organizationId,
      { status, employeeId: employee_id, search, page, limit }
    )
    res.json(data)
  } catch (err) { next(err) }
}

async function handleApproveTeamGoal(req, res, next) {
  try {
    const goalId = req.params.goalId || req.params.id
    const data = await service.approveTeamGoal(req.user.employeeId, req.user.organizationId, goalId)
    res.json({ message: 'Goal approved.', data })
  } catch (err) { next(err) }
}

async function handleRejectTeamGoal(req, res, next) {
  try {
    const goalId = req.params.goalId || req.params.id
    const { reason } = req.body
    const data = await service.rejectTeamGoal(req.user.employeeId, req.user.organizationId, goalId, reason)
    res.json({ message: 'Goal rejected.', data })
  } catch (err) { next(err) }
}

async function handleApproveCompletion(req, res, next) {
  try {
    const requestId = req.params.requestId || req.params.goalId || req.params.id
    const data = await service.approveCompletionRequest(req.user.employeeId, req.user.organizationId, requestId)
    res.json({ message: 'Sub-goal completion approved.', data })
  } catch (err) { next(err) }
}

async function handleRejectCompletion(req, res, next) {
  try {
    const requestId = req.params.requestId || req.params.goalId || req.params.id
    const { reason } = req.body
    const data = await service.rejectCompletionRequest(req.user.employeeId, req.user.organizationId, requestId, reason)
    res.json({ message: 'Sub-goal completion rejected.', data })
  } catch (err) { next(err) }
}

async function handleCreateAssigned(req, res, next) {
  try {
    const data = await service.createAssignedGoal(req.user.employeeId, req.user.organizationId, req.body)
    res.status(STATUS_CODES.CREATED).json({ message: 'Goal assigned.', data })
  } catch (err) { next(err) }
}

async function handleGetAssigned(req, res, next) {
  try {
    const data = await service.getAssignedGoals(req.user.employeeId, req.user.organizationId)
    res.json(data)
  } catch (err) { next(err) }
}

async function handleActivateAssigned(req, res, next) {
  try {
    const goalId = req.params.goalId || req.params.id
    const data = await service.activateAssignedGoal(req.user.employeeId, req.user.organizationId, goalId)
    res.json({ message: 'Goal activated.', data })
  } catch (err) { next(err) }
}

async function handleOverrideProgress(req, res, next) {
  try {
    const goalId = req.params.goalId || req.params.id
    const { progress, reason } = req.body
    const data = await service.overrideProgress(req.user.employeeId, req.user.organizationId, goalId, progress, reason)
    res.json({ message: 'Progress overridden.', data })
  } catch (err) { next(err) }
}

module.exports = {
  handleGetDirectReports,
  handleGetTeamGoals,
  handleGetCompletionRequests,
  handleApproveTeamGoal,
  handleRejectTeamGoal,
  handleApproveCompletion,
  handleRejectCompletion,
  handleCreateAssigned,
  handleGetAssigned,
  handleActivateAssigned,
  handleOverrideProgress,
}
