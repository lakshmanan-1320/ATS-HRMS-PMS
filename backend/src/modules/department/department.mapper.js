function mapDepartment(row) {
  if (!row) return {};
  return {
    department_id: row.department_id,
    name: row.name,
    description: row.description,
    status: row.status,
    parent_id: row.parent_id,
    ...(row.sub_count !== undefined && { sub_count: parseInt(row.sub_count, 10) }),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  mapDepartment,
};
