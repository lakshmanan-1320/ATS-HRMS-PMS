-- Migration 084: Add Calibration Scope (Organization & Department) to Bell Curve Runs

ALTER TABLE bell_curve_runs 
  ADD COLUMN IF NOT EXISTS scope_type VARCHAR(50) NOT NULL DEFAULT 'ORGANIZATION' CHECK (scope_type IN ('ORGANIZATION', 'DEPARTMENT')),
  ADD COLUMN IF NOT EXISTS scope_reference_id UUID NULL;

-- Index for optimized filtering
CREATE INDEX IF NOT EXISTS idx_bell_curve_runs_scope ON bell_curve_runs(scope_type, scope_reference_id);
