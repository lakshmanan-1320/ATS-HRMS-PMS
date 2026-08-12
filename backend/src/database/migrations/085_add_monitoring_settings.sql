-- Migration 085: Complete Dynamic Monitoring Plan in PIP Module

-- 1. Add monitoring settings to pip_settings
ALTER TABLE pip_settings
  ADD COLUMN IF NOT EXISTS monitoring_duration_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS monitoring_checkin_frequency VARCHAR(50) NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN IF NOT EXISTS monitoring_max_extension_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS monitoring_close_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 80.00,
  ADD COLUMN IF NOT EXISTS monitoring_extend_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS monitoring_convert_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 50.00;

-- 2. Add parent_pip_id to pips (for linking converted active PIPs to original monitoring plans)
ALTER TABLE pips
  ADD COLUMN IF NOT EXISTS parent_pip_id UUID NULL REFERENCES pips(pip_id) ON DELETE SET NULL;

-- 3. Add direction, calculation_type, frequency, and active flags to pip_template_metrics and pip_metrics
ALTER TABLE pip_template_metrics
  ADD COLUMN IF NOT EXISTS direction VARCHAR(50) NOT NULL DEFAULT 'HIGHER_IS_BETTER' CHECK (direction IN ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER')),
  ADD COLUMN IF NOT EXISTS calculation_type VARCHAR(50) NOT NULL DEFAULT 'HIGHER_IS_BETTER' CHECK (calculation_type IN ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'BOOLEAN', 'PERCENTAGE', 'COUNT', 'RATING')),
  ADD COLUMN IF NOT EXISTS measurement_frequency VARCHAR(50) NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE pip_metrics
  ADD COLUMN IF NOT EXISTS direction VARCHAR(50) NOT NULL DEFAULT 'HIGHER_IS_BETTER' CHECK (direction IN ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER')),
  ADD COLUMN IF NOT EXISTS calculation_type VARCHAR(50) NOT NULL DEFAULT 'HIGHER_IS_BETTER' CHECK (calculation_type IN ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'BOOLEAN', 'PERCENTAGE', 'COUNT', 'RATING')),
  ADD COLUMN IF NOT EXISTS measurement_frequency VARCHAR(50) NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
