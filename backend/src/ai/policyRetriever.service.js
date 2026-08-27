const { query } = require('../config/db');
const { generateEmbedding } = require('./embedding.service');

async function retrievePolicies(organizationId, question, limit = 5) {
  console.log('\nPolicy Retriever');
  console.log('Organization ID:', organizationId);
  console.log('Question:', question);

  try {
    // ---------------------------------------------------------
    // 1. Try vector retrieval
    // ---------------------------------------------------------
    const questionEmbedding = await generateEmbedding(question);

    console.log(
      'Question embedding generated. Dimensions:',
      questionEmbedding.length
    );

    const embeddingString = `[${questionEmbedding.join(',')}]`;

    const result = await query(
      `
      SELECT
        embedding_id,
        policy_id,
        chunk_index,
        chunk_text,
        1 - (embedding <=> $1::vector) AS similarity
      FROM hr_policy_embeddings
      WHERE organization_id = $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
      `,
      [embeddingString, organizationId, limit]
    );

    console.log('Policy chunks retrieved:', result.rows.length);

    if (result.rows.length > 0) {
      return result.rows;
    }

    // ---------------------------------------------------------
    // 2. FALLBACK: retrieve directly from hr_policies
    // ---------------------------------------------------------
    console.log('No embeddings found. Using policy content fallback...');

const policies = await query(
  `
  SELECT
    policy_id,
    title,
    content_text
  FROM hr_policies
  WHERE organization_id = $1
    AND is_active = true
    AND is_published = true
    AND content_text IS NOT NULL
    AND LENGTH(TRIM(content_text)) > 0
    AND title ILIKE '%Code of Conduct%'
  ORDER BY title
  `,
  [organizationId]
);

    console.log('Published policies found:', policies.rows.length);

    const results = [];

    for (const policy of policies.rows) {
      results.push({
        policy_id: policy.policy_id,
        chunk_index: 0,
        similarity: 1.0,
        chunk_text: `
POLICY: ${policy.title}

${policy.content_text}
        `.trim()
      });
    }

    return results.slice(0, limit);

  } catch (error) {
    console.error('Policy retrieval failed:', error);
    throw error;
  }
}

module.exports = {
  retrievePolicies
};