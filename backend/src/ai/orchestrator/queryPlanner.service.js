/**
 * queryPlanner.service.js
 *
 * Creates an execution plan from the query understanding result.
 *
 * Routing logic is driven ENTIRELY by boolean flags (requiresLiveData, requiresPolicy)
 * from the semantic understanding layer — NOT by hardcoded intent sets.
 *
 * Modes:
 * A - LIVE_DB:        requiresLiveData=true,  requiresPolicy=false  → Direct DB, skip LLM
 * B - POLICY_RAG:     requiresLiveData=false, requiresPolicy=true   → Vector search + LLM
 * C - HYBRID:         requiresLiveData=true,  requiresPolicy=true   → Parallel DB+RAG + LLM
 * D - CONVERSATIONAL: greeting/small-talk                           → Instant response
 * E - CLARIFICATION:  ambiguous question                            → Ask for clarification
 * F - SAFE_FALLBACK:  genuinely out of HR scope                     → Polite out-of-scope
 *
 * IMPORTANT: UNKNOWN domain with HR policy keywords → POLICY_RAG (not SAFE_FALLBACK)
 * Only truly non-HR questions go to SAFE_FALLBACK.
 */

'use strict';

/**
 * Creates an execution plan for a classified query.
 * @param {object} intentResult - From queryUnderstanding / intentClassifier
 * @param {object} context - Authenticated employee context
 * @returns {object} Execution plan { mode, useLlm, useDb, useRag, handler, clarificationPrompt? }
 */
function createPlan(intentResult, context) {
  const {
    intent,
    requiresLiveData,
    requiresPolicyData,  // intentClassifier alias
    requiresPolicy,      // direct from understandQuery
    requiresClarification,
    clarificationPrompt,
    domain,
    confidence = 0.95,
  } = intentResult;

  // Normalize: intentClassifier uses requiresPolicyData, understandQuery uses requiresPolicy
  const needsPolicy = requiresPolicyData || requiresPolicy || false;
  const needsLiveData = requiresLiveData || false;

  // ── Mode E: Clarification
  if (requiresClarification) {
    return {
      mode: 'CLARIFICATION',
      useLlm: false, useDb: false, useRag: false,
      clarificationPrompt,
      handler: 'CLARIFICATION',
    };
  }

  // ── Mode D: Conversational / Greeting
  if (intent === 'GENERAL_CHAT' || domain === 'general_chat') {
    return {
      mode: 'CONVERSATIONAL',
      useLlm: false, useDb: false, useRag: false,
      handler: 'CONVERSATIONAL',
    };
  }

  // ── Mode C: Hybrid (live DB + policy RAG in parallel)
  if (needsLiveData && needsPolicy) {
    return {
      mode: 'HYBRID',
      useLlm: true, useDb: true, useRag: true,
      handler: intent,
    };
  }

  // ── Mode A: Pure Live DB (no LLM, sub-20ms)
  if (needsLiveData && !needsPolicy) {
    return {
      mode: 'LIVE_DB',
      useLlm: false, useDb: true, useRag: false,
      handler: intent,
    };
  }

  // ── Mode B: Pure Policy RAG + LLM
  if (!needsLiveData && needsPolicy) {
    return {
      mode: 'POLICY_RAG',
      useLlm: true, useDb: false, useRag: true,
      handler: intent,
    };
  }

  // ── UNKNOWN with low confidence but came from POLICY_GENERAL →
  //    attempt broad policy search rather than safe fallback
  if (intent === 'POLICY_GENERAL' || (domain === 'unknown' && needsPolicy)) {
    return {
      mode: 'POLICY_RAG',
      useLlm: true, useDb: false, useRag: true,
      handler: 'POLICY_GENERAL',
    };
  }

  // ── Mode F: Safe Fallback — genuinely out of scope
  //    (domain=unknown, no live data needed, no policy intent)
  if (intent === 'UNKNOWN' || domain === 'unknown') {
    return {
      mode: 'SAFE_FALLBACK',
      useLlm: false, useDb: false, useRag: false,
      handler: 'SAFE_FALLBACK',
    };
  }

  // ── Default: attempt broad policy search for anything unresolved
  return {
    mode: 'POLICY_RAG',
    useLlm: true, useDb: false, useRag: true,
    handler: 'POLICY_GENERAL',
  };
}

module.exports = {
  createPlan,
};
