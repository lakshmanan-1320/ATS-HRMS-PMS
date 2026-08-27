-- Migration: Create Policy Embeddings Table
-- Stores tenant-isolated document chunks with vector embeddings from embeddinggemma.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS policy_embeddings (
    policy_embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    policy_id           UUID NOT NULL REFERENCES hr_policies(policy_id) ON DELETE CASCADE,
    policy_key          VARCHAR(50) NOT NULL,
    category            VARCHAR(100) NOT NULL,
    section_ref         VARCHAR(50) NOT NULL,
    chunk_index         INTEGER NOT NULL,
    chunk_text          TEXT NOT NULL,
    embedding           VECTOR(768) NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tenant-scoped category isolation
CREATE INDEX IF NOT EXISTS idx_policy_embeddings_lookup
ON policy_embeddings(organization_id, category);
