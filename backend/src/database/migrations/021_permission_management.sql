-- Permission Management
-- Employees receive 2 permissions (2 hours each) credited on 1st of every month

CREATE TABLE IF NOT EXISTS employee_permission_balances (
  balance_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID        NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  month           INTEGER     NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            INTEGER     NOT NULL,
  allocated_count INTEGER     NOT NULL DEFAULT 2,
  used_count      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, month, year)
);

CREATE TABLE IF NOT EXISTS permission_requests (
  permission_request_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id             UUID        NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  manager_employee_id     UUID        REFERENCES employees(employee_id),
  permission_date         DATE        NOT NULL,
  start_time              TIME        NOT NULL,
  end_time                TIME        NOT NULL,
  duration_hours          NUMERIC(3,2) NOT NULL DEFAULT 2.00,
  reason                  TEXT,
  status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  approved_by_employee_id UUID        REFERENCES employees(employee_id),
  approved_at             TIMESTAMPTZ,
  rejection_reason        TEXT,
  month                   INTEGER     NOT NULL,
  year                    INTEGER     NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perm_balance_emp_month
  ON employee_permission_balances (employee_id, month, year);

CREATE INDEX IF NOT EXISTS idx_perm_requests_emp
  ON permission_requests (employee_id, month, year);

CREATE INDEX IF NOT EXISTS idx_perm_requests_manager
  ON permission_requests (manager_employee_id);

CREATE INDEX IF NOT EXISTS idx_perm_requests_status
  ON permission_requests (status);
