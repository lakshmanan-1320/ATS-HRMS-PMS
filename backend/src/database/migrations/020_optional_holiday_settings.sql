-- Optional Holiday Eligibility Management
-- Adds configurable optional holiday quota to organization settings

ALTER TABLE organization_leave_settings
  ADD COLUMN IF NOT EXISTS optional_holiday_max_days INTEGER  NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS optional_holiday_pro_rata BOOLEAN  NOT NULL DEFAULT true;

-- Per-employee optional holiday balance per leave year
CREATE TABLE IF NOT EXISTS employee_optional_holiday_balances (
  id             BIGSERIAL    PRIMARY KEY,
  employee_id    UUID         NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  leave_year     INTEGER      NOT NULL,
  allocated_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  used_days      NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, leave_year)
);

-- Tracks which specific optional holidays each employee has availed
CREATE TABLE IF NOT EXISTS employee_optional_holiday_avails (
  id          BIGSERIAL    PRIMARY KEY,
  employee_id UUID         NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  holiday_id  UUID         NOT NULL REFERENCES holidays(holiday_id) ON DELETE CASCADE,
  leave_year  INTEGER      NOT NULL,
  availed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, holiday_id)
);

CREATE INDEX IF NOT EXISTS idx_emp_oh_balance_emp_year
  ON employee_optional_holiday_balances (employee_id, leave_year);

CREATE INDEX IF NOT EXISTS idx_emp_oh_avails_emp
  ON employee_optional_holiday_avails (employee_id, leave_year);
