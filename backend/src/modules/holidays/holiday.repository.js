const { query } = require('../../config/db');

async function create(organizationId, data) {
  const result = await query(
    `INSERT INTO holidays (
      organization_id, holiday_name, holiday_date, holiday_type, description, is_active, created_by_admin_user_id
    ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, true), $7)
    RETURNING *`,
    [
      organizationId,
      data.holiday_name,
      data.holiday_date,
      data.holiday_type,
      data.description || null,
      data.is_active,
      data.created_by_admin_user_id
    ]
  );
  return result.rows[0];
}

async function update(organizationId, id, data) {
  const result = await query(
    `UPDATE holidays
     SET holiday_name = COALESCE($1, holiday_name),
         holiday_date = COALESCE($2, holiday_date),
         holiday_type = COALESCE($3, holiday_type),
         description = COALESCE($4, description),
         updated_at = NOW()
     WHERE holiday_id = $5 AND organization_id = $6 AND is_deleted = false
     RETURNING *`,
    [
      data.holiday_name,
      data.holiday_date,
      data.holiday_type,
      data.description,
      id,
      organizationId
    ]
  );
  return result.rows[0] || null;
}

async function softDelete(organizationId, id) {
  const result = await query(
    `UPDATE holidays
     SET is_deleted = true,
         is_active = false,
         updated_at = NOW()
     WHERE holiday_id = $1 AND organization_id = $2 AND is_deleted = false
     RETURNING *`,
    [id, organizationId]
  );
  return result.rows[0] || null;
}

async function toggleStatus(organizationId, id, isActive) {
  const result = await query(
    `UPDATE holidays
     SET is_active = $1,
         updated_at = NOW()
     WHERE holiday_id = $2 AND organization_id = $3 AND is_deleted = false
     RETURNING *`,
    [isActive, id, organizationId]
  );
  return result.rows[0] || null;
}

async function findById(organizationId, id) {
  const result = await query(
    `SELECT h.*, u.email as created_by_email
     FROM holidays h
     LEFT JOIN users u ON h.created_by_admin_user_id = u.user_id
     WHERE h.holiday_id = $1 AND h.organization_id = $2 AND h.is_deleted = false`,
     [id, organizationId]
  );
  return result.rows[0] || null;
}

async function findByDate(organizationId, dateStr) {
  const result = await query(
    `SELECT * FROM holidays
     WHERE organization_id = $1 AND holiday_date = $2 AND is_active = true AND is_deleted = false
     LIMIT 1`,
    [organizationId, dateStr]
  );
  return result.rows[0] || null;
}

async function findActiveInRange(organizationId, startDateStr, endDateStr) {
  const result = await query(
    `SELECT * FROM holidays
     WHERE organization_id = $1 AND holiday_date BETWEEN $2 AND $3
       AND is_active = true
       AND is_deleted = false
     ORDER BY holiday_date ASC`,
    [organizationId, startDateStr, endDateStr]
  );
  return result.rows;
}

async function findUpcomingActive(organizationId, refDateStr) {
  const result = await query(
    `SELECT * FROM holidays
     WHERE organization_id = $1 AND holiday_date >= $2
       AND is_active = true
       AND is_deleted = false
     ORDER BY holiday_date ASC`,
    [organizationId, refDateStr]
  );
  return result.rows;
}

async function findAll(organizationId, filters = {}) {
  const params = [organizationId];
  let sql = `
    SELECT h.*, u.email as created_by_email
    FROM holidays h
    LEFT JOIN users u ON h.created_by_admin_user_id = u.user_id
    WHERE h.organization_id = $1 AND h.is_deleted = false
  `;

  if (filters.year) {
    params.push(filters.year);
    sql += ` AND EXTRACT(YEAR FROM h.holiday_date) = $${params.length}`;
  }

  if (filters.month) {
    params.push(filters.month);
    sql += ` AND EXTRACT(MONTH FROM h.holiday_date) = $${params.length}`;
  }

  if (filters.type) {
    params.push(filters.type);
    sql += ` AND h.holiday_type = $${params.length}`;
  }

  if (filters.onlyActive === true) {
    sql += ` AND h.is_active = true`;
  }

  sql += ` ORDER BY h.holiday_date ASC`;

  const result = await query(sql, params);
  return result.rows;
}

// --- Recurring & Global Holidays ---

async function getGlobalTemplates() {
  const result = await query(
    `SELECT * FROM global_holidays ORDER BY recurrence_month ASC, recurrence_day ASC`
  );
  return result.rows;
}

async function getOrgOptOutIds(organizationId) {
  const result = await query(
    `SELECT global_holiday_id FROM organization_holiday_opt_outs WHERE organization_id = $1`,
    [organizationId]
  );
  return result.rows.map(r => r.global_holiday_id);
}

async function saveOrgOptOut(organizationId, globalHolidayId, isOptedOut) {
  if (isOptedOut) {
    await query(
      `INSERT INTO organization_holiday_opt_outs (organization_id, global_holiday_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [organizationId, globalHolidayId]
    );
  } else {
    await query(
      `DELETE FROM organization_holiday_opt_outs
       WHERE organization_id = $1 AND global_holiday_id = $2`,
      [organizationId, globalHolidayId]
    );
  }
}

async function getCustomRecurring(organizationId) {
  const result = await query(
    `SELECT * FROM recurring_holidays
     WHERE organization_id = $1
     ORDER BY recurrence_month ASC, recurrence_day ASC`,
    [organizationId]
  );
  return result.rows;
}

async function createCustomRecurring(organizationId, data) {
  const result = await query(
    `INSERT INTO recurring_holidays (
      organization_id, holiday_name, holiday_type, recurrence_month, recurrence_day, description, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, true))
    RETURNING *`,
    [
      organizationId,
      data.holiday_name,
      data.holiday_type,
      data.recurrence_month,
      data.recurrence_day,
      data.description || null,
      data.is_active
    ]
  );
  return result.rows[0];
}

async function updateCustomRecurring(recurringHolidayId, data) {
  const result = await query(
    `UPDATE recurring_holidays
     SET holiday_name = COALESCE($1, holiday_name),
         holiday_type = COALESCE($2, holiday_type),
         recurrence_month = COALESCE($3, recurrence_month),
         recurrence_day = COALESCE($4, recurrence_day),
         description = COALESCE($5, description),
         is_active = COALESCE($6, is_active),
         updated_at = NOW()
     WHERE recurring_holiday_id = $7
     RETURNING *`,
    [
      data.holiday_name,
      data.holiday_type,
      data.recurrence_month,
      data.recurrence_day,
      data.description,
      data.is_active,
      recurringHolidayId
    ]
  );
  return result.rows[0] || null;
}

async function deleteCustomRecurring(recurringHolidayId) {
  const result = await query(
    `DELETE FROM recurring_holidays WHERE recurring_holiday_id = $1 RETURNING *`,
    [recurringHolidayId]
  );
  return result.rows[0] || null;
}

module.exports = {
  create,
  update,
  softDelete,
  toggleStatus,
  findById,
  findByDate,
  findActiveInRange,
  findUpcomingActive,
  findAll,
  getGlobalTemplates,
  getOrgOptOutIds,
  saveOrgOptOut,
  getCustomRecurring,
  createCustomRecurring,
  updateCustomRecurring,
  deleteCustomRecurring,
};
