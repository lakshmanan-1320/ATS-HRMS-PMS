const { query } = require('../../config/db');
const { indexTenantPolicies } = require('../../ai/policyIndexer.service');

async function seedPolicyEmbeddings() {
  try {
    console.log('[Seeder] Starting policy embeddings vector generation...');

    const orgRes = await query('SELECT DISTINCT organization_id FROM client_admins');
    if (!orgRes.rows.length) {
      console.log('[Seeder] No organization found. Skipping policy indexing.');
      return;
    }

    for (const row of orgRes.rows) {
      const orgId = row.organization_id;
      
      console.log(`[Seeder] Indexing Data Security policies for Organization: ${orgId}`);
      const result1 = await indexTenantPolicies(orgId, 'IT & Data Security');
      console.log(`[Seeder] Successful: Indexed ${result1.policiesIndexed} policies, created ${result1.chunksIndexed} vectors.`);

      console.log(`[Seeder] Indexing Leave & Employee Conduct policies for Organization: ${orgId}`);
      const result2 = await indexTenantPolicies(orgId, 'Leave & Employee Conduct');
      console.log(`[Seeder] Successful: Indexed ${result2.policiesIndexed} policies, created ${result2.chunksIndexed} vectors.`);

      console.log(`[Seeder] Indexing Attendance & Working Hours policies for Organization: ${orgId}`);
      const result3 = await indexTenantPolicies(orgId, 'Attendance & Working Hours');
      console.log(`[Seeder] Successful: Indexed ${result3.policiesIndexed} policies, created ${result3.chunksIndexed} vectors.`);

      console.log(`[Seeder] Indexing Benefits & Compensation policies for Organization: ${orgId}`);
      const result4 = await indexTenantPolicies(orgId, 'Benefits & Compensation');
      console.log(`[Seeder] Successful: Indexed ${result4.policiesIndexed} policies, created ${result4.chunksIndexed} vectors.`);
    }

    console.log('[Seeder] Policy embeddings indexing completed successfully!');
  } catch (err) {
    console.error('[Seeder] Error during policy embeddings seeding:', err);
    throw err;
  }
}

// Support executing directly from terminal/CLI
if (require.main === module) {
  seedPolicyEmbeddings()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedPolicyEmbeddings;
