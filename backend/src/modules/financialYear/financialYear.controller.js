const service = require('./financialYear.service');
const { STATUS_CODES } = require('../../constants/statusCodes');
const ApiError = require('../../utils/apiError');

function validateUuid(val, name = 'UUID') {
  if (val === undefined || val === null || val === '') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `${name} is required.`);
  }
  const str = String(val);
  if (str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid format for ${name}.`);
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(str)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Invalid format for ${name}.`);
  }
  return str;
}

async function handleList(req, res, next) {
  try {
    const data = await service.listFinancialYears(req.user.organizationId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleGetById(req, res, next) {
  try {
    const id = validateUuid(req.params.financialYearId, 'financialYearId');
    const data = await service.getFinancialYearById(id, req.user.organizationId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function handleCreate(req, res, next) {
  try {
    const data = await service.createFinancialYear(req.user.organizationId, req.body, req.user.userId || req.user.id);
    res.status(STATUS_CODES.CREATED).json({ success: true, message: 'Financial Year created.', data });
  } catch (err) {
    next(err);
  }
}

async function handleUpdate(req, res, next) {
  try {
    const id = validateUuid(req.params.financialYearId, 'financialYearId');
    const data = await service.updateFinancialYear(id, req.user.organizationId, req.body, req.user.userId || req.user.id);
    res.json({ success: true, message: 'Financial Year updated.', data });
  } catch (err) {
    next(err);
  }
}

async function handleActivate(req, res, next) {
  try {
    const id = validateUuid(req.params.financialYearId, 'financialYearId');
    const data = await service.activateFinancialYear(id, req.user.organizationId, req.user.userId || req.user.id);
    res.json({ success: true, message: 'Financial Year activated.', data });
  } catch (err) {
    next(err);
  }
}

async function handleClose(req, res, next) {
  try {
    const id = validateUuid(req.params.financialYearId, 'financialYearId');
    const data = await service.closeFinancialYear(id, req.user.organizationId, req.user.userId || req.user.id);
    res.json({ success: true, message: 'Financial Year closed.', data });
  } catch (err) {
    next(err);
  }
}

async function handleArchive(req, res, next) {
  try {
    const id = validateUuid(req.params.financialYearId, 'financialYearId');
    const data = await service.archiveFinancialYear(id, req.user.organizationId, req.user.userId || req.user.id);
    res.json({ success: true, message: 'Financial Year archived.', data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleList,
  handleGetById,
  handleCreate,
  handleUpdate,
  handleActivate,
  handleClose,
  handleArchive
};
