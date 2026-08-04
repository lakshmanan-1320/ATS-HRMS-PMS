-- Migration 068: Create Competency Assessment Model & Tables

-- 1. Create Competency Library
CREATE TABLE IF NOT EXISTS competency_library (
  competency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT competency_library_org_name_unique UNIQUE (organization_id, name)
);

-- Index for lookup by organization
CREATE INDEX IF NOT EXISTS idx_competency_library_org ON competency_library(organization_id);

-- 2. Create Competency Behavioral Indicators
CREATE TABLE IF NOT EXISTS competency_indicators (
  indicator_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id UUID NOT NULL REFERENCES competency_library(competency_id) ON DELETE CASCADE,
  rating_level INT NOT NULL CHECK (rating_level BETWEEN 1 AND 5),
  behavioral_indicator TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT competency_indicators_comp_rating_unique UNIQUE (competency_id, rating_level)
);

-- Index for lookup by competency
CREATE INDEX IF NOT EXISTS idx_competency_indicators_comp ON competency_indicators(competency_id);

-- 3. Create Rating Scales
CREATE TABLE IF NOT EXISTS competency_rating_scales (
  scale_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  rating_level INT NOT NULL CHECK (rating_level BETWEEN 1 AND 5),
  label VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT competency_rating_scales_org_rating_unique UNIQUE (organization_id, rating_level)
);

-- Index for lookup by organization rating level
CREATE INDEX IF NOT EXISTS idx_competency_rating_scales_org ON competency_rating_scales(organization_id);

-- 4. Create Goal Competencies (the selected competencies tied to a goal template)
CREATE TABLE IF NOT EXISTS goal_competencies (
  goal_competency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  competency_library_id UUID REFERENCES competency_library(competency_id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  weight NUMERIC(5,2) NOT NULL CHECK (weight >= 0.00),
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookup by goal
CREATE INDEX IF NOT EXISTS idx_goal_competencies_goal ON goal_competencies(goal_id);

-- 5. Create Competency Assessments (manager ratings per competency per assignment)
CREATE TABLE IF NOT EXISTS competency_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES goal_assignments(assignment_id) ON DELETE CASCADE,
  goal_competency_id UUID NOT NULL REFERENCES goal_competencies(goal_competency_id) ON DELETE CASCADE,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  rated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  rated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT competency_assessments_assignment_comp_unique UNIQUE (assignment_id, goal_competency_id)
);

-- Index for lookup by assignment
CREATE INDEX IF NOT EXISTS idx_competency_assessments_assignment ON competency_assessments(assignment_id);

-- 6. Alter goal_assignments to store score and acknowledgement
ALTER TABLE goal_assignments 
  ADD COLUMN IF NOT EXISTS weighted_score NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS employee_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ DEFAULT NULL;

-- 7. Seed defaults for all existing organizations
-- Seed default rating scales
INSERT INTO competency_rating_scales (organization_id, rating_level, label)
SELECT organization_id, 1, 'Below Expectations' FROM organizations ON CONFLICT DO NOTHING;
INSERT INTO competency_rating_scales (organization_id, rating_level, label)
SELECT organization_id, 2, 'Developing' FROM organizations ON CONFLICT DO NOTHING;
INSERT INTO competency_rating_scales (organization_id, rating_level, label)
SELECT organization_id, 3, 'Meets Expectations' FROM organizations ON CONFLICT DO NOTHING;
INSERT INTO competency_rating_scales (organization_id, rating_level, label)
SELECT organization_id, 4, 'Exceeds Expectations' FROM organizations ON CONFLICT DO NOTHING;
INSERT INTO competency_rating_scales (organization_id, rating_level, label)
SELECT organization_id, 5, 'Outstanding' FROM organizations ON CONFLICT DO NOTHING;

-- Seed default library competencies for each organization
DO $$
DECLARE
  org_rec RECORD;
  new_comp_id UUID;
BEGIN
  FOR org_rec IN SELECT organization_id FROM organizations LOOP

    -- Communication
    INSERT INTO competency_library (organization_id, name, description)
    VALUES (org_rec.organization_id, 'Communication', 'Clear expression, active listening, written and verbal effectiveness')
    ON CONFLICT (organization_id, name) DO NOTHING;

    SELECT competency_id INTO new_comp_id FROM competency_library 
    WHERE organization_id = org_rec.organization_id AND name = 'Communication';

    IF new_comp_id IS NOT NULL THEN
      INSERT INTO competency_indicators (competency_id, rating_level, behavioral_indicator) VALUES
        (new_comp_id, 1, 'Rarely communicates proactively, misses key updates'),
        (new_comp_id, 2, 'Communicates when prompted, basic clarity'),
        (new_comp_id, 3, 'Clear and timely communication across the team'),
        (new_comp_id, 4, 'Proactively communicates insights, adapts style to audience'),
        (new_comp_id, 5, 'Influences org communication culture, exemplary clarity')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Leadership
    INSERT INTO competency_library (organization_id, name, description)
    VALUES (org_rec.organization_id, 'Leadership', 'Inspiring others, decision-making, conflict resolution')
    ON CONFLICT (organization_id, name) DO NOTHING;

    SELECT competency_id INTO new_comp_id FROM competency_library 
    WHERE organization_id = org_rec.organization_id AND name = 'Leadership';

    IF new_comp_id IS NOT NULL THEN
      INSERT INTO competency_indicators (competency_id, rating_level, behavioral_indicator) VALUES
        (new_comp_id, 1, 'Avoids taking responsibility, does not guide peers'),
        (new_comp_id, 2, 'Guides others when requested, passive participation'),
        (new_comp_id, 3, 'Inspires teammates, takes responsibility for actions'),
        (new_comp_id, 4, 'Delegates effectively, handles conflicts proactively'),
        (new_comp_id, 5, 'Exceptional visionary mentor, drives organizational growth')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Teamwork
    INSERT INTO competency_library (organization_id, name, description)
    VALUES (org_rec.organization_id, 'Teamwork', 'Collaboration, helping peers, contributing beyond own role')
    ON CONFLICT (organization_id, name) DO NOTHING;

    SELECT competency_id INTO new_comp_id FROM competency_library 
    WHERE organization_id = org_rec.organization_id AND name = 'Teamwork';

    IF new_comp_id IS NOT NULL THEN
      INSERT INTO competency_indicators (competency_id, rating_level, behavioral_indicator) VALUES
        (new_comp_id, 1, 'Prefers to work in isolation, rarely assists peers'),
        (new_comp_id, 2, 'Collaborates when instructed, minimal helpfulness'),
        (new_comp_id, 3, 'Active collaborator, supports teammates willingly'),
        (new_comp_id, 4, 'Promotes inclusive teamwork, helps peers overcome challenges'),
        (new_comp_id, 5, 'Exemplary bridge-builder, forms strong cross-functional bonds')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Ownership
    INSERT INTO competency_library (organization_id, name, description)
    VALUES (org_rec.organization_id, 'Ownership', 'Accountability, follow-through, initiative without being asked')
    ON CONFLICT (organization_id, name) DO NOTHING;

    SELECT competency_id INTO new_comp_id FROM competency_library 
    WHERE organization_id = org_rec.organization_id AND name = 'Ownership';

    IF new_comp_id IS NOT NULL THEN
      INSERT INTO competency_indicators (competency_id, rating_level, behavioral_indicator) VALUES
        (new_comp_id, 1, 'Requires constant supervision, avoids accountability'),
        (new_comp_id, 2, 'Takes responsibility for assigned tasks under guidance'),
        (new_comp_id, 3, 'Fully accountable, follows through on commitments'),
        (new_comp_id, 4, 'Shows strong initiative, goes above and beyond to deliver'),
        (new_comp_id, 5, 'Owner mindset, drives strategy and is accountable for major outcomes')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Problem-Solving
    INSERT INTO competency_library (organization_id, name, description)
    VALUES (org_rec.organization_id, 'Problem-Solving', 'Root cause analysis, creative solutions, handling ambiguity')
    ON CONFLICT (organization_id, name) DO NOTHING;

    SELECT competency_id INTO new_comp_id FROM competency_library 
    WHERE organization_id = org_rec.organization_id AND name = 'Problem-Solving';

    IF new_comp_id IS NOT NULL THEN
      INSERT INTO competency_indicators (competency_id, rating_level, behavioral_indicator) VALUES
        (new_comp_id, 1, 'Struggles with unexpected issues, does not search for root causes'),
        (new_comp_id, 2, 'Identifies problems but relies on others for solutions'),
        (new_comp_id, 3, 'Analyzes issues logically, proposes viable solutions'),
        (new_comp_id, 4, 'Solves complex problems, designs preventive actions'),
        (new_comp_id, 5, 'Innovative solution finder, handles high ambiguity with ease')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Adaptability
    INSERT INTO competency_library (organization_id, name, description)
    VALUES (org_rec.organization_id, 'Adaptability', 'Embracing change, learning new skills, thriving under pressure')
    ON CONFLICT (organization_id, name) DO NOTHING;

    SELECT competency_id INTO new_comp_id FROM competency_library 
    WHERE organization_id = org_rec.organization_id AND name = 'Adaptability';

    IF new_comp_id IS NOT NULL THEN
      INSERT INTO competency_indicators (competency_id, rating_level, behavioral_indicator) VALUES
        (new_comp_id, 1, 'Resists change, performance drops significantly under pressure'),
        (new_comp_id, 2, 'Accepts change slowly, needs support to adjust'),
        (new_comp_id, 3, 'Adapts to new tasks smoothly, maintains composure'),
        (new_comp_id, 4, 'Thrives in fast-paced changes, learns new skills proactively'),
        (new_comp_id, 5, 'Champions change management, remains highly productive under pressure')
      ON CONFLICT DO NOTHING;
    END IF;

  END LOOP;
END $$;
