const policyRetriever = require('./policyRetriever.service');
const contextService = require('./context.service');
const ollamaService = require('./ollama.service');

// Similarity threshold below which we refuse to answer (to prevent hallucination)
const RELEVANCE_THRESHOLD = 0.25;

/**
 * Main RAG orchestrator for policy questions
 * 
 * @param {string} organizationId - Tenant organization ID
 * @param {string} question - Employee question
 * @param {string} category - Policy category filter (defaults to 'IT & Data Security')
 * @returns {Promise<object>} - AI Answer and source metadata
 */
async function getChatbotResponse(organizationId, question, category = 'IT & Data Security') {
  if (!organizationId) {
    throw new Error('Organization ID is required.');
  }
  if (!question || !question.trim()) {
    throw new Error('Question is required.');
  }

  // 1. Retrieve tenant-scoped and category-scoped policy chunks
  const matchedChunks = await policyRetriever.retrievePolicies(
    organizationId,
    question,
    category,
    3
  );

  // 2. Validate relevance by inspecting the best similarity score
  const hasRelevantChunks = matchedChunks.length > 0 && matchedChunks[0].similarity >= RELEVANCE_THRESHOLD;

  if (!hasRelevantChunks) {
    // Return early if no relevant policy context matches
    return {
      success: true,
      answer: 'I cannot find this information in the official Data Security policies.',
      sources: [],
      model: 'gemma3:4b'
    };
  }

  // 3. Build grounded prompt context
  const prompt = contextService.buildGroundedPrompt(question, matchedChunks);

  // 4. Query Gemma 3 4B via Ollama
  const rawCompletion = await ollamaService.generateCompletion(prompt);

  // 5. Clean up any prompt leakage or whitespace
  const answer = (rawCompletion || '').trim();

  return {
    success: true,
    answer,
    sources: matchedChunks.map(chunk => ({
      policyId: chunk.policyId,
      policyKey: chunk.policyKey,
      section: chunk.sectionRef
    })),
    model: 'gemma3:4b'
  };
}

module.exports = {
  getChatbotResponse,
  RELEVANCE_THRESHOLD
};
