const { query } = require('../config/db');
const { generateEmbedding } = require('./embedding.service');

/**
 * Retrieves the most relevant policy chunks based on vector similarity search
 * Enforces strict tenant isolation, category scoping, active, and published status.
 * 
 * @param {string} organizationId - Authenticated tenant ID
 * @param {string} question - Employee question string
 * @param {string} category - Policy category/module scope (e.g. 'IT & Data Security')
 * @param {number} limit - Maximum number of chunks to return
 * @returns {Promise<Array<object>>} - List of matched policy chunks
 */
async function retrievePolicies(organizationId, question, category = 'IT & Data Security', limit = 5) {
  if (!organizationId) {
    throw new Error('Organization ID is required.');
  }
  if (!question || !question.trim()) {
    throw new Error('Question is required.');
  }

  // Generate embedding vector for the question using embeddinggemma
  const questionEmbedding = await generateEmbedding(question);

  if (!questionEmbedding || !Array.isArray(questionEmbedding)) {
    throw new Error('Failed to generate question embedding.');
  }

  // Retrieve matching chunks with strict tenant & category parameters
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
      AND e.category = $3
      AND p.is_active = true
      AND p.is_published = true
    ORDER BY e.embedding <=> $1::vector
    LIMIT $4
    `,
    [
      JSON.stringify(questionEmbedding),
      organizationId,
      category,
      limit
    ]
  );

  return result.rows;
}

module.exports = {
  retrievePolicies
};