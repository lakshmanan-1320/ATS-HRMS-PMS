require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { query } = require('../src/config/db');
const { chat } = require('../src/ai/ai.service');

/**
 * testPersonalHRAssistant.js
 * Comprehensive automated verification script testing the Personal HR Assistant.
 */
async function runTests() {
  console.log('==================================================');
  console.log('STARTING PERSONAL HR ASSISTANT TEST SUITE');
  console.log('==================================================\n');

  // 1. Fetch active organization and two sample employees for tenant/security isolation testing
  const orgRes = await query(`
    SELECT DISTINCT p.organization_id 
    FROM hr_policies p
    WHERE p.is_active = true AND p.is_published = true 
    LIMIT 1
  `);

  if (!orgRes.rows.length) {
    console.error('[ERROR] No organization with active policies found.');
    process.exit(1);
  }

  const organizationId = orgRes.rows[0].organization_id;

  const empRes = await query(`
    SELECT e.employee_id, e.employee_code, e.first_name, e.last_name, e.email, e.designation, u.user_id
    FROM employees e
    LEFT JOIN users u ON u.employee_id = e.employee_id
    WHERE e.organization_id = $1 AND e.status = 'active'
    ORDER BY e.created_at ASC
    LIMIT 2
  `, [organizationId]);

  const empA = empRes.rows[0];
  const empB = empRes.rows[1] || empRes.rows[0];

  console.log('Test Environment:');
  console.log(`- Organization ID: ${organizationId}`);
  console.log(`- Test Employee A: ${empA.first_name} ${empA.last_name} (${empA.employee_code})`);
  console.log(`- Test Employee B: ${empB.first_name} ${empB.last_name} (${empB.employee_code})\n`);

  const userA = {
    userId: empA.user_id || empA.employee_id,
    employeeId: empA.employee_id,
    organizationId,
    role: 'employee',
    email: empA.email
  };

  const userB = {
    userId: empB.user_id || empB.employee_id,
    employeeId: empB.employee_id,
    organizationId,
    role: 'employee',
    email: empB.email
  };

  const testMatrix = [
    // -------------------------------------------------------------
    // CATEGORY A: LEAVE
    // -------------------------------------------------------------
    { group: 'A. LEAVE', question: 'How many leaves do I have?', user: userA },
    { group: 'A. LEAVE', question: 'How much EL is left?', user: userA },
    { group: 'A. LEAVE', question: 'Which days did I take leave?', user: userA },
    { group: 'A. LEAVE', question: 'Can I take 3 days off?', user: userA },
    { group: 'A. LEAVE', question: 'Can I take leave tomorrow?', user: userA },

    // -------------------------------------------------------------
    // CATEGORY B: ATTENDANCE
    // -------------------------------------------------------------
    { group: 'B. ATTENDANCE', question: 'Was I late this month?', user: userA },
    { group: 'B. ATTENDANCE', question: 'Which days was I absent?', user: userA },
    { group: 'B. ATTENDANCE', question: 'Show my attendance for August', user: userA },
    { group: 'B. ATTENDANCE', question: 'What was my attendance percentage?', user: userA },

    // -------------------------------------------------------------
    // CATEGORY C: BONUS
    // -------------------------------------------------------------
    { group: 'C. BONUS', question: 'Am I eligible for bonus?', user: userA },
    { group: 'C. BONUS', question: 'How is my bonus calculated?', user: userA },

    // -------------------------------------------------------------
    // CATEGORY D: CROSS-POLICY
    // -------------------------------------------------------------
    { group: 'D. CROSS-POLICY', question: 'Will unpaid leave affect my bonus?', user: userA },
    { group: 'D. CROSS-POLICY', question: 'Does attendance affect my bonus?', user: userA },

    // -------------------------------------------------------------
    // CATEGORY E: POLICY-ONLY
    // -------------------------------------------------------------
    { group: 'E. POLICY-ONLY', question: 'What are the workplace ethics rules?', user: userA },
    { group: 'E. POLICY-ONLY', question: 'What are the password rules?', user: userA },

    // -------------------------------------------------------------
    // CATEGORY F: INFORMAL LANGUAGE
    // -------------------------------------------------------------
    { group: 'F. INFORMAL', question: 'I need 3 days off', user: userA },
    { group: 'F. INFORMAL', question: 'How much leave do I got?', user: userA },
    { group: 'F. INFORMAL', question: 'Can I take Monday off?', user: userA },

    // -------------------------------------------------------------
    // CATEGORY G: SECURITY & ISOLATION
    // -------------------------------------------------------------
    { group: 'G. SECURITY', question: 'How many leaves do I have?', user: userB }
  ];

  let passed = 0;
  const total = testMatrix.length;

  for (let i = 0; i < testMatrix.length; i++) {
    const t = testMatrix[i];
    console.log(`==================================================`);
    console.log(`[TEST ${i + 1}/${total}] [${t.group}]`);
    console.log(`User:     ${t.user.email} (${t.user.employeeId})`);
    console.log(`Question: "${t.question}"`);
    console.log(`--------------------------------------------------`);

    try {
      const response = await chat({ question: t.question }, t.user);

      console.log(`Intent Detected:     ${response.intent}`);
      console.log(`Data Sources:        [${(response.dataSources || []).join(', ')}]`);
      console.log(`Sources Count:       ${(response.sources || []).length}`);
      console.log(`Suggested Questions: ${(response.suggestedQuestions || []).length}`);

      console.log(`\n--- ASSISTANT ANSWER (${response.metrics?.generationTimeMs || 0}ms) ---`);
      console.log(response.answer);
      console.log(`--------------------------------------------------\n`);

      passed++;
    } catch (err) {
      console.error(`[FAIL] Test ${i + 1} encountered error:`, err);
    }
  }

  // -------------------------------------------------------------
  // TEST SUPER ADMIN ROLE
  // -------------------------------------------------------------
  console.log(`==================================================`);
  console.log(`[TEST SUPER ADMIN WITHOUT ORG CONTEXT]`);
  const superAdminRes = await chat(
    { question: 'How many leaves do I have?' },
    { role: 'super_admin', organizationId: null, userId: 'super-admin-id' }
  );
  console.log(`Super Admin Response: "${superAdminRes.answer}"`);
  console.log(`--------------------------------------------------\n`);

  console.log(`==================================================`);
  console.log(`PERSONAL HR ASSISTANT TEST SUITE COMPLETED (${passed}/${total} passed)`);
  console.log(`==================================================\n`);

  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
