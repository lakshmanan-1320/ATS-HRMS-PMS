-- Migration: 040_overtime_management.sql
-- Create overtime settings, overtime requests, and employee payroll overtime snapshot tables.

-- 1. Add eligibility flag to Employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS overtime_eligible BOOLEAN DEFAULT TRUE;

-- 2. Create overtime_settings Table
CREATE TABLE IF NOT EXISTS overtime_settings (
    overtime_setting_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    is_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
    requires_approval     BOOLEAN NOT NULL DEFAULT TRUE,
    calculation_method   VARCHAR(30) NOT NULL DEFAULT 'SALARY_MULTIPLIER', -- HOURLY_RATE, SALARY_MULTIPLIER
    hourly_rate_basis    VARCHAR(30) NOT NULL DEFAULT 'GROSS_STANDARD_HOURS', -- FIXED_RATE, GROSS_STANDARD_HOURS, GROSS_ACTUAL_HOURS
    standard_monthly_hours INTEGER NOT NULL DEFAULT 208,
    
    -- Multipliers for SALARY_MULTIPLIER method
    weekday_multiplier   NUMERIC(4,2) NOT NULL DEFAULT 1.50,
    weekend_multiplier   NUMERIC(4,2) NOT NULL DEFAULT 2.00,
    holiday_multiplier   NUMERIC(4,2) NOT NULL DEFAULT 2.50,
    
    -- Fixed rates for HOURLY_RATE method
    weekday_hourly_rate  NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    weekend_hourly_rate  NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    holiday_hourly_rate  NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    
    minimum_ot_minutes   INTEGER NOT NULL DEFAULT 0,
    rounding_rule        VARCHAR(30) NOT NULL DEFAULT 'EXACT', -- NEAREST_15_MIN, NEAREST_30_MIN, EXACT
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_overtime_settings_org UNIQUE (organization_id)
);

-- Index for settings by organization
CREATE INDEX IF NOT EXISTS idx_overtime_settings_org ON overtime_settings(organization_id);

-- 3. Create overtime_requests Table
CREATE TABLE IF NOT EXISTS overtime_requests (
    overtime_request_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id          UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    attendance_date      DATE NOT NULL,
    clock_out_time       TIMESTAMPTZ,
    requested_ot_minutes INTEGER NOT NULL DEFAULT 0,
    approved_ot_minutes  INTEGER DEFAULT NULL, -- NULL indicates pending
    day_type             VARCHAR(20) NOT NULL DEFAULT 'WEEKDAY', -- WEEKDAY, WEEKEND, HOLIDAY
    reason               TEXT,
    approval_status      VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED
    approved_by          UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at          TIMESTAMPTZ,
    remarks              TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index to prevent duplicate pending/approved requests per date, allowing resubmission if rejected/cancelled
CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_date_active_ot 
ON overtime_requests (employee_id, attendance_date) 
WHERE (approval_status IN ('PENDING', 'APPROVED'));

-- Indexes for request searches
CREATE INDEX IF NOT EXISTS idx_overtime_requests_emp ON overtime_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_org ON overtime_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_status ON overtime_requests(approval_status);

-- 4. Create employee_payroll_overtime Table (Snapshot metadata)
CREATE TABLE IF NOT EXISTS employee_payroll_overtime (
    employee_payroll_ot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_payroll_id    UUID NOT NULL REFERENCES employee_payrolls(employee_payroll_id) ON DELETE CASCADE,
    employee_id            UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    approved_hours         NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    hourly_rate            NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    multiplier             NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    ot_amount              NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    day_type               VARCHAR(20) NOT NULL DEFAULT 'WEEKDAY',
    created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed default OVERTIME component for all existing organizations
INSERT INTO payroll_components (organization_id, component_name, component_code, component_type, category, calculation_basis, default_value, display_order, include_in_gross, include_in_ctc, is_mandatory, is_active)
SELECT 
    o.organization_id, 
    'Overtime', 
    'OVERTIME', 
    'EARNING', 
    'ALLOWANCE',
    'FIXED_AMOUNT', 
    0.00, 
    10, 
    false, -- Exclude from base salary gross setup baseline
    true,  -- Include in total CTC
    false, 
    true
FROM organizations o
ON CONFLICT (organization_id, component_code) DO NOTHING;
