/**
 * gemma.service.js
 * High-level wrapper for Gemma LLM generation with configurable context & timeouts.
 */

'use strict';

const ollamaService = require('./ollama.service');

/**
 * Generate completion for prompt using Gemma.
 * @param {string} prompt - Full structured prompt
 * @param {object} [options] - Options (timeoutMs, num_predict, num_ctx)
 * @returns {Promise<string>}
 */
async function generateCompletion(prompt, options = {}) {
  return ollamaService.generateCompletion(prompt, {
    num_ctx: options.num_ctx || 4096,
    num_predict: options.num_predict || 512,
    timeoutMs: options.timeoutMs,
  });
}

module.exports = {
  generateCompletion,
};
