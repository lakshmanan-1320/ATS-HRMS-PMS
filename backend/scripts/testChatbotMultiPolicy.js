require('dotenv').config();
const { query } = require('../src/config/db');
const aiService = require('../src/ai/ai.service');

const QUESTIONS_TO_TEST = [
  {
    type: 'Code of Conduct',
    question: 'What are the main employee conduct and workplace ethics rules?'
  },
  {
    type: 'IT Security',
    question: 'What information must employees keep confidential and what are password rules?'
  },
  {
    type: 'Attendance & Leave',
    question: 'What are the normal working hours and what happens if an employee arrives late?'
  },
  {
    type: 'Bonus Policy',
    question: 'Who is eligible for the employee bonus and how is the bonus calculated?'
  },
  {
    type: 'Cross-Policy (Bonus + Attendance)',
    question: 'What happens to my bonus if I take unpaid leave?'
  },
  {
    type: 'Unsupported / Out of Scope',
    question: "What is the company's travel reimbursement policy?"
  }
];

async function run() {
  console.log('==================================================');
  console.log('TESTING FULL END-TO-END HR CHATBOT WITH GEMMA 3:4B');
  console.log('==================================================\n');

  const orgResult = await query(
    `SELECT DISTINCT organization_id FROM hr_policies WHERE is_active = true AND is_published = true LIMIT 1`
  );
  const organizationId = process.env.POLICY_ORGANIZATION_ID || orgResult.rows[0]?.organization_id;

  if (!organizationId) {
    console.error('No organization found.');
    process.exit(1);
  }

  // 1. Test Regular Employee with Organization Context
  const employeeUser = {
    userId: '11111111-1111-1111-1111-111111111111',
    role: 'employee',
    organizationId
  };

  for (let i = 0; i < QUESTIONS_TO_TEST.length; i++) {
    const item = QUESTIONS_TO_TEST[i];
    console.log(`\n==================================================`);
    console.log(`[TEST ${i + 1}/${QUESTIONS_TO_TEST.length}] ${item.type}`);
    console.log(`Question: "${item.question}"`);
    console.log(`==================================================`);

    const t0 = performance.now();
    const result = await aiService.chat({ message: item.question }, employeeUser);
    const duration = Math.round(performance.now() - t0);

    console.log(`\n--- GEMMA ANSWER (${duration}ms) ---`);
    console.log(result.answer);
    console.log('\n--- SOURCES CITED ---');
    if (result.sources && result.sources.length > 0) {
      result.sources.forEach((s, idx) => {
        console.log(`${idx + 1}. ${s.policy_title} (${s.policy_key}) - ${s.section} [Similarity: ${s.similarity.toFixed(4)}]`);
      });
    } else {
      console.log('No sources cited.');
    }
  }

  // 2. Test Super Admin without Organization Context
  console.log(`\n==================================================`);
  console.log(`[TEST SUPER ADMIN ROLE HANDLING]`);
  console.log(`==================================================`);
  const superAdminUser = {
    userId: '99999999-9999-9999-9999-999999999999',
    role: 'super_admin',
    organizationId: null
  };

  const saResult = await aiService.chat({ message: 'What are the bonus rules?' }, superAdminUser);
  console.log('\n--- SUPER ADMIN RESPONSE ---');
  console.log(saResult.answer);

  console.log('\n==================================================');
  console.log('ALL TESTS COMPLETED SUCCESSFULLY');
  console.log('==================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('Chatbot test failed:', err);
  process.exit(1);
});
