/**
 * queryPlanner.service.js
 * Plans the execution strategy based on classified intent and context.
 *
 * Execution Modes:
 * - MODE_A (LIVE_DB): Direct DB queries. Completely skips Gemma and vector search for sub-30ms latency.
 * - MODE_B (POLICY_RAG): Vector search over hr_policy_embeddings + Gemma synthesis.
 * - MODE_C (HYBRID): Parallel fetch of live HRMS state + policy chunks -> Gemma reasoning.
 * - MODE_D (CONVERSATIONAL / OUT_OF_SCOPE): Quick direct response without RAG.
 */

'use strict';

const LIVE_DB_INTENTS = new Set([
  'EMPLOYEE_REPORTING_MANAGER',
  'EMPLOYEE_PROFILE',
  'EMPLOYEE_COUNT',
  'CURRENT_CHECKINS',
  'EMPLOYEES_ON_LEAVE',
  'EMPLOYEE_LEAVE_HISTORY',
  'EMPLOYEE_LEAVE_BALANCE',
  'ATTENDANCE_TODAY',
  'ATTENDANCE_MONTH',
  'TEAM_ATTENDANCE',
  'CURRENT_ABSENCES',
]);

const POLICY_RAG_INTENTS = new Set([
  'POLICY_SECURITY',
  'POLICY_WORKING_HOURS',
  'POLICY_LEAVE',
  'POLICY_CONDUCT',
  'POLICY_GENERAL',
]);

const HYBRID_INTENTS = new Set([
  'EMPLOYEE_PUNCH',
  'EMPLOYEE_LEAVE_APPLICATION',
  'EMPLOYEE_ATTENDANCE',
  'EMPLOYEE_ABSENCE',
  'POLICY_BONUS',
  'POLICY_AND_EMPLOYEE_DATA',
]);

/**
 * Creates an execution plan for a classified intent.
 * @param {object} intentResult - From intentClassifier
 * @param {object} context - Authenticated employee context
 * @returns {object} Execution plan
 */
function createPlan(intentResult, context) {
  const { intent } = intentResult;

  if (intent === 'GENERAL_CHAT') {
    return {
      mode: 'CONVERSATIONAL',
      useLlm: false,
      useDb: false,
      useRag: false,
      handler: 'CONVERSATIONAL',
    };
  }

  if (LIVE_DB_INTENTS.has(intent)) {
    return {
      mode: 'LIVE_DB',
      useLlm: false,
      useDb: true,
      useRag: false,
      handler: intent,
    };
  }

  if (POLICY_RAG_INTENTS.has(intent)) {
    return {
      mode: 'POLICY_RAG',
      useLlm: true,
      useDb: false,
      useRag: true,
      handler: intent,
    };
  }

  if (HYBRID_INTENTS.has(intent)) {
    return {
      mode: 'HYBRID',
      useLlm: true,
      useDb: true,
      useRag: true,
      handler: intent,
    };
  }

  // Fallback to POLICY_RAG
  return {
    mode: 'POLICY_RAG',
    useLlm: true,
    useDb: false,
    useRag: true,
    handler: 'POLICY_GENERAL',
  };
}

module.exports = {
  createPlan,
  LIVE_DB_INTENTS,
  POLICY_RAG_INTENTS,
  HYBRID_INTENTS,
};
