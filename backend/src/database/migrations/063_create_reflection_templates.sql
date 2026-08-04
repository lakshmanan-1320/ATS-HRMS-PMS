-- 063_create_reflection_templates.sql
-- Create tables for dynamic reflection templates and employee reflection answers

CREATE TABLE IF NOT EXISTS goal_reflection_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  input_type VARCHAR(20) DEFAULT 'TEXTAREA', -- TEXTAREA, TEXT, SELECT
  display_order INT DEFAULT 1,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goal_reflection_answers (
  answer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES goal_reflection_templates(template_id) ON DELETE CASCADE,
  reflection_id UUID REFERENCES feedback_reflections(reflection_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  answer TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_reflection_templates_goal ON goal_reflection_templates(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_reflection_answers_goal ON goal_reflection_answers(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_reflection_answers_emp ON goal_reflection_answers(employee_id);
