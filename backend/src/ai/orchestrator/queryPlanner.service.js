/**
 * queryPlanner.service.js
 * Plans the execution strategy based on classified intent and context.
 *
 * Execution Modes:
 * - MODE_A (LIVE_DB): Direct DB queries. Completely skips Gemma and vector search for sub-20ms latency.
 * - MODE_B (POLICY_RAG): Vector search over hr_policy_embeddings + Gemma synthesis.
 * - MODE_C (HYBRID): Parallel fetch of live HRMS state + targeted policy chunks -> Gemma reasoning.
 * - MODE_D (CONVERSATIONAL): Quick direct response without RAG.
 */

'use strict';

const LIVE_DB_INTENTS = new Set([
  // Employee Self
  'EMPLOYEE_PROFILE',
  'EMPLOYEE_JOINING_DATE',
  'EMPLOYEE_DEPARTMENT',
  'EMPLOYEE_DESIGNATION',
  'EMPLOYEE_REPORTING_MANAGER',
  'EMPLOYEE_SHIFT',
  'EMPLOYEE_SALARY',
  // Attendance
  'ATTENDANCE_TODAY',
  'ATTENDANCE_YESTERDAY',
  'ATTENDANCE_MONTH',
  'ATTENDANCE_INCOMPLETE_PUNCH',
  'ATTENDANCE_CHECK_IN',
  'ATTENDANCE_CHECK_OUT',
  // Regularization
  'EMPLOYEE_REGULARIZATION_PENDING',
  'EMPLOYEE_REGULARIZATION_HISTORY',
  'MANAGER_REGULARIZATION_PENDING',
  'MANAGER_REGULARIZATION_HISTORY',
  // Leave
  'EMPLOYEE_LEAVE_BALANCE',
  'EMPLOYEE_LEAVE_HISTORY',
  'EMPLOYEE_LEAVE_PENDING',
  'MANAGER_TEAM_LEAVE',
  'MANAGER_TEAM_LEAVE_HISTORY',
  // Team
  'MANAGER_TEAM_MEMBERS',
  'MANAGER_TEAM_ATTENDANCE',
  'MANAGER_TEAM_ABSENCES',
  'MANAGER_TEAM_CHECKINS',
  'MANAGER_TEAM_LATE',
  'MANAGER_TEAM_INCOMPLETE_PUNCHES',
  // Approvals
  'MANAGER_PENDING_APPROVALS',
  'MANAGER_PENDING_LEAVE_APPROVALS',
  'MANAGER_PENDING_REGULARIZATION_APPROVALS',
  // Org
  'ORG_EMPLOYEE_COUNT',
  'ORG_CHECKINS',
  'ORG_ABSENCES',
  'ORG_LEAVE',
  'ORG_PENDING_APPROVALS',
  // Legacy aliases
  'EMPLOYEE_COUNT',
  'CURRENT_CHECKINS',
  'CURRENT_ABSENCES',
  'EMPLOYEES_ON_LEAVE',
  'TEAM_ATTENDANCE',
  'PENDING_APPROVALS',
]);

const POLICY_RAG_INTENTS = new Set([
  'POLICY_ATTENDANCE',
  'POLICY_REGULARIZATION',
  'POLICY_LEAVE',
  'POLICY_BONUS',
  'POLICY_SECURITY',
  'POLICY_CONDUCT',
  'POLICY_WORKING_HOURS',
  'POLICY_GENERAL',
]);

const HYBRID_INTENTS = new Set([
  'HYBRID_ATTENDANCE_REGULARIZATION',
  'HYBRID_LEAVE_APPLICATION',
  'HYBRID_BONUS_ELIGIBILITY',
  'HYBRID_REMOTE_WORK_SECURITY',
  'HYBRID_OVERTIME',
  // Legacy aliases
  'HYBRID_REGULARIZATION',
  'EMPLOYEE_PUNCH',
  'EMPLOYEE_LEAVE_APPLICATION',
  'EMPLOYEE_ATTENDANCE',
  'EMPLOYEE_ABSENCE',
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

  // Fallback to POLICY_RAG for UNKNOWN only if it seems policy-related
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
