-- Migration 030: Leave Plans and Transaction Ledger

-- 1. Create leave_plans table
CREATE TABLE IF NOT EXISTS leave_plans (
    leave_plan_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    leave_year_type VARCHAR(20) DEFAULT 'calendar_year', -- 'calendar_year' | 'financial_year'
    start_month     INTEGER DEFAULT 1,                  -- Jan (1), Apr (4)
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create leave_plan_types table (maps leave types with plan-specific quotas & rules)
CREATE TABLE IF NOT EXISTS leave_plan_types (
    leave_plan_type_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_plan_id           UUID NOT NULL REFERENCES leave_plans(leave_plan_id) ON DELETE CASCADE,
    leave_type_id           UUID NOT NULL REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    quota_days              NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    accrual_type            VARCHAR(20) DEFAULT 'ANNUAL', -- 'ANNUAL', 'MONTHLY', 'QUARTERLY'
    carry_forward_rule      VARCHAR(30) DEFAULT 'LAPSE', -- 'LAPSE', 'CARRY_FORWARD_ALL', 'CARRY_FORWARD_LIMIT'
    max_carry_forward_days  NUMERIC(5,2) DEFAULT 0.00,
    encashment_rule         VARCHAR(30) DEFAULT 'NONE',  -- 'NONE', 'ENCASH_ALL', 'ENCASH_LIMIT'
    max_encash_days         NUMERIC(5,2) DEFAULT 0.00,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_plan_type UNIQUE (leave_plan_id, leave_type_id)
);

-- 3. Create leave_ledger_entries table (ledger model for balance history)
CREATE TABLE IF NOT EXISTS leave_ledger_entries (
    ledger_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id   UUID NOT NULL REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    financial_year  INTEGER NOT NULL,
    transaction_type VARCHAR(30) NOT NULL, -- 'ACCRUAL', 'AWARDED', 'USED', 'ADJUSTMENT', 'CARRY_FORWARD', 'ENCASHMENT', 'LAPSE'
    days            NUMERIC(5,2) NOT NULL, -- positive for credits, negative for debits
    reference_id    UUID,                 -- links to leave_request_id, adjustment_id, etc.
    remarks         TEXT,
    created_by      UUID,                 -- links to user_id of admin or system (NULL)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_ledger_emp_type_fy
ON leave_ledger_entries (employee_id, leave_type_id, financial_year);

-- 4. Create leave_year_end_logs table (handles Year-End status locking)
CREATE TABLE IF NOT EXISTS leave_year_end_logs (
    log_id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_plan_id               UUID NOT NULL REFERENCES leave_plans(leave_plan_id) ON DELETE CASCADE,
    processed_year              INTEGER NOT NULL,
    status                      VARCHAR(20) DEFAULT 'RUNNING', -- 'RUNNING', 'COMPLETED', 'FAILED'
    processed_by_admin_user_id UUID NOT NULL,
    remarks                     TEXT,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_plan_year UNIQUE (leave_plan_id, processed_year)
);

-- 5. Create leave_accrual_runs table (registry for job execution tracking)
CREATE TABLE IF NOT EXISTS leave_accrual_runs (
    run_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    accrual_period  VARCHAR(20) NOT NULL, -- e.g. "2026-06"
    status          VARCHAR(20) DEFAULT 'RUNNING', -- 'RUNNING', 'COMPLETED', 'FAILED'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create leave_encashments table (financial integration parameters)
CREATE TABLE IF NOT EXISTS leave_encashments (
    encashment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id       UUID NOT NULL REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    financial_year      INTEGER NOT NULL,
    encashed_days       NUMERIC(5,2) NOT NULL,
    encash_rate         NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    amount              NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payroll_status      VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'PROCESSED'
    processed_date      DATE NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Modify employees table to add leave_plan_id reference
ALTER TABLE employees ADD COLUMN IF NOT EXISTS leave_plan_id UUID REFERENCES leave_plans(leave_plan_id) ON DELETE RESTRICT;

-- Index for employee leave plans
CREATE INDEX IF NOT EXISTS idx_employees_leave_plan ON employees(leave_plan_id);

-- 8. Data Migration & Seeding Routine
DO $$
DECLARE
    org_rec RECORD;
    plan_id UUID;
    type_rec RECORD;
    emp_rec RECORD;
    bal_rec RECORD;
    fy_year INTEGER;
BEGIN
    -- Query financial/calendar year threshold (e.g. current year 2026)
    fy_year := EXTRACT(YEAR FROM NOW())::integer;

    FOR org_rec IN SELECT organization_id FROM organizations LOOP
        -- A. Insert Default Standard Leave Plan for this org
        INSERT INTO leave_plans (organization_id, name, description, leave_year_type, start_month, is_active)
        VALUES (
            org_rec.organization_id,
            'Standard Leave Plan',
            'Organization default standard leave plan (Calendar Year: Jan - Dec)',
            'calendar_year',
            1,
            TRUE
        )
        RETURNING leave_plan_id INTO plan_id;

        -- B. Map all active leave types to this default plan
        FOR type_rec IN SELECT leave_type_id, annual_quota_days, monthly_limit_days, is_paid_leave FROM leave_types WHERE is_active = true LOOP
            INSERT INTO leave_plan_types (
                leave_plan_id, leave_type_id, quota_days, accrual_type,
                carry_forward_rule, max_carry_forward_days, encashment_rule, max_encash_days
            )
            VALUES (
                plan_id,
                type_rec.leave_type_id,
                type_rec.annual_quota_days,
                'ANNUAL', -- Default to annual accrual for legacy compatibility
                CASE WHEN type_rec.is_paid_leave = true THEN 'CARRY_FORWARD_LIMIT' ELSE 'LAPSE' END,
                CASE WHEN type_rec.is_paid_leave = true THEN 10.00 ELSE 0.00 END,
                'NONE',
                0.00
            )
            ON CONFLICT (leave_plan_id, leave_type_id) DO NOTHING;
        END LOOP;

        -- C. Assign all active employees of this organization to this plan
        UPDATE employees
        SET leave_plan_id = plan_id
        WHERE organization_id = org_rec.organization_id AND leave_plan_id IS NULL;

        -- D. Backfill historical and current balances as transactional ledger entries
        FOR emp_rec IN SELECT employee_id FROM employees WHERE organization_id = org_rec.organization_id LOOP
            FOR bal_rec IN SELECT leave_type_id, financial_year, allocated_days, used_days FROM employee_leave_balances WHERE employee_id = emp_rec.employee_id LOOP
                -- Add credit entry for legacy allocated_days
                IF bal_rec.allocated_days > 0 THEN
                    INSERT INTO leave_ledger_entries (employee_id, leave_type_id, financial_year, transaction_type, days, remarks)
                    VALUES (emp_rec.employee_id, bal_rec.leave_type_id, bal_rec.financial_year, 'AWARDED', bal_rec.allocated_days, 'Initial legacy allocation backfill');
                END IF;

                -- Add debit entry for legacy used_days
                IF bal_rec.used_days > 0 THEN
                    INSERT INTO leave_ledger_entries (employee_id, leave_type_id, financial_year, transaction_type, days, remarks)
                    VALUES (emp_rec.employee_id, bal_rec.leave_type_id, bal_rec.financial_year, 'USED', -bal_rec.used_days, 'Initial legacy usage backfill');
                END IF;
            END LOOP;
        END LOOP;

    END LOOP;
END $$;
