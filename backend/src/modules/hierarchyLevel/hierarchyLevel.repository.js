const { query } = require('../../config/db');

async function getHierarchyLevels(organizationId) {
  const result = await query(`
    SELECT hl.hierarchy_level_id, hl.sort_order, hl.level_code, hl.designation, hl.description,
           hl.created_at, hl.updated_at,
           COUNT(e.employee_id)::int AS employee_count
    FROM hierarchy_levels hl
    LEFT JOIN employees e ON e.hierarchy_level_id = hl.hierarchy_level_id AND e.status != 'terminated'
    WHERE hl.organization_id = $1
    GROUP BY hl.hierarchy_level_id
    ORDER BY hl.sort_order ASC
  `, [organizationId]);
  return result.rows;
}

async function updateSortOrder(organizationId, id, sortOrder) {
  await query(`
    UPDATE hierarchy_levels
    SET sort_order=$1, updated_at=NOW()
    WHERE hierarchy_level_id=$2 AND organization_id=$3
  `, [sortOrder, id, organizationId]);
}

async function getHierarchyLevelByCode(organizationId, code) {
  const result = await query(
    'SELECT hierarchy_level_id FROM hierarchy_levels WHERE LOWER(level_code) = LOWER($1) AND organization_id = $2',
    [code, organizationId]
  );
  return result.rows[0] || null;
}

async function getMaxSortOrder(organizationId) {
  const result = await query(
    'SELECT COALESCE(MAX(sort_order), 0) AS max FROM hierarchy_levels WHERE organization_id = $1',
    [organizationId]
  );
  return result.rows[0].max;
}

async function createHierarchyLevel(organizationId, data) {
  const { sort_order, level_code, designation, description } = data;
  const result = await query(`
    INSERT INTO hierarchy_levels (organization_id, sort_order, level_code, designation, description)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [organizationId, sort_order, level_code, designation, description]);
  return result.rows[0];
}

async function getHierarchyLevelById(organizationId, id) {
  const result = await query(
    'SELECT hierarchy_level_id FROM hierarchy_levels WHERE hierarchy_level_id = $1 AND organization_id = $2',
    [id, organizationId]
  );
  return result.rows[0] || null;
}

async function getDuplicateHierarchyLevelCode(organizationId, code, excludeId) {
  const result = await query(
    'SELECT hierarchy_level_id FROM hierarchy_levels WHERE LOWER(level_code) = LOWER($1) AND organization_id = $2 AND hierarchy_level_id != $3',
    [code, organizationId, excludeId]
  );
  return result.rows[0] || null;
}

async function updateHierarchyLevel(organizationId, id, data, txClient = null) {
  const run = txClient || { query };
  const { level_code, designation, description } = data;
  const result = await run.query(`
    UPDATE hierarchy_levels
    SET level_code=$1, designation=$2, description=$3, updated_at=NOW()
    WHERE hierarchy_level_id=$4 AND organization_id=$5
    RETURNING *
  `, [level_code, designation, description, id, organizationId]);
  return result.rows[0];
}

async function deleteHierarchyLevel(organizationId, id) {
  const result = await query(
    'DELETE FROM hierarchy_levels WHERE hierarchy_level_id=$1 AND organization_id=$2 RETURNING hierarchy_level_id',
    [id, organizationId]
  );
  return result.rows[0];
}

module.exports = {
  getHierarchyLevels,
  updateSortOrder,
  getHierarchyLevelByCode,
  getMaxSortOrder,
  createHierarchyLevel,
  getHierarchyLevelById,
  getDuplicateHierarchyLevelCode,
  updateHierarchyLevel,
  deleteHierarchyLevel,
};
