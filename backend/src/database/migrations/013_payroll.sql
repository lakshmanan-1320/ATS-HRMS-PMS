-- Migration: 013_payroll.sql
-- Create weekly off settings, salary structures, salary assignments, payroll runs, employee payrolls, manual adjustments, and run logs.

-- 1. Create week_off_settings table
CREATE TABLE IF NOT EXISTS week_off_settings (
    week_off_setting_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    -- Array of integers representing week offs: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    week_off_days        INTEGER[] NOT NULL DEFAULT '{0, 6}',
    updated_by           UUID REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_week_off_org UNIQUE (organization_id)
);

-- 2. Create salary_structures table
CREATE TABLE IF NOT EXISTS salary_structures (
    salary_structure_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    structure_name           VARCHAR(100) NOT NULL,
    basic_salary             NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    hra_amount               NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    special_allowance_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    travel_allowance_amount  NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_active                BOOLEAN DEFAULT true,
    created_by_admin_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_basic_salary CHECK (basic_salary >= 0),
    CONSTRAINT chk_hra_amount CHECK (hra_amount >= 0),
    CONSTRAINT chk_special_allowance CHECK (special_allowance_amount >= 0),
    CONSTRAINT chk_travel_allowance CHECK (travel_allowance_amount >= 0)
);

-- 3. Create employee_salary_assignments table
CREATE TABLE IF NOT EXISTS employee_salary_assignments (
    assignment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id         UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    salary_structure_id UUID NOT NULL REFERENCES salary_structures(salary_structure_id) ON DELETE CASCADE,
    effective_from      DATE NOT NULL,
    effective_to        DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_effective_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- 4. Create payroll_runs table
CREATE TABLE IF NOT EXISTS payroll_runs (
    payroll_run_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id            UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    payroll_month              INTEGER NOT NULL,
    payroll_year               INTEGER NOT NULL,
    payroll_start_date         DATE NOT NULL,
    payroll_end_date           DATE NOT NULL,
    current_status             VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, GENERATED, APPROVED, LOCKED
    generated_by_admin_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    generated_at               TIMESTAMPTZ,
    approved_by_admin_user_id  UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at                TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_payroll_month CHECK (payroll_month >= 1 AND payroll_month <= 12),
    CONSTRAINT chk_payroll_year CHECK (payroll_year >= 2000),
    CONSTRAINT chk_payroll_dates CHECK (payroll_end_date >= payroll_start_date),
    CONSTRAINT uq_payroll_runs_org_month_year UNIQUE (organization_id, payroll_month, payroll_year)
);

-- 5. Create employee_payrolls table
CREATE TABLE IF NOT EXISTS employee_payrolls (
    employee_payroll_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id      UUID NOT NULL REFERENCES payroll_runs(payroll_run_id) ON DELETE CASCADE,
    employee_id         UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    salary_structure_id UUID NOT NULL REFERENCES salary_structures(salary_structure_id),
    working_days        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    present_days        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    paid_leave_days     NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    holiday_days        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    week_off_days       NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    lop_days            NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    gross_salary        NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_earnings      NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_deductions    NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_salary          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    current_status      VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, APPROVED, LOCKED
    payslip_url         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_payroll_run_employee UNIQUE (payroll_run_id, employee_id)
);

-- 6. Create payroll_adjustments table
CREATE TABLE IF NOT EXISTS payroll_adjustments (
    adjustment_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id               UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    payroll_run_id            UUID NOT NULL REFERENCES payroll_runs(payroll_run_id) ON DELETE CASCADE,
    adjustment_type           VARCHAR(30) NOT NULL, -- ADDITION, DEDUCTION
    adjustment_name           VARCHAR(100) NOT NULL,
    amount                    NUMERIC(12,2) NOT NULL,
    remarks                   TEXT,
    created_by_admin_user_id  UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_adjustment_type CHECK (adjustment_type IN ('ADDITION', 'DEDUCTION')),
    CONSTRAINT chk_adjustment_amount CHECK (amount > 0),
    CONSTRAINT uq_adjustment_run_employee_name UNIQUE (payroll_run_id, employee_id, adjustment_name)
);

-- 7. Create payroll_run_logs table
CREATE TABLE IF NOT EXISTS payroll_run_logs (
    log_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id    UUID NOT NULL REFERENCES payroll_runs(payroll_run_id) ON DELETE CASCADE,
    action            VARCHAR(50) NOT NULL, -- GENERATE, APPROVE, LOCK, REGENERATE, ADJUST
    action_taken_by   UUID REFERENCES users(user_id) ON DELETE SET NULL,
    remarks           TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_salary_structures_org ON salary_structures (organization_id);
CREATE INDEX IF NOT EXISTS idx_salary_assignments_emp ON employee_salary_assignments (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_payrolls_run ON employee_payrolls (payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_run ON payroll_adjustments (payroll_run_id);
