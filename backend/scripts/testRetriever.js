require('dotenv').config();

const {
  retrievePolicies
} = require('../src/ai/policyRetriever.service');

async function run() {
  const organizationId =
    '465023ed-ffd9-41b0-8fc6-8bd5f691d3dc';

  const question = 'What are the employee conduct and workplace ethics rules?';

  console.log('Searching policies...\n');

  const results = await retrievePolicies(
    organizationId,
    question,
    5
  );

  console.log('RESULTS:\n');

  results.forEach((result, index) => {
    console.log(`--- Result ${index + 1} ---`);
    console.log('Policy ID:', result.policy_id);
    console.log('Chunk:', result.chunk_index);
    console.log('Similarity:', result.similarity);
    console.log('Text:', result.chunk_text);
    console.log();
  });
}

run().catch(error => {
  console.error('Retriever test failed:', error);
});