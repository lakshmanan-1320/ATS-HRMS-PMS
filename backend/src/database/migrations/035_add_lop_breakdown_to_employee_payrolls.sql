-- Add LOP breakdown fields to employee_payrolls table
ALTER TABLE employee_payrolls ADD COLUMN IF NOT EXISTS lop_days_absence NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE employee_payrolls ADD COLUMN IF NOT EXISTS lop_days_late NUMERIC(5,2) DEFAULT 0.00;
