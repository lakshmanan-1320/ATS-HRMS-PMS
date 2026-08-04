-- Migration 045: Add is_temporary column to shift_assignments
ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_shift_assignments_temp 
ON shift_assignments(employee_id, is_temporary, effective_from, effective_to);
