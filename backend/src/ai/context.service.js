/**
 * context.service.js
 * Formats policy chunks and employee HRMS data into grounded context and constructs LLM prompts.
 */

const { buildUserAwareHRPrompt, buildHRPrompt, formatPolicyChunks } = require('./prompt.service');

/**
 * Formats a list of database policy chunks into a clean, annotated reference context string.
 * @param {Array<object>} chunks - Policy chunks from retriever
 * @returns {string} - Formatted context string
 */
function formatPolicyContext(chunks) {
  return formatPolicyChunks(chunks);
}

/**
 * Builds the strict, grounded system prompt for Gemma 3 4B supporting both policy and live user data.
 * @param {string} question - Employee question
 * @param {Array<object>} [chunks] - Relevant policy chunks
 * @param {string} [employeeDataText] - Formatted employee HRMS data text
 * @returns {string} - Complete prompt string
 */
function buildGroundedPrompt(question, chunks = [], employeeDataText = '') {
  return buildUserAwareHRPrompt(question, chunks, employeeDataText);
}

module.exports = {
  formatPolicyContext,
  buildGroundedPrompt
};
