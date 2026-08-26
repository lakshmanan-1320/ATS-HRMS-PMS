const { query } = require('../config/db');
const { generateEmbedding } = require('./embedding.service');

async function retrievePolicies(organizationId, question, limit = 5) {
  if (!organizationId) {
    throw new Error('Organization ID is required.');
  }

  if (!question) {
    throw new Error('Question is required.');
  }

  console.log('Policy Retriever');
  console.log('Organization ID:', organizationId);
  console.log('Question:', question);

  // Generate embedding for the user's question
  const questionEmbedding = await generateEmbedding(question);

  if (!questionEmbedding || !Array.isArray(questionEmbedding)) {
    throw new Error('Failed to generate question embedding.');
  }

  console.log(
    'Question embedding generated. Dimensions:',
    questionEmbedding.length
  );

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
    [
      JSON.stringify(questionEmbedding),
      organizationId,
      limit
    ]
  );

  console.log(
    'Policy chunks retrieved:',
    result.rows.length
  );

  return result.rows;
}

module.exports = {
  retrievePolicies
};