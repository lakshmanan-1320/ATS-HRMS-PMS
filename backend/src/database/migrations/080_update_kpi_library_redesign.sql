-- Migration 080: Re-create KPI Library table for simplified goal tracking
DROP TABLE IF EXISTS kpi_library CASCADE;
DROP TABLE IF EXISTS kpi_assignments CASCADE;

CREATE TABLE kpi_library (
  kpi_library_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  measurement_type VARCHAR(50) NOT NULL CHECK (measurement_type IN ('PERCENTAGE', 'NUMBER', 'CURRENCY', 'BOOLEAN', 'TEXT')),
  target_value NUMERIC(18, 4),
  target_boolean BOOLEAN,
  target_text TEXT,
  unit VARCHAR(50),
  frequency VARCHAR(50) DEFAULT 'MONTHLY' CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
  kpi_type VARCHAR(50) DEFAULT 'OUTCOME' CHECK (kpi_type IN ('OUTCOME', 'OUTPUT', 'LEADING', 'LAGGING')),
  priority VARCHAR(50) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, title)
);

CREATE INDEX IF NOT EXISTS idx_kpi_library_org ON kpi_library(organization_id);
