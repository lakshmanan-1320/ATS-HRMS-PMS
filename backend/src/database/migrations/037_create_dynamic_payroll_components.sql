-- Migration: 037_create_dynamic_payroll_components.sql
-- Create dynamic payroll components, employee salary configurations, and payslip components snapshot.

-- 1. Create payroll_components table
CREATE TABLE IF NOT EXISTS payroll_components (
    component_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    component_name         VARCHAR(100) NOT NULL,
    component_code         VARCHAR(50) NOT NULL,
    component_type         VARCHAR(30) NOT NULL, -- EARNING, DEDUCTION, EMPLOYER_CONTRIBUTION
    category               VARCHAR(50) NOT NULL DEFAULT 'ALLOWANCE', -- STATUTORY, ALLOWANCE, REIMBURSEMENT, BONUS, OVERTIME, TAX, LOAN, RECOVERY
    calculation_basis      VARCHAR(30) NOT NULL, -- FIXED_AMOUNT, GROSS, BASIC, COMPONENT, FORMULA
    reference_component_id UUID REFERENCES payroll_components(component_id) ON DELETE SET NULL,
    default_value          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    display_order          INTEGER NOT NULL DEFAULT 0,
    is_taxable             BOOLEAN DEFAULT false,
    include_in_ctc         BOOLEAN DEFAULT true,
    include_in_gross       BOOLEAN DEFAULT true,
    is_mandatory           BOOLEAN DEFAULT false,
    is_active              BOOLEAN DEFAULT true,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_component_code UNIQUE (organization_id, component_code),
    CONSTRAINT chk_component_type CHECK (component_type IN ('EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION')),
    CONSTRAINT chk_calculation_basis CHECK (calculation_basis IN ('FIXED_AMOUNT', 'GROSS', 'BASIC', 'COMPONENT', 'FORMULA'))
);

-- 2. Create employee_salary_configs table (Salary Versioning)
CREATE TABLE IF NOT EXISTS employee_salary_configs (
    employee_salary_config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id               UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    organization_id           UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    salary_type               VARCHAR(20) NOT NULL DEFAULT 'MONTHLY_GROSS', -- MONTHLY_GROSS, ANNUAL_CTC
    gross_salary              NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    ctc_amount                NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    effective_from            DATE NOT NULL,
    effective_to              DATE,
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_salary_type CHECK (salary_type IN ('MONTHLY_GROSS', 'ANNUAL_CTC')),
    CONSTRAINT chk_config_effective_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- 3. Create employee_salary_components table (Values for each version)
CREATE TABLE IF NOT EXISTS employee_salary_components (
    employee_salary_component_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_salary_config_id    UUID NOT NULL REFERENCES employee_salary_configs(employee_salary_config_id) ON DELETE CASCADE,
    component_id                 UUID NOT NULL REFERENCES payroll_components(component_id) ON DELETE CASCADE,
    percentage                   NUMERIC(5,2),
    fixed_amount                 NUMERIC(12,2),
    calculated_amount            NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_manual                    BOOLEAN DEFAULT false,
    created_at                   TIMESTAMPTZ DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_config_component UNIQUE (employee_salary_config_id, component_id)
);

-- 4. Create employee_payroll_components table (Payslip snapshots)
CREATE TABLE IF NOT EXISTS employee_payroll_components (
    employee_payroll_component_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_payroll_id           UUID NOT NULL REFERENCES employee_payrolls(employee_payroll_id) ON DELETE CASCADE,
    component_id                  UUID NOT NULL REFERENCES payroll_components(component_id) ON DELETE RESTRICT,
    component_name                VARCHAR(100) NOT NULL,
    component_code                VARCHAR(50) NOT NULL,
    component_type                VARCHAR(30) NOT NULL,
    category                      VARCHAR(50) NOT NULL,
    calculated_amount             NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    actual_amount                 NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Make salary_structure_id nullable on employee_payrolls for dynamic payroll configurations
ALTER TABLE employee_payrolls ALTER COLUMN salary_structure_id DROP NOT NULL;

-- 6. Seed default payroll components for all existing organizations
INSERT INTO payroll_components (organization_id, component_name, component_code, component_type, category, calculation_basis, default_value, display_order, include_in_gross, include_in_ctc, is_mandatory, is_active)
SELECT 
    o.organization_id, 
    c.name, 
    c.code, 
    c.type, 
    c.category,
    c.basis, 
    c.val, 
    c.ord, 
    c.inc_gross, 
    c.inc_ctc, 
    true, 
    true
FROM organizations o
CROSS JOIN (VALUES
    ('Basic Salary', 'BASIC', 'EARNING', 'ALLOWANCE', 'GROSS', 40.00, 1, true, true),
    ('HRA', 'HRA', 'EARNING', 'ALLOWANCE', 'BASIC', 50.00, 2, true, true),
    ('Special Allowance', 'SPECIAL_ALLOWANCE', 'EARNING', 'ALLOWANCE', 'FIXED_AMOUNT', 0.00, 3, true, true),
    ('PF Employee Contribution', 'PF', 'DEDUCTION', 'STATUTORY', 'BASIC', 12.00, 4, false, false),
    ('Professional Tax', 'PROFESSIONAL_TAX', 'DEDUCTION', 'TAX', 'FIXED_AMOUNT', 200.00, 5, false, false)
) AS c(name, code, type, category, basis, val, ord, inc_gross, inc_ctc)
ON CONFLICT (organization_id, component_code) DO NOTHING;

-- 7. Add self-referential foreign keys for seeded components where calculation basis is BASIC
-- Specifically, link HRA (Basis = BASIC) to BASIC component_id
UPDATE payroll_components h
SET reference_component_id = b.component_id
FROM payroll_components b
WHERE h.organization_id = b.organization_id
  AND h.component_code = 'HRA'
  AND b.component_code = 'BASIC';

-- Link PF (Basis = BASIC) to BASIC component_id
UPDATE payroll_components p
SET reference_component_id = b.component_id
FROM payroll_components b
WHERE p.organization_id = b.organization_id
  AND p.component_code = 'PF'
  AND b.component_code = 'BASIC';

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_payroll_components_org ON payroll_components(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_configs_emp ON employee_salary_configs(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_components_cfg ON employee_salary_components(employee_salary_config_id);
CREATE INDEX IF NOT EXISTS idx_employee_payroll_components_ep ON employee_payroll_components(employee_payroll_id);
