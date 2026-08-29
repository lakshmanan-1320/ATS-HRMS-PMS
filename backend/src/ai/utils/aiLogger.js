/**
 * utils/aiLogger.js
 * Structured performance and audit logger for the HRMS AI chatbot pipeline.
 *
 * Logs: requestId, userId, orgId, role, intent, per-stage latency, chunk counts.
 * Does NOT log: JWTs, passwords, PII, full HR records, prompt content.
 */

const logger = require('../../config/logger');

/**
 * Logs the complete AI pipeline performance summary.
 *
 * @param {object} params
 * @param {string} params.requestId       - Unique request identifier
 * @param {string} params.userId          - Authenticated user ID (no PII)
 * @param {string} params.organizationId  - Tenant organization ID
 * @param {string} params.role            - User role
 * @param {string} params.intent          - Detected intent
 * @param {string} params.mode            - Response mode: A | B | C | BLOCKED
 * @param {object} params.perf            - Per-stage timing in ms
 * @param {number} [params.chunksRetrieved] - Number of policy chunks retrieved
 * @param {boolean} [params.gemmaUsed]    - Whether Gemma was called
 * @param {boolean} [params.success]      - Whether the request succeeded
 * @param {string} [params.error]         - Error type if failed (no stack trace)
 */
function logAIPipeline({
  requestId,
  userId,
  organizationId,
  role,
  intent,
  mode,
  perf = {},
  chunksRetrieved = 0,
  gemmaUsed = false,
  success = true,
  error = null,
}) {
  const parts = [
    `[AI]`,
    `req=${requestId || 'n/a'}`,
    `org=${organizationId || 'n/a'}`,
    `role=${role || 'unknown'}`,
    `intent=${intent || 'UNKNOWN'}`,
    `mode=${mode || '?'}`,
  ];

  // Per-stage timings
  if (perf.contextMs !== undefined)    parts.push(`context=${perf.contextMs}ms`);
  if (perf.intentMs !== undefined)     parts.push(`intent=${perf.intentMs}ms`);
  if (perf.employeeQueryMs !== undefined) {
    parts.push(`employeeQuery=${perf.employeeQueryMs}ms`);
  } else {
    parts.push(`employeeQuery=skipped`);
  }
  if (perf.embeddingMs !== undefined) {
    parts.push(`embedding=${perf.embeddingMs}ms`);
  } else {
    parts.push(`embedding=skipped`);
  }
  if (perf.retrievalMs !== undefined) {
    parts.push(`retrieval=${perf.retrievalMs}ms chunks=${chunksRetrieved}`);
  } else {
    parts.push(`retrieval=skipped`);
  }
  if (gemmaUsed && perf.gemmaMs !== undefined) {
    parts.push(`gemma=${perf.gemmaMs}ms`);
  } else {
    parts.push(`gemma=skipped`);
  }
  if (perf.totalMs !== undefined) parts.push(`total=${perf.totalMs}ms`);

  if (!success && error) parts.push(`error=${error}`);

  const line = parts.join(' | ');

  if (success) {
    logger.info(line);
  } else {
    logger.warn(line);
  }
}

/**
 * Logs a security/authorization block event.
 *
 * @param {object} params
 */
function logSecurityBlock({ requestId, userId, organizationId, role, reason }) {
  logger.warn(
    `[AI:BLOCKED] req=${requestId || 'n/a'} | org=${organizationId || 'n/a'} | role=${role || 'unknown'} | reason=${reason || 'UNAUTHORIZED'}`
  );
}

/**
 * Logs a Gemma fallback (timeout / generation failure).
 *
 * @param {object} params
 */
function logGemmaFallback({ requestId, organizationId, intent, reason }) {
  logger.warn(
    `[AI:GEMMA_FALLBACK] req=${requestId || 'n/a'} | org=${organizationId || 'n/a'} | intent=${intent || 'UNKNOWN'} | reason=${reason || 'TIMEOUT'}`
  );
}

module.exports = {
  logAIPipeline,
  logSecurityBlock,
  logGemmaFallback,
};
