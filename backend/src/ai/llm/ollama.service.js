/**
 * ollama.service.js
 * Client interface for local Ollama server (default: http://localhost:11434).
 * Supports embeddings (nomic-embed-text) and generation (gemma3:4b), plus health checks.
 */

'use strict';

const logger = require('../../config/logger');

const OLLAMA_BASE_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
const EMBED_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'gemma3:4b';
const TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS, 10) || 60000;

/**
 * Checks health of Ollama server and verifies configured models exist.
 * @returns {Promise<object>}
 */
async function checkHealth() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return {
        ollama: false,
        error: `Ollama returned status ${res.status}`,
      };
    }

    const data = await res.json();
    const models = (data.models || []).map((m) => m.name);

    const hasChatModel = models.some((m) => m.startsWith(CHAT_MODEL.split(':')[0]));
    const hasEmbedModel = models.some((m) => m.startsWith(EMBED_MODEL.split(':')[0]));

    return {
      ollama: true,
      chatModel: CHAT_MODEL,
      chatModelAvailable: hasChatModel,
      embeddingModel: EMBED_MODEL,
      embeddingModelAvailable: hasEmbedModel,
      availableModels: models,
    };
  } catch (err) {
    return {
      ollama: false,
      error: err.message,
    };
  }
}

/**
 * Generates text embeddings using nomic-embed-text.
 * @param {string} promptText
 * @returns {Promise<Array<number>>}
 */
async function generateEmbedding(promptText) {
  if (!promptText || !promptText.trim()) {
    throw new Error('Text to embed must not be empty.');
  }

  const endpoint = `${OLLAMA_BASE_URL}/api/embed`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: promptText.trim(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Embedding API error (HTTP ${res.status}): ${errBody}`);
    }

    const json = await res.json();
    if (json.embeddings && json.embeddings.length > 0) {
      return json.embeddings[0];
    }
    if (json.embedding) {
      return json.embedding;
    }

    throw new Error('Ollama embed endpoint returned no embeddings array.');
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Ollama embedding request timed out after 15 seconds.');
    }
    throw err;
  }
}

/**
 * Generates text completion using Gemma.
 * Optimized for CPU inference with compact context and constrained predictions.
 *
 * @param {string} prompt
 * @param {object} [options]
 * @returns {Promise<string>}
 */
async function generateCompletion(prompt, options = {}) {
  const endpoint = `${OLLAMA_BASE_URL}/api/generate`;
  const timeout = options.timeoutMs || TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CHAT_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_ctx: options.num_ctx || 1536,
          num_predict: options.num_predict || 200,
          top_p: 0.9,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama generate error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return (data.response || '').trim();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Gemma generation timed out after ${timeout / 1000}s.`);
    }
    throw err;
  }
}

module.exports = {
  checkHealth,
  generateEmbedding,
  generateCompletion,
  OLLAMA_BASE_URL,
  CHAT_MODEL,
  EMBED_MODEL,
};
