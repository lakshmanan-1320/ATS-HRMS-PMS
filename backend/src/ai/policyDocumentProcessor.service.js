const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { query } = require('../config/db');
const { indexPolicy } = require('./policyIndexer.service');

async function extractPdfText(absolutePath) {
  try {
    const dataBuffer = fs.readFileSync(absolutePath);
    if (pdfParse.PDFParse) {
      const uint8Data = new Uint8Array(dataBuffer);
      const parser = new pdfParse.PDFParse(uint8Data);
      const result = await parser.getText();
      return (typeof result === 'string' ? result : (result?.text || '')).trim();
    } else if (typeof pdfParse === 'function') {
      const result = await pdfParse(dataBuffer);
      return (result?.text || '').trim();
    }
  } catch (pdfErr) {
    console.error(`[PolicyDocumentProcessor] Error parsing PDF ${absolutePath}:`, pdfErr);
  }
  return '';
}

/**
 * Processes an uploaded PDF policy document, extracts full text from PDF,
 * updates content_text in the database, and generates vector embeddings via EmbeddingGemma.
 * 
 * @param {object} policy - Database policy record
 * @returns {Promise<object|null>} - Indexing result metadata or null on error
 */
async function processAndIndexPolicy(policy) {
  if (!policy || !policy.policy_id) return null;

  try {
    let extractedPdfText = '';

    // 1. Extract text directly from uploaded PDF if document_url exists
    if (policy.document_url) {
      const absolutePath = path.isAbsolute(policy.document_url)
        ? policy.document_url
        : path.join(__dirname, '../../', policy.document_url);

      if (fs.existsSync(absolutePath)) {
        const fileExt = path.extname(absolutePath).toLowerCase();
        if (fileExt === '.pdf') {
          extractedPdfText = await extractPdfText(absolutePath);
        }
      }
    }

    // 2. Combine PDF text + HTML content text (or fallback to existing content_text)
    let fullContentText = extractedPdfText;
    const existingContentText = (policy.content_text || '').trim();

    if (!fullContentText) {
      fullContentText = existingContentText;
    } else if (existingContentText && !fullContentText.includes(existingContentText)) {
      // Append HTML text overview if not already included in PDF text
      fullContentText = `${fullContentText}\n\n${existingContentText}`;
    }

    // 3. Update database record with the full extracted text
    if (fullContentText && fullContentText !== policy.content_text) {
      await query(
        `UPDATE hr_policies SET content_text = $1, updated_at = NOW() WHERE policy_id = $2`,
        [fullContentText, policy.policy_id]
      );
      policy.content_text = fullContentText;
    }

    // 4. Trigger Vector Chunking & Embedding Indexing
    const indexResult = await indexPolicy(policy);
    console.log(`[PolicyDocumentProcessor] Policy ${policy.policy_id} ("${policy.title}") indexed successfully with ${indexResult.chunksIndexed} chunks.`);
    return indexResult;

  } catch (error) {
    console.error(`[PolicyDocumentProcessor] Indexing failed for policy ${policy.policy_id}:`, error);

    // Safe status update: mark ai_status as failed in DB without throwing error
    try {
      await query(
        `UPDATE hr_policies SET ai_status = 'failed', updated_at = NOW() WHERE policy_id = $1`,
        [policy.policy_id]
      );
    } catch (dbErr) {
      console.error('[PolicyDocumentProcessor] Failed to set ai_status to failed:', dbErr);
    }

    return null;
  }
}

module.exports = {
  processAndIndexPolicy
};
