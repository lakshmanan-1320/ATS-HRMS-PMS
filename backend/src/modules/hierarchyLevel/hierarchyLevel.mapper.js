function mapHierarchyLevel(row) {
  if (!row) return {};
  return {
    hierarchy_level_id: row.hierarchy_level_id,
    sort_order: row.sort_order,
    level_code: row.level_code,
    designation: row.designation,
    description: row.description,
    employee_count: row.employee_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  mapHierarchyLevel,
};
