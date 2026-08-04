-- Migration 065: Create Relational Goal Assignments Model

CREATE TABLE IF NOT EXISTS goal_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  progress NUMERIC(5,2) DEFAULT 0.00,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT goal_assignments_org_goal_emp_unique UNIQUE (goal_id, employee_id),
  CONSTRAINT goal_assignments_status_check CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'))
);

-- Add assignment_id references to continuous feedback & reflection tables
ALTER TABLE goal_reflection_answers ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES goal_assignments(assignment_id) ON DELETE CASCADE;
ALTER TABLE feedback_entries ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES goal_assignments(assignment_id) ON DELETE CASCADE;
ALTER TABLE feedback_reflections ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES goal_assignments(assignment_id) ON DELETE CASCADE;
ALTER TABLE feedback_action_items ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES goal_assignments(assignment_id) ON DELETE CASCADE;
ALTER TABLE feedback_praises ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES goal_assignments(assignment_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_goal_assignments_goal_id ON goal_assignments(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_assignments_employee_id ON goal_assignments(employee_id);
