/**
 * embedding.service.js
 * Generates 768-dimensional text embeddings using nomic-embed-text via Ollama.
 */

'use strict';

const ollamaService = require('../llm/ollama.service');

/**
 * Generate vector embedding for the input text using the configured Ollama embedding model.
 * @param {string} text - Text to embed
 * @returns {Promise<Array<number>>} - 768-dimensional vector array
 */
async function generateEmbedding(text) {
  return ollamaService.generateEmbedding(text);
}

module.exports = {
  generateEmbedding,
};
