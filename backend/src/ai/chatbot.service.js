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
async function getChatbotResponse(organizationId, question, category = ['IT & Data Security', 'Leave & Employee Conduct']) {
  const tTotalStart = performance.now();

  if (!organizationId) {
    throw new Error('Organization ID is required.');
  }
  if (!question || !question.trim()) {
    throw new Error('Question is required.');
  }

  const trimmed = question.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
  const greetings = new Set(['hi', 'hello', 'hey', 'gday', 'good morning', 'good afternoon', 'good evening', 'howdy', 'hola', 'yo', 'thanks', 'thank you', 'thankyou']);

  // Handle generic greetings and conversational dialogs directly (Instant Response)
  if (greetings.has(trimmed) || trimmed === 'who are you' || trimmed === 'help') {
    let answerText = "Hello there! I’m your AI Assistant, here to help you with any questions you have about our company policies, specifically regarding IT & Data Security, the Code of Conduct, Attendance, and Bonus policies. Please, feel free to ask away!";
    
    if (trimmed === 'thanks' || trimmed === 'thank you' || trimmed === 'thankyou') {
      answerText = "You're welcome! Let me know if you have any other questions about our company policies.";
    } else if (trimmed === 'who are you' || trimmed === 'help') {
      answerText = "I am your AI Assistant, built to answer questions regarding company policies (specifically IT & Data Security, Code of Conduct, Attendance, and Bonus policies). How can I help you today?";
    }

    return {
      success: true,
      answer: answerText,
      sources: [],
      model: 'static-response',
      metrics: {
        totalTimeMs: Math.round(performance.now() - tTotalStart)
      }
    };
  }

  // Normalize target categories array
  const targetCategories = Array.isArray(category) ? category : [category];

  // 1. Retrieve tenant-scoped policy chunks across targets
  const perf = {};
  const matchedChunks = await policyRetriever.retrievePolicies(
    organizationId,
    question,
    targetCategories,
    3,
    perf
  );

  // 2. Validate relevance by inspecting the best similarity score
  const hasRelevantChunks = matchedChunks.length > 0 && matchedChunks[0].similarity >= RELEVANCE_THRESHOLD;

  if (!hasRelevantChunks) {
    // Return early if no relevant policy context matches
    return {
      success: true,
      answer: 'I cannot find this information in the official company policies. Please contact HR or your administrator for assistance.',
      sources: [],
      model: 'gemma3:4b',
      metrics: {
        embeddingTimeMs: Math.round(perf.embeddingTimeMs || 0),
        retrievalTimeMs: Math.round(perf.retrievalTimeMs || 0),
        contextTimeMs: 0,
        generationTimeMs: 0,
        totalTimeMs: Math.round(performance.now() - tTotalStart)
      }
    };
  }

  // 3. Build grounded prompt context
  const tContextStart = performance.now();
  const prompt = contextService.buildGroundedPrompt(question, matchedChunks);
  const contextTimeMs = performance.now() - tContextStart;

  // 4. Query Gemma 3 4B via Ollama
  const tGenerationStart = performance.now();
  const rawCompletion = await ollamaService.generateCompletion(prompt);
  const generationTimeMs = performance.now() - tGenerationStart;

  // 5. Clean up any prompt leakage or whitespace
  const answer = (rawCompletion || '').trim();
  const totalTimeMs = performance.now() - tTotalStart;

  const metrics = {
    embeddingTimeMs: Math.round(perf.embeddingTimeMs || 0),
    retrievalTimeMs: Math.round(perf.retrievalTimeMs || 0),
    contextTimeMs: Math.round(contextTimeMs),
    generationTimeMs: Math.round(generationTimeMs),
    totalTimeMs: Math.round(totalTimeMs)
  };

  // Log RAG Timing metrics in console
  console.log('============================================');
  console.log('[RAG TIMING METRICS]');
  console.log(`- Embedding Generation:   ${metrics.embeddingTimeMs} ms`);
  console.log(`- pgvector Retrieval:     ${metrics.retrievalTimeMs} ms`);
  console.log(`- Context Preparation:     ${metrics.contextTimeMs} ms`);
  console.log(`- Gemma Generation:       ${metrics.generationTimeMs} ms`);
  console.log(`- Total Response Time:     ${metrics.totalTimeMs} ms`);
  console.log('============================================');

  return {
    success: true,
    answer,
    sources: matchedChunks.map(chunk => ({
      policyId: chunk.policyId,
      policyKey: chunk.policyKey,
      section: chunk.sectionRef,
      similarity: chunk.similarity,
      text: chunk.chunkText
    })),
    model: 'gemma3:4b',
    metrics
  };
}

module.exports = {
  getChatbotResponse,
  RELEVANCE_THRESHOLD
};
