const { query } = require('../../config/db');

async function getTopLevelDepartments(organizationId) {
  const result = await query(`
    SELECT d.department_id, d.name, d.description, d.status, d.created_at, d.updated_at,
      (SELECT COUNT(*) FROM departments s WHERE s.parent_id = d.department_id)::int AS sub_count
    FROM departments d
    WHERE d.organization_id = $1 AND d.parent_id IS NULL
    ORDER BY d.created_at DESC
  `, [organizationId]);
  return result.rows;
}

async function getSubDepartments(organizationId, parentId) {
  const result = await query(`
    SELECT department_id, name, description, status, parent_id, created_at, updated_at
    FROM departments
    WHERE parent_id = $1 AND organization_id = $2
    ORDER BY created_at ASC
  `, [parentId, organizationId]);
  return result.rows;
}

async function getDepartmentById(organizationId, id) {
  const result = await query('SELECT * FROM departments WHERE department_id = $1 AND organization_id = $2', [id, organizationId]);
  return result.rows[0] || null;
}

async function getTopLevelDepartmentByName(organizationId, name) {
  const result = await query(
    'SELECT department_id FROM departments WHERE name ILIKE $1 AND organization_id = $2 AND parent_id IS NULL',
    [name, organizationId]
  );
  return result.rows[0] || null;
}

async function getSubDepartmentByName(organizationId, parentId, name) {
  const result = await query(
    'SELECT department_id FROM departments WHERE name ILIKE $1 AND parent_id = $2 AND organization_id = $3',
    [name, parentId, organizationId]
  );
  return result.rows[0] || null;
}

async function getDuplicateDepartmentName(organizationId, name, parentId, id) {
  const result = await query(
    'SELECT department_id FROM departments WHERE name ILIKE $1 AND organization_id = $2 AND parent_id IS NOT DISTINCT FROM $3 AND department_id != $4',
    [name, organizationId, parentId, id]
  );
  return result.rows[0] || null;
}

async function createDepartment(data) {
  const { name, description, organizationId, parentId } = data;
  const result = await query(`
    INSERT INTO departments (name, description, organization_id, parent_id)
    VALUES ($1, $2, $3, $4)
    RETURNING department_id, name, description, status, parent_id, created_at
  `, [name, description, organizationId, parentId || null]);
  return result.rows[0];
}

async function updateDepartment(organizationId, id, data) {
  const { name, description } = data;
  const result = await query(`
    UPDATE departments SET name=$1, description=$2, updated_at=NOW()
    WHERE department_id=$3 AND organization_id=$4
    RETURNING department_id, name, description, status, parent_id, updated_at
  `, [name, description, id, organizationId]);
  return result.rows[0];
}

async function updateDepartmentStatus(organizationId, id, status) {
  const result = await query(`
    UPDATE departments SET status=$1, updated_at=NOW()
    WHERE department_id=$2 AND organization_id=$3
    RETURNING department_id, status
  `, [status, id, organizationId]);
  return result.rows[0];
}

async function deleteDepartment(organizationId, id) {
  const result = await query(
    'DELETE FROM departments WHERE department_id=$1 AND organization_id=$2 RETURNING department_id',
    [id, organizationId]
  );
  return result.rows[0];
}

module.exports = {
  getTopLevelDepartments,
  getSubDepartments,
  getDepartmentById,
  getTopLevelDepartmentByName,
  getSubDepartmentByName,
  getDuplicateDepartmentName,
  createDepartment,
  updateDepartment,
  updateDepartmentStatus,
  deleteDepartment,
};
