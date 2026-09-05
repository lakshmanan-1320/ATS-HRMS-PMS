/**
 * prompt.service.js
 *
 * Grounded Prompt Architecture for HRMS AI Assistant.
 *
 * STRICT RULES:
 * 1. For POLICY_RAG mode: employee identity (name, code, designation) is NEVER included.
 *    Only user role is passed so the LLM knows the permission level.
 * 2. For HYBRID mode: employee data is included but labeled as "EMPLOYEE CONTEXT FOR COMPARISON".
 * 3. For all modes: The LLM is explicitly instructed NOT to invent data not present in the sections.
 * 4. Missing information must be stated explicitly — never supplemented with general knowledge.
 *
 * Prompt sections:
 * --- ROLE CONTEXT ---          (always — role only)
 * --- VERIFIED HRMS DATA ---    (only when employeeDataText is provided)
 * --- APPROVED COMPANY POLICY --- (only when policyChunks are provided)
 * --- RECENT CONVERSATION ---   (only when history is provided)
 * --- USER QUESTION ---         (always)
 * ASSISTANT ANSWER:
 */

'use strict';

/**
 * Formats policy chunks into clearly labeled policy sources.
 * Each chunk is labeled with its policy title and section.
 */
function formatPolicyChunks(policyChunks = []) {
  if (!policyChunks || policyChunks.length === 0) {
    return 'No relevant company policy sections were found.';
  }

  return policyChunks
    .slice(0, 3)
    .map((chunk, index) => {
      const title = chunk.policyTitle || 'Company Policy';
      const category = chunk.category ? ` [${chunk.category}]` : '';
      const sec = chunk.sectionRef && chunk.sectionRef !== 'General Policy'
        ? `[${chunk.sectionRef}] `
        : '';
      let text = String(chunk.chunkText || '').trim();
      // Trim to reasonable size for CPU inference
      if (text.length > 600) text = text.slice(0, 600) + '...';
      return `[Source ${index + 1}: ${title}${category}]\n${sec}${text}`;
    })
    .join('\n\n');
}

/**
 * Builds a grounded HR prompt for the LLM.
 *
 * @param {object} params
 * @param {string} params.question          - User's question
 * @param {Array}  params.policyChunks      - Retrieved policy chunks (may be empty)
 * @param {string} params.employeeDataText  - Formatted employee HRMS data text (may be empty)
 * @param {object} params.user              - User context { role, ...employeeFields }
 * @param {Array}  params.conversationContext - Recent conversation history
 * @param {string} [params.mode]            - Execution mode: 'POLICY_RAG' | 'HYBRID' | 'LIVE_DB'
 * @returns {string}
 */
function buildUserAwareHRPrompt(params = {}) {
  const {
    question = '',
    policyChunks = [],
    employeeDataText = '',
    user = {},
    conversationContext = [],
    mode = 'HYBRID',
  } = params;

  const cleanQuestion = String(question || '').trim();
  const employeeContextText = String(employeeDataText || '').trim();
  const userRole = user.role || 'employee';
  const isPolicyOnlyMode = mode === 'POLICY_RAG';

  const parts = [];

  // ── System Instructions
  parts.push('You are the official HR Assistant for this company.');
  parts.push('');
  parts.push('STRICT RULES:');
  parts.push('1. Answer ONLY from the VERIFIED HRMS DATA and APPROVED COMPANY POLICY provided below.');
  parts.push('2. If the HRMS DATA is provided, it is the authoritative source for that employee\'s current status.');
  parts.push('3. If the COMPANY POLICY is provided, it is the authoritative source for company rules.');
  parts.push('4. If the answer is NOT in the provided sections, respond: "The available company policy does not contain this information." Do NOT use general business knowledge as a substitute.');
  parts.push('5. Never invent leave balances, dates, salaries, percentages, approval statuses, or policy rules.');
  if (isPolicyOnlyMode) {
    parts.push('6. This is a GENERAL POLICY question. Do NOT mention any employee\'s name, code, designation, or personal data in your response. Answer for any employee of the specified role.');
  } else {
    parts.push('6. Use the VERIFIED HRMS DATA to give a personalized answer. Combine with COMPANY POLICY only when both are relevant to the question.');
  }
  parts.push('7. Be concise (2-5 sentences). Do NOT mention SQL, databases, embeddings, vectors, or AI model names.');
  parts.push('');

  // ── Role Context (always included — minimal identity for policy-only mode)
  parts.push('--- ROLE CONTEXT ---');
  parts.push(`User Role: ${userRole}`);
  // Only include employee identity when NOT in policy-only mode
  if (!isPolicyOnlyMode) {
    if (user.fullName) parts.push(`Name: ${user.fullName}`);
    if (user.designation) parts.push(`Designation: ${user.designation}`);
    if (user.departmentName) parts.push(`Department: ${user.departmentName}`);
    if (user.dateOfJoining) parts.push(`Joining Date: ${user.dateOfJoining}`);
  }
  parts.push('--------------------');
  parts.push('');

  // ── Verified HRMS Data (only when present)
  if (employeeContextText && !isPolicyOnlyMode) {
    parts.push('--- VERIFIED HRMS DATA ---');
    parts.push(employeeContextText);
    parts.push('--------------------------');
    parts.push('');
  }

  // ── Approved Company Policy (only when chunks present)
  if (policyChunks && policyChunks.length > 0) {
    parts.push('--- APPROVED COMPANY POLICY ---');
    parts.push(formatPolicyChunks(policyChunks));
    parts.push('-------------------------------');
    parts.push('');
  }

  // ── Recent Conversation (last 3 exchanges)
  if (Array.isArray(conversationContext) && conversationContext.length > 0) {
    const historyText = conversationContext
      .slice(-4)
      .map((item) => {
        const sender = item.sender === 'assistant' || item.role === 'assistant' ? 'Assistant' : 'User';
        return `${sender}: ${String(item.text || item.content || '').trim()}`;
      })
      .join('\n');
    parts.push('--- RECENT CONVERSATION ---');
    parts.push(historyText);
    parts.push('---------------------------');
    parts.push('');
  }

  // ── User Question
  parts.push('--- USER QUESTION ---');
  parts.push(cleanQuestion);
  parts.push('');
  parts.push('ASSISTANT ANSWER:');

  return parts.join('\n');
}

module.exports = {
  buildUserAwareHRPrompt,
  formatPolicyChunks,
};
