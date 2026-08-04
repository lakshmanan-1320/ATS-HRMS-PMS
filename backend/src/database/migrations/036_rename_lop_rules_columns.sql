-- Rename Late Arrival LOP columns to match user's final naming specifications
ALTER TABLE attendance_policies RENAME COLUMN late_arrivals_limit TO late_arrivals_threshold;
ALTER TABLE attendance_policies RENAME COLUMN lop_days_deduction TO lop_days_per_threshold;
