const { query } = require('../config/db');

const { generateEmbedding } = require('./embedding.service');
const { chunkText } = require('./policyChunker.service');

async function indexPolicy(policy) {
  const {
    policy_id,
    organization_id,
    content_text
  } = policy;

  if (!policy_id || !organization_id || !content_text) {
    throw new Error('Invalid policy data.');
  }

  const chunks = chunkText(content_text);

  if (!chunks.length) {
    throw new Error('Policy contains no searchable content.');
  }

  // Remove previous embeddings for this policy
  await query(
    `
    DELETE FROM hr_policy_embeddings
    WHERE policy_id = $1
      AND organization_id = $2
    `,
    [policy_id, organization_id]
  );

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    const embedding = await generateEmbedding(chunk);

    await query(
      `
      INSERT INTO hr_policy_embeddings (
        policy_id,
        organization_id,
        chunk_index,
        chunk_text,
        embedding
      )
      VALUES ($1, $2, $3, $4, $5::vector)
      `,
      [
        policy_id,
        organization_id,
        i,
        chunk,
        JSON.stringify(embedding)
      ]
    );
  }

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

  return {
    policyId: policy_id,
    chunksIndexed: chunks.length
  };
}

module.exports = {
  indexPolicy
};