-- Migration 041: Add effective_to column to shift_assignments for shift timeline history

ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS effective_to DATE NULL;

-- Index for date-range shift resolution
CREATE INDEX IF NOT EXISTS idx_shift_assignments_timeline ON shift_assignments(employee_id, effective_from, effective_to);
