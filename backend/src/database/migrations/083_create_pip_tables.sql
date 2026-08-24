-- Migration 083: Create PIP (Performance Improvement Plan) Module Tables

-- 1. PIP Settings (Global / Organization configurations)
CREATE TABLE IF NOT EXISTS pip_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(organization_id) ON DELETE CASCADE,
  enable_pip BOOLEAN NOT NULL DEFAULT TRUE,
  allow_manager_initiation BOOLEAN NOT NULL DEFAULT TRUE,
  require_hr_approval BOOLEAN NOT NULL DEFAULT TRUE,
  allow_manual_creation BOOLEAN NOT NULL DEFAULT TRUE,
  enable_monitoring BOOLEAN NOT NULL DEFAULT TRUE,
  allow_extension BOOLEAN NOT NULL DEFAULT TRUE,
  max_extension_count INTEGER NOT NULL DEFAULT 2,
  default_duration_days INTEGER NOT NULL DEFAULT 60,
  default_checkin_frequency VARCHAR(50) NOT NULL DEFAULT 'WEEKLY',
  reminder_frequency_days INTEGER NOT NULL DEFAULT 7,
  enable_recommendation_engine BOOLEAN NOT NULL DEFAULT TRUE,
  close_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 80.00,
  extend_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  escalate_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PIP Bell Curve Settings (Ties bucket and/or minimum appraisal score to PIP candidate eligibility)
CREATE TABLE IF NOT EXISTS pip_bell_curve_settings (
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  bucket_id UUID NOT NULL REFERENCES bell_curve_buckets(bucket_id) ON DELETE CASCADE,
  min_appraisal_score NUMERIC(5, 2),
  PRIMARY KEY (organization_id, bucket_id)
);

-- 3. PIP Templates
CREATE TABLE IF NOT EXISTS pip_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 60,
  checkin_frequency VARCHAR(50) NOT NULL DEFAULT 'WEEKLY',
  completion_threshold_pct NUMERIC(5, 2) NOT NULL DEFAULT 80.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PIP Template Metrics
CREATE TABLE IF NOT EXISTS pip_template_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES pip_templates(template_id) ON DELETE CASCADE,
  metric_name VARCHAR(255) NOT NULL,
  metric_source VARCHAR(50) NOT NULL CHECK (metric_source IN ('ATTENDANCE', 'GOAL', 'KPI', 'COMPETENCY', 'CONTINUOUS_REVIEW', 'SELF_ASSESSMENT', 'FEEDBACK_360', 'MANUAL', 'CUSTOM')),
  metric_key VARCHAR(255),
  target_type VARCHAR(50) NOT NULL DEFAULT 'PERCENTAGE',
  default_target NUMERIC(10, 2) NOT NULL,
  weight NUMERIC(5, 2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
  display_order INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PIP Candidate Queue
CREATE TABLE IF NOT EXISTS pip_candidates (
  candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL CHECK (source IN ('BELL_CURVE', 'APPRAISAL', 'MANUAL', 'MANAGER_RECOMMENDATION')),
  source_reference_id UUID,
  appraisal_score NUMERIC(5, 2),
  bell_curve_bucket_id UUID REFERENCES bell_curve_buckets(bucket_id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'MONITORING', 'APPROVED_PIP', 'REJECTED')),
  recommendation_reason TEXT,
  rejection_remarks TEXT,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PIP Active / Historical Records
CREATE TABLE IF NOT EXISTS pips (
  pip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES pip_candidates(candidate_id) ON DELETE SET NULL,
  template_id UUID REFERENCES pip_templates(template_id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MONITORING', 'COMPLETED', 'EXTENDED', 'ESCALATED', 'CANCELLED')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  checkin_frequency VARCHAR(50) NOT NULL DEFAULT 'WEEKLY',
  extension_count INTEGER NOT NULL DEFAULT 0,
  overall_progress NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  reason TEXT NOT NULL,
  hr_decision_remarks TEXT,
  employee_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  employee_acknowledged_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PIP Metrics (Concrete targets for the employee active PIP)
CREATE TABLE IF NOT EXISTS pip_metrics (
  pip_metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pip_id UUID NOT NULL REFERENCES pips(pip_id) ON DELETE CASCADE,
  metric_name VARCHAR(255) NOT NULL,
  metric_source VARCHAR(50) NOT NULL,
  metric_key VARCHAR(255),
  target_type VARCHAR(50) NOT NULL DEFAULT 'PERCENTAGE',
  target_value NUMERIC(10, 2) NOT NULL,
  current_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  completion_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  weight NUMERIC(5, 2) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PIP Check-ins (Manager updates)
CREATE TABLE IF NOT EXISTS pip_checkins (
  checkin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pip_id UUID NOT NULL REFERENCES pips(pip_id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
  overall_progress_at_checkin NUMERIC(5, 2),
  manager_progress_rating NUMERIC(3, 1),
  manager_notes TEXT,
  action_items TEXT,
  risks TEXT,
  next_meeting_date DATE,
  employee_comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. PIP Check-in Metric Values (Historical metric values logged at the check-in point)
CREATE TABLE IF NOT EXISTS pip_checkin_metric_values (
  checkin_id UUID NOT NULL REFERENCES pip_checkins(checkin_id) ON DELETE CASCADE,
  pip_metric_id UUID NOT NULL REFERENCES pip_metrics(pip_metric_id) ON DELETE CASCADE,
  current_value NUMERIC(10, 2) NOT NULL,
  completion_pct NUMERIC(5, 2) NOT NULL,
  PRIMARY KEY (checkin_id, pip_metric_id)
);

-- 10. PIP Evidence upload
CREATE TABLE IF NOT EXISTS pip_evidence (
  evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pip_id UUID NOT NULL REFERENCES pips(pip_id) ON DELETE CASCADE,
  checkin_id UUID REFERENCES pip_checkins(checkin_id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default configurations for existing organizations
INSERT INTO pip_settings (
  organization_id,
  enable_pip,
  allow_manager_initiation,
  require_hr_approval,
  allow_manual_creation,
  enable_monitoring,
  allow_extension,
  max_extension_count,
  default_duration_days,
  default_checkin_frequency,
  reminder_frequency_days,
  enable_recommendation_engine,
  close_threshold_pct,
  extend_threshold_pct,
  escalate_threshold_pct
)
SELECT 
  organization_id, 
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 2, 60, 'WEEKLY', 7, TRUE, 80.00, 50.00, 50.00
FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pip_settings_org ON pip_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_pip_candidates_org_emp ON pip_candidates(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_pips_org_emp ON pips(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_pip_metrics_pip ON pip_metrics(pip_id);
CREATE INDEX IF NOT EXISTS idx_pip_checkins_pip ON pip_checkins(pip_id);
