const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;

function chunkText(text) {
  if (!text || !text.trim()) {
    return [];
  }

  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const chunks = [];

  let start = 0;

  while (start < normalizedText.length) {
    let end = start + CHUNK_SIZE;

    if (end < normalizedText.length) {
      const paragraphBreak = normalizedText.lastIndexOf('\n\n', end);

      if (paragraphBreak > start + 500) {
        end = paragraphBreak;
      }
    }

    const chunk = normalizedText.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalizedText.length) {
      break;
    }

    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks;
}

module.exports = {
  chunkText
};