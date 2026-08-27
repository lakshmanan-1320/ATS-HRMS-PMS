const { query } = require('../config/db');
const { generateEmbedding } = require('./embedding.service');

/**
 * Retrieves the most relevant policy chunks based on vector similarity search.
 * Enforces strict tenant isolation, dynamic category scoping, active, and published status.
 * 
 * @param {string} organizationId - Authenticated tenant ID
 * @param {string} question - Employee question string
 * @param {string|Array<string>} categories - Optional category or array of categories to filter by
 * @param {number} limit - Maximum number of chunks to return
 * @returns {Promise<Array<object>>} - List of matched policy chunks
 */
async function retrievePolicies(organizationId, question, categories = null, limit = 5, perf = {}) {
  if (!organizationId) {
    throw new Error('Organization ID is required.');
  }
  if (!question || !question.trim()) {
    throw new Error('Question is required.');
  }

  // Normalize categories parameter into an array of strings (or null)
  let categoriesArray = null;
  if (categories) {
    categoriesArray = Array.isArray(categories) ? categories : [categories];
  }

  try {
    // Generate embedding vector for the question using embeddinggemma
    const tEmbeddingStart = performance.now();
    const questionEmbedding = await generateEmbedding(question);
    perf.embeddingTimeMs = performance.now() - tEmbeddingStart;

    if (!questionEmbedding || !Array.isArray(questionEmbedding)) {
      throw new Error('Failed to generate question embedding.');
    }

    // Retrieve matching chunks with strict tenant isolation and dynamic categories array parameter
    const tRetrievalStart = performance.now();
    const result = await query(
      `
      SELECT
        e.policy_id AS "policyId",
        e.policy_key AS "policyKey",
        e.section_ref AS "sectionRef",
        e.chunk_text AS "chunkText",
        1 - (e.embedding <=> $1::vector) AS "similarity"
      FROM policy_embeddings e
      INNER JOIN hr_policies p ON e.policy_id = p.policy_id
      WHERE e.organization_id = $2
        AND ($3::text[] IS NULL OR e.category = ANY($3::text[]))
        AND p.is_active = true
        AND p.is_published = true
      ORDER BY e.embedding <=> $1::vector
      LIMIT $4
      `,
      [
        JSON.stringify(questionEmbedding),
        organizationId,
        categoriesArray,
        limit
      ]
    );
    perf.retrievalTimeMs = performance.now() - tRetrievalStart;

    if (result.rows.length > 0) {
      return result.rows;
    }

    // ---------------------------------------------------------
    // FALLBACK: Retrieve text directly from hr_policies
    // ---------------------------------------------------------
    console.log(`[Retriever] No embeddings found for categories ${JSON.stringify(categoriesArray)}. Using policy content fallback...`);

    const tFallbackStart = performance.now();
    const fallbackPolicies = await query(
      `
      SELECT policy_id, title, category, content_text
      FROM hr_policies
      WHERE organization_id = $1
        AND ($2::text[] IS NULL OR category = ANY($2::text[]))
        AND is_active = true
        AND is_published = true
        AND content_text IS NOT NULL
        AND LENGTH(TRIM(content_text)) > 0
      ORDER BY title
      `,
      [organizationId, categoriesArray]
    );
    perf.retrievalTimeMs = (perf.retrievalTimeMs || 0) + (performance.now() - tFallbackStart);

    const fallbackResults = [];
    for (const policy of fallbackPolicies.rows) {
      const policyKey = policy.category === 'IT & Data Security' ? 'POL-IT-001' : 'POL-HR-002';
      fallbackResults.push({
        policyId: policy.policy_id,
        policyKey,
        sectionRef: 'General',
        chunkText: `POLICY: ${policy.title}\n\n${policy.content_text}`.trim(),
        similarity: 1.0
      });
    }

    return fallbackResults.slice(0, limit);

  } catch (error) {
    console.error('Policy retrieval failed:', error);
    throw error;
  }
}

module.exports = {
  retrievePolicies
};