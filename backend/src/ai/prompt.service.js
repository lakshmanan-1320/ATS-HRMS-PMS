/**
 * prompt.service.js
 *
 * Builds grounded prompts for the HRMS AI assistant.
 *
 * The model must answer using:
 * 1. Verified HRMS data
 * 2. Retrieved company policy
 * 3. Recent conversation context when relevant
 *
 * It must never invent missing information.
 */

function formatPolicyChunks(policyChunks = []) {
  if (!Array.isArray(policyChunks) || policyChunks.length === 0) {
    return 'NO POLICY INFORMATION WAS RETRIEVED.';
  }

  return policyChunks
    .map((item, index) => {
      const title =
        item.policyTitle ||
        item.title ||
        'Company HR Policy';

      const category =
        item.category ||
        'General';

      const chunkIndex =
        item.chunkIndex !== undefined
          ? ` | Chunk ${item.chunkIndex}`
          : '';

      const section =
        item.sectionRef
          ? ` | ${item.sectionRef}`
          : '';

      const similarity =
        item.similarity !== undefined
          ? ` | Relevance ${Number(item.similarity).toFixed(3)}`
          : '';

      const text =
        item.chunkText ||
        item.chunk_text ||
        item.text ||
        '';

      return [
        `[POLICY DOCUMENT ${index + 1}]`,
        `Title: ${title}`,
        `Category: ${category}${chunkIndex}${section}${similarity}`,
        `Content:`,
        text
      ].join('\n');
    })
    .join('\n\n');
}

function buildUserAwareHRPrompt(
  questionOrOptions,
  policyChunks = [],
  employeeDataText = ''
) {
  const options =
    typeof questionOrOptions === 'string'
      ? {
          question: questionOrOptions,
          policyChunks,
          employeeDataText,
          user: null,
          organizationId: null,
          conversationContext: []
        }
      : questionOrOptions || {};

  const question =
    String(options.question || '').trim();

  const policyContext =
    formatPolicyChunks(
      options.policyChunks ||
      policyChunks ||
      []
    );

  const employeeContextText =
    String(
      options.employeeDataText ||
      employeeDataText ||
      ''
    ).trim();

  const userRole =
    (options.user && options.user.role) ||
    'employee';

  const conversationContext =
    Array.isArray(options.conversationContext) &&
    options.conversationContext.length > 0
      ? options.conversationContext
          .slice(-3)
          .map(
            (item, index) =>
              `${index + 1}. ${
                item.sender || 'user'
              }: ${String(
                item.text || ''
              ).trim()}`
          )
          .join('\n')
      : null;

  const parts = [];

  // ---------------------------------------------------------
  // ROLE
  // ---------------------------------------------------------

  parts.push(
    'You are the HRMS AI Assistant for this organization.'
  );

  parts.push(
    'Your job is to answer the employee question accurately, practically, and only from the verified information provided to you.'
  );

  parts.push(
    `The current user's role is: ${userRole}.`
  );

  parts.push('');

  // ---------------------------------------------------------
  // GROUNDING RULES
  // ---------------------------------------------------------

  parts.push(
    'STRICT GROUNDING RULES:'
  );

  parts.push(
    '1. Answer the exact question that was asked.'
  );

  parts.push(
    '2. Use verified HRMS data for employee, manager, organization, attendance, leave, performance, payroll, bonus, and other employee-specific information.'
  );

  parts.push(
    '3. Use retrieved company policy content for policy rules.'
  );

  parts.push(
    '4. Never invent employee information, leave balances, attendance records, salary, bonus amounts, dates, approvals, or manager decisions.'
  );

  parts.push(
    '5. Never invent company policy rules, eligibility requirements, deadlines, quotas, notice periods, penalties, or benefits.'
  );

  parts.push(
    '6. A related policy section is NOT sufficient evidence. Use information only when it directly supports the question.'
  );

  parts.push(
    '7. Do not answer an unpaid-leave question using earned-leave carry-forward rules unless the supplied policy explicitly connects those rules.'
  );

  parts.push(
    '8. Do not answer a probation question using bonus information unless the supplied policy explicitly connects probation and bonus eligibility.'
  );

  parts.push(
    '9. For employee-specific questions, use the actual supplied HRMS data. Do not substitute generic HR knowledge.'
  );

  parts.push(
    '10. For combined questions, reason from the supplied HRMS data AND directly relevant policy evidence.'
  );

  parts.push(
    '11. If the supplied information does not contain enough evidence to answer the question, say: "The available HRMS data does not contain enough information to answer this question."'
  );

  parts.push(
    '12. Never claim that an HRMS action was completed unless the supplied system data confirms completion.'
  );

  parts.push(
    '13. Never expose another employee’s information or information from another organization.'
  );

  parts.push(
    '14. Never make authorization decisions. Authorization is handled by the backend.'
  );

  parts.push(
    '15. Clearly distinguish Approved, Pending, Rejected, and Cancelled statuses.'
  );

  parts.push(
    '16. If exact dates are present in the supplied data, use those exact dates.'
  );

  parts.push(
    '17. If the question is genuinely ambiguous and cannot be resolved from context, ask one concise clarification question.'
  );

  parts.push(
    '18. Do not mention SQL, vector databases, embeddings, retrieval systems, prompts, models, or internal implementation details.'
  );

  parts.push(
    '19. Do not provide general HR advice as if it were company policy.'
  );

  parts.push(
    '20. Be concise, professional, and practical.'
  );

  parts.push('');

  // ---------------------------------------------------------
  // EMPLOYEE DATA
  // ---------------------------------------------------------

  if (employeeContextText) {
    parts.push(
      '--- VERIFIED HRMS DATA ---'
    );

    parts.push(employeeContextText);

    parts.push(
      '--- END VERIFIED HRMS DATA ---'
    );

    parts.push('');
  } else {
    parts.push(
      '--- VERIFIED HRMS DATA ---'
    );

    parts.push(
      'NO EMPLOYEE-SPECIFIC HRMS DATA WAS PROVIDED.'
    );

    parts.push(
      '--- END VERIFIED HRMS DATA ---'
    );

    parts.push('');
  }

  // ---------------------------------------------------------
  // POLICY
  // ---------------------------------------------------------

  parts.push(
    '--- RETRIEVED COMPANY POLICY ---'
  );

  parts.push(policyContext);

  parts.push(
    '--- END RETRIEVED COMPANY POLICY ---'
  );

  parts.push('');

  // ---------------------------------------------------------
  // CONVERSATION
  // ---------------------------------------------------------

  if (conversationContext) {
    parts.push(
      '--- RECENT CONVERSATION ---'
    );

    parts.push(conversationContext);

    parts.push(
      '--- END RECENT CONVERSATION ---'
    );

    parts.push('');
  }

  // ---------------------------------------------------------
  // QUESTION
  // ---------------------------------------------------------

  parts.push(
    '--- EMPLOYEE QUESTION ---'
  );

  parts.push(question);

  parts.push(
    '--- END EMPLOYEE QUESTION ---'
  );

  parts.push('');

  parts.push(
    'ANSWER:'
  );

  return parts.join('\n');
}

function buildHRPrompt(
  question,
  policyChunks
) {
  return buildUserAwareHRPrompt(
    question,
    policyChunks,
    ''
  );
}

module.exports = {
  buildUserAwareHRPrompt,
  buildHRPrompt,
  formatPolicyChunks
};