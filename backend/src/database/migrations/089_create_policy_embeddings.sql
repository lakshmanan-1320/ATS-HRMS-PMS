-- Migration: Create Policy Embeddings Table
-- Stores tenant-isolated document chunks with vector embeddings from the configured Ollama embedding model.
--
-- Requires the pgvector extension. If pgvector is not installed on the PostgreSQL server,
-- this migration is skipped (the AI policy search will not work). After installing pgvector, run:
--   DELETE FROM schema_migrations WHERE name = '089_create_policy_embeddings.sql';
-- and restart the backend so this migration runs again.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    RAISE WARNING 'pgvector is not installed: skipping hr_policy_embeddings. See 089_create_policy_embeddings.sql to re-run after installing it.';
    RETURN;
  END IF;

  CREATE EXTENSION IF NOT EXISTS vector;

  EXECUTE $sql$
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
    )
  $sql$;

  CREATE INDEX IF NOT EXISTS idx_hr_policy_embeddings_org
  ON hr_policy_embeddings(organization_id);

  CREATE INDEX IF NOT EXISTS idx_hr_policy_embeddings_policy
  ON hr_policy_embeddings(policy_id);
END
$$;
