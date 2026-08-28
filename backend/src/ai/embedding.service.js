const ollamaService = require('./ollama.service');

/**
 * Generate vector embedding for the input text using the configured Ollama embedding model.
 * @param {string} text - Clean text to embed
 * @returns {Promise<Array<number>>} - Vector array
 */
async function generateEmbedding(text) {
  return ollamaService.generateEmbedding(text);
}

module.exports = {
  generateEmbedding
};
