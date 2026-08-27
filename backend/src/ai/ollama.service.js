const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'embeddinggemma';
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'gemma3:4b';

/**
 * Generate embedding vector using embeddinggemma via /api/embed
 * @param {string} text - The input text to embed
 * @returns {Promise<Array<number>>} - Vector array
 */
async function generateEmbedding(text) {
  if (!text || !text.trim()) {
    throw new Error('Text is required to generate embedding.');
  }

  const response = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding model generation failed: ${errorText}`);
  }

  const data = await response.json();
  if (!data.embeddings || !data.embeddings[0]) {
    throw new Error('Invalid response from Ollama embed endpoint.');
  }

  return data.embeddings[0];
}

/**
 * Generate completion text using gemma3:4b via /api/generate
 * @param {string} prompt - The prompt text containing system role, context, and query
 * @returns {Promise<string>} - Generated response text
 */
async function generateCompletion(prompt) {
  if (!prompt || !prompt.trim()) {
    throw new Error('Prompt is required for completion generation.');
  }

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      prompt,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat model completion failed: ${errorText}`);
  }

  const data = await response.json();
  return data.response;
}

module.exports = {
  generateEmbedding,
  generateCompletion
};
