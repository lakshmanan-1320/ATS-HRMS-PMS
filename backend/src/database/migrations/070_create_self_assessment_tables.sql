-- Migration 070: Create Self Assessment Model & Tables

-- 1. Create Self Assessment Templates
CREATE TABLE IF NOT EXISTS self_assessment_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- LONG_TEXT, SHORT_TEXT, NUMBER, CURRENCY, URL, DATE, PERCENTAGE, RATING_1_5, SCALE_1_10, YES_NO, MULTIPLE_CHOICE, CHECKBOX, FILE_UPLOAD, SIGNATURE
  display_order INT NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  weight NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  options_json JSONB, -- For instructions, choices, max_rating, evidence_required, attachments_required, etc.
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on self_assessment_templates
CREATE INDEX IF NOT EXISTS idx_sa_templates_goal ON self_assessment_templates(goal_id);

-- 2. Create Self Assessment Submissions
CREATE TABLE IF NOT EXISTS self_assessment_submissions (
  submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES goal_assignments(assignment_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, RETURNED, APPROVED
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  overall_employee_score NUMERIC(5,2) DEFAULT NULL,
  overall_manager_score NUMERIC(5,2) DEFAULT NULL,
  final_score NUMERIC(5,2) DEFAULT NULL,
  employee_comments TEXT,
  manager_comments TEXT,
  employee_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT self_assessment_submissions_assignment_unique UNIQUE (assignment_id)
);

-- Indexes on submissions
CREATE INDEX IF NOT EXISTS idx_sa_submissions_goal ON self_assessment_submissions(goal_id);
CREATE INDEX IF NOT EXISTS idx_sa_submissions_assignment ON self_assessment_submissions(assignment_id);

-- 3. Create Self Assessment Answers
CREATE TABLE IF NOT EXISTS self_assessment_answers (
  answer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES self_assessment_submissions(submission_id) ON DELETE CASCADE,
  template_id UUID REFERENCES self_assessment_templates(template_id) ON DELETE SET NULL,
  answer TEXT,
  employee_rating NUMERIC(5,2),
  manager_rating NUMERIC(5,2),
  manager_comment TEXT,
  employee_comment TEXT,
  weight NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  weighted_score NUMERIC(5,2) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT self_assessment_answers_submission_template_unique UNIQUE (submission_id, template_id)
);

-- Index on answers
CREATE INDEX IF NOT EXISTS idx_sa_answers_submission ON self_assessment_answers(submission_id);

-- 4. Create Self Assessment Attachments (Evidence)
CREATE TABLE IF NOT EXISTS self_assessment_attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  answer_id UUID NOT NULL REFERENCES self_assessment_answers(answer_id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  storage_path VARCHAR(500) NOT NULL,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED
  manager_feedback TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on attachments
CREATE INDEX IF NOT EXISTS idx_sa_attachments_answer ON self_assessment_attachments(answer_id);

-- 5. Seed default configurations for all existing organizations
INSERT INTO performance_technique_configurations (organization_id, technique, configuration_json)
SELECT 
  organization_id, 
  'SELF_ASSESSMENT', 
  '{"employee_weight": 40, "manager_weight": 60}'::jsonb
FROM organizations
ON CONFLICT (organization_id, technique) DO NOTHING;
