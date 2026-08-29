const env = require('../config/env');

const OLLAMA_URL = env.ai?.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
const CHAT_MODEL = env.ai?.chatModel || process.env.OLLAMA_CHAT_MODEL || 'gemma3:4b';
const DEFAULT_TIMEOUT_MS = env.ai?.timeoutMs || parseInt(process.env.AI_TIMEOUT_MS || '20000', 10);

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
          temperature: 0.1,
          num_ctx: 4096,
          num_predict: 512
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemma generation failed: ${errorText}`);
    }

    const data = await response.json();
    return (data && data.response) ? data.response.trim() : '';
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
  generateCompletion,
  generateAnswer: generateCompletion,
};
