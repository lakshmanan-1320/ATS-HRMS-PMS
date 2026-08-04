-- Migration 058: Dynamic Goal Categories
CREATE TABLE IF NOT EXISTS goal_categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_org_category_name UNIQUE (organization_id, name)
);

-- Drop old check constraint if exists
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_goal_category_check;

-- Add goal_category_id column
ALTER TABLE goals ADD COLUMN IF NOT EXISTS goal_category_id UUID REFERENCES goal_categories(category_id) ON DELETE SET NULL;

-- PL/pgSQL block to migrate existing data and seed default categories
DO $$
DECLARE
  v_org RECORD;
  v_cat RECORD;
  v_bus_id UUID;
  v_perf_id UUID;
  v_learn_id UUID;
  v_pers_id UUID;
BEGIN
  -- 1. Loop through all organizations and seed defaults
  FOR v_org IN SELECT organization_id FROM organizations LOOP
    
    -- Business category
    INSERT INTO goal_categories (organization_id, name, is_active)
    VALUES (v_org.organization_id, 'Business', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET is_active = true
    RETURNING category_id INTO v_bus_id;

    -- Performance category
    INSERT INTO goal_categories (organization_id, name, is_active)
    VALUES (v_org.organization_id, 'Performance', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET is_active = true
    RETURNING category_id INTO v_perf_id;

    -- Learning category
    INSERT INTO goal_categories (organization_id, name, is_active)
    VALUES (v_org.organization_id, 'Learning', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET is_active = true
    RETURNING category_id INTO v_learn_id;

    -- Personal Development category
    INSERT INTO goal_categories (organization_id, name, is_active)
    VALUES (v_org.organization_id, 'Personal Development', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET is_active = true
    RETURNING category_id INTO v_pers_id;

    -- 2. Update existing goals for this organization to match the new category ID
    UPDATE goals
    SET goal_category_id = v_bus_id
    WHERE organization_id = v_org.organization_id 
      AND goal_category = 'BUSINESS';

    UPDATE goals
    SET goal_category_id = v_perf_id
    WHERE organization_id = v_org.organization_id 
      AND goal_category = 'PERFORMANCE';

    UPDATE goals
    SET goal_category_id = v_learn_id
    WHERE organization_id = v_org.organization_id 
      AND goal_category = 'LEARNING';

    UPDATE goals
    SET goal_category_id = v_pers_id
    WHERE organization_id = v_org.organization_id 
      AND goal_category = 'PERSONAL_DEVELOPMENT';

  END LOOP;
END$$;
