const { query } = require('../config/db');
const { generateEmbedding } = require('./embedding.service');
const { chunkText } = require('./policyChunker.service');

/**
 * Determine document reference key (policy_key) based on the policy title
 * @param {object} policy - Database policy object
 * @returns {string} - Policy key (e.g. 'POL-IT-001')
 */
function getPolicyKey(policy) {
  const title = (policy.title || '').toLowerCase();
  if (title.includes('attendance') || title.includes('working hours') || title.includes('leave')) {
    return 'POL-HR-001';
  }
  if (title.includes('conduct') || title.includes('ethics')) {
    return 'POL-HR-002';
  }
  if (title.includes('it') || title.includes('security') || title.includes('acceptable use')) {
    return 'POL-IT-001';
  }
  return 'POL-GEN-001';
}

/**
 * Parse section reference from chunk text
 * @param {string} chunkText - Chunk text content
 * @returns {string} - Section reference string (e.g. 'Section 1.1')
 */
function parseSectionRef(chunkText) {
  // Look for section numbers like "1.1", "2.3", "Section 5.1"
  const bulletMatch = chunkText.match(/(\d+\.\d+)\s+[A-Z]/);
  if (bulletMatch) {
    return `Section ${bulletMatch[1]}`;
  }
  
  const sectionHeaderMatch = chunkText.match(/SECTION\s+(\d+)/i);
  if (sectionHeaderMatch) {
    return `Section ${sectionHeaderMatch[1]}`;
  }

  return 'General';
}

/**
 * Splits a policy's plain text content dynamically into clean, semantic sections using SECTION headers.
 * @param {string} contentText - Complete policy plain text
 * @returns {Array|null} - Array of sections { sectionRef, text } or null if no headers are found
 */
function splitPolicyIntoSections(contentText) {
  const sectionRegex = /\n\nSECTION\s+(\d+)[:\s]/gi;
  const matches = [...contentText.matchAll(sectionRegex)];
  
  if (matches.length === 0) {
    return null;
  }
  
  const sections = [];
  
  // Extract text before first SECTION header as General header preamble
  if (matches[0].index > 0) {
    sections.push({
      sectionRef: 'General',
      text: contentText.slice(0, matches[0].index).trim()
    });
  }
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const currentIndex = match.index;
    const nextIndex = (i + 1 < matches.length) ? matches[i + 1].index : contentText.length;
    const sectionText = contentText.slice(currentIndex, nextIndex).trim();
    const sectionNum = match[1];
    
    sections.push({
      sectionRef: `Section ${sectionNum}`,
      text: sectionText
    });
  }
  
  return sections;
}

/**
 * Index a single policy object (used by custom scripts / Code of Conduct seeder)
 * @param {object} policy - Database policy object
 * @returns {Promise<object>} - Result metadata
 */
async function indexPolicy(policy) {
  const {
    policy_id,
    organization_id,
    content_text,
    category
  } = policy;

  if (!policy_id || !organization_id || !content_text) {
    throw new Error('Invalid policy data.');
  }

  const policyKey = getPolicyKey(policy);
  const policyCategory = category || policy.category || 'Leave & Employee Conduct';

  // Split policy content semantically by sections, falling back to character chunking if no headers
  let sections = splitPolicyIntoSections(content_text);
  if (!sections) {
    const chunks = chunkText(content_text);
    sections = chunks.map((chunk, i) => ({
      sectionRef: parseSectionRef(chunk),
      text: chunk
    }));
  }

  if (!sections.length) {
    throw new Error('Policy contains no searchable content.');
  }

  // Remove previous embeddings for this policy from the unified table
  await query(
    `
    DELETE FROM policy_embeddings
    WHERE policy_id = $1
      AND organization_id = $2
    `,
    [policy_id, organization_id]
  );

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const embedding = await generateEmbedding(section.text);

    await query(
      `
      INSERT INTO policy_embeddings (
        organization_id,
        policy_id,
        policy_key,
        category,
        section_ref,
        chunk_index,
        chunk_text,
        embedding
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
      `,
      [
        organization_id,
        policy_id,
        policyKey,
        policyCategory,
        section.sectionRef,
        i,
        section.text,
        JSON.stringify(embedding)
      ]
    );
  }

  // Update policy index status if columns exist
  try {
    await query(
      `
      UPDATE hr_policies
      SET
        ai_status = 'indexed',
        ai_indexed_at = NOW(),
        updated_at = NOW()
      WHERE policy_id = $1
        AND organization_id = $2
      `,
      [policy_id, organization_id]
    );
  } catch (err) {
    // Non-fatal if staging database does not have ai_status column yet
  }

  return {
    policyId: policy_id,
    chunksIndexed: sections.length
  };
}

/**
 * Index policies of a specific category for a tenant
 * @param {string} organizationId - Tenant ID
 * @param {string} category - Policy category filter
 * @returns {Promise<object>} - Count of policies and chunks indexed
 */
async function indexTenantPolicies(organizationId, category) {
  if (!organizationId) {
    throw new Error('Organization ID is required.');
  }
  if (!category) {
    throw new Error('Category is required.');
  }

  // Fetch active & published policies matching organization and category
  const policiesRes = await query(
    `
    SELECT policy_id, organization_id, title, category, content_text
    FROM hr_policies
    WHERE organization_id = $1
      AND category = $2
      AND is_active = true
      AND is_published = true
    `,
    [organizationId, category]
  );

  const policies = policiesRes.rows;
  let totalChunks = 0;

  for (const policy of policies) {
    const indexed = await indexPolicy(policy);
    totalChunks += indexed.chunksIndexed;
  }

  return {
    policiesIndexed: policies.length,
    chunksIndexed: totalChunks
  };
}

module.exports = {
  indexTenantPolicies,
  indexPolicy,
  getPolicyKey,
  parseSectionRef
};