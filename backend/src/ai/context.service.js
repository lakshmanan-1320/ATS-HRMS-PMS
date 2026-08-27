/**
 * context.service.js
 * Formats retrieved policy chunks into grounded context and constructs the strict LLM prompt.
 */

/**
 * Formats a list of database policy chunks into a clean, annotated reference context string.
 * @param {Array<object>} chunks - Policy chunks from retriever
 * @returns {string} - Formatted context string
 */
function formatPolicyContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return 'NO POLICY CONTEXT AVAILABLE';
  }

  return chunks
    .map((chunk) => {
      return `[${chunk.policyKey} | ${chunk.sectionRef}]\n${chunk.chunkText}`;
    })
    .join('\n\n');
}

/**
 * Builds the strict, grounded system prompt for Gemma 3 4B.
 * @param {string} question - Employee question
 * @param {Array<object>} chunks - Relevant policy chunks
 * @returns {string} - Complete prompt string
 */
function buildGroundedPrompt(question, chunks) {
  const contextText = formatPolicyContext(chunks);

  return `### SYSTEM INSTRUCTIONS
You are the company's Policy AI Assistant. Your job is to answer employee questions using the provided Policy Context.

Instructions:
1. If the provided Policy Context contains relevant details, answer the user's question accurately, concisely, and professionally using those details.
2. Do not use any outside knowledge or invent policies, rules, deadlines, contact emails, or procedures that are not explicitly written in the context.
3. If the provided context is completely unrelated or does not contain any relevant information to answer the question, respond exactly with:
"I cannot find this information in the official company policies. Please contact HR or your administrator for assistance."

The policy context is authoritative.

### POLICY CONTEXT
${contextText}

### USER QUESTION
${question}

### ANSWER:
`;
}

module.exports = {
  formatPolicyContext,
  buildGroundedPrompt
};
