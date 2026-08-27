const ollamaService = require('./ollama.service');

/**
 * Generate 768-dimensional vector embedding for the input text using embeddinggemma.
 * @param {string} text - Clean text to embed
 * @returns {Promise<Array<number>>} - Vector array
 */
async function generateEmbedding(text) {
  return ollamaService.generateEmbedding(text);
}

module.exports = {
  generateEmbedding
};