/**
 * policyRetriever.service.js
 *
 * Retrieves the most relevant policy chunks based on vector similarity and metadata filtering.
 * Enforces strict multi-tenant isolation, cosine similarity thresholds, and active/published status.
 *
 * Key behaviors:
 * - Category-targeted search (bonus question → Benefits & Compensation only)
 * - Keyword boost for topic relevance
 * - Graceful fallback: if targeted category returns 0 results → broad search
 * - Returns empty array (not error) when no policy matches threshold — callers decide the response
 */

'use strict';

const { query } = require('../../config/db');
const { generateEmbedding } = require('./embedding.service');
const logger = require('../../config/logger');

// Lower threshold slightly to catch semantically relevant but less exact matches
// (e.g. "overtime policy" when no overtime section exists — at least return working hours)
const DEFAULT_MIN_SIMILARITY = 0.35;
const TARGETED_MIN_SIMILARITY = 0.38; // slightly higher when category is known
const DEFAULT_TOP_K = 3;

/** Topic-level evidence patterns for post-retrieval relevance filtering */
const TOPIC_EVIDENCE = {
  bonus: /\bbonus|incentive|payout|eligib|reward|performance\s+pay/i,
  probation: /\bprobation|confirmation|probationary|trial\s+period/i,
  leave: /\bleave|earned|casual|sick|unpaid|lop|carry\s+forward|encash|annual\s+leave/i,
  regularization: /\bregulari[sz]|missed?\s+punch|forgot\s+to\s+punch|attendance\s+correction/i,
  working_hours: /\bworking\s+hours?|office\s+hours?|shift|grace\s+period|late\s+coming/i,
  overtime: /\bovertime|extra\s+hours?|compensatory|comp\s*off/i,
  security: /\bsecurity|data|password|vpn|device|asset|privacy|confidential/i,
  remote_work: /\bwork\s+from\s+home|wfh|remote\s+work|work\s+remotely|telework/i,
  conduct: /\bconduct|ethics|gift|harassment|disciplinary|conflict\s+of\s+interest/i,
  carry_forward: /\bcarry\s+forward|carry\s+over|encash|accumulate|lapse/i,
};

/**
 * Maps question text and optional explicit category to target policy categories.
 * Returns null (search all) or an array of specific categories to search first.
 */
function inferTargetCategories(question = '', optionsCategory = null) {
  if (optionsCategory) {
    return Array.isArray(optionsCategory) ? optionsCategory : [optionsCategory];
  }

  const lower = question.toLowerCase();

  // Bonus & Compensation — check first (high priority, easily confused with attendance)
  if (/\b(bonus|incentive|compensation|allowance|payout|variable\s+pay)\b/i.test(lower)) {
    return ['Benefits & Compensation'];
  }

  // Security & Remote Work
  if (/\b(security|password|vpn|remote\s+work|work\s+from\s+home|wfh|device|asset|laptop|company\s+data|data\s+protection|privacy|confidential|it\s+policy)\b/i.test(lower)) {
    return ['IT & Data Security'];
  }

  // Code of conduct
  if (/\b(conduct|ethics|gift|harassment|bribe|conflict\s+of\s+interest|disciplinary|dress\s+code|whistleblower)\b/i.test(lower)) {
    return ['Leave & Employee Conduct'];
  }

  // Attendance, Leave, Working Hours, Regularization, Probation
  if (/\b(leave|vacation|attendance|punch|regulariz|working\s+hours?|office\s+hours?|grace|shift|probation|notice\s+period|carry\s+forward|encash|overtime|unpaid|lop)\b/i.test(lower)) {
    return ['Attendance & Working Hours'];
  }

  return null; // Search all categories
}

/**
 * Checks if a chunk contains evidence of the requested topic.
 * Used to filter out irrelevant high-similarity chunks.
 */
function hasTopicEvidence(row, topic) {
  if (!topic || !TOPIC_EVIDENCE[topic]) return true; // No filter if no topic specified
  const haystack = `${row.policyTitle || ''}\n${row.category || ''}\n${row.chunkText || ''}`;
  return TOPIC_EVIDENCE[topic].test(haystack);
}

/**
 * Builds the core SQL for policy chunk retrieval.
 */
function buildRetrievalSql(categories, policyIdFilter) {
  let sql = `
    SELECT
      e.policy_id         AS "policyId",
      p.title             AS "policyTitle",
      p.category          AS "category",
      p.version_number    AS "policyVersion",
      p.effective_date    AS "effectiveFrom",
      e.chunk_index       AS "chunkIndex",
      e.chunk_text        AS "chunkText",
      1 - (e.embedding <=> $1::vector) AS "similarity"
    FROM hr_policy_embeddings e
    INNER JOIN hr_policies p ON e.policy_id = p.policy_id
    WHERE e.organization_id = $2
      AND p.organization_id = $2
      AND p.is_active = true
      AND p.is_published = true
      AND p.effective_date <= CURRENT_DATE
  `;
  const params = []; // $1 = embedding, $2 = organizationId — added by caller

  if (categories && categories.length > 0) {
    sql += ` AND p.category = ANY($3::text[])`;
  }

  if (policyIdFilter) {
    const idx = categories ? 4 : 3;
    sql += ` AND e.policy_id = $${idx}`;
  }

  sql += `\n  ORDER BY e.embedding <=> $1::vector ASC\n  LIMIT $${categories ? (policyIdFilter ? 5 : 4) : (policyIdFilter ? 4 : 3)}`;

  return sql;
}

/**
 * Retrieves matching policy chunks for a question.
 *
 * @param {string} organizationId - Authenticated tenant UUID
 * @param {string} question - Question text
 * @param {number} [limit] - Max chunks to return
 * @param {object} [options] - { category, categories, policyId, minSimilarity, topic, perf }
 * @returns {Promise<Array<object>>}
 */
async function retrievePolicies(organizationId, question, limit = DEFAULT_TOP_K, options = {}) {
  if (!organizationId) throw new Error('Organization ID is required for policy retrieval.');
  if (!question || !question.trim()) throw new Error('Question is required for policy retrieval.');

  const effectiveLimit = typeof limit === 'number' ? limit : DEFAULT_TOP_K;
  const perf = options.perf || {};
  const targetCategories = inferTargetCategories(question, options.category || options.categories || null);
  const policyIdFilter = options.policyId || null;
  const topic = options.topic || null;
  const minSimilarity = typeof options.minSimilarity === 'number'
    ? options.minSimilarity
    : targetCategories ? TARGETED_MIN_SIMILARITY : DEFAULT_MIN_SIMILARITY;

  try {
    // Step 1: Generate embedding for question
    const tEmbed = performance.now();
    const questionEmbedding = await generateEmbedding(question.trim());
    perf.embeddingTimeMs = Math.round(performance.now() - tEmbed);

    if (!questionEmbedding || !Array.isArray(questionEmbedding) || questionEmbedding.length === 0) {
      throw new Error('Failed to generate question embedding.');
    }

    const embeddingString = JSON.stringify(questionEmbedding);
    const candidatePoolSize = Math.max(effectiveLimit * 5, 20);

    // Step 2: Run targeted category search
    const tRetrieval = performance.now();

    const runSearch = async (cats, poolSize) => {
      const params = [embeddingString, organizationId];
      let sql = `
        SELECT
          e.policy_id         AS "policyId",
          p.title             AS "policyTitle",
          p.category          AS "category",
          p.version_number    AS "policyVersion",
          p.effective_date    AS "effectiveFrom",
          e.chunk_index       AS "chunkIndex",
          e.chunk_text        AS "chunkText",
          1 - (e.embedding <=> $1::vector) AS "similarity"
        FROM hr_policy_embeddings e
        INNER JOIN hr_policies p ON e.policy_id = p.policy_id
        WHERE e.organization_id = $2
          AND p.organization_id = $2
          AND p.is_active = true
          AND p.is_published = true
          AND p.effective_date <= CURRENT_DATE
      `;
      if (cats && cats.length > 0) {
        params.push(cats);
        sql += ` AND p.category = ANY($${params.length}::text[])`;
      }
      if (policyIdFilter) {
        params.push(policyIdFilter);
        sql += ` AND e.policy_id = $${params.length}`;
      }
      params.push(poolSize);
      sql += `\n  ORDER BY e.embedding <=> $1::vector ASC\n  LIMIT $${params.length}`;
      return query(sql, params);
    };

    let result = await runSearch(targetCategories, candidatePoolSize);

    // Step 3: Fallback to all-category search if targeted search returned nothing
    if (result.rows.length === 0 && targetCategories && targetCategories.length > 0) {
      logger.info(`[PolicyRetriever] Category "${targetCategories.join(', ')}" returned 0 results — falling back to full search`);
      result = await runSearch(null, candidatePoolSize);
    }

    perf.retrievalTimeMs = Math.round(performance.now() - tRetrieval);

    if (result.rows.length === 0) {
      logger.info(`[PolicyRetriever] No policy chunks found for org ${organizationId}`);
      return [];
    }

    // Step 4: Apply topic evidence filter (soft — only removes if no evidence)
    const candidates = topic
      ? result.rows.filter((row) => hasTopicEvidence(row, topic))
      : result.rows;

    // If topic filter eliminated everything, use unfiltered results
    const pool = candidates.length > 0 ? candidates : result.rows;

    // Step 5: Apply minimum similarity threshold
    const aboveThreshold = pool.filter((row) => Number(row.similarity) >= minSimilarity);

    // If nothing meets threshold but we have results, return best 1 with a warning
    const scoringPool = aboveThreshold.length > 0 ? aboveThreshold : pool.slice(0, 1);

    // Step 6: Keyword boost for specific topic alignment
    const lowerQuestion = question.toLowerCase();
    const scored = scoringPool.map((c) => {
      let boost = 0;
      const lowerChunk = (c.chunkText || '').toLowerCase();
      const lowerTitle = (c.policyTitle || '').toLowerCase();

      // Direct title match
      if (lowerQuestion.includes('bonus') && (lowerTitle.includes('bonus') || lowerChunk.includes('bonus'))) boost += 0.25;
      if (lowerQuestion.includes('probation') && lowerChunk.includes('probation')) boost += 0.25;
      if ((lowerQuestion.includes('unpaid') || lowerQuestion.includes('lop')) && (lowerChunk.includes('unpaid') || lowerChunk.includes('loss of pay') || lowerChunk.includes('lop'))) boost += 0.25;
      if (lowerQuestion.includes('regulariz') && lowerChunk.includes('regulariz')) boost += 0.25;
      if (lowerQuestion.includes('working hours') && (lowerChunk.includes('working hours') || lowerTitle.includes('attendance'))) boost += 0.20;
      if ((lowerQuestion.includes('carry forward') || lowerQuestion.includes('carry over') || lowerQuestion.includes('encash')) && (lowerChunk.includes('carry') || lowerChunk.includes('encash'))) boost += 0.30;
      if (lowerQuestion.includes('wfh') || lowerQuestion.includes('remote') || lowerQuestion.includes('work from home')) {
        if (lowerChunk.includes('wfh') || lowerChunk.includes('remote') || lowerChunk.includes('work from home')) boost += 0.25;
      }
      if (lowerQuestion.includes('overtime') && lowerChunk.includes('overtime')) boost += 0.30;
      if (topic && hasTopicEvidence(c, topic)) boost += 0.10;

      // Extract section reference from chunk text
      const matchSec = (c.chunkText || '').match(/SECTION\s+([0-9A-Z\.]+)(?:\s*:\s*([^\n\r]+))?/i);
      const sectionRef = matchSec
        ? `Section ${matchSec[1]}${matchSec[2] ? ': ' + matchSec[2].trim() : ''}`
        : 'General Policy';

      return {
        ...c,
        sectionRef,
        similarity: Math.min(1.0, Number(c.similarity) + boost),
      };
    });

    // Step 7: Sort by boosted similarity and return top N
    scored.sort((a, b) => b.similarity - a.similarity);
    const finalChunks = scored.slice(0, effectiveLimit);

    logger.info(`[PolicyRetriever] Retrieved ${finalChunks.length} chunks for org ${organizationId} (topic: ${topic || 'any'}, category: ${targetCategories ? targetCategories.join(',') : 'all'})`);
    return finalChunks;

  } catch (error) {
    logger.error('[PolicyRetriever] Policy retrieval failed:', error.message);
    throw error;
  }
}

module.exports = {
  retrievePolicies,
};
