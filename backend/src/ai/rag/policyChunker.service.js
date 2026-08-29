/**
 * policyChunker.service.js
 * Splits policy documents into semantically coherent, section-aware chunks.
 */

'use strict';

const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 200;

function extractSectionRef(text) {
  const match = text.match(/SECTION\s+([0-9A-Z\.]+)(?:\s*:\s*([^\n\r]+))?/i);
  if (match) {
    const num = match[1];
    const rawTitle = match[2] ? match[2].trim() : '';
    if (rawTitle) {
      const title = rawTitle.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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

function chunkPolicyText(text) {
  if (!text || !text.trim()) {
    return [];
  }

  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const sectionHeaderRegex = /(?:^|\n\n)(SECTION\s+\d+[^:\n]*:[^\n]+)/gi;
  const matches = [...normalized.matchAll(sectionHeaderRegex)];

  if (matches.length === 0) {
    return fallbackSlidingWindow(normalized);
  }

  const chunks = [];
  let chunkIndex = 0;

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const headerTitle = currentMatch[1].trim();
    const startIndex = currentMatch.index + (currentMatch[0].startsWith('\n\n') ? 2 : 0);
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : normalized.length;

    const sectionFullText = normalized.slice(startIndex, endIndex).trim();
    const sectionRef = extractSectionRef(headerTitle);

    if (sectionFullText.length <= CHUNK_SIZE + 200) {
      chunks.push({
        chunkIndex: chunkIndex++,
        sectionRef,
        chunkText: sectionFullText,
      });
    } else {
      const subChunks = splitLargeSection(sectionFullText, headerTitle, sectionRef);
      for (const sc of subChunks) {
        chunks.push({
          chunkIndex: chunkIndex++,
          sectionRef: sc.sectionRef,
          chunkText: sc.chunkText,
        });
      }
    }
  }

  return chunks;
}

function splitLargeSection(sectionText, headerTitle, sectionRef) {
  const paragraphs = sectionText.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const subChunks = [];

  let currentText = '';
  let subIndex = 1;

  for (const para of paragraphs) {
    if ((currentText + '\n\n' + para).length > CHUNK_SIZE && currentText.length > 0) {
      subChunks.push({
        sectionRef: `${sectionRef} (Part ${subIndex++})`,
        chunkText: `${headerTitle}\n\n${currentText}`.trim(),
      });

      const overlapSlice = currentText.slice(-CHUNK_OVERLAP).trim();
      currentText = overlapSlice ? `${overlapSlice}\n\n${para}` : para;
    } else {
      currentText = currentText ? `${currentText}\n\n${para}` : para;
    }
  }

  if (currentText.trim().length > 0) {
    subChunks.push({
      sectionRef: subIndex > 1 ? `${sectionRef} (Part ${subIndex})` : sectionRef,
      chunkText: `${headerTitle}\n\n${currentText}`.trim(),
    });
  }

  return subChunks;
}

function fallbackSlidingWindow(text) {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks = [];
  let chunkIndex = 0;
  let currentBuffer = '';

  for (const para of paragraphs) {
    if ((currentBuffer + '\n\n' + para).length > CHUNK_SIZE && currentBuffer.length > 0) {
      chunks.push({
        chunkIndex: chunkIndex++,
        sectionRef: 'General',
        chunkText: currentBuffer.trim(),
      });
      const overlap = currentBuffer.slice(-CHUNK_OVERLAP).trim();
      currentBuffer = overlap ? `${overlap}\n\n${para}` : para;
    } else {
      currentBuffer = currentBuffer ? `${currentBuffer}\n\n${para}` : para;
    }
  }

  if (currentBuffer.trim().length > 0) {
    chunks.push({
      chunkIndex: chunkIndex++,
      sectionRef: 'General',
      chunkText: currentBuffer.trim(),
    });
  }

  return chunks;
}

module.exports = {
  chunkPolicyText,
  extractSectionRef,
};
