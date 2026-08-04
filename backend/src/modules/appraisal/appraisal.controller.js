const service = require('./appraisal.service')
const { STATUS_CODES } = require('../../constants/statusCodes')
const ApiError = require('../../utils/apiError')

function validateId(val, name = 'ID') {
  if (val === undefined || val === null || val === '') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `${name} is required.`)
  }
  const num = Number(val)
  if (!Number.isInteger(num) || num <= 0) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid format for ${name}.`)
  }
  return num
}

function validateUuid(val, name = 'UUID') {
  if (val === undefined || val === null || val === '') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `${name} is required.`)
  }
  const str = String(val)
  if (str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid format for ${name}.`)
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(str)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid format for ${name}.`)
  }
  return str
}

/* ── admin ───────────────────────────────────────────────────────────── */

async function handleListCycles(req, res, next) {
  try {
    const data = await service.listCycles(req.user.organizationId)
    res.json(data)
  } catch (err) { next(err) }
}

async function handleCreateCycle(req, res, next) {
  try {
    const data = await service.createCycle(req.user.organizationId, req.body)
    res.status(STATUS_CODES.CREATED).json({ message: 'Appraisal cycle created.', data })
  } catch (err) { next(err) }
}

async function handleUpdateCycle(req, res, next) {
  try {
    const id = validateUuid(req.params.id, 'id')
    const data = await service.updateCycle(req.user.organizationId, id, req.body)
    res.json({ message: 'Cycle updated.', data })
  } catch (err) { next(err) }
}

async function handleDeleteCycle(req, res, next) {
  try {
    const id = validateUuid(req.params.id, 'id')
    await service.deleteCycle(req.user.organizationId, id)
    res.json({ message: 'Cycle deleted.' })
  } catch (err) { next(err) }
}

async function handleGetCycleEmployees(req, res, next) {
  try {
    const id = validateUuid(req.params.id, 'id')
    const data = await service.getCycleEmployeeSummary(req.user.organizationId, id)
    res.json(data)
  } catch (err) { next(err) }
}

/* ── employee ────────────────────────────────────────────────────────── */

async function handleGetActiveCycles(req, res, next) {
  try {
    const data = await service.getActiveCycles(req.user.organizationId)
    res.json(data)
  } catch (err) { next(err) }
}

async function handleGetSelfAppraisal(req, res, next) {
  try {
    const cycleId = validateUuid(req.params.cycleId, 'cycleId')
    const data = await service.getSelfAppraisal(req.user.employeeId, req.user.organizationId, cycleId)
    res.json(data)
  } catch (err) { next(err) }
}

async function handleSaveSelfAppraisal(req, res, next) {
  try {
    const cycleId = validateUuid(req.params.cycleId, 'cycleId')
    const data = await service.saveSelfAppraisal(req.user.employeeId, req.user.organizationId, cycleId, req.body)
    res.json({ message: 'Self-appraisal saved.', data })
  } catch (err) { next(err) }
}

async function handleSubmitSelfAppraisal(req, res, next) {
  try {
    const cycleId = validateUuid(req.params.cycleId, 'cycleId')
    const data = await service.submitSelfAppraisal(req.user.employeeId, req.user.organizationId, cycleId)
    res.json({ message: 'Self-appraisal submitted.', data })
  } catch (err) { next(err) }
}

/* ── manager ─────────────────────────────────────────────────────────── */

async function handleGetManagerTeamStatus(req, res, next) {
  try {
    const cycleId = validateUuid(req.params.cycleId, 'cycleId')
    const data = await service.getManagerTeamStatus(req.user.employeeId, req.user.organizationId, cycleId)
    res.json(data)
  } catch (err) { next(err) }
}

async function handleGetManagerAppraisal(req, res, next) {
  try {
    const cycleId = validateUuid(req.params.cycleId, 'cycleId')
    const employeeId = validateUuid(req.params.employeeId, 'employeeId')
    const data = await service.getManagerAppraisalForEmployee(
      req.user.employeeId, req.user.organizationId,
      cycleId, employeeId
    )
    res.json(data)
  } catch (err) { next(err) }
}

async function handleSaveManagerAppraisal(req, res, next) {
  try {
    const cycleId = validateUuid(req.params.cycleId, 'cycleId')
    const employeeId = validateUuid(req.params.employeeId, 'employeeId')
    const data = await service.saveManagerAppraisal(
      req.user.employeeId, req.user.organizationId,
      cycleId, employeeId, req.body
    )
    res.json({ message: 'Manager appraisal saved.', data })
  } catch (err) { next(err) }
}

async function handleSubmitManagerAppraisal(req, res, next) {
  try {
    const cycleId = validateUuid(req.params.cycleId, 'cycleId')
    const employeeId = validateUuid(req.params.employeeId, 'employeeId')
    const data = await service.submitManagerAppraisal(
      req.user.employeeId, req.user.organizationId,
      cycleId, employeeId
    )
    res.json({ message: 'Manager appraisal submitted.', data })
  } catch (err) { next(err) }
}

module.exports = {
  handleListCycles,
  handleCreateCycle,
  handleUpdateCycle,
  handleDeleteCycle,
  handleGetCycleEmployees,
  handleGetActiveCycles,
  handleGetSelfAppraisal,
  handleSaveSelfAppraisal,
  handleSubmitSelfAppraisal,
  handleGetManagerTeamStatus,
  handleGetManagerAppraisal,
  handleSaveManagerAppraisal,
  handleSubmitManagerAppraisal,
}
