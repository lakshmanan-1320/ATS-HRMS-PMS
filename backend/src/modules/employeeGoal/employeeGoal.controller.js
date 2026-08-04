const service = require('./employeeGoal.service')
const { STATUS_CODES } = require('../../constants/statusCodes')

async function handleGetConfig(req, res, next) {
  try {
    const data = await service.getGoalConfig(req.user.organizationId)
    res.json(data)
  } catch (err) { next(err) }
}

async function handleCreate(req, res, next) {
  try {
    const data = await service.createEmployeeGoal(req.user.employeeId, req.user.organizationId, req.body)
    res.status(STATUS_CODES.CREATED).json({ message: 'Goal created.', data })
  } catch (err) { next(err) }
}

async function handleGetCreated(req, res, next) {
  try {
    const data = await service.getCreatedGoals(req.user.employeeId, req.user.organizationId)
    res.json(data)
  } catch (err) { next(err) }
}

async function handleUpdate(req, res, next) {
  try {
    const goalId = req.params.goalId || req.params.id
    const data = await service.updateCreatedGoal(req.user.employeeId, req.user.organizationId, goalId, req.body)
    res.json({ message: 'Goal updated.', data })
  } catch (err) { next(err) }
}

async function handleDelete(req, res, next) {
  try {
    const goalId = req.params.goalId || req.params.id
    await service.deleteCreatedGoal(req.user.employeeId, req.user.organizationId, goalId)
    res.json({ message: 'Goal deleted.' })
  } catch (err) { next(err) }
}

async function handleSubmit(req, res, next) {
  try {
    const goalId = req.params.goalId || req.params.id
    const data = await service.submitCreatedGoal(req.user.employeeId, req.user.organizationId, goalId)
    res.json({ message: 'Goal submitted for manager approval.', data })
  } catch (err) { next(err) }
}

async function handleMarkComplete(req, res, next) {
  try {
    const goalId = req.params.goalId || req.params.id
    const { note } = req.body
    const data = await service.submitCompletion(req.user.employeeId, req.user.organizationId, goalId, note)
    res.json({ message: 'Completion request sent to your manager for approval.', data })
  } catch (err) { next(err) }
}

async function handleWithdrawCompletion(req, res, next) {
  try {
    const goalId = req.params.goalId || req.params.id
    const data = await service.withdrawCompletion(req.user.employeeId, req.user.organizationId, goalId)
    res.json({ message: 'Completion request withdrawn.', data })
  } catch (err) { next(err) }
}

async function handleGetGoalHistory(req, res, next) {
  try {
    const goalId = req.params.goalId || req.params.id
    const data = await service.getGoalHistory(req.user.organizationId, goalId)
    res.json(data)
  } catch (err) { next(err) }
}

module.exports = {
  handleGetConfig,
  handleCreate,
  handleGetCreated,
  handleUpdate,
  handleDelete,
  handleSubmit,
  handleMarkComplete,
  handleWithdrawCompletion,
  handleGetGoalHistory,
}
