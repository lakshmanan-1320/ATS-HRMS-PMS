const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBEDDING_MODEL =
  process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

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
    const error = await response.text();
    throw new Error(`Embedding generation failed: ${error}`);
  }

  const data = await response.json();

  if (!data.embeddings || !data.embeddings[0]) {
    throw new Error('Invalid embedding response from Ollama.');
  }

  return data.embeddings[0];
}

module.exports = {
  generateEmbedding
};