-- Leave Policy Settings: monthly limits and LOP mapping per leave type
ALTER TABLE leave_types
  ADD COLUMN IF NOT EXISTS monthly_limit_days NUMERIC(5,2) NULL,
  ADD COLUMN IF NOT EXISTS lop_leave_type_id  UUID NULL REFERENCES leave_types(leave_type_id) ON DELETE SET NULL;

-- Organization-level leave year and accrual settings (single-row singleton)
CREATE TABLE IF NOT EXISTS organization_leave_settings (
  id                    INTEGER PRIMARY KEY DEFAULT 1,
  leave_year_type       VARCHAR(20)  NOT NULL DEFAULT 'financial_year', -- 'financial_year' | 'calendar_year'
  leave_year_start_month INTEGER     NOT NULL DEFAULT 4,                -- 1-12; 4=April for FY, 1=Jan for CY
  pro_rata_on_join      BOOLEAN      NOT NULL DEFAULT true,
  auto_credit_on_join   BOOLEAN      NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT org_leave_settings_singleton CHECK (id = 1)
);

-- Seed default row if not present
INSERT INTO organization_leave_settings (id, leave_year_type, leave_year_start_month, pro_rata_on_join, auto_credit_on_join)
VALUES (1, 'financial_year', 4, true, true)
ON CONFLICT (id) DO NOTHING;

-- Index for monthly limit queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp_type_month
  ON leave_requests (employee_id, leave_type_id, start_date);
