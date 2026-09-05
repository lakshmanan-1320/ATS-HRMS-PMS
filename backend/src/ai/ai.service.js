/**
 * ai.service.js
 *
 * Production-Ready HRMS AI Chatbot Orchestrator
 *
 * Pipeline:
 * req.user
 *   → Pre-retrieval Security Guard (prompt injection, sensitive query check)
 *   → Authenticated Employee Context (resolveEmployeeContext)
 *   → Semantic Query Understanding (classifyIntent → understandQuery)
 *   → Role Scope Authorization (validateRoleAccess)
 *   → Query Planner (createPlan → mode: LIVE_DB / POLICY_RAG / HYBRID / CONVERSATIONAL / CLARIFICATION / SAFE_FALLBACK)
 *   → Data Source Router (routeAndFetch → parallel DB + RAG where needed)
 *   → LLM Reasoning (Gemma — only for POLICY_RAG and HYBRID, never for LIVE_DB)
 *   → Answer Validation & Formatting
 *   → Structured Client Response
 *
 * KEY INVARIANTS:
 * - The LLM NEVER decides authorization. Authorization happens BEFORE data retrieval.
 * - LIVE_DB questions never call Gemma — direct DB answers in < 20ms.
 * - Policy-only questions never include employee PII in the Gemma prompt.
 * - Missing policy is reported honestly — never substituted with general knowledge.
 * - All errors produce structured error codes — never "Session expired" for data errors.
 */

'use strict';

const crypto = require('crypto');
const logger = require('../config/logger');
const { resolveEmployeeContext } = require('./employeeContext.service');
const {
  isPotentialPromptInjection,
  isUnauthorizedSensitiveQuery,
  validateRoleAccess,
} = require('./security/aiAuthorization.service');
const { classifyIntent } = require('./orchestrator/intentClassifier.service');
const { createPlan } = require('./orchestrator/queryPlanner.service');
const { routeAndFetch } = require('./orchestrator/dataSourceRouter.service');
const {
  formatDeterministicAnswer,
  formatConversationalAnswer,
  formatClarificationAnswer,
  formatSafeFallbackAnswer,
  sanitizeLlmAnswer,
  getSuggestedQuestions,
} = require('./orchestrator/answerValidator.service');
const { buildUserAwareHRPrompt } = require('./llm/prompt.service');
const gemmaService = require('./llm/gemma.service');
const { logAIPipeline, logSecurityBlock, logGemmaFallback } = require('./utils/aiLogger');

function _ms(t) {
  return Math.round(performance.now() - t);
}

/**
 * Builds a specific "policy not found" message based on what was searched for.
 * Never returns generic business knowledge — always clearly states the policy
 * does not contain this information.
 */
function _missingPolicyAnswer(intentResult = {}) {
  const topic = intentResult.policyTopic || intentResult.domain || '';
  const category = intentResult.policyCategory || '';

  const topicLabels = {
    overtime: 'an overtime or extra-hours policy',
    probation: 'probation period rules',
    regularization: 'attendance regularization rules',
    remote_work: 'a work-from-home or remote work policy',
    security: 'IT or data security rules',
    bonus: 'bonus or incentive eligibility criteria',
    leave: 'leave rules',
    working_hours: 'working hours rules',
    carry_forward: 'leave carry-forward or encashment rules',
    conduct: 'a code of conduct or workplace ethics policy',
  };

  const label = topicLabels[topic] || (category ? `${category} policy rules` : 'this HR policy topic');
  return `The available company policy documents do not currently contain ${label}. Please contact HR directly for this information.`;
}

/**
 * Main chat orchestration function.
 * @param {object} body - { message, category, history }
 * @param {object} user - Authenticated req.user payload
 * @returns {Promise<object>} Structured API response
 */
async function chat(body = {}, user = {}) {
  const t0 = performance.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  const perf = {};

  const rawMessage = body.message || body.question || '';
  const message = String(rawMessage).trim().replace(/\s+/g, ' ');
  const history = Array.isArray(body.history) ? body.history : [];
  const category = body.category || null;

  // Normalize user fields from JWT payload variants
  const normalizedUser = {
    ...user,
    organizationId: user.organizationId || user.organization_id || null,
    userId: user.userId || user.user_id || user.id || null,
    employeeId: user.employeeId || user.employee_id || null,
    role: user.role || 'employee',
  };

  // ── 1. Input Validation ────────────────────────────────────────────────────
  if (!message) {
    return _errorResponse('AI_EMPTY_MESSAGE', 'Please type a question to get started.', 400);
  }
  if (!normalizedUser.organizationId) {
    return _errorResponse('AI_NO_ORG_CONTEXT', 'Organization context is required. Please log in again.', 401);
  }

  // ── 2. Prompt Injection Guard ──────────────────────────────────────────────
  if (isPotentialPromptInjection(message)) {
    logSecurityBlock({
      requestId, userId: normalizedUser.userId,
      organizationId: normalizedUser.organizationId,
      role: normalizedUser.role, reason: 'PROMPT_INJECTION',
    });
    return _buildResponse({
      question: message,
      answer: 'I can only assist with your HRMS records and official company HR policies.',
      intent: 'SECURITY_BLOCKED', sources: [], dataSources: [],
      suggestedQuestions: [], perf, t0,
    });
  }

  // ── 3. Resolve Authenticated Employee Context ──────────────────────────────
  const tContext = performance.now();
  let context;
  try {
    context = await resolveEmployeeContext(normalizedUser);
  } catch (ctxErr) {
    logger.error(`[AI:${requestId}] Context resolution error:`, ctxErr.message);
    return _errorResponse('AI_CONTEXT_ERROR', 'Unable to retrieve your employee record. Please try again.', 500);
  }
  perf.contextMs = _ms(tContext);

  if (context.isSuperAdminNoOrg || !context.organizationId) {
    return _buildResponse({
      question: message,
      answer: 'An organization context is required to answer HR inquiries.',
      intent: 'OUT_OF_SCOPE', sources: [], dataSources: [], suggestedQuestions: [], perf, t0,
    });
  }

  const organizationId = context.organizationId;
  const role = (normalizedUser.role || context.role || 'employee').toLowerCase();

  // ── 4. Sensitive Field Access Guard ───────────────────────────────────────
  if (isUnauthorizedSensitiveQuery(message, role)) {
    logSecurityBlock({
      requestId, userId: normalizedUser.userId,
      organizationId, role, reason: 'UNAUTHORIZED_SENSITIVE_QUERY',
    });
    return _buildResponse({
      question: message,
      answer: 'I can only provide HR information authorized for your role. Sensitive data for other employees is not accessible.',
      intent: 'UNAUTHORIZED', sources: [], dataSources: [],
      suggestedQuestions: getSuggestedQuestions('POLICY_GENERAL'), perf, t0,
    });
  }

  // ── 5. Semantic Query Understanding ───────────────────────────────────────
  const tIntent = performance.now();
  const intentResult = classifyIntent(message, history, {
    role, employeeId: context.employeeId, organizationId: context.organizationId,
  });
  perf.intentMs = _ms(tIntent);
  const { intent } = intentResult;

  logger.info(`[AI:${requestId}] intent=${intent} domain=${intentResult.domain} liveData=${intentResult.requiresLiveData} policy=${intentResult.requiresPolicyData || intentResult.requiresPolicy} role=${role}`);

  // ── 6. Role Scope Authorization ───────────────────────────────────────────
  const access = validateRoleAccess(context, intent);
  if (!access.allowed) {
    return _buildResponse({
      question: message,
      answer: access.reason || 'You are not authorized to access this HRMS data.',
      intent: 'UNAUTHORIZED', sources: [], dataSources: [],
      suggestedQuestions: getSuggestedQuestions('POLICY_GENERAL'), perf, t0,
    });
  }

  // ── 7. Query Planning ──────────────────────────────────────────────────────
  const plan = createPlan(intentResult, context);

  // ── 8. Fast Paths (no DB or LLM needed) ───────────────────────────────────
  if (plan.mode === 'CLARIFICATION') {
    return _buildResponse({
      question: message,
      answer: formatClarificationAnswer(plan.clarificationPrompt),
      intent, sources: [], dataSources: [],
      suggestedQuestions: getSuggestedQuestions('POLICY_LEAVE'),
      context, perf, t0,
    });
  }

  if (plan.mode === 'CONVERSATIONAL') {
    return _buildResponse({
      question: message,
      answer: formatConversationalAnswer(),
      intent, sources: [], dataSources: [],
      suggestedQuestions: getSuggestedQuestions('GENERAL_CHAT'),
      context, perf, t0,
    });
  }

  if (plan.mode === 'SAFE_FALLBACK') {
    return _buildResponse({
      question: message,
      answer: formatSafeFallbackAnswer(),
      intent, sources: [], dataSources: [],
      suggestedQuestions: getSuggestedQuestions('POLICY_GENERAL'),
      context, perf, t0,
    });
  }

  // ── 9. Data Retrieval (DB + RAG in parallel where needed) ─────────────────
  const { liveData, policyChunks } = await routeAndFetch(plan, {
    context, intentResult, message, category, perf,
  });

  // ── 10. MODE A: LIVE_DB — Direct DB answer, skip LLM entirely ─────────────
  if (plan.mode === 'LIVE_DB') {
    const answer = formatDeterministicAnswer(intent, liveData, context);
    perf.totalMs = _ms(t0);

    logAIPipeline({
      requestId, userId: context.userId, organizationId, role,
      intent, mode: 'A', perf, chunksRetrieved: 0, gemmaUsed: false, success: true,
    });

    return _buildResponse({
      question: message, answer, intent,
      sources: [{ type: 'hrms', sourceType: 'EMPLOYEE_DATA', dataType: intent.toLowerCase(), label: 'Live HRMS Record' }],
      dataSources: ['HRMS'],
      suggestedQuestions: getSuggestedQuestions(intent),
      context, perf, t0, usedLlm: false,
    });
  }

  // ── 11. MODE B & C: LLM Reasoning (Policy RAG or Hybrid) ──────────────────
  const isPolicyOnly = plan.mode === 'POLICY_RAG';

  // Format employee data text — omit from POLICY_RAG prompts
  let employeeDataText = '';
  if (!isPolicyOnly && liveData) {
    employeeDataText = formatDeterministicAnswer(intent, liveData, context);
    // Avoid passing error text as employee data
    if (liveData.error || liveData.noEmployeeRecord) {
      employeeDataText = '';
    }
  }

  // Handle missing policy chunks
  if (isPolicyOnly && (!policyChunks || policyChunks.length === 0)) {
    perf.totalMs = _ms(t0);
    return _buildResponse({
      question: message,
      answer: _missingPolicyAnswer(intentResult),
      intent, sources: [], dataSources: [],
      suggestedQuestions: getSuggestedQuestions(intent),
      context, perf, t0, usedLlm: false,
    });
  }

  if (plan.mode === 'HYBRID' && (!policyChunks || policyChunks.length === 0)) {
    // Hybrid but no policy found — return employee data alone with a note
    const empAnswer = employeeDataText || formatDeterministicAnswer(intent, liveData, context);
    const policyNote = _missingPolicyAnswer(intentResult);
    perf.totalMs = _ms(t0);
    return _buildResponse({
      question: message,
      answer: empAnswer ? `${empAnswer}\n\n*Note: ${policyNote}*` : policyNote,
      intent,
      sources: liveData ? [{ type: 'hrms', sourceType: 'EMPLOYEE_DATA', dataType: intent.toLowerCase(), label: 'Live HRMS Record' }] : [],
      dataSources: liveData ? ['HRMS'] : [],
      suggestedQuestions: getSuggestedQuestions(intent),
      context, perf, t0, usedLlm: false,
    });
  }

  const topChunks = (policyChunks || []).slice(0, 3);

  // Build grounded prompt — employee identity EXCLUDED from policy-only prompts
  const prompt = buildUserAwareHRPrompt({
    question: message,
    policyChunks: topChunks,
    employeeDataText,
    user: {
      role,
      // Only pass employee identity fields when NOT in policy-only mode
      fullName: isPolicyOnly ? null : context.fullName,
      designation: isPolicyOnly ? null : context.designation,
      departmentName: isPolicyOnly ? null : context.departmentName,
      dateOfJoining: isPolicyOnly ? null : context.dateOfJoining,
    },
    conversationContext: history,
    mode: plan.mode,
  });

  // ── LLM Generation ─────────────────────────────────────────────────────────
  const tGemma = performance.now();
  let rawCompletion = '';
  let gemmaFailed = false;

  try {
    rawCompletion = await gemmaService.generateCompletion(prompt, {
      timeoutMs: 60000,
      num_predict: 220,
      num_ctx: 1536,
    });
    perf.gemmaMs = _ms(tGemma);
  } catch (err) {
    perf.gemmaMs = _ms(tGemma);
    gemmaFailed = true;
    const reason = err.message.includes('timed out') ? 'TIMEOUT' : 'GENERATION_ERROR';
    logGemmaFallback({ requestId, organizationId, intent, reason });
    logger.error(`[AI:${requestId}] Gemma error (${reason}):`, err.message);
  }

  let finalAnswer = (rawCompletion || '').trim();

  if (gemmaFailed || !finalAnswer) {
    // Graceful degradation — return verified data we already have
    if (employeeDataText) {
      finalAnswer = `${employeeDataText}\n\n*Note: The policy explanation service is temporarily unavailable.*`;
    } else if (topChunks.length > 0) {
      const quotes = topChunks.slice(0, 2).map((c) => {
        const sec = c.sectionRef ? `${c.sectionRef}: ` : '';
        return `• **${c.policyTitle || 'Company Policy'}** (${sec})\n"${String(c.chunkText || '').slice(0, 300).trim()}"`;
      }).join('\n\n');
      finalAnswer = `According to the available company policy:\n\n${quotes}`;
    } else {
      finalAnswer = 'The HR assistant is temporarily unavailable. Please try again in a moment.';
    }
  } else {
    finalAnswer = sanitizeLlmAnswer(finalAnswer);
  }

  perf.totalMs = _ms(t0);

  logAIPipeline({
    requestId, userId: context.userId, organizationId, role,
    intent, mode: plan.mode === 'HYBRID' ? 'C' : 'B',
    perf, chunksRetrieved: policyChunks.length,
    gemmaUsed: !gemmaFailed, success: true,
  });

  // Deduplicate policy sources
  const seenKeys = new Set();
  const policySources = (policyChunks || [])
    .filter((c) => {
      const key = `${c.policyId || c.policyTitle}:${c.sectionRef || c.chunkIndex}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    })
    .map((c) => ({
      type: 'policy',
      sourceType: 'POLICY',
      policyId: c.policyId,
      policyTitle: c.policyTitle,
      category: c.category,
      policyVersion: c.policyVersion,
      effectiveFrom: c.effectiveFrom,
      section: c.sectionRef,
      chunkIndex: c.chunkIndex || 0,
      similarity: Number(c.similarity || 0),
    }));

  const sources = [
    ...policySources,
    ...(liveData && !liveData.error && !liveData.noEmployeeRecord
      ? [{ type: 'hrms', sourceType: 'EMPLOYEE_DATA', dataType: intent.toLowerCase(), label: 'Live HRMS Record' }]
      : []),
  ];

  const dataSources = [
    ...(policyChunks.length ? ['HR Policy'] : []),
    ...(liveData && !liveData.error ? ['HRMS'] : []),
  ];

  return _buildResponse({
    question: message, answer: finalAnswer, intent,
    sources, dataSources,
    suggestedQuestions: getSuggestedQuestions(intent),
    context, perf, t0, usedLlm: !gemmaFailed,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Response builders
// ─────────────────────────────────────────────────────────────────────────────

function _buildResponse(params) {
  const {
    question, answer, intent, sources, dataSources,
    suggestedQuestions, context, perf, t0, usedLlm = false,
  } = params;
  return {
    success: true,
    question,
    answer,
    intent,
    sources: sources || [],
    dataSources: dataSources || [],
    suggestedQuestions: suggestedQuestions || [],
    employee: context?.isEmployee
      ? {
          employeeCode: context.employeeCode,
          fullName: context.fullName,
          designation: context.designation,
        }
      : null,
    metrics: { ...perf, totalMs: _ms(t0) },
    metadata: { usedLlm, latencyMs: _ms(t0) },
  };
}

function _errorResponse(code, message, statusHint = 500) {
  return {
    success: false,
    code,
    message,
    statusHint,
    sources: [],
    dataSources: [],
    suggestedQuestions: [],
    metrics: {},
    metadata: { usedLlm: false },
  };
}

module.exports = {
  chat,
};
