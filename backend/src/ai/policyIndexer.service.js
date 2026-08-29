const { query } = require('../config/db');
const { generateEmbedding } = require('./embedding.service');
const { chunkPolicyText } = require('./policyChunker.service');

/**
 * Policy indexing for the authoritative hr_policy_embeddings table.
 * The DB schema stores only policy_id, organization_id, chunk_index, chunk_text and embedding.
 * Additional metadata is read from hr_policies when needed.
 */
function getPolicyKey(policy) {
  if (policy.policy_key && typeof policy.policy_key === 'string' && policy.policy_key.trim()) {
    return policy.policy_key.trim();
  }

  if (policy.policy_id) {
    return `POL-${String(policy.policy_id).slice(0, 8).toUpperCase()}`;
  }

  return 'POL-GEN';
}

/**
function parseSectionRef(chunkText) {
  const bulletMatch = chunkText.match(/(\d+\.\d+)\s+[A-Z]/);
  if (bulletMatch) {
    return `Section ${bulletMatch[1]}`;
  }
  
  const sectionHeaderMatch = chunkText.match(/SECTION\s+(\d+)/i);
  if (sectionHeaderMatch) {
    return `Section ${sectionHeaderMatch[1]}`;
  }

  return 'General';
}

function splitPolicyIntoSections(contentText) {
  const sectionRegex = /\n\nSECTION\s+(\d+)[:\s]/gi;
  const matches = [...contentText.matchAll(sectionRegex)];
  
  if (matches.length === 0) {
    return null;
  }
  
  const sections = [];
  if (matches[0].index > 0) {
    sections.push({
      sectionRef: 'General',
      text: contentText.slice(0, matches[0].index).trim()
    });
  }
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const currentIndex = match.index;
    const nextIndex = (i + 1 < matches.length) ? matches[i + 1].index : contentText.length;
    const sectionText = contentText.slice(currentIndex, nextIndex).trim();
    const sectionNum = match[1];
    
    sections.push({
      sectionRef: `Section ${sectionNum}`,
      text: sectionText
    });
  }
  
  return sections;
}

/**
 * Index a single policy object into hr_policy_embeddings with vector embeddings
 * @param {object} policy - Database policy object
 * @returns {Promise<object>} - Result metadata
 */
async function indexPolicy(policy) {
  const {
    policy_id,
    organization_id,
    content_text,
    category
  } = policy;

  if (!policy_id || !organization_id || !content_text) {
    throw new Error('Invalid policy data: policy_id, organization_id, and content_text are required.');
  }

  const policyKey = (getPolicyKey(policy) || 'POL-GEN').slice(0, 50);
  const policyCategory = (category || policy.category || 'General').slice(0, 100);

  // Split policy content semantically by sections if available, falling back to character chunking
  let chunks = [];
  const sectionChunks = splitPolicyIntoSections(content_text);
  if (sectionChunks && sectionChunks.length > 0) {
    chunks = sectionChunks.map((s, i) => ({
      chunkIndex: i,
      chunkText: s.text,
      sectionRef: s.sectionRef
    }));
  } else {
    const textChunks = chunkPolicyText(content_text);
    chunks = textChunks.map((c, i) => ({
      chunkIndex: c.chunkIndex !== undefined ? c.chunkIndex : i,
      chunkText: typeof c === 'string' ? c : (c.chunkText || c.text || ''),
      sectionRef: parseSectionRef(typeof c === 'string' ? c : (c.chunkText || c.text || ''))
    }));
  }

  if (!chunks.length) {
    throw new Error('Policy contains no searchable text content.');
  }

  // 1. Remove previous embeddings for this policy from the authoritative table
  await query(
    `
    DELETE FROM hr_policy_embeddings
    WHERE policy_id = $1
      AND organization_id = $2
    `,
    [policy_id, organization_id]
  );

  // 2. Insert new chunk embeddings into hr_policy_embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkText = chunk.chunkText;
    const embedding = await generateEmbedding(chunkText);

    await query(
      `
      INSERT INTO hr_policy_embeddings (
        organization_id,
        policy_id,
        chunk_index,
        chunk_text,
        embedding
      )
      VALUES ($1, $2, $3, $4, $5::vector)
      `,
      [
        organization_id,
        policy_id,
        chunk.chunkIndex !== undefined ? chunk.chunkIndex : i,
        chunkText,
        JSON.stringify(embedding)
      ]
    );
  }

  // 3. Update policy index status in hr_policies
  try {
    await query(
      `
      UPDATE hr_policies
      SET
        ai_status = 'indexed',
        ai_indexed_at = NOW(),
        updated_at = NOW()
      WHERE policy_id = $1
        AND organization_id = $2
      `,
      [policy_id, organization_id]
    );
  } catch (err) {
    console.warn(`[Indexer] Could not update ai_status on hr_policies for ${policy_id}:`, err.message);
  }

  return {
    policyId: policy_id,
    policyKey,
    chunksIndexed: chunks.length
  };
}

/**
 * Index all active and published policies for a specific organization or across all tenants
 * @param {string} [organizationId] - Optional Tenant ID filter
 * @param {string} [policyId] - Optional specific policy ID filter
 * @returns {Promise<object>} - Count of policies and chunks indexed
 */
async function indexTenantPolicies(organizationId = null, filter = null) {
  let sql = `
    SELECT policy_id, organization_id, title, category, content_text
    FROM hr_policies
    WHERE is_active = true
      AND is_published = true
      AND content_text IS NOT NULL
      AND LENGTH(TRIM(content_text)) > 0
  `;
  const params = [];

  if (organizationId) {
    params.push(organizationId);
    sql += ` AND organization_id = $${params.length}`;
  }

  if (filter) {
    // If filter is a UUID, filter by policy_id; otherwise filter by category
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filter);
    if (isUUID) {
      params.push(filter);
      sql += ` AND policy_id = $${params.length}`;
    } else {
      params.push(filter);
      sql += ` AND category = $${params.length}`;
    }
  }

  sql += ` ORDER BY organization_id, title`;

  const policiesRes = await query(sql, params);
  const policies = policiesRes.rows;
  let totalChunks = 0;

  for (const policy of policies) {
    const indexed = await indexPolicy(policy);
    totalChunks += indexed.chunksIndexed;
  }

  return {
    policiesIndexed: policies.length,
    chunksIndexed: totalChunks
  };
}

module.exports = {
  indexTenantPolicies,
  indexPolicy,
  getPolicyKey
};