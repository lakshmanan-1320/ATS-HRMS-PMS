/**
 * policyRetriever.service.js
 * Retrieves the most relevant policy chunks based on vector similarity search.
 * Enforces strict tenant isolation, cosine similarity thresholds, and active/published status.
 */

'use strict';

const { query } = require('../../config/db');
const { generateEmbedding } = require('./embedding.service');

const DEFAULT_MIN_SIMILARITY = 0.45;
const DEFAULT_TOP_K = 3;

/**
 * Retrieves matching policy chunks for a query string.
 * @param {string} organizationId - Authenticated tenant UUID
 * @param {string} question - Question text
 * @param {number} [limit] - Max chunks
 * @param {object} [options] - Filters (category, policyId, minSimilarity, perf)
 * @returns {Promise<Array<object>>}
 */
async function retrievePolicies(organizationId, question, limit = DEFAULT_TOP_K, options = {}) {
  if (!organizationId) {
    throw new Error('Organization ID is required for policy retrieval.');
  }
  if (!question || !question.trim()) {
    throw new Error('Question is required for policy retrieval.');
  }

  const effectiveLimit = typeof limit === 'number' ? limit : (parseInt(process.env.RAG_TOP_K, 10) || DEFAULT_TOP_K);
  const minSimilarity =
    typeof options.minSimilarity === 'number'
      ? options.minSimilarity
      : parseFloat(process.env.RAG_MIN_SIMILARITY) || DEFAULT_MIN_SIMILARITY;

  const perf = options.perf || {};
  const categoriesArray = options.categories
    ? Array.isArray(options.categories)
      ? options.categories
      : [options.categories]
    : null;
  const policyIdFilter = options.policyId || null;

  try {
    // 1. Generate 768-dim embedding via nomic-embed-text
    const tEmbeddingStart = performance.now();
    const questionEmbedding = await generateEmbedding(question.trim());
    perf.embeddingTimeMs = Math.round(performance.now() - tEmbeddingStart);

    if (!questionEmbedding || !Array.isArray(questionEmbedding) || questionEmbedding.length === 0) {
      throw new Error('Failed to generate question embedding.');
    }

    const embeddingString = JSON.stringify(questionEmbedding);
    const candidatePoolSize = Math.max(effectiveLimit * 3, 15);

    // 2. Vector search across active & published policies in tenant
    const tRetrievalStart = performance.now();
    let sql = `
      SELECT
        e.policy_id AS "policyId",
        p.title AS "policyTitle",
        p.category AS "category",
        e.chunk_index AS "chunkIndex",
        e.chunk_text AS "chunkText",
        1 - (e.embedding <=> $1::vector) AS "similarity"
      FROM hr_policy_embeddings e
      INNER JOIN hr_policies p ON e.policy_id = p.policy_id
      WHERE e.organization_id = $2
        AND p.organization_id = $2
        AND p.is_active = true
        AND p.is_published = true
    `;
    const params = [embeddingString, organizationId];

    if (categoriesArray && categoriesArray.length > 0) {
      params.push(categoriesArray);
      sql += ` AND p.category = ANY($${params.length}::text[])`;
    }

    if (policyIdFilter) {
      params.push(policyIdFilter);
      sql += ` AND e.policy_id = $${params.length}`;
    }

    params.push(candidatePoolSize);
    sql += `
      ORDER BY e.embedding <=> $1::vector ASC
      LIMIT $${params.length}
    `;

    const result = await query(sql, params);
    perf.retrievalTimeMs = Math.round(performance.now() - tRetrievalStart);

    const candidates = result.rows;

    // 3. Filter candidates by relevance threshold
    const relevantCandidates = candidates.filter((row) => Number(row.similarity) >= minSimilarity);

    // 4. Cross-Policy Balancing
    const finalChunks = balanceCrossPolicyChunks(relevantCandidates, effectiveLimit);

    return finalChunks;
  } catch (error) {
    console.error('[Retriever] Policy retrieval failed:', error);
    throw error;
  }
}

/**
 * Balances chunk selection across policies to support cross-policy queries.
 */
function balanceCrossPolicyChunks(candidates, maxTotal) {
  if (!candidates || candidates.length === 0) return [];
  if (candidates.length <= maxTotal) return candidates;

  const topScore = Number(candidates[0].similarity);

  const byPolicy = new Map();
  for (const c of candidates) {
    if (!byPolicy.has(c.policyId)) {
      byPolicy.set(c.policyId, []);
    }
    byPolicy.get(c.policyId).push(c);
  }

  const relevantPolicyChunks = new Map();
  for (const [policyId, chunks] of byPolicy) {
    const bestChunkScore = Number(chunks[0].similarity);
    if (bestChunkScore >= topScore - 0.08) {
      relevantPolicyChunks.set(policyId, chunks);
    }
  }

  if (relevantPolicyChunks.size === 1) {
    const onlyPolicyChunks = Array.from(relevantPolicyChunks.values())[0];
    return onlyPolicyChunks.slice(0, maxTotal);
  }

  const result = [];
  const maxPerPolicy = Math.max(1, Math.floor(maxTotal / relevantPolicyChunks.size) + 1);

  for (const [_, chunks] of relevantPolicyChunks) {
    const takeCount = Math.min(chunks.length, maxPerPolicy);
    result.push(...chunks.slice(0, takeCount));
  }

  result.sort((a, b) => Number(b.similarity) - Number(a.similarity));
  return result.slice(0, maxTotal);
}

module.exports = {
  retrievePolicies,
  balanceCrossPolicyChunks,
};
