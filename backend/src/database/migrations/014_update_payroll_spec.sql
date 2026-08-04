-- Migration: 014_update_payroll_spec.sql
-- Update salary structures, employees, payroll runs, employee payrolls, and payroll adjustments.

-- 1. Add medical allowance to salary_structures
ALTER TABLE salary_structures 
ADD COLUMN IF NOT EXISTS medical_allowance_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00;

-- 2. Add compliance fields and extend father name length in employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS uan_number VARCHAR(30),
ADD COLUMN IF NOT EXISTS esi_number VARCHAR(30);

ALTER TABLE employees 
ALTER COLUMN father_name TYPE VARCHAR(150);

-- 3. Add locked audit fields to payroll_runs
ALTER TABLE payroll_runs
ADD COLUMN IF NOT EXISTS locked_by_admin_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- 4. Add spec-matching snapshot fields and audit columns to employee_payrolls
ALTER TABLE employee_payrolls
ADD COLUMN IF NOT EXISTS total_additions NUMERIC(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payslip_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS payslip_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payslip_generated_by UUID REFERENCES users(user_id) ON DELETE SET NULL;

-- 5. Drop and recreate payroll_adjustments to link directly to employee_payrolls snapshot
DROP TABLE IF EXISTS payroll_adjustments CASCADE;

CREATE TABLE payroll_adjustments (
    adjustment_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_payroll_id       UUID NOT NULL REFERENCES employee_payrolls(employee_payroll_id) ON DELETE CASCADE,
    adjustment_type           VARCHAR(20) NOT NULL, -- ADDITION, DEDUCTION
    adjustment_name           VARCHAR(100) NOT NULL,
    amount                    NUMERIC(12,2) NOT NULL,
    remarks                   TEXT,
    created_by_admin_user_id  UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_adjustment_type CHECK (adjustment_type IN ('ADDITION', 'DEDUCTION')),
    CONSTRAINT chk_adjustment_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_ep ON payroll_adjustments (employee_payroll_id);
