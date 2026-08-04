const repo = require('./financialYear.repository');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function createFinancialYear(orgId, data, userId) {
  if (!data.name || !data.name.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Financial Year name is required.');
  }
  if (!data.start_date || !data.end_date) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Start date and End date are required.');
  }

  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  if (start > end) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Start date must be before or equal to End date.');
  }

  // Check duplicate name
  const existing = await repo.getByName(data.name.trim(), orgId);
  if (existing) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Financial Year with name "${data.name}" already exists.`);
  }

  return await repo.create(orgId, {
    name: data.name.trim(),
    start_date: data.start_date,
    end_date: data.end_date
  }, userId);
}

async function updateFinancialYear(financialYearId, orgId, data, userId) {
  const existingFy = await repo.getById(financialYearId, orgId);
  if (!existingFy) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Financial Year not found.');
  }

  if (existingFy.status === 'CLOSED' || existingFy.status === 'ARCHIVED') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot modify a closed or archived Financial Year.');
  }

  if (!data.name || !data.name.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Financial Year name is required.');
  }
  if (!data.start_date || !data.end_date) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Start date and End date are required.');
  }

  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  if (start > end) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Start date must be before or equal to End date.');
  }

  // Check duplicate name excluding itself
  const duplicate = await repo.getByName(data.name.trim(), orgId, financialYearId);
  if (duplicate) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, `Financial Year with name "${data.name}" already exists.`);
  }

  return await repo.update(financialYearId, orgId, {
    name: data.name.trim(),
    start_date: data.start_date,
    end_date: data.end_date
  }, userId);
}

async function listFinancialYears(orgId) {
  return await repo.list(orgId);
}

async function getFinancialYearById(financialYearId, orgId) {
  const fy = await repo.getById(financialYearId, orgId);
  if (!fy) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Financial Year not found.');
  }
  return fy;
}

async function activateFinancialYear(financialYearId, orgId, userId) {
  const fy = await repo.getById(financialYearId, orgId);
  if (!fy) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Financial Year not found.');
  }

  if (fy.status === 'ARCHIVED') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot activate an archived Financial Year.');
  }

  return await repo.activate(financialYearId, orgId, userId);
}

async function closeFinancialYear(financialYearId, orgId, userId) {
  const fy = await repo.getById(financialYearId, orgId);
  if (!fy) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Financial Year not found.');
  }

  if (fy.status !== 'ACTIVE') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Only active Financial Years can be closed.');
  }

  return await repo.close(financialYearId, orgId, userId);
}

async function archiveFinancialYear(financialYearId, orgId, userId) {
  const fy = await repo.getById(financialYearId, orgId);
  if (!fy) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Financial Year not found.');
  }

  if (fy.status === 'ACTIVE') {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot archive an active Financial Year. Close it first.');
  }

  return await repo.archive(financialYearId, orgId, userId);
}

async function getActiveFinancialYear(orgId) {
  const fy = await repo.getActive(orgId);
  if (!fy) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'No active Financial Year found for this organization.');
  }
  return fy;
}

module.exports = {
  createFinancialYear,
  updateFinancialYear,
  listFinancialYears,
  getFinancialYearById,
  activateFinancialYear,
  closeFinancialYear,
  archiveFinancialYear,
  getActiveFinancialYear
};
