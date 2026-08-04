CREATE TABLE IF NOT EXISTS hierarchy_levels (
  hierarchy_level_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  sort_order         INTEGER NOT NULL DEFAULT 1,
  level_code         VARCHAR(20) NOT NULL,
  designation        VARCHAR(100) NOT NULL,
  description        TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hierarchy_org_code
  ON hierarchy_levels(organization_id, LOWER(level_code));
