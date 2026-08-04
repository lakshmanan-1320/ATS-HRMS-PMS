-- Migration 060: KPI Submissions, Attachments, Links and Tasks

-- 1. Alter goal_kpis table to use approved columns and completion_percentage
ALTER TABLE goal_kpis DROP COLUMN IF EXISTS current_value CASCADE;
ALTER TABLE goal_kpis DROP COLUMN IF EXISTS current_text CASCADE;
ALTER TABLE goal_kpis DROP COLUMN IF EXISTS current_boolean CASCADE;
ALTER TABLE goal_kpis DROP COLUMN IF EXISTS progress_percentage CASCADE;

ALTER TABLE goal_kpis ADD COLUMN IF NOT EXISTS approved_value NUMERIC(18, 4) DEFAULT 0.0000;
ALTER TABLE goal_kpis ADD COLUMN IF NOT EXISTS approved_text TEXT;
ALTER TABLE goal_kpis ADD COLUMN IF NOT EXISTS approved_boolean BOOLEAN;
ALTER TABLE goal_kpis ADD COLUMN IF NOT EXISTS completion_percentage NUMERIC(5, 2) DEFAULT 0.00 CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

-- Make sure CHECKLIST is in measurement check constraints
ALTER TABLE goal_kpis DROP CONSTRAINT IF EXISTS goal_kpis_measurement_type_check;
ALTER TABLE goal_kpis ADD CONSTRAINT goal_kpis_measurement_type_check 
  CHECK (measurement_type IN ('CHECKLIST', 'PERCENTAGE', 'NUMBER', 'CURRENCY', 'BOOLEAN', 'TEXT'));

-- 2. Create goal_kpi_tasks table to support checklist tasks
CREATE TABLE IF NOT EXISTS goal_kpi_tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES goal_kpis(kpi_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create goal_kpi_submissions table
CREATE TABLE IF NOT EXISTS goal_kpi_submissions (
  submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  kpi_id UUID NOT NULL REFERENCES goal_kpis(kpi_id) ON DELETE CASCADE,
  
  -- Values submitted
  submitted_value NUMERIC(18, 4),
  submitted_text TEXT,
  submitted_boolean BOOLEAN,
  
  comment TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
  review_due_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 days'),
  submitted_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  review_comment TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 4. Create goal_kpi_submission_attachments table (proofs)
CREATE TABLE IF NOT EXISTS goal_kpi_submission_attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES goal_kpi_submissions(submission_id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create goal_kpi_submission_links table (Jira, Figma, etc.)
CREATE TABLE IF NOT EXISTS goal_kpi_submission_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES goal_kpi_submissions(submission_id) ON DELETE CASCADE,
  link_name VARCHAR(100) NOT NULL,
  link_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create goal_progress_history table
CREATE TABLE IF NOT EXISTS goal_progress_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  old_progress NUMERIC(5, 2) NOT NULL,
  new_progress NUMERIC(5, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  comment TEXT,
  updated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_tasks_kpi ON goal_kpi_tasks(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_subs_kpi ON goal_kpi_submissions(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_subs_status ON goal_kpi_submissions(status);
CREATE INDEX IF NOT EXISTS idx_goal_progress_hist ON goal_progress_history(goal_id);
