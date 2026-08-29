-- Rename Late Arrival LOP columns to match user's final naming specifications
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_policies' AND column_name = 'late_arrivals_limit'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_policies' AND column_name = 'late_arrivals_threshold'
    ) THEN
        ALTER TABLE attendance_policies RENAME COLUMN late_arrivals_limit TO late_arrivals_threshold;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_policies' AND column_name = 'lop_days_deduction'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_policies' AND column_name = 'lop_days_per_threshold'
    ) THEN
        ALTER TABLE attendance_policies RENAME COLUMN lop_days_deduction TO lop_days_per_threshold;
    END IF;
END $$;
