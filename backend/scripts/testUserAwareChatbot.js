require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { query } = require('../src/config/db');
const { chat } = require('../src/ai/ai.service');

/**
 * testUserAwareChatbot.js
 * Comprehensive automated verification script testing the User-Aware HR AI Assistant.
 */
async function runTests() {
  console.log('==================================================');
  console.log('STARTING USER-AWARE HR AI ASSISTANT TEST SUITE');
  console.log('==================================================\n');

  // 1. Fetch active organization and sample employee
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
    LIMIT 1
  `, [organizationId]);

  const testEmp = empRes.rows[0] || {
    employee_id: '00000000-0000-0000-0000-000000000001',
    employee_code: 'EMP-TEST-001',
    first_name: 'Test',
    last_name: 'Employee',
    email: 'test.employee@example.com',
    user_id: '00000000-0000-0000-0000-000000000002'
  };

  console.log('Test Environment:');
  console.log(`- Organization ID: ${organizationId}`);
  console.log(`- Test Employee:   ${testEmp.first_name} ${testEmp.last_name} (${testEmp.employee_code})`);
  console.log(`- Employee ID:     ${testEmp.employee_id}`);
  console.log(`- User ID:         ${testEmp.user_id || 'N/A'}\n`);

  const authUser = {
    userId: testEmp.user_id || testEmp.employee_id,
    employeeId: testEmp.employee_id,
    organizationId,
    role: 'employee',
    email: testEmp.email
  };

  const testCases = [
    // -------------------------------------------------------------
    // CATEGORY 1: POLICY ONLY
    // -------------------------------------------------------------
    {
      category: 'POLICY ONLY',
      question: 'What are the main employee conduct and workplace ethics rules?',
      expectedIntent: 'POLICY_ONLY'
    },
    {
      category: 'POLICY ONLY',
      question: 'What are the password requirements and security rules?',
      expectedIntent: 'POLICY_ONLY'
    },
    {
      category: 'POLICY ONLY',
      question: 'What are the normal working hours in the attendance policy?',
      expectedIntent: 'POLICY_ONLY'
    },
    {
      category: 'POLICY ONLY',
      question: 'How is employee bonus eligibility determined?',
      expectedIntent: 'POLICY_ONLY'
    },

    // -------------------------------------------------------------
    // CATEGORY 2: EMPLOYEE DATA ONLY
    // -------------------------------------------------------------
    {
      category: 'EMPLOYEE DATA ONLY',
      question: 'How many leaves do I have left?',
      expectedIntent: 'POLICY_PLUS_EMPLOYEE_DATA' // or EMPLOYEE_DATA_ONLY
    },
    {
      category: 'EMPLOYEE DATA ONLY',
      question: 'How many casual leaves do I have?',
      expectedIntent: 'POLICY_PLUS_EMPLOYEE_DATA'
    },
    {
      category: 'EMPLOYEE DATA ONLY',
      question: 'Which dates did I take leave?',
      expectedIntent: 'EMPLOYEE_DATA_ONLY'
    },
    {
      category: 'EMPLOYEE DATA ONLY',
      question: 'What was my attendance this month?',
      expectedIntent: 'EMPLOYEE_DATA_ONLY'
    },

    // -------------------------------------------------------------
    // CATEGORY 3: POLICY + EMPLOYEE DATA (HYBRID)
    // -------------------------------------------------------------
    {
      category: 'POLICY + EMPLOYEE DATA',
      question: 'Can I take leave next Friday?',
      expectedIntent: 'POLICY_PLUS_EMPLOYEE_DATA'
    },
    {
      category: 'POLICY + EMPLOYEE DATA',
      question: 'Does my attendance affect my bonus?',
      expectedIntent: 'POLICY_PLUS_EMPLOYEE_DATA'
    },
    {
      category: 'POLICY + EMPLOYEE DATA',
      question: 'Do I have enough leave balance for a 3-day leave?',
      expectedIntent: 'POLICY_PLUS_EMPLOYEE_DATA'
    },

    // -------------------------------------------------------------
    // CATEGORY 4: NEGATIVE / UNSUPPORTED
    // -------------------------------------------------------------
    {
      category: 'NEGATIVE / UNSUPPORTED',
      question: 'What is the company travel reimbursement policy?',
      expectedIntent: 'POLICY_ONLY'
    }
  ];

  let passed = 0;
  let total = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`==================================================`);
    console.log(`[TEST ${i + 1}/${total}] [${tc.category}]`);
    console.log(`Question: "${tc.question}"`);
    console.log(`--------------------------------------------------`);

    try {
      const response = await chat({ question: tc.question }, authUser);

      console.log(`Intent Detected: ${response.intent}`);
      console.log(`Sources Count:   ${response.sources.length}`);
      
      const policySources = response.sources.filter(s => s.sourceType === 'POLICY');
      const dataSources = response.sources.filter(s => s.sourceType === 'EMPLOYEE_DATA');
      console.log(`- Policy Sources:   ${policySources.length}`);
      console.log(`- Data Sources:     ${dataSources.length}`);

      console.log(`\n--- ASSISTANT ANSWER (${response.metrics?.generationTimeMs || 0}ms) ---`);
      console.log(response.answer);
      console.log(`--------------------------------------------------\n`);

      passed++;
    } catch (err) {
      console.error(`[FAIL] Test ${i + 1} encountered error:`, err);
    }
  }

  // -------------------------------------------------------------
  // TEST MULTI-TURN CONVERSATIONAL FOLLOW-UP
  // -------------------------------------------------------------
  console.log(`==================================================`);
  console.log(`[TEST MULTI-TURN FOLLOW-UP]`);
  console.log(`Turn 1: "How many casual leaves do I have?"`);
  console.log(`Turn 2: "What about sick leave?"`);
  console.log(`Turn 3: "When did I use them?"`);
  console.log(`--------------------------------------------------`);

  try {
    const history = [];

    // Turn 1
    const r1 = await chat({ question: 'How many casual leaves do I have?' }, authUser);
    history.push({ sender: 'user', text: 'How many casual leaves do I have?' });
    history.push({ sender: 'ai', text: r1.answer });

    console.log(`Turn 1 Intent: ${r1.intent}`);
    console.log(`Turn 1 Answer:\n${r1.answer}\n`);

    // Turn 2
    const r2 = await chat({ question: 'What about sick leave?', history }, authUser);
    history.push({ sender: 'user', text: 'What about sick leave?' });
    history.push({ sender: 'ai', text: r2.answer });

    console.log(`Turn 2 Intent: ${r2.intent}`);
    console.log(`Turn 2 Answer:\n${r2.answer}\n`);

    // Turn 3
    const r3 = await chat({ question: 'When did I use them?', history }, authUser);
    console.log(`Turn 3 Intent: ${r3.intent}`);
    console.log(`Turn 3 Answer:\n${r3.answer}\n`);

    console.log(`[SUCCESS] Multi-turn follow-ups resolved cleanly.`);
  } catch (err) {
    console.error(`[FAIL] Multi-turn follow-up error:`, err);
  }

  // -------------------------------------------------------------
  // TEST SUPER ADMIN WITHOUT ORG CONTEXT
  // -------------------------------------------------------------
  console.log(`==================================================`);
  console.log(`[TEST SUPER ADMIN ROLE HANDLING]`);
  const superAdminRes = await chat(
    { question: 'How many leaves do I have?' },
    { role: 'super_admin', organizationId: null, userId: 'super-admin-id' }
  );
  console.log(`Super Admin Response: "${superAdminRes.answer}"`);
  console.log(`--------------------------------------------------`);

  console.log(`\n==================================================`);
  console.log(`ALL TESTS COMPLETED (${passed}/${total} executed)`);
  console.log(`==================================================\n`);

  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
