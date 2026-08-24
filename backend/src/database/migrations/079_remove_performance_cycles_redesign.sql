-- Migration 079: Remove Performance Cycles, map Goals directly to Financial Year, and create goal_settings per Financial Year.

-- Ensure all expected columns exist on performance_configurations before querying it
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'performance_configurations') THEN
        ALTER TABLE performance_configurations 
          ADD COLUMN IF NOT EXISTS max_goals_per_employee INTEGER DEFAULT 5,
          ADD COLUMN IF NOT EXISTS goal_setting_direction VARCHAR(50) DEFAULT 'TOP_DOWN',
          ADD COLUMN IF NOT EXISTS goal_approval_required BOOLEAN DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS allow_goal_edit_after_approval BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS allow_employee_goal_creation BOOLEAN DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS allow_manager_goal_creation BOOLEAN DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS require_goal_weight_validation BOOLEAN DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 1. Create goal_settings table
CREATE TABLE IF NOT EXISTS goal_settings (
    goal_setting_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_year_id                UUID UNIQUE NOT NULL REFERENCES financial_years(financial_year_id) ON DELETE CASCADE,
    organization_id                  UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    max_goals_per_employee           INT DEFAULT 5,
    goal_setting_direction           VARCHAR(30) DEFAULT 'HYBRID',
    goal_approval_required           BOOLEAN DEFAULT TRUE,
    allow_goal_edit_after_approval   BOOLEAN DEFAULT FALSE,
    allow_employee_goal_creation     BOOLEAN DEFAULT TRUE,
    allow_manager_goal_creation      BOOLEAN DEFAULT TRUE,
    require_goal_weight_validation   BOOLEAN DEFAULT TRUE,
    updated_at                       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Migrate existing performance configurations (Performance Cycles) settings into goal_settings
DO $$
DECLARE
    rec RECORD;
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'performance_configurations') THEN
        FOR rec IN 
            SELECT DISTINCT ON (financial_year_id) 
                financial_year_id, 
                organization_id, 
                max_goals_per_employee, 
                goal_setting_direction, 
                goal_approval_required, 
                allow_goal_edit_after_approval, 
                allow_employee_goal_creation, 
                allow_manager_goal_creation, 
                require_goal_weight_validation
            FROM performance_configurations
            ORDER BY financial_year_id, status = 'ACTIVE' DESC, updated_at DESC
        LOOP
            INSERT INTO goal_settings (
                financial_year_id, 
                organization_id, 
                max_goals_per_employee, 
                goal_setting_direction, 
                goal_approval_required, 
                allow_goal_edit_after_approval, 
                allow_employee_goal_creation, 
                allow_manager_goal_creation, 
                require_goal_weight_validation
            ) VALUES (
                rec.financial_year_id,
                rec.organization_id,
                rec.max_goals_per_employee,
                rec.goal_setting_direction,
                rec.goal_approval_required,
                rec.allow_goal_edit_after_approval,
                rec.allow_employee_goal_creation,
                rec.allow_manager_goal_creation,
                rec.require_goal_weight_validation
            ) ON CONFLICT (financial_year_id) DO NOTHING;
        END LOOP;
    END IF;

    -- For financial years with no performance configuration, create a default goal_settings
    FOR rec IN 
        SELECT financial_year_id, organization_id 
        FROM financial_years 
        WHERE financial_year_id NOT IN (SELECT financial_year_id FROM goal_settings)
    LOOP
        INSERT INTO goal_settings (financial_year_id, organization_id)
        VALUES (rec.financial_year_id, rec.organization_id)
        ON CONFLICT (financial_year_id) DO NOTHING;
    END LOOP;
END $$;

-- 3. Add financial_year_id column to goals (dropping the old integer-typed column first if exists)
ALTER TABLE goals DROP COLUMN IF EXISTS financial_year_id CASCADE;
ALTER TABLE goals ADD COLUMN financial_year_id UUID REFERENCES financial_years(financial_year_id) ON DELETE CASCADE;

-- 4. Migrate goals' financial_year_id based on performance_configurations mapping
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'performance_configurations') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'performance_configuration_id') THEN
            EXECUTE 'UPDATE goals g
                     SET financial_year_id = pc.financial_year_id
                     FROM performance_configurations pc
                     WHERE g.performance_configuration_id = pc.performance_configuration_id
                       AND g.financial_year_id IS NULL';
        END IF;
    END IF;
END $$;

-- Backfill any remaining goals that did not have performance configurations but map to an active FY for that organization
UPDATE goals g
SET financial_year_id = fy.financial_year_id
FROM financial_years fy
WHERE g.organization_id = fy.organization_id
  AND fy.status = 'ACTIVE'
  AND g.financial_year_id IS NULL;

-- Make financial_year_id NOT NULL for goals
ALTER TABLE goals ALTER COLUMN financial_year_id SET NOT NULL;

-- 5. Drop foreign key constraints and tables related to performance configurations
ALTER TABLE goals DROP COLUMN IF EXISTS performance_configuration_id CASCADE;

-- Also clean goal_kpis table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'goal_kpis'::regclass AND attname = 'performance_configuration_id') THEN
        ALTER TABLE goal_kpis DROP COLUMN IF EXISTS performance_configuration_id CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Table or columns might not exist
END $$;

DROP TABLE IF EXISTS employee_performance_scores CASCADE;
DROP TABLE IF EXISTS appraisal_cycle_performance_cycles CASCADE;
DROP TABLE IF EXISTS performance_configurations CASCADE;
