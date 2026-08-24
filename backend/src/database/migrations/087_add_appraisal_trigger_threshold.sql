-- Migration 087: Add appraisal_trigger_threshold_pct to pip_settings table

ALTER TABLE pip_settings
  ADD COLUMN IF NOT EXISTS appraisal_trigger_threshold_pct NUMERIC(5, 2) DEFAULT 50.00;
