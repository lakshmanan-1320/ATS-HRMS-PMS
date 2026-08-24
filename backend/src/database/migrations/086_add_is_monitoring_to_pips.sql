-- Migration 086: Add is_monitoring to pips table

ALTER TABLE pips
  ADD COLUMN IF NOT EXISTS is_monitoring BOOLEAN NOT NULL DEFAULT FALSE;
