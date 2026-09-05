/**
 * reindex_policies.js
 * CLI script to batch re-chunk and re-embed all published company policies.
 *
 * Usage:
 *   node src/database/reindex_policies.js
 */

'use strict';

require('dotenv').config();
const { indexAllOrganizationPolicies } = require('../ai/rag/policyIndexer.service');

async function run() {
  console.log('Starting company policies re-indexing...');
  const t0 = performance.now();
  try {
    const result = await indexAllOrganizationPolicies();
    const duration = Math.round(performance.now() - t0);
    console.log(`Re-indexing complete in ${duration}ms:`);
    console.log(`- Total policies found: ${result.totalPolicies}`);
    console.log(`- Successfully indexed: ${result.indexedCount}`);
    console.log(`- Total chunks created: ${result.totalChunks}`);
    if (result.errors.length > 0) {
      console.warn('- Errors encountered:', result.errors);
    }
    process.exit(0);
  } catch (err) {
    console.error('Re-indexing failed:', err);
    process.exit(1);
  }
}

run();
