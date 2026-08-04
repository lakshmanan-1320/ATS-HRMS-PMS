function mapClientAdmin(row) {
  if (!row) return {};
  return {
    client_admin_id: row.client_admin_id,
    organization_id: row.organization_id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    company_name: row.company_name || row.organization_name || 'N/A',
    organization_name: row.organization_name || row.company_name || 'N/A',
    status: row.status,
    notes: row.notes,
    last_login: row.last_login,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  mapClientAdmin,
};
