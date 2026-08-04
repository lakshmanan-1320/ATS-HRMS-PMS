-- Migration 059: Create Goal KPIs and progress history tables

-- Create sequence for human-readable KPI codes
CREATE SEQUENCE IF NOT EXISTS goal_kpis_kpi_code_seq;

-- 1. KPI Table Definition
CREATE TABLE IF NOT EXISTS goal_kpis (
  kpi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  performance_configuration_id UUID REFERENCES performance_configurations(performance_configuration_id) ON DELETE SET NULL,
  kpi_code VARCHAR(50) UNIQUE DEFAULT 'KPI-' || lpad(nextval('goal_kpis_kpi_code_seq')::text, 6, '0'),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  measurement_type VARCHAR(50) NOT NULL CHECK (measurement_type IN ('PERCENTAGE', 'NUMBER', 'CURRENCY', 'BOOLEAN', 'TEXT')),
  
  -- Target & Current value storage
  target_value NUMERIC(18, 4),
  current_value NUMERIC(18, 4) DEFAULT 0.0000,
  target_text TEXT,
  current_text TEXT,
  target_boolean BOOLEAN,
  current_boolean BOOLEAN,
  
  unit VARCHAR(50),
  weight_percentage NUMERIC(5, 2) NOT NULL CHECK (weight_percentage > 0 AND weight_percentage <= 100),
  progress_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  frequency VARCHAR(50) DEFAULT 'MONTHLY' CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
  kpi_type VARCHAR(50) DEFAULT 'OUTCOME' CHECK (kpi_type IN ('OUTCOME', 'OUTPUT', 'LEADING', 'LAGGING')),
  priority VARCHAR(50) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CHANGES_REQUESTED')),
  
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  owner_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. KPI Progress History Table Definition
CREATE TABLE IF NOT EXISTS goal_kpi_progress_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES goal_kpis(kpi_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  
  -- History value columns
  old_value NUMERIC(18, 4),
  new_value NUMERIC(18, 4),
  old_text TEXT,
  new_text TEXT,
  old_boolean BOOLEAN,
  new_boolean BOOLEAN,
  
  progress_percentage NUMERIC(5, 2) NOT NULL,
  comment TEXT,
  updated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_kpis_organization ON goal_kpis(organization_id);
CREATE INDEX IF NOT EXISTS idx_kpis_goal ON goal_kpis(goal_id);
CREATE INDEX IF NOT EXISTS idx_kpis_status ON goal_kpis(status);
CREATE INDEX IF NOT EXISTS idx_kpi_history_kpi ON goal_kpi_progress_history(kpi_id);
