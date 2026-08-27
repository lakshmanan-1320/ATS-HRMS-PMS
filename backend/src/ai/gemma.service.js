const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

const CHAT_MODEL =
  process.env.OLLAMA_CHAT_MODEL || 'gemma3:4b';

async function generateAnswer(prompt) {
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
    const error = await response.text();
    throw new Error(`Gemma generation failed: ${error}`);
  }

  const data = await response.json();

  return data.response;
}

module.exports = {
  generateAnswer
};
