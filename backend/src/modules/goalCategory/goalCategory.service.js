const repo = require('./goalCategory.repository');
const ApiError = require('../../utils/apiError');
const { STATUS_CODES } = require('../../constants/statusCodes');

async function listCategories(orgId) {
  return await repo.listCategories(orgId);
}

async function listActiveCategories(orgId) {
  return await repo.listActiveCategories(orgId);
}

async function addCategory(orgId, data) {
  if (!data.name || !data.name.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Category name is required.');
  }

  const existing = await repo.getCategoryByName(orgId, data.name.trim());
  if (existing) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'A category with this name already exists.');
  }

  return await repo.createCategory(orgId, {
    name: data.name.trim(),
    is_active: data.is_active !== false,
  });
}

async function editCategory(orgId, categoryId, data) {
  if (!data.name || !data.name.trim()) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Category name is required.');
  }

  const existing = await repo.getCategoryById(orgId, categoryId);
  if (!existing) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal category not found.');
  }

  const duplicate = await repo.getCategoryByName(orgId, data.name.trim());
  if (duplicate && duplicate.category_id !== categoryId) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'A category with this name already exists.');
  }

  return await repo.updateCategory(orgId, categoryId, {
    name: data.name.trim(),
    is_active: data.is_active !== false,
  });
}

async function removeCategory(orgId, categoryId) {
  const existing = await repo.getCategoryById(orgId, categoryId);
  if (!existing) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'Goal category not found.');
  }

  const inUse = await repo.isCategoryUsed(orgId, categoryId);
  if (inUse) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Cannot delete category because it is in use by one or more goals.');
  }

  await repo.deleteCategory(orgId, categoryId);
}

module.exports = {
  listCategories,
  listActiveCategories,
  addCategory,
  editCategory,
  removeCategory,
};
