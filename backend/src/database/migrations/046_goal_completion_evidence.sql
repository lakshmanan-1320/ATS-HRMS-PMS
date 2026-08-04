-- Migration 046: Goal Completion Evidence & Verification Workflow
CREATE TABLE IF NOT EXISTS goal_completion_requests (
  goal_completion_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  completion_comments TEXT NOT NULL,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  manager_remarks TEXT,
  approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gcr_org ON goal_completion_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_gcr_goal ON goal_completion_requests(goal_id);
CREATE INDEX IF NOT EXISTS idx_gcr_emp ON goal_completion_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_gcr_status ON goal_completion_requests(status);

CREATE TABLE IF NOT EXISTS goal_completion_attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_completion_request_id UUID NOT NULL REFERENCES goal_completion_requests(goal_completion_request_id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gca_request ON goal_completion_attachments(goal_completion_request_id);

CREATE TABLE IF NOT EXISTS goal_completion_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_completion_request_id UUID NOT NULL REFERENCES goal_completion_requests(goal_completion_request_id) ON DELETE CASCADE,
  title VARCHAR(255),
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gcl_request ON goal_completion_links(goal_completion_request_id);

-- Update status check constraint on goals table to allow pending_verification
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_status_check;
ALTER TABLE goals ADD CONSTRAINT goals_status_check 
  CHECK (status IN ('draft','active','in_progress','submitted','approved','pending_verification','completed','rejected'));
