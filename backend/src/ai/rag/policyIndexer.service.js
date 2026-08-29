/**
 * policyIndexer.service.js
 * Indexing service for hr_policy_embeddings table using 768-dim vector embeddings.
 */

'use strict';

const { query } = require('../../config/db');
const { generateEmbedding } = require('./embedding.service');
const { chunkPolicyText } = require('./policyChunker.service');

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
 * Index a single policy object into hr_policy_embeddings with vector embeddings
 * @param {object} policy - Database policy object
 * @returns {Promise<object>} - Result metadata
 */
async function indexPolicy(policy) {
  const { policy_id, organization_id, content_text } = policy;

  if (!policy_id || !organization_id || !content_text) {
    throw new Error('Invalid policy data: policy_id, organization_id, and content_text are required.');
  }

  const chunks = chunkPolicyText(content_text);
  if (!chunks.length) {
    throw new Error('Policy contains no searchable text content.');
  }

  // 1. Remove previous embeddings for this policy
  await query(
    `DELETE FROM hr_policy_embeddings
    WHERE policy_id = $1 AND organization_id = $2`,
    [policy_id, organization_id]
  );

  // 2. Insert new chunk embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkText = chunk.chunkText;
    const embedding = await generateEmbedding(chunkText);

    await query(
      `INSERT INTO hr_policy_embeddings (
        organization_id,
        policy_id,
        chunk_index,
        chunk_text,
        embedding
      )
      VALUES ($1, $2, $3, $4, $5::vector)`,
      [
        organization_id,
        policy_id,
        chunk.chunkIndex !== undefined ? chunk.chunkIndex : i,
        chunkText,
        JSON.stringify(embedding),
      ]
    );
  }

  // 3. Update policy index status in hr_policies
  try {
    await query(
      `UPDATE hr_policies
      SET
        ai_status = 'indexed',
        ai_indexed_at = NOW(),
        updated_at = NOW()
      WHERE policy_id = $1 AND organization_id = $2`,
      [policy_id, organization_id]
    );
  } catch (err) {
    console.warn(`[Indexer] Could not update ai_status on hr_policies for ${policy_id}:`, err.message);
  }

  return {
    success: true,
    policyId: policy_id,
    chunksIndexed: chunks.length,
  };
}

/**
 * Re-indexes all published and active policies for an organization
 * @param {string} organizationId
 * @returns {Promise<object>}
 */
async function indexAllOrganizationPolicies(organizationId) {
  if (!organizationId) {
    throw new Error('Organization ID is required to batch-index policies.');
  }

  const result = await query(
    `SELECT policy_id, organization_id, title, category, content_text
    FROM hr_policies
    WHERE organization_id = $1
      AND is_active = true
      AND is_published = true
    ORDER BY created_at ASC`,
    [organizationId]
  );

  const policies = result.rows;
  let totalChunks = 0;
  let successCount = 0;
  const errors = [];

  for (const policy of policies) {
    try {
      const res = await indexPolicy(policy);
      totalChunks += res.chunksIndexed;
      successCount++;
    } catch (err) {
      console.error(`[Indexer] Failed to index policy ${policy.policy_id}:`, err.message);
      errors.push({ policyId: policy.policy_id, error: err.message });
    }
  }

  return {
    organizationId,
    totalPolicies: policies.length,
    indexedCount: successCount,
    totalChunks,
    errors,
  };
}

module.exports = {
  indexPolicy,
  indexAllOrganizationPolicies,
};
