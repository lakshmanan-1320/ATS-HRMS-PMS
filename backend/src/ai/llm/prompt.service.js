/**
 * prompt.service.js
 * Builds grounded prompts for Gemma 3 4B.
 *
 * Rules:
 * - Strictly grounds answers in verified company policy and live HRMS data.
 * - Delimits verified sections with clear headers.
 * - Forbids hallucinating employee records, balances, or approval actions.
 */

'use strict';

function formatPolicyChunks(policyChunks = []) {
  if (!policyChunks || policyChunks.length === 0) {
    return 'No relevant policy sections found.';
  }

  return policyChunks
    .slice(0, 3)
    .map((chunk, index) => {
      const title = chunk.policyTitle || 'Policy';
      let text = (chunk.chunkText || '').trim();
      if (text.length > 400) {
        text = text.slice(0, 400) + '...';
      }
      return `[Source ${index + 1}: ${title}]\n${text}`;
    })
    .join('\n\n');
}

/**
 * Builds user-aware grounded prompt for Gemma.
 * @param {object} params
 * @returns {string}
 */
function buildUserAwareHRPrompt(params = {}) {
  const {
    question = '',
    policyChunks = [],
    employeeDataText = '',
    user = {},
    conversationContext = [],
  } = params;

  const cleanQuestion = String(question || '').trim();
  const policyContext = formatPolicyChunks(policyChunks);
  const employeeContextText = String(employeeDataText || '').trim();
  const userRole = user.role || 'employee';

  const parts = [];

  parts.push(`You are the official HR Assistant for this company.`);
  parts.push(`User Role: ${userRole}.`);
  parts.push(`Instructions: Answer directly in 1-3 concise sentences using ONLY the context below. Do not invent details. Be helpful and direct.`);
  parts.push('');

  if (employeeContextText) {
    parts.push('--- VERIFIED HRMS RECORD ---');
    parts.push(employeeContextText.slice(0, 400));
    parts.push('---------------------------');
    parts.push('');
  }

  if (policyChunks && policyChunks.length > 0) {
    parts.push('--- APPROVED COMPANY POLICY CONTEXT ---');
    parts.push(policyContext);
    parts.push('----------------------------------------');
    parts.push('');
  }

  if (Array.isArray(conversationContext) && conversationContext.length > 0) {
    const historyText = conversationContext
      .slice(-3)
      .map((item, idx) => `${idx + 1}. ${item.sender || 'User'}: ${String(item.text || '').trim()}`)
      .join('\n');
    parts.push('--- RECENT CONVERSATION ---');
    parts.push(historyText);
    parts.push('---------------------------');
    parts.push('');
  }

  parts.push(`USER QUESTION: ${cleanQuestion}`);
  parts.push('');
  parts.push('ASSISTANT ANSWER:');

  return parts.join('\n');
}

module.exports = {
  buildUserAwareHRPrompt,
  formatPolicyChunks,
};
