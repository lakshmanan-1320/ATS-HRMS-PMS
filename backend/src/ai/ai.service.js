/**
 * ai.service.js
 * Production-Ready HRMS AI Chatbot Orchestrator
 *
 * Flow:
 * Authenticated User -> Pre-retrieval Security Guard -> Context Resolver ->
 * Intent Classifier -> Query Planner -> Data Source Router -> LLM Synthesis (if planned) ->
 * Answer Validator -> Client Response
 */

'use strict';

const crypto = require('crypto');
const logger = require('../config/logger');
const { resolveEmployeeContext } = require('./employeeContext.service');
const { isPotentialPromptInjection, isUnauthorizedSensitiveQuery, validateRoleAccess } = require('./security/aiAuthorization.service');
const { classifyIntent } = require('./orchestrator/intentClassifier.service');
const { createPlan } = require('./orchestrator/queryPlanner.service');
const { routeAndFetch } = require('./orchestrator/dataSourceRouter.service');
const { formatDeterministicAnswer, formatConversationalAnswer, sanitizeLlmAnswer, getSuggestedQuestions } = require('./orchestrator/answerValidator.service');
const { buildUserAwareHRPrompt } = require('./llm/prompt.service');
const gemmaService = require('./llm/gemma.service');
const { logAIPipeline, logSecurityBlock, logGemmaFallback } = require('./utils/aiLogger');

function _ms(t) {
  return Math.round(performance.now() - t);
}

/**
 * Main chat orchestration function.
 * @param {object} body - Request body containing message, category, history
 * @param {object} user - Authenticated user payload from req.user
 * @returns {Promise<object>} Standard API response
 */
async function chat(body = {}, user = {}) {
  const t0 = performance.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  const perf = {};

  const rawMessage = body.message || body.question || '';
  const message = String(rawMessage).trim().replace(/\s+/g, ' ');
  const history = Array.isArray(body.history) ? body.history : [];
  const category = body.category || null;

  const normalizedUser = {
    ...user,
    organizationId: user.organizationId || user.organization_id || null,
    userId: user.userId || user.user_id || user.id || null,
    employeeId: user.employeeId || user.employee_id || null,
    role: user.role || 'employee',
  };

  // ── 1. Input Validation ────────────────────────────────────────────────────
  if (!message) {
    throw new Error('Message is required.');
  }
  if (!normalizedUser.organizationId) {
    throw new Error('Authentication and organization context are required.');
  }

  // ── 2. Pre-Retrieval Security: Prompt Injection Guard ──────────────────────
  if (isPotentialPromptInjection(message)) {
    logSecurityBlock({
      requestId,
      userId: normalizedUser.userId,
      organizationId: normalizedUser.organizationId,
      role: normalizedUser.role,
      reason: 'PROMPT_INJECTION',
    });
    return _buildResponse({
      question: message,
      answer: 'I can only assist with verified HRMS records and company HR policies. I cannot process this request.',
      intent: 'SECURITY_BLOCKED',
      sources: [],
      dataSources: [],
      suggestedQuestions: getSuggestedQuestions('GENERAL_CHAT'),
      perf,
      t0,
    });
  }

  // ── 3. Resolve Tenant & Employee Context ───────────────────────────────────
  const tContext = performance.now();
  const context = await resolveEmployeeContext(normalizedUser);
  perf.contextMs = _ms(tContext);

  if (context.isSuperAdminNoOrg || !context.organizationId) {
    return _buildResponse({
      question: message,
      answer: 'An organization context is required to answer HR inquiries.',
      intent: 'OUT_OF_SCOPE',
      sources: [],
      dataSources: [],
      suggestedQuestions: [],
      perf,
      t0,
    });
  }

  const organizationId = context.organizationId;
  const role = (user.role || context.role || 'employee').toLowerCase();

  // ── 4. Pre-Retrieval Security: Sensitive Field Access Guard ────────────────
  if (isUnauthorizedSensitiveQuery(message, role)) {
    logSecurityBlock({
      requestId,
      userId: user.userId,
      organizationId,
      role,
      reason: 'UNAUTHORIZED_SENSITIVE_QUERY',
    });
    return _buildResponse({
      question: message,
      answer: 'I can only provide information authorized for your role. I cannot disclose another employee\'s compensation or details from another organization.',
      intent: 'UNAUTHORIZED',
      sources: [],
      dataSources: [],
      suggestedQuestions: getSuggestedQuestions('POLICY_GENERAL'),
      perf,
      t0,
    });
  }

  // ── 5. Intent Classification ───────────────────────────────────────────────
  const tIntent = performance.now();
  const intentResult = classifyIntent(message, history, {
    role,
    employeeId: context.employeeId,
    organizationId: context.organizationId,
  });
  perf.intentMs = _ms(tIntent);
  const { intent } = intentResult;

  // ── 6. Role Scope Validation ───────────────────────────────────────────────
  const access = validateRoleAccess(context, intent);
  if (!access.allowed) {
    return _buildResponse({
      question: message,
      answer: access.reason || 'You do not have permission to access this HRMS data.',
      intent: 'UNAUTHORIZED',
      sources: [],
      dataSources: [],
      suggestedQuestions: getSuggestedQuestions('POLICY_GENERAL'),
      perf,
      t0,
    });
  }

  // ── 7. Query Planning ──────────────────────────────────────────────────────
  const plan = createPlan(intentResult, context);

  logger.info(`[AI:${requestId}] intent=${intent} plan=${plan.mode} role=${role} org=${organizationId}`);

  // ── 8. Conversational Fast-Path (MODE D) ───────────────────────────────────
  if (plan.mode === 'CONVERSATIONAL') {
    perf.totalMs = _ms(t0);
    return _buildResponse({
      question: message,
      answer: formatConversationalAnswer(),
      intent,
      sources: [],
      dataSources: [],
      suggestedQuestions: getSuggestedQuestions('GENERAL_CHAT'),
      context,
      perf,
      t0,
    });
  }

  // ── 9. Data Retrieval (Data Source Router) ──────────────────────────────────
  const { liveData, policyChunks } = await routeAndFetch(plan, {
    context,
    intentResult,
    message,
    category,
    perf,
  });

  // ── 10. MODE A: Live DB Direct Answer (No Gemma) ───────────────────────────
  if (plan.mode === 'LIVE_DB') {
    const answer = formatDeterministicAnswer(intent, liveData, context);
    perf.totalMs = _ms(t0);

    logAIPipeline({
      requestId,
      userId: context.userId,
      organizationId,
      role,
      intent,
      mode: 'A',
      perf,
      chunksRetrieved: 0,
      gemmaUsed: false,
      success: true,
    });

    return _buildResponse({
      question: message,
      answer,
      intent,
      sources: [{ type: 'hrms', sourceType: 'EMPLOYEE_DATA', dataType: intent.toLowerCase(), label: 'Live HRMS Record' }],
      dataSources: ['HRMS'],
      suggestedQuestions: getSuggestedQuestions(intent),
      context,
      perf,
      t0,
      usedLlm: false,
    });
  }

  // ── 11. MODE B & C: LLM Reasoning (Policy RAG or Hybrid) ───────────────────
  let employeeDataText = '';
  if (liveData) {
    employeeDataText = formatDeterministicAnswer(intent, liveData, context);
  } else if (!context.isEmployee && plan.useDb) {
    employeeDataText = `Note: User is logged in as an Administrator (${role}) without a personal employee leave/attendance profile.`;
  }

  // If policy required but no policy chunks were found:
  if (plan.mode === 'POLICY_RAG' && (!policyChunks || policyChunks.length === 0)) {
    perf.totalMs = _ms(t0);
    return _buildResponse({
      question: message,
      answer: 'I could not find a published company policy addressing this question. Please contact HR for confirmation.',
      intent,
      sources: [],
      dataSources: ['HR Policy'],
      suggestedQuestions: getSuggestedQuestions(intent),
      context,
      perf,
      t0,
      usedLlm: false,
    });
  }

  const prompt = buildUserAwareHRPrompt({
    question: message,
    policyChunks,
    employeeDataText,
    user: {
      role,
      userId: context.userId,
      employeeId: context.employeeId,
      organizationId,
      email: context.email,
    },
    organizationId,
    conversationContext: history,
  });

  const tGemma = performance.now();
  let rawCompletion = '';
  let gemmaFailed = false;

  try {
    rawCompletion = await gemmaService.generateCompletion(prompt);
    perf.gemmaMs = _ms(tGemma);
  } catch (err) {
    perf.gemmaMs = _ms(tGemma);
    gemmaFailed = true;
    const reason = err.message.includes('timed out') ? 'TIMEOUT' : 'GENERATION_ERROR';
    logGemmaFallback({ requestId, organizationId, intent, reason });
    logger.error(`[AI:${requestId}] Gemma error:`, err.message);
  }

  let finalAnswer = (rawCompletion || '').trim();

  // Graceful Fallback if Gemma failed:
  if (gemmaFailed || !finalAnswer) {
    if (liveData) {
      finalAnswer = `${employeeDataText}\n\nNote: The policy explanation engine is temporarily busy. The above HRMS data is verified from your live records.`;
    } else if (policyChunks.length > 0) {
      finalAnswer = 'Relevant HR policy information was retrieved, but a generated summary is temporarily unavailable. Please refer to company HR policy documents or contact HR.';
    } else {
      finalAnswer = 'The HR assistant is temporarily unable to process this request. Please try again shortly.';
    }
  } else {
    finalAnswer = sanitizeLlmAnswer(finalAnswer, !!liveData);
  }

  perf.totalMs = _ms(t0);

  logAIPipeline({
    requestId,
    userId: context.userId,
    organizationId,
    role,
    intent,
    mode: plan.mode === 'HYBRID' ? 'C' : 'B',
    perf,
    chunksRetrieved: policyChunks.length,
    gemmaUsed: !gemmaFailed,
    success: true,
  });

  const sources = [
    ...policyChunks.map((c) => ({
      type: 'policy',
      sourceType: 'POLICY',
      policyId: c.policyId,
      policyTitle: c.policyTitle,
      category: c.category,
      chunkIndex: c.chunkIndex || 0,
      similarity: Number(c.similarity || 0),
      text: c.chunkText,
    })),
    ...(liveData ? [{ type: 'hrms', sourceType: 'EMPLOYEE_DATA', dataType: intent.toLowerCase(), label: 'Live HRMS Record' }] : []),
  ];

  const dataSources = [
    ...(policyChunks.length ? ['HR Policy'] : []),
    ...(liveData ? ['HRMS'] : []),
  ];

  return _buildResponse({
    question: message,
    answer: finalAnswer,
    intent,
    sources,
    dataSources,
    suggestedQuestions: getSuggestedQuestions(intent),
    context,
    perf,
    t0,
    usedLlm: !gemmaFailed,
  });
}

function _buildResponse(params) {
  const { question, answer, intent, sources, dataSources, suggestedQuestions, context, perf, t0, usedLlm = false } = params;
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
    metrics: {
      ...perf,
      totalMs: _ms(t0),
    },
    metadata: {
      usedLlm,
      latencyMs: _ms(t0),
    },
  };
}

module.exports = {
  chat,
};
