-- Migration 081: Create Bell Curve / Forced Ranking Calibration Tables

-- 1. Configurations Table
CREATE TABLE IF NOT EXISTS bell_curve_configurations (
  configuration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  tie_strategy VARCHAR(50) NOT NULL DEFAULT 'INCLUDE_ALL' CHECK (tie_strategy IN ('INCLUDE_ALL', 'MANUAL_REVIEW')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buckets Table
CREATE TABLE IF NOT EXISTS bell_curve_buckets (
  bucket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID NOT NULL REFERENCES bell_curve_configurations(configuration_id) ON DELETE CASCADE,
  bucket_name VARCHAR(255) NOT NULL,
  bucket_order INTEGER NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  color VARCHAR(50) NOT NULL,
  suggested_action VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_config_bucket_order UNIQUE (configuration_id, bucket_order)
);

-- 3. Runs (Version History & Status Control) Table
CREATE TABLE IF NOT EXISTS bell_curve_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID NOT NULL REFERENCES bell_curve_configurations(configuration_id) ON DELETE CASCADE,
  appraisal_cycle_id UUID NOT NULL REFERENCES appraisal_cycles(appraisal_cycle_id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FROZEN', 'PUBLISHED')),
  generated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_cycle_run_number UNIQUE (appraisal_cycle_id, run_number)
);

-- 4. Results Table
CREATE TABLE IF NOT EXISTS bell_curve_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES bell_curve_runs(run_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  appraisal_score NUMERIC(5, 2) NOT NULL,
  original_bucket_id UUID REFERENCES bell_curve_buckets(bucket_id) ON DELETE SET NULL,
  current_bucket_id UUID REFERENCES bell_curve_buckets(bucket_id) ON DELETE SET NULL,
  is_override BOOLEAN DEFAULT false,
  override_reason TEXT,
  calibrated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  calibrated_date TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_run_employee UNIQUE (run_id, employee_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bell_curve_config ON bell_curve_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_bell_curve_buckets ON bell_curve_buckets(configuration_id);
CREATE INDEX IF NOT EXISTS idx_bell_curve_runs ON bell_curve_runs(appraisal_cycle_id);
CREATE INDEX IF NOT EXISTS idx_bell_curve_results_run ON bell_curve_results(run_id);
