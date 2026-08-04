-- Migration 072: Create 360° Feedback Tables

-- 1. Per-goal reviewer configuration
CREATE TABLE IF NOT EXISTS feedback_goal_config (
  feedback_goal_config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  allow_manager BOOLEAN NOT NULL DEFAULT TRUE,
  manager_count INT NOT NULL DEFAULT 1,
  allow_peers BOOLEAN NOT NULL DEFAULT TRUE,
  peer_count INT NOT NULL DEFAULT 3,
  allow_direct_reports BOOLEAN NOT NULL DEFAULT TRUE,
  direct_report_count INT NOT NULL DEFAULT 2,
  allow_external BOOLEAN NOT NULL DEFAULT FALSE,
  external_count INT NOT NULL DEFAULT 0,
  anonymous_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reviewer_deadline TIMESTAMPTZ,
  reminder_interval_days INT NOT NULL DEFAULT 3,
  late_submission_policy VARCHAR(50) NOT NULL DEFAULT 'BLOCK',
  manager_weight NUMERIC(5,2) NOT NULL DEFAULT 40.00,
  peer_weight NUMERIC(5,2) NOT NULL DEFAULT 40.00,
  direct_report_weight NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  external_weight NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  minimum_completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feedback_goal_config_goal_unique UNIQUE (goal_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_goal_config_org ON feedback_goal_config(organization_id);

-- 2. Questionnaire templates per goal
CREATE TABLE IF NOT EXISTS feedback_templates (
  feedback_template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  weight NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  options_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_templates_goal ON feedback_templates(goal_id);

-- 3. Reviewer participants per assignment
CREATE TABLE IF NOT EXISTS feedback_participants (
  feedback_participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES goal_assignments(assignment_id) ON DELETE CASCADE,
  reviewer_employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  declined BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  last_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feedback_participants_relationship_check
    CHECK (relationship_type IN ('MANAGER', 'PEER', 'DIRECT_REPORT', 'EXTERNAL')),
  CONSTRAINT feedback_participants_status_check
    CHECK (status IN ('PENDING', 'SUBMITTED', 'EXPIRED', 'DECLINED')),
  CONSTRAINT feedback_participants_assignment_reviewer_unique
    UNIQUE (assignment_id, reviewer_employee_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_participants_assignment ON feedback_participants(assignment_id);
CREATE INDEX IF NOT EXISTS idx_feedback_participants_reviewer ON feedback_participants(reviewer_employee_id);

-- 4. Answers per participant per question
CREATE TABLE IF NOT EXISTS feedback_answers (
  feedback_answer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_participant_id UUID NOT NULL REFERENCES feedback_participants(feedback_participant_id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES feedback_templates(feedback_template_id) ON DELETE CASCADE,
  rating NUMERIC(5,2),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feedback_answers_participant_question_unique
    UNIQUE (feedback_participant_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_answers_participant ON feedback_answers(feedback_participant_id);

-- 5. Calculated summary per assignment (backend only)
CREATE TABLE IF NOT EXISTS feedback_summary (
  feedback_summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES goal_assignments(assignment_id) ON DELETE CASCADE,
  manager_average NUMERIC(5,2),
  peer_average NUMERIC(5,2),
  direct_report_average NUMERIC(5,2),
  external_average NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  completion_percentage NUMERIC(5,2),
  final_score NUMERIC(5,2),
  results_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feedback_summary_assignment_unique UNIQUE (assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_summary_assignment ON feedback_summary(assignment_id);

-- 6. Seed default org-level configuration
INSERT INTO performance_technique_configurations (organization_id, technique, configuration_json)
SELECT
  organization_id,
  '360_FEEDBACK',
  '{
    "manager_weight": 40,
    "peer_weight": 40,
    "direct_report_weight": 20,
    "external_weight": 0,
    "anonymous_default": false,
    "reminder_interval_days": 3,
    "late_submission_policy": "BLOCK",
    "minimum_completion_percentage": 100
  }'::jsonb
FROM organizations
ON CONFLICT (organization_id, technique) DO NOTHING;
