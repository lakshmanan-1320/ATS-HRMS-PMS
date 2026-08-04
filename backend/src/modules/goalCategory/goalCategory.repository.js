const { query } = require('../../config/db');

async function listCategories(orgId) {
  const result = await query(
    `SELECT category_id, organization_id, name, is_active, created_at, updated_at
     FROM goal_categories
     WHERE organization_id = $1
     ORDER BY name ASC`,
    [orgId]
  );
  return result.rows;
}

async function listActiveCategories(orgId) {
  const result = await query(
    `SELECT category_id, organization_id, name, is_active, created_at, updated_at
     FROM goal_categories
     WHERE organization_id = $1 AND is_active = true
     ORDER BY name ASC`,
    [orgId]
  );
  return result.rows;
}

async function getCategoryById(orgId, categoryId) {
  const result = await query(
    `SELECT category_id, organization_id, name, is_active, created_at, updated_at
     FROM goal_categories
     WHERE organization_id = $1 AND category_id = $2`,
    [orgId, categoryId]
  );
  return result.rows[0] || null;
}

async function getCategoryByName(orgId, name) {
  const result = await query(
    `SELECT category_id, name
     FROM goal_categories
     WHERE organization_id = $1 AND UPPER(name) = UPPER($2)`,
    [orgId, name]
  );
  return result.rows[0] || null;
}

async function createCategory(orgId, data) {
  const { name, is_active } = data;
  const result = await query(
    `INSERT INTO goal_categories (organization_id, name, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING category_id, organization_id, name, is_active, created_at, updated_at`,
    [orgId, name, is_active !== false]
  );
  return result.rows[0];
}

async function updateCategory(orgId, categoryId, data) {
  const { name, is_active } = data;
  const result = await query(
    `UPDATE goal_categories
     SET name = $3, is_active = $4, updated_at = NOW()
     WHERE organization_id = $1 AND category_id = $2
     RETURNING category_id, organization_id, name, is_active, created_at, updated_at`,
    [orgId, categoryId, name, is_active !== false]
  );
  return result.rows[0];
}

async function deleteCategory(orgId, categoryId) {
  await query(
    `DELETE FROM goal_categories
     WHERE organization_id = $1 AND category_id = $2`,
    [orgId, categoryId]
  );
}

async function isCategoryUsed(orgId, categoryId) {
  const result = await query(
    `SELECT 1 FROM goals
     WHERE organization_id = $1 AND goal_category_id = $2
     LIMIT 1`,
    [orgId, categoryId]
  );
  return result.rows.length > 0;
}

module.exports = {
  listCategories,
  listActiveCategories,
  getCategoryById,
  getCategoryByName,
  createCategory,
  updateCategory,
  deleteCategory,
  isCategoryUsed,
};
