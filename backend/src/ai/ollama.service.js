const env = require('../config/env');

const OLLAMA_URL = env.ai?.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = env.ai?.embeddingModel || process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
const CHAT_MODEL = env.ai?.chatModel || process.env.OLLAMA_CHAT_MODEL || 'gemma3:4b';
const DEFAULT_TIMEOUT_MS = env.ai?.timeoutMs || parseInt(process.env.AI_TIMEOUT_MS || '20000', 10);

async function generateEmbedding(text, options = {}) {
  if (!text || !text.trim()) {
    throw new Error('Text is required to generate embedding.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding model generation failed: ${errorText}`);
    }

    const data = await response.json();
    if (!data.embeddings || !data.embeddings[0]) {
      throw new Error('Invalid response from Ollama embed endpoint.');
    }

    const vector = Array.isArray(data.embeddings[0]) ? data.embeddings[0] : [];
    if (vector.length !== 768) {
      throw new Error(`Embedding dimensions mismatch: expected 768, received ${vector.length}.`);
    }

    return vector;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Embedding generation timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function generateCompletion(prompt, options = {}) {
  if (!prompt || !prompt.trim()) {
    throw new Error('Prompt is required for completion generation.');
  }

  const controller = new AbortController();
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: CHAT_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.1,
          num_ctx: options.num_ctx || 4096,
          num_predict: options.num_predict || 1024
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat model completion failed: ${errorText}`);
    }

    const data = await response.json();
    const responseText = (data && data.response ? data.response : '').trim();

    return {
      response: responseText,
      toString() { return responseText; },
      metadata: {
        total_duration: data.total_duration,
        prompt_eval_duration: data.prompt_eval_duration,
        eval_duration: data.eval_duration,
        prompt_eval_count: data.prompt_eval_count,
        eval_count: data.eval_count
      }
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Gemma generation timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  generateEmbedding,
  generateCompletion
};
