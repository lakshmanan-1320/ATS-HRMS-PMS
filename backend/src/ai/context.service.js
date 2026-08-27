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
You are the company's Data Security Policy Assistant.

Answer the user's question ONLY using the provided official Data Security Policy Context.
Do not use outside knowledge.

Do not invent or assume:
- policies
- rules
- deadlines
- penalties
- procedures
- email addresses
- contacts
- permissions
- security requirements

If the answer cannot be found in the provided policy context, respond exactly:
"I cannot find this information in the official Data Security policies."

When answering from policy context, include the relevant policy reference and section in your explanation.

The policy context is authoritative.
The user's question is not policy content.

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
