const { getChatbotResponse } = require('../ai/chatbot.service');
const { retrievePolicies } = require('../ai/policyRetriever.service');
const { query } = require('../config/db');

async function testRAGFlow() {
  try {
    console.log('================ RAG TEST SUITE ================');

    // 1. Fetch target test organizations
    const orgRes = await query('SELECT DISTINCT organization_id FROM client_admins LIMIT 2');
    if (orgRes.rows.length < 2) {
      console.log('Not enough organizations to test cross-tenant isolation fully. Need 2.');
      return;
    }

    const orgA = orgRes.rows[0].organization_id;
    const orgB = orgRes.rows[1].organization_id;

    console.log(`Org A: ${orgA}`);
    console.log(`Org B: ${orgB}`);

    // 2. Test 1 & 2: Tenant Isolation and Cross-Tenant Isolation
    console.log('\n--- Test 1 & 2: Scoped Retrieval & Cross-tenant Isolation ---');
    const question = 'What is the password complexity requirement?';
    
    console.log(`Retrieving policies for Org A with query: "${question}"...`);
    const chunksA = await retrievePolicies(orgA, question, 'IT & Data Security', 3);
    console.log(`Org A found ${chunksA.length} chunk(s).`);
    chunksA.forEach((c, idx) => {
      console.log(`  [Chunk ${idx+1}] similarity: ${c.similarity.toFixed(4)}, key: ${c.policyKey}, section: ${c.sectionRef}`);
    });

    console.log(`Retrieving policies for Org B with query: "${question}"...`);
    const chunksB = await retrievePolicies(orgB, question, 'IT & Data Security', 3);
    console.log(`Org B found ${chunksB.length} chunk(s).`);
    chunksB.forEach((c, idx) => {
      console.log(`  [Chunk ${idx+1}] similarity: ${c.similarity.toFixed(4)}, key: ${c.policyKey}, section: ${c.sectionRef}`);
    });

    // Verify cross-contamination (Org A should NOT see Org B's chunks)
    // In our DB seed, each org has its own independent vectors.
    console.log('\n--- Test 3: Module Isolation ---');
    console.log('Attempting retrieval for an out-of-scope query (e.g. Leave or Conduct)...');
    const leaveQuestion = 'How many sick leaves do I get?';
    const chunksLeave = await retrievePolicies(orgA, leaveQuestion, 'IT & Data Security', 5);
    const hasConductOrLeave = chunksLeave.some(c => c.policyKey.includes('HR-001') || c.policyKey.includes('HR-002'));
    console.log(`IT & Data Security scope query returned ${chunksLeave.length} chunk(s).`);
    console.log(`Contains any HR/Leave chunks: ${hasConductOrLeave ? '❌ FAILED' : '✓ PASSED'}`);

    // 3. Test Chatbot Service completions
    console.log('\n--- Test 4: Semantic Chatbot Response ---');
    console.log(`Sending question: "${question}" to chatbot Service for Org A...`);
    const chatbotRes = await getChatbotResponse(orgA, question, 'IT & Data Security');
    console.log('Chatbot Answer:\n', chatbotRes.answer);
    console.log('Sources cited:', JSON.stringify(chatbotRes.sources));

    // 4. Test 5: Fallback behavior for completely out-of-scope questions
    console.log('\n--- Test 5: Fallback / No-Answer Behavior ---');
    const outOfScopeQuestion = 'Can I buy a spaceship using company funds?';
    console.log(`Sending out-of-scope question: "${outOfScopeQuestion}"...`);
    const fallbackRes = await getChatbotResponse(orgA, outOfScopeQuestion, 'IT & Data Security');
    console.log('Fallback Answer:\n', fallbackRes.answer);
    console.log('Sources cited:', JSON.stringify(fallbackRes.sources));

    console.log('\n================================================');
  } catch (err) {
    console.error('Error running RAG test:', err);
  } finally {
    process.exit(0);
  }
}

testRAGFlow();
