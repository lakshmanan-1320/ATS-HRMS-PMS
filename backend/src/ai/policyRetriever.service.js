const { query } = require('../config/db');
const { generateEmbedding } = require('./embedding.service');

const DEFAULT_MIN_SIMILARITY = 0.60;
const DEFAULT_TOP_K = 8;

/**
 * Retrieves the most relevant policy chunks for an HR question.
 *
 * Important:
 * - Keeps strict organization/tenant isolation.
 * - Searches only active + published policies.
 * - Uses vector similarity.
 * - Does NOT force unrelated policies into the result.
 * - Returns chunks ordered by relevance.
 *
 * @param {string} organizationId
 * @param {string} question
 * @param {number} limit
 * @param {object} options
 * @returns {Promise<Array<object>>}
 */
async function retrievePolicies(
  organizationId,
  question,
  limit = DEFAULT_TOP_K,
  options = {}
) {
  if (!organizationId) {
    throw new Error('Organization ID is required for policy retrieval.');
  }

  if (!question || !question.trim()) {
    throw new Error('Question is required for policy retrieval.');
  }

  const effectiveLimit =
    typeof limit === 'number'
      ? limit
      : parseInt(process.env.RAG_TOP_K, 10) || DEFAULT_TOP_K;

  const configuredThreshold = parseFloat(
    process.env.RAG_MIN_SIMILARITY
  );

  const minSimilarity =
    typeof options.minSimilarity === 'number'
      ? options.minSimilarity
      : Number.isFinite(configuredThreshold)
        ? configuredThreshold
        : DEFAULT_MIN_SIMILARITY;

  const perf = options.perf || {};

  const categoriesArray = options.categories
    ? Array.isArray(options.categories)
      ? options.categories
      : [options.categories]
    : null;

  const policyIdFilter = options.policyId || null;

  try {
    // ---------------------------------------------------------
    // 1. Generate question embedding
    // ---------------------------------------------------------
    const tEmbeddingStart = performance.now();

    const questionEmbedding = await generateEmbedding(
      question.trim()
    );

    perf.embeddingTimeMs = Math.round(
      performance.now() - tEmbeddingStart
    );

    if (
      !Array.isArray(questionEmbedding) ||
      questionEmbedding.length === 0
    ) {
      throw new Error(
        'Failed to generate question embedding.'
      );
    }

    const embeddingString = JSON.stringify(questionEmbedding);

    // Retrieve more candidates first, then apply similarity threshold.
    const candidatePoolSize = Math.max(
      effectiveLimit * 4,
      20
    );

    // ---------------------------------------------------------
    // 2. Vector search
    // ---------------------------------------------------------
    const tRetrievalStart = performance.now();

    let sql = `
      SELECT
        e.policy_id AS "policyId",
        p.title AS "policyTitle",
        p.category AS "category",
        e.chunk_index AS "chunkIndex",

        'POL-' ||
        UPPER(SUBSTRING(e.policy_id::text, 1, 8))
        AS "policyKey",

        'Section ' ||
        (e.chunk_index + 1)
        AS "sectionRef",

        e.chunk_text AS "chunkText",

        1 - (e.embedding <=> $1::vector)
        AS "similarity"

      FROM hr_policy_embeddings e

      INNER JOIN hr_policies p
        ON e.policy_id = p.policy_id

      WHERE e.organization_id = $2
        AND p.organization_id = $2
        AND p.is_active = true
        AND p.is_published = true
    `;

    const params = [
      embeddingString,
      organizationId
    ];

    // Optional category filtering
    if (
      categoriesArray &&
      categoriesArray.length > 0
    ) {
      params.push(categoriesArray);

      sql += `
        AND p.category = ANY($${params.length}::text[])
      `;
    }

    // Optional specific policy filtering
    if (policyIdFilter) {
      params.push(policyIdFilter);

      sql += `
        AND e.policy_id = $${params.length}
      `;
    }

    params.push(candidatePoolSize);

    sql += `
      ORDER BY e.embedding <=> $1::vector ASC
      LIMIT $${params.length}
    `;

    const result = await query(sql, params);

    perf.retrievalTimeMs = Math.round(
      performance.now() - tRetrievalStart
    );

    const candidates = result.rows || [];

    // ---------------------------------------------------------
    // 3. DEBUG: show what vector search actually retrieved
    // ---------------------------------------------------------
    console.log('\n================ RETRIEVER DEBUG ================');
    console.log(`Organization: ${organizationId}`);
    console.log(`Question: "${question.trim()}"`);
    console.log(`Threshold: ${minSimilarity}`);
    console.log(`Candidates: ${candidates.length}`);
    console.log('--------------------------------------------------');

    candidates.forEach((row, index) => {
      console.log(
        `${index + 1}. ${row.policyTitle || 'Unknown Policy'}`
      );

      console.log(
        `   Category: ${row.category || 'General'}`
      );

      console.log(
        `   Chunk: ${row.chunkIndex}`
      );

      console.log(
        `   Similarity: ${Number(row.similarity).toFixed(4)}`
      );

      console.log(
        `   Text: ${String(row.chunkText || '')
          .replace(/\s+/g, ' ')
          .slice(0, 500)}`
      );

      console.log('--------------------------------------------------');
    });

    // ---------------------------------------------------------
    // 4. Apply similarity threshold
    // ---------------------------------------------------------
    const relevantCandidates = candidates
      .filter(
        (row) =>
          Number(row.similarity) >= minSimilarity
      )
      .sort(
        (a, b) =>
          Number(b.similarity) -
          Number(a.similarity)
      );

    console.log(
      `Above threshold: ${relevantCandidates.length}`
    );

    // ---------------------------------------------------------
    // 5. Return ONLY the strongest relevant chunks
    //
    // Do not artificially balance policies.
    // A question about unpaid leave should not receive
    // unrelated bonus/attendance chunks simply for diversity.
    // ---------------------------------------------------------
    const finalChunks = relevantCandidates.slice(
      0,
      effectiveLimit
    );

    console.log(
      `Final chunks returned: ${finalChunks.length}`
    );

    finalChunks.forEach((row, index) => {
      console.log(
        `FINAL ${index + 1}: ${
          row.policyTitle || 'Unknown Policy'
        } | ${row.category || 'General'} | ` +
        `similarity=${Number(row.similarity).toFixed(4)}`
      );
    });

    console.log(
      '==================================================\n'
    );

    return finalChunks;

  } catch (error) {
    console.error(
      '[Retriever] Policy retrieval failed:',
      error
    );

    throw error;
  }
}

module.exports = {
  retrievePolicies,
  DEFAULT_MIN_SIMILARITY,
  DEFAULT_TOP_K
};