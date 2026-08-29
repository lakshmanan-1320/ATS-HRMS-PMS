const { query } = require('../src/config/db');
const { indexPolicy } = require('../src/ai/policyIndexer.service');

async function run() {
  try {
    console.log('================================================');
    console.log('STARTING HR POLICY INDEXING (ALL POLICIES)');
    console.log('================================================\n');

    const orgFilter = process.env.POLICY_ORGANIZATION_ID || process.argv[2] || null;
    const policyFilter = process.env.POLICY_ID || process.argv[3] || null;

    let sql = `
      SELECT
        policy_id,
        organization_id,
        title,
        category,
        content_text
      FROM hr_policies
      WHERE is_active = true
        AND is_published = true
        AND content_text IS NOT NULL
        AND LENGTH(TRIM(content_text)) > 0
    `;
    const params = [];

    if (orgFilter) {
      params.push(orgFilter);
      sql += ` AND organization_id = $${params.length}`;
      console.log(`Filter applied: Organization ID = ${orgFilter}`);
    }

    if (policyFilter) {
      params.push(policyFilter);
      sql += ` AND policy_id = $${params.length}`;
      console.log(`Filter applied: Policy ID = ${policyFilter}`);
    }

    sql += ` ORDER BY organization_id, title`;

    const result = await query(sql, params);

    if (!result.rows.length) {
      console.log('No active and published policies found matching criteria.');
      process.exit(0);
    }

    console.log(`Found ${result.rows.length} policy record(s) to index:\n`);

    let totalChunks = 0;
    const policySummaries = [];

    for (const policy of result.rows) {
      console.log('------------------------------------------------');
      console.log(`Indexing Policy: "${policy.title}"`);
      console.log(`Policy ID:       ${policy.policy_id}`);
      console.log(`Organization ID: ${policy.organization_id}`);
      console.log(`Category:        ${policy.category}`);
      console.log(`Content Length:  ${policy.content_text.length} chars`);

      try {
        const indexed = await indexPolicy(policy);
        console.log(`Status:          SUCCESS (Chunks: ${indexed.chunksIndexed}, Key: ${indexed.policyKey})`);
        totalChunks += indexed.chunksIndexed || 0;
        policySummaries.push({
          title: policy.title,
          policyKey: indexed.policyKey,
          chunks: indexed.chunksIndexed
        });
      } catch (err) {
        console.error(`Status:          FAILED (${err.message})`);
      }
    }

    console.log('\n================================================');
    console.log('POLICY INDEXING SUMMARY');
    console.log('================================================');
    for (const s of policySummaries) {
      console.log(`Policy: ${s.title} [${s.policyKey}] -> Chunks: ${s.chunks}`);
    }
    console.log('------------------------------------------------');
    console.log(`Total Policies Processed: ${result.rows.length}`);
    console.log(`Total Chunks Indexed:     ${totalChunks}`);
    console.log('================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Policy indexing execution failed:', error);
    process.exit(1);
  }
}

run();