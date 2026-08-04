const db = require('../../config/db');

async function create(orgId, data, userId) {
  const queryText = `
    INSERT INTO financial_years (
      organization_id, name, start_date, end_date, status, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, 'DRAFT', $5, $5)
    RETURNING *
  `;
  const values = [orgId, data.name, data.start_date, data.end_date, userId];
  const result = await db.query(queryText, values);
  return result.rows[0];
}

async function update(financialYearId, orgId, data, userId) {
  const queryText = `
    UPDATE financial_years SET
      name = $1,
      start_date = $2,
      end_date = $3,
      updated_by = $4,
      updated_at = NOW()
    WHERE financial_year_id = $5 AND organization_id = $6
    RETURNING *
  `;
  const values = [data.name, data.start_date, data.end_date, userId, financialYearId, orgId];
  const result = await db.query(queryText, values);
  return result.rows[0] || null;
}

async function list(orgId) {
  const queryText = `
    SELECT * FROM financial_years 
    WHERE organization_id = $1 
    ORDER BY start_date DESC, created_at DESC
  `;
  const result = await db.query(queryText, [orgId]);
  return result.rows;
}

async function getById(financialYearId, orgId) {
  const queryText = `
    SELECT * FROM financial_years 
    WHERE financial_year_id = $1 AND organization_id = $2
  `;
  const result = await db.query(queryText, [financialYearId, orgId]);
  return result.rows[0] || null;
}

async function getByName(name, orgId, excludeFinancialYearId = null) {
  let queryText = `
    SELECT * FROM financial_years 
    WHERE LOWER(name) = LOWER($1) AND organization_id = $2
  `;
  const values = [name, orgId];
  if (excludeFinancialYearId) {
    queryText += ` AND financial_year_id != $3`;
    values.push(excludeFinancialYearId);
  }
  const result = await db.query(queryText, values);
  return result.rows[0] || null;
}

async function activate(financialYearId, orgId, userId) {
  return await db.withTransaction(async (client) => {
    // 1. Close any currently active financial years
    await client.query(
      `UPDATE financial_years 
       SET status = 'CLOSED', updated_by = $1, updated_at = NOW() 
       WHERE organization_id = $2 AND status = 'ACTIVE'`,
      [userId, orgId]
    );

    // 2. Activate target financial year
    const result = await client.query(
      `UPDATE financial_years 
       SET status = 'ACTIVE', updated_by = $1, updated_at = NOW() 
       WHERE financial_year_id = $2 AND organization_id = $3
       RETURNING *`,
      [userId, financialYearId, orgId]
    );
    return result.rows[0] || null;
  });
}

async function close(financialYearId, orgId, userId) {
  const queryText = `
    UPDATE financial_years 
    SET status = 'CLOSED', updated_by = $1, updated_at = NOW() 
    WHERE financial_year_id = $2 AND organization_id = $3
    RETURNING *
  `;
  const result = await db.query(queryText, [userId, financialYearId, orgId]);
  return result.rows[0] || null;
}

async function archive(financialYearId, orgId, userId) {
  const queryText = `
    UPDATE financial_years 
    SET status = 'ARCHIVED', updated_by = $1, updated_at = NOW() 
    WHERE financial_year_id = $2 AND organization_id = $3
    RETURNING *
  `;
  const result = await db.query(queryText, [userId, financialYearId, orgId]);
  return result.rows[0] || null;
}

async function getActive(orgId) {
  const result = await db.query(
    `SELECT * FROM financial_years WHERE organization_id = $1 AND status = 'ACTIVE'`,
    [orgId]
  );
  return result.rows[0] || null;
}

module.exports = {
  create,
  update,
  list,
  getById,
  getByName,
  activate,
  close,
  archive,
  getActive
};
