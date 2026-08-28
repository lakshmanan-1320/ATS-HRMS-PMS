const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 200;

/**
 * Parses section header from text chunk
 * @param {string} text - Text chunk
 * @returns {string} - Clean section title (e.g. "Section 2: Eligibility For Bonus")
 */
function extractSectionRef(text) {
  const match = text.match(/SECTION\s+([0-9A-Z\.]+)(?:\s*:\s*([^\n\r]+))?/i);
  if (match) {
    const num = match[1];
    const rawTitle = match[2] ? match[2].trim() : '';
    if (rawTitle) {
      // Capitalize words nicely
      const title = rawTitle
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const fullTitle = `Section ${num}: ${title}`;
      return fullTitle.length > 50 ? fullTitle.slice(0, 50) : fullTitle;
    }
    return `Section ${num}`.slice(0, 50);
  }

  const bulletMatch = text.match(/(\d+\.\d+)\s+([A-Z][^\n\r:]{2,50})/);
  if (bulletMatch) {
    const bulletTitle = `Section ${bulletMatch[1]}: ${bulletMatch[2].trim()}`;
    return bulletTitle.length > 50 ? bulletTitle.slice(0, 50) : bulletTitle;
  }

  return 'General';
}

/**
 * Splits policy text into section-aware, semantically preserved chunks.
 * 
 * @param {string} text - Full policy text content
 * @returns {Array<object>} - Array of chunk objects { chunkIndex, sectionRef, chunkText }
 */
function chunkPolicyText(text) {
  if (!text || !text.trim()) {
    return [];
  }

  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Find all SECTION boundaries (e.g. "SECTION 1: ...", "SECTION 2: ...")
  const sectionHeaderRegex = /(?:^|\n\n)(SECTION\s+\d+[^:\n]*:[^\n]+)/gi;
  const matches = [...normalized.matchAll(sectionHeaderRegex)];

  // If no standard SECTION headers found, perform paragraph-based sliding window
  if (matches.length === 0) {
    return fallbackSlidingWindow(normalized);
  }

  const chunks = [];
  let chunkIndex = 0;

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const headerTitle = currentMatch[1].trim();
    const startIndex = currentMatch.index + (currentMatch[0].startsWith('\n\n') ? 2 : 0);
    const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : normalized.length;

    const sectionFullText = normalized.slice(startIndex, endIndex).trim();
    const sectionRef = extractSectionRef(headerTitle);

    if (sectionFullText.length <= CHUNK_SIZE + 200) {
      // Small to medium section: keep intact as a single chunk
      chunks.push({
        chunkIndex: chunkIndex++,
        sectionRef,
        chunkText: sectionFullText
      });
    } else {
      // Large section: split into smaller sub-chunks while preserving section header context
      const subChunks = splitLargeSection(sectionFullText, headerTitle, sectionRef);
      for (const sc of subChunks) {
        chunks.push({
          chunkIndex: chunkIndex++,
          sectionRef: sc.sectionRef,
          chunkText: sc.chunkText
        });
      }
    }
  }

  return chunks;
}

/**
 * Splits a large section into coherent paragraphs with overlap while maintaining header context
 */
function splitLargeSection(sectionText, headerTitle, sectionRef) {
  const paragraphs = sectionText.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const subChunks = [];

  let currentText = '';
  let partNumber = 1;

  for (const para of paragraphs) {
    if (!currentText) {
      currentText = para;
    } else if ((currentText.length + para.length + 2) <= CHUNK_SIZE) {
      currentText += `\n\n${para}`;
    } else {
      // Flush current chunk
      const partRef = subChunks.length === 0 ? sectionRef : `${sectionRef} (P${partNumber})`;
      subChunks.push({
        sectionRef: partRef.slice(0, 50),
        chunkText: currentText.trim()
      });
      partNumber++;

      // Prepend section title if not already at the start of next chunk for embedding context
      const overlapStart = Math.max(0, currentText.length - CHUNK_OVERLAP);
      const overlapText = currentText.slice(overlapStart).trim();

      if (overlapText.length > 50 && !para.startsWith(headerTitle)) {
        currentText = `[${headerTitle}]\n...${overlapText}\n\n${para}`;
      } else {
        currentText = para.startsWith(headerTitle) ? para : `[${headerTitle}]\n${para}`;
      }
    }
  }

  if (currentText.trim().length > 0) {
    const finalPartRef = subChunks.length === 0 ? sectionRef : `${sectionRef} (P${partNumber})`;
    subChunks.push({
      sectionRef: finalPartRef.slice(0, 50),
      chunkText: currentText.trim()
    });
  }

  return subChunks;
}

/**
 * Fallback sliding window for unstructured policy text
 */
function fallbackSlidingWindow(text) {
  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE;

    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end);
      if (paragraphBreak > start + 400) {
        end = paragraphBreak;
      }
    }

    const chunkContent = text.slice(start, end).trim();
    if (chunkContent) {
      chunks.push({
        chunkIndex: chunkIndex++,
        sectionRef: extractSectionRef(chunkContent),
        chunkText: chunkContent
      });
    }

    if (end >= text.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks;
}

/**
 * Backward-compatible helper returning string array if needed
 */
function chunkText(text) {
  return chunkPolicyText(text).map((c) => c.chunkText);
}

module.exports = {
  chunkPolicyText,
  chunkText,
  extractSectionRef
};