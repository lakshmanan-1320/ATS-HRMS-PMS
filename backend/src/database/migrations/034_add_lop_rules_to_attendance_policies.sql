-- Add Late Arrival to LOP configuration fields to attendance_policies table
ALTER TABLE attendance_policies ADD COLUMN IF NOT EXISTS enable_late_arrival_lop BOOLEAN DEFAULT FALSE;
ALTER TABLE attendance_policies ADD COLUMN IF NOT EXISTS late_arrivals_limit INTEGER DEFAULT 0;
ALTER TABLE attendance_policies ADD COLUMN IF NOT EXISTS lop_days_deduction DECIMAL(4,2) DEFAULT 0.00;
