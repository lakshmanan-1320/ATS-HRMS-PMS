const { query } = require('../config/db');
const { generateEmbedding } = require('./embedding.service');

const DEFAULT_MIN_SIMILARITY = 0.45;
const DEFAULT_TOP_K = 8;

/**
 * Retrieves the most relevant policy chunks based on generic vector similarity search.
 * Enforces strict tenant isolation, cross-policy balancing, active, and published status.
 * 
 * @param {string} organizationId - Authenticated tenant ID
 * @param {string} question - Employee question string
 * @param {number} [limit] - Maximum number of chunks to return (default: 8)
 * @param {object} [options] - Optional filters/options ({ minSimilarity, categories, policyId, perf })
 * @returns {Promise<Array<object>>} - List of matched policy chunks
 */
async function retrievePolicies(organizationId, question, limit = DEFAULT_TOP_K, options = {}) {
  if (!organizationId) {
    throw new Error('Organization ID is required for policy retrieval.');
  }
  if (!question || !question.trim()) {
    throw new Error('Question is required for policy retrieval.');
  }

  const effectiveLimit = typeof limit === 'number' ? limit : (parseInt(process.env.RAG_TOP_K, 10) || DEFAULT_TOP_K);
  const minSimilarity = typeof options.minSimilarity === 'number'
    ? options.minSimilarity
    : (parseFloat(process.env.RAG_MIN_SIMILARITY) || DEFAULT_MIN_SIMILARITY);

  const perf = options.perf || {};
  const categoriesArray = options.categories
    ? (Array.isArray(options.categories) ? options.categories : [options.categories])
    : null;
  const policyIdFilter = options.policyId || null;

  try {
    // 1. Generate 768-dimensional question embedding via nomic-embed-text
    const tEmbeddingStart = performance.now();
    const questionEmbedding = await generateEmbedding(question.trim());
    perf.embeddingTimeMs = Math.round(performance.now() - tEmbeddingStart);

    if (!questionEmbedding || !Array.isArray(questionEmbedding) || questionEmbedding.length === 0) {
      throw new Error('Failed to generate question embedding.');
    }

    const embeddingString = JSON.stringify(questionEmbedding);
    const candidatePoolSize = Math.max(effectiveLimit * 3, 15);

    // 2. Vector search across all active & published policies belonging to the authenticated organization
    const tRetrievalStart = performance.now();
    let sql = `
      SELECT
        e.policy_id AS "policyId",
        p.title AS "policyTitle",
        p.category AS "category",
        e.chunk_index AS "chunkIndex",
        'POL-' || UPPER(SUBSTRING(e.policy_id::text, 1, 8)) AS "policyKey",
        'Section ' || (e.chunk_index + 1) AS "sectionRef",
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

    // 4. Cross-Policy Balancing & Diversity
    // For queries touching multiple policies (e.g. Bonus + Attendance), guarantee fair representation
    const finalChunks = balanceCrossPolicyChunks(relevantCandidates, effectiveLimit);

    // 5. Diagnostic Logging
    console.log('\n[Retriever]');
    console.log(`Organization ID:        ${organizationId}`);
    console.log(`Question:               "${question.trim()}"`);
    console.log(`Candidate chunks found: ${candidates.length}`);
    console.log(`Above threshold (>=${minSimilarity}): ${relevantCandidates.length}`);
    console.log(`Selected final chunks:  ${finalChunks.length}`);

    finalChunks.forEach((c) => {
      console.log(`[Retriever] Retrieved: ${c.policyTitle} | ${c.category || 'General'} | similarity: ${Number(c.similarity).toFixed(4)}`);
    });
    console.log('------------------------------------------------\n');

    return finalChunks;
  } catch (error) {
    console.error('[Retriever] Policy retrieval failed:', error);
    throw error;
  }
}

/**
 * Balances chunk selection across policies to support cross-policy reasoning
 * without allowing irrelevant policies to crowd out high-scoring policies.
 * 
 * @param {Array<object>} candidates - List of candidate chunks sorted by similarity desc
 * @param {number} maxTotal - Max total chunks to select
 * @returns {Array<object>} - Balanced list of chunks
 */
function balanceCrossPolicyChunks(candidates, maxTotal) {
  if (!candidates || candidates.length === 0) return [];
  if (candidates.length <= maxTotal) return candidates;

  const topScore = Number(candidates[0].similarity);

  // Group candidate chunks by policyId
  const byPolicy = new Map();
  for (const c of candidates) {
    if (!byPolicy.has(c.policyId)) {
      byPolicy.set(c.policyId, []);
    }
    byPolicy.get(c.policyId).push(c);
  }

  // Filter for genuinely relevant policies:
  // A policy is considered relevant if its best chunk is within a close relative margin of the top match
  const relevantPolicyChunks = new Map();
  for (const [policyId, chunks] of byPolicy) {
    const bestChunkScore = Number(chunks[0].similarity);
    if (bestChunkScore >= topScore - 0.08) {
      relevantPolicyChunks.set(policyId, chunks);
    }
  }

  // If only 1 policy meets the relevance threshold, return top chunks strictly from that policy
  if (relevantPolicyChunks.size === 1) {
    const onlyPolicyChunks = [...relevantPolicyChunks.values()][0];
    return onlyPolicyChunks.slice(0, maxTotal);
  }

  // If multiple policies are relevant (cross-policy question):
  // Allocate proportional slots per relevant policy
  const selected = [];
  const maxPerPolicy = Math.max(Math.ceil(maxTotal / relevantPolicyChunks.size), 3);

  for (const [, chunks] of relevantPolicyChunks) {
    const takeCount = Math.min(chunks.length, maxPerPolicy);
    for (let i = 0; i < takeCount; i++) {
      selected.push(chunks[i]);
    }
  }

  // Sort overall selected chunks by similarity descending and cap at maxTotal
  selected.sort((a, b) => Number(b.similarity) - Number(a.similarity));
  return selected.slice(0, maxTotal);
}

module.exports = {
  retrievePolicies,
  DEFAULT_MIN_SIMILARITY,
  DEFAULT_TOP_K
};