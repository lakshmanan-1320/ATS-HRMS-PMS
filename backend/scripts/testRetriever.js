require('dotenv').config();
const { query } = require('../src/config/db');
const { retrievePolicies } = require('../src/ai/policyRetriever.service');

const TEST_QUESTIONS = [
  // 1. Code of Conduct
  { category: 'Code of Conduct', question: 'What are the main employee conduct and workplace ethics rules?' },
  { category: 'Code of Conduct', question: 'What behavior is prohibited in the workplace?' },
  { category: 'Code of Conduct', question: "What is the company's policy on sexual harassment?" },
  { category: 'Code of Conduct', question: 'What are the rules regarding respectful workplace behavior?' },

  // 2. IT Security
  { category: 'IT Security', question: 'What information must employees keep confidential?' },
  { category: 'IT Security', question: 'Can employees share their passwords?' },
  { category: 'IT Security', question: 'What are the rules for handling sensitive company data?' },
  { category: 'IT Security', question: 'What security practices are required?' },

  // 3. Attendance & Leave
  { category: 'Attendance / Leave', question: 'What are the normal working hours?' },
  { category: 'Attendance / Leave', question: 'What is the attendance policy?' },
  { category: 'Attendance / Leave', question: 'What is the leave policy?' },
  { category: 'Attendance / Leave', question: 'What happens when an employee takes unpaid leave?' },

  // 4. Bonus
  { category: 'Bonus', question: 'Who is eligible for the employee bonus?' },
  { category: 'Bonus', question: 'How is the bonus calculated?' },
  { category: 'Bonus', question: 'When is the bonus paid?' },
  { category: 'Bonus', question: 'What conditions affect bonus eligibility?' },

  // 5. Cross-Policy (Bonus + Attendance)
  { category: 'Cross-Policy (Bonus + Attendance)', question: 'Does attendance affect bonus eligibility?' },
  { category: 'Cross-Policy (Bonus + Attendance)', question: 'What happens to my bonus if I take unpaid leave?' },
  { category: 'Cross-Policy (Bonus + Attendance)', question: 'Does unauthorized absence affect my bonus?' },
  { category: 'Cross-Policy (Bonus + Attendance)', question: 'How does attendance performance affect incentives?' },
  { category: 'Cross-Policy (Bonus + Attendance)', question: 'Does leave affect bonus calculation?' },

  // 6. Negative / Unsupported
  { category: 'Negative / Unsupported', question: "What is the company's travel reimbursement policy?" },
  { category: 'Negative / Unsupported', question: "What is the company's relocation policy?" },
  { category: 'Negative / Unsupported', question: "What is the company's maternity leave policy?" },
  { category: 'Negative / Unsupported', question: "What is the company's car allowance policy?" }
];

async function run() {
  console.log('================================================');
  console.log('RUNNING COMPREHENSIVE RETRIEVER TEST SUITE');
  console.log('================================================\n');

  // Dynamically resolve target organization ID from indexed policies
  const orgResult = await query(
    `SELECT DISTINCT organization_id FROM hr_policies WHERE is_active = true AND is_published = true LIMIT 1`
  );

  const organizationId = process.env.POLICY_ORGANIZATION_ID || orgResult.rows[0]?.organization_id;

  if (!organizationId) {
    console.error('No organization found with active policies.');
    process.exit(1);
  }

  console.log(`Target Organization ID: ${organizationId}\n`);

  let passedTests = 0;

  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const item = TEST_QUESTIONS[i];
    console.log(`[Test ${i + 1}/${TEST_QUESTIONS.length}] [${item.category}]`);
    console.log(`Question: "${item.question}"`);

    try {
      const chunks = await retrievePolicies(organizationId, item.question, 8);
      console.log(`-> Retrieved ${chunks.length} chunks.`);

      if (chunks.length > 0) {
        const policySummary = {};
        chunks.forEach((c) => {
          policySummary[c.policyTitle] = (policySummary[c.policyTitle] || 0) + 1;
        });
        console.log('   Policies breakdown:', JSON.stringify(policySummary));
        console.log(`   Top match: ${chunks[0].policyTitle} (${chunks[0].sectionRef}) - Similarity: ${Number(chunks[0].similarity).toFixed(4)}`);
      } else {
        console.log('   [INFO] No chunks met similarity threshold (Expected for unsupported queries).');
      }

      passedTests++;
    } catch (err) {
      console.error(`   [FAIL] Error during retrieval: ${err.message}`);
    }

    console.log('------------------------------------------------');
  }

  console.log(`\nRetriever Test Completed: ${passedTests}/${TEST_QUESTIONS.length} queries executed.`);
  process.exit(0);
}

run().catch((error) => {
  console.error('Retriever test suite failed:', error);
  process.exit(1);
});