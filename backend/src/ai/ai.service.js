const { query } = require('../config/db');

const policyRetriever = require('./policyRetriever.service');
const { buildHRPrompt } = require('./prompt.service');
const { generateAnswer } = require('./gemma.service');

async function chat(body, user) {
  const { message } = body;

  if (!message) {
    throw new Error('Message is required.');
  }

  let organizationId = user?.organizationId;

  // Fallback: get organization from users table
  if (!organizationId && user?.userId) {
    const result = await query(
      `
      SELECT organization_id
      FROM users
      WHERE user_id = $1
      LIMIT 1
      `,
      [user.userId]
    );

    organizationId = result.rows[0]?.organization_id;
  }

  if (!organizationId) {
    throw new Error('Organization ID is required.');
  }

  console.log('================ AI SERVICE ================');
  console.log('Organization ID:', organizationId);
  console.log('User question:', message);
  console.log('============================================');

  // 1. Retrieve relevant policy chunks
  const searchCategory = body.category === 'IT_SECURITY' ? 'IT & Data Security' : 'Leave & Employee Conduct';
  const policies = await policyRetriever.retrievePolicies(
    organizationId,
    message,
    searchCategory,
    5
  );

  console.log('Retrieved policy chunks:', policies.length);

  // 2. If nothing was retrieved, do not ask Gemma to invent an answer
  if (!policies.length) {
    return {
      success: true,
      question: message,
      answer: 'I could not find this information in the available HR policies.',
      sources: []
    };
  }

  // 3. Build RAG prompt using retrieved policies
  const prompt = buildHRPrompt(message, policies);

  console.log('Generating answer using Gemma...');

  // 4. Generate answer locally using Ollama + Gemma
  const answer = await generateAnswer(prompt);

  console.log('Gemma answer generated.');

  // 5. Return source information
  const sources = policies.map((policy) => ({
    policyId: policy.policyId || policy.policy_id,
    policyKey: policy.policyKey || 'POL-HR-002',
    section: policy.sectionRef || 'General',
    chunk_index: policy.chunk_index !== undefined ? policy.chunk_index : 0,
    similarity: policy.similarity,
    text: policy.chunkText || policy.chunk_text
  }));

  return {
    success: true,
    question: message,
    answer: answer?.trim() || 'I could not generate an answer.',
    sources
  };
}

module.exports = {
  chat
};