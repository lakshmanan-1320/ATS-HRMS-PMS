-- Migration: 039_salary_revisions.sql
-- Create salary revisions table linking versioned configs

CREATE TABLE IF NOT EXISTS salary_revisions (
  revision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  old_salary_config_id UUID REFERENCES employee_salary_configs(employee_salary_config_id) ON DELETE SET NULL,
  new_salary_config_id UUID REFERENCES employee_salary_configs(employee_salary_config_id) ON DELETE CASCADE,
  increment_amount DECIMAL(12,2) NOT NULL,
  increment_percentage DECIMAL(8,2) NOT NULL,
  effective_from DATE NOT NULL,
  reason VARCHAR(255) NOT NULL,
  remarks TEXT,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, EFFECTIVE, CANCELLED
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE,
  CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_salary_revisions_org_emp ON salary_revisions (organization_id, employee_id);
