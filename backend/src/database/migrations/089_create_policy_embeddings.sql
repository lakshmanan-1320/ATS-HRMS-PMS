-- Migration: Create Policy Embeddings Table
-- Stores tenant-isolated document chunks with vector embeddings from the configured Ollama embedding model.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS hr_policy_embeddings (
    embedding_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    policy_id           UUID NOT NULL REFERENCES hr_policies(policy_id) ON DELETE CASCADE,
    chunk_index         INTEGER NOT NULL,
    chunk_text          TEXT NOT NULL,
    embedding           VECTOR(768) NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (policy_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_hr_policy_embeddings_org
ON hr_policy_embeddings(organization_id);

CREATE INDEX IF NOT EXISTS idx_hr_policy_embeddings_policy
ON hr_policy_embeddings(policy_id);
