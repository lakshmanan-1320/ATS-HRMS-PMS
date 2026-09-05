/**
 * intentClassifier.service.js
 *
 * Role-aware HRMS intent classifier and structured query understanding bridge.
 * Delegates to queryUnderstanding.service.js to extract domain, operation, scope, and parameters.
 */

'use strict';

const { understandQuery, parseDateRange, extractLeaveType } = require('./queryUnderstanding.service');

/**
 * Classifies the intent of a question using structured query understanding.
 *
 * @param {string} question - Question text
 * @param {Array} history - Conversation history
 * @param {object} user - Authenticated user context
 * @returns {object} Intent classification and understanding result
 */
function classifyIntent(question = '', history = [], user = {}) {
  const understanding = understandQuery(question, history, user);

  return {
    intent: understanding.intent,
    domain: understanding.domain,
    operation: understanding.operation,
    scope: understanding.scope,
    requiresEmployeeData: understanding.requiresLiveData,
    requiresLiveData: understanding.requiresLiveData,
    requiresPolicyData: understanding.requiresPolicy,
    requiresRag: understanding.requiresPolicy,
    requiresClarification: understanding.requiresClarification || false,
    clarificationPrompt: understanding.clarificationPrompt || null,
    policyCategory: understanding.policyCategory || null,
    policyTopic: understanding.policyTopic || null,
    leaveTypeFilter: understanding.leaveType || null,
    leaveType: understanding.leaveType || null,
    requestedDuration: understanding.requestedDuration || null,
    dateRange: understanding.dateRange || null,
    isFollowUp: understanding.isFollowUp || false,
    confidence: understanding.confidence || 0.95,
  };
}

module.exports = {
  classifyIntent,
  parseDateRange,
  extractLeaveType,
};
