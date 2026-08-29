/**
 * prompt.service.js
 * Builds strict, grounded prompts for the HRMS AI assistant.
 */

function formatPolicyChunks(policyChunks = []) {
  if (!policyChunks || policyChunks.length === 0) {
    return 'NO POLICY INFORMATION WAS RETRIEVED.';
  }

  return policyChunks
    .map((item, index) => {
      const title = item.policyTitle || item.title || 'Company HR Policy';
      const category = item.category || 'General';
      const chunkIndex = item.chunkIndex !== undefined ? ` | Chunk ${item.chunkIndex}` : '';
      const text = item.chunkText || item.chunk_text || item.text || '';
      const docHeader = `${title} | ${category}${chunkIndex}`;
      return `[POLICY DOCUMENT ${index + 1}: ${docHeader}]\n${text}`;
    })
    .join('\n\n');
}

function buildUserAwareHRPrompt(questionOrOptions, policyChunks = [], employeeDataText = '') {
  const options = typeof questionOrOptions === 'string'
    ? {
        question: questionOrOptions,
        policyChunks,
        employeeDataText,
        user: null,
        organizationId: null,
        conversationContext: []
      }
    : questionOrOptions || {};

  const question = String(options.question || '').trim();
  const policyContext = formatPolicyChunks(options.policyChunks || policyChunks || []);
  const employeeContextText = String(options.employeeDataText || employeeDataText || '').trim();
  const userRole = (options.user && options.user.role) || 'employee';
  const conversationContext = Array.isArray(options.conversationContext) && options.conversationContext.length > 0
    ? options.conversationContext.slice(-3).map((item, index) => `${index + 1}. ${item.sender || 'user'}: ${String(item.text || '').trim()}`).join('\n')
    : null;

  const parts = [];

  parts.push(`You are the HRMS AI Assistant for this organization.`);
  parts.push(`You must answer using ONLY the supplied HRMS data and approved company policy context below.`);
  parts.push(`The user's role is: ${userRole}.`);
  parts.push('');

  parts.push('STRICT RULES — follow every rule without exception:');
  parts.push('1. Never invent employee information, leave dates, leave balances, or attendance records.');
  parts.push('2. Never invent leave approvals, request statuses, or manager decisions.');
  parts.push('3. Never invent salary, payroll amounts, or bonus information.');
  parts.push('4. Never invent policy rules, deadlines, quotas, or penalty amounts.');
  parts.push('5. Never claim an HRMS action was completed unless the system context confirms it was submitted and confirmed.');
  parts.push('6. Never expose information belonging to another employee or another organization.');
  parts.push('7. Do not make authorization or permission decisions — those have already been made by the backend.');
  parts.push('8. If the supplied data does not contain the answer, say clearly: "The available HRMS data does not contain this information."');
  parts.push('9. For policy questions, use only the retrieved policy context. If it is insufficient, say so explicitly.');
  parts.push('10. For employee-specific questions, use only the actual HRMS data supplied. Do not use general knowledge.');
  parts.push('11. For combined questions, reason only from the supplied employee data AND policy context together.');
  parts.push('12. Do not mention internal implementation details, SQL queries, embeddings, vector databases, or model names.');
  parts.push('13. Be concise, professional, and practical. Avoid unnecessary filler.');
  parts.push('14. When records contain dates, always state the exact dates as given.');
  parts.push('15. Clearly distinguish record statuses: Approved / Pending / Rejected / Cancelled. Never conflate them.');
  parts.push('16. Never turn an instruction into a claim that an action has already happened.');
  parts.push('17. If the question is ambiguous, ask one concise clarifying question rather than guessing.');
  parts.push('18. If policy context conflicts with itself, note the conflict and reference the active/published version.');
  parts.push('');

  if (employeeContextText) {
    parts.push('--- VERIFIED HRMS DATA ---');
    parts.push(employeeContextText);
    parts.push('--- END HRMS DATA ---');
    parts.push('');
  }

  if (policyContext && policyContext !== 'NO POLICY INFORMATION WAS RETRIEVED.') {
    parts.push('--- APPROVED POLICY CONTEXT ---');
    parts.push(policyContext);
    parts.push('--- END POLICY CONTEXT ---');
    parts.push('');
  }

  if (conversationContext) {
    parts.push('--- RECENT CONVERSATION ---');
    parts.push(conversationContext);
    parts.push('--- END CONVERSATION ---');
    parts.push('');
  }

  parts.push(`EMPLOYEE QUESTION: ${question}`);
  parts.push('');
  parts.push('ANSWER (follow all 18 rules above — be direct and practical):');

  return parts.join('\n');
}

function buildHRPrompt(question, policyChunks) {
  return buildUserAwareHRPrompt(question, policyChunks, '');
}

module.exports = {
  buildUserAwareHRPrompt,
  buildHRPrompt,
  formatPolicyChunks
};
