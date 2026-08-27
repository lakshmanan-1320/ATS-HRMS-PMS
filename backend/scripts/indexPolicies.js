const { query } = require('../src/config/db');
const { indexPolicy } = require('../src/ai/policyIndexer.service');

const ORGANIZATION_ID =
  '465023ed-ffd9-41b0-8fc6-8bd5f691d3dc';

async function run() {
  try {
    console.log('Starting Code of Conduct policy indexing...');

    const result = await query(
      `
      SELECT
        policy_id,
        organization_id,
        title,
        content_text
      FROM hr_policies
      WHERE organization_id = $1
        AND title ILIKE '%Code of Conduct%'
        AND is_active = true
        AND is_published = true
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [ORGANIZATION_ID]
    );

    if (!result.rows.length) {
      throw new Error(
        'Code of Conduct policy not found for this organization.'
      );
    }

    const policy = result.rows[0];

    console.log('Policy found:');
    console.log('Policy ID:', policy.policy_id);
    console.log('Organization ID:', policy.organization_id);
    console.log('Title:', policy.title);
    console.log(
      'Content length:',
      policy.content_text?.length || 0
    );

    if (!policy.content_text) {
      throw new Error('Policy has no content_text.');
    }

    const indexed = await indexPolicy(policy);

    console.log('--------------------------------');
    console.log('INDEXING COMPLETE');
    console.log('Policy:', policy.title);
    console.log('Policy ID:', policy.policy_id);
    console.log('Chunks:', indexed.chunksIndexed);
    console.log('--------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Policy indexing failed:', error);
    process.exit(1);
  }
}

run();