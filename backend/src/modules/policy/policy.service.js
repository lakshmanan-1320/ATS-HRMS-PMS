const { query } = require('../../config/db');

/**
 * Fetch all policies scoped to tenant organization
 */
async function getAllPolicies(organizationId, role, { category, search } = {}) {
  let sql = `
    SELECT 
      policy_id, organization_id, title, category, summary, content_html, content_text,
      keywords, document_url, document_name, document_size, version_number, effective_date,
      is_active, is_published, published_at, ai_status, ai_indexed_at, created_at, updated_at
    FROM hr_policies
    WHERE organization_id = $1
  `;
  const params = [organizationId];

  // Non-admins can ONLY see active & published policies
  if (!['client_admin', 'super_admin'].includes(role)) {
    sql += ` AND is_active = true AND is_published = true`;
  } else {
    // Admins see non-retired policies by default
    sql += ` AND is_active = true`;
  }

  if (category && category !== 'All') {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    const idx = params.length;
    sql += ` AND (
      LOWER(title) LIKE $${idx} OR 
      LOWER(summary) LIKE $${idx} OR 
      LOWER(category) LIKE $${idx} OR 
      $${idx} = ANY(SELECT LOWER(unnest(keywords)))
    )`;
  }

  sql += ` ORDER BY effective_date DESC, created_at DESC`;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Fetch a single policy by ID with tenant isolation
 */
async function getPolicyById(organizationId, policyId, role) {
  let sql = `
    SELECT * FROM hr_policies 
    WHERE organization_id = $1 AND policy_id = $2
  `;
  const params = [organizationId, policyId];

  if (!['client_admin', 'super_admin'].includes(role)) {
    sql += ` AND is_active = true AND is_published = true`;
  }

  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Create a new HR policy
 */
async function createPolicy(organizationId, data, userId) {
  const {
    title,
    category,
    summary,
    contentHtml,
    contentText,
    keywords = [],
    documentUrl,
    documentName,
    documentSize = 0,
    versionNumber = '1.0',
    effectiveDate,
    isPublished = false
  } = data;

  const publishedAt = isPublished ? new Date() : null;

  const sql = `
    INSERT INTO hr_policies (
      organization_id, title, category, summary, content_html, content_text,
      keywords, document_url, document_name, document_size, version_number,
      effective_date, is_active, is_published, published_at, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, $14, $15, $15)
    RETURNING *
  `;

  const params = [
    organizationId,
    title,
    category,
    summary,
    contentHtml,
    contentText,
    keywords,
    documentUrl,
    documentName,
    documentSize,
    versionNumber,
    effectiveDate || new Date(),
    isPublished,
    publishedAt,
    userId
  ];

  const result = await query(sql, params);
  return result.rows[0];
}

/**
 * Update an existing HR policy
 */
async function updatePolicy(organizationId, policyId, data, userId) {
  const current = await getPolicyById(organizationId, policyId, 'client_admin');
  if (!current) return null;

  const {
    title = current.title,
    category = current.category,
    summary = current.summary,
    contentHtml = current.content_html,
    contentText = current.content_text,
    keywords = current.keywords,
    documentUrl = current.document_url,
    documentName = current.document_name,
    documentSize = current.document_size,
    versionNumber = current.version_number,
    effectiveDate = current.effective_date,
    isPublished = current.is_published
  } = data;

  let publishedAt = current.published_at;
  if (isPublished && !current.is_published) {
    publishedAt = new Date();
  }

  const sql = `
    UPDATE hr_policies SET
      title = $1,
      category = $2,
      summary = $3,
      content_html = $4,
      content_text = $5,
      keywords = $6,
      document_url = $7,
      document_name = $8,
      document_size = $9,
      version_number = $10,
      effective_date = $11,
      is_published = $12,
      published_at = $13,
      updated_by = $14,
      updated_at = NOW()
    WHERE organization_id = $15 AND policy_id = $16
    RETURNING *
  `;

  const params = [
    title, category, summary, contentHtml, contentText, keywords,
    documentUrl, documentName, documentSize, versionNumber, effectiveDate,
    isPublished, publishedAt, userId, organizationId, policyId
  ];

  const result = await query(sql, params);
  return result.rows[0];
}

/**
 * Toggle policy lifecycle status (Draft / Published / Retired)
 */
async function updatePolicyStatus(organizationId, policyId, { isActive, isPublished }, userId) {
  const current = await getPolicyById(organizationId, policyId, 'client_admin');
  if (!current) return null;

  let publishedAt = current.published_at;
  if (isPublished && !current.is_published) {
    publishedAt = new Date();
  }

  const sql = `
    UPDATE hr_policies SET
      is_active = COALESCE($1, is_active),
      is_published = COALESCE($2, is_published),
      published_at = $3,
      updated_by = $4,
      updated_at = NOW()
    WHERE organization_id = $5 AND policy_id = $6
    RETURNING *
  `;

  const result = await query(sql, [isActive, isPublished, publishedAt, userId, organizationId, policyId]);
  return result.rows[0];
}

/**
 * Delete a policy
 */
async function deletePolicy(organizationId, policyId) {
  const sql = `DELETE FROM hr_policies WHERE organization_id = $1 AND policy_id = $2 RETURNING *`;
  const result = await query(sql, [organizationId, policyId]);
  return result.rows[0] || null;
}

module.exports = {
  getAllPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  updatePolicyStatus,
  deletePolicy
};
