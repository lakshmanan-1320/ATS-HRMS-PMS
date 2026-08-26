function buildHRPrompt(question, policyChunks) {
  const context = policyChunks
    .map((item, index) => {
      return `
POLICY ${index + 1}:

${item.chunk_text}
`;
    })
    .join('\n');

  return `
You are an HRMS policy assistant.

Answer the employee's question using ONLY the HR policies
provided in the context below.

Rules:
1. Do not invent HR policies.
2. Do not assume information that is not present.
3. If the answer is not available in the provided policies,
   clearly say that the policy information is not available.
4. Give a concise and professional answer.
5. Do not mention that you are an AI model.
6. Do not expose internal database information.

HR POLICY CONTEXT:
${context}

EMPLOYEE QUESTION:
${question}

ANSWER:
`;
}

module.exports = {
  buildHRPrompt
};