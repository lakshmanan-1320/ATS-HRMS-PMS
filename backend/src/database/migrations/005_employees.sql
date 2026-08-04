ALTER TABLE companies ADD COLUMN IF NOT EXISTS emp_code_prefix VARCHAR(10) DEFAULT 'EMP';

CREATE TABLE IF NOT EXISTS employees (
  employee_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  employee_code     VARCHAR(50) NOT NULL,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(50),
  gender            VARCHAR(20),
  date_of_birth     DATE,
  date_of_joining   DATE,
  department_id     UUID REFERENCES departments(department_id) ON DELETE SET NULL,
  designation       VARCHAR(100),
  employment_type   VARCHAR(30) DEFAULT 'full_time',
  status            VARCHAR(20) DEFAULT 'active',
  manager_id        UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, employee_code)
);
