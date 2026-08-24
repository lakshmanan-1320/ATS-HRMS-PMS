-- Migration 076: Cycle Hierarchy Redesign (Financial Year, Performance Cycle & Appraisal Cycle)

-- Create dummy performance_configurations table if it was dropped previously, so migrations run smoothly
CREATE TABLE IF NOT EXISTS performance_configurations (
    performance_configuration_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id                UUID,
    cycle_name                     VARCHAR(255),
    cycle_type                     VARCHAR(50),
    start_date                     DATE,
    end_date                       DATE,
    status                         VARCHAR(20) DEFAULT 'DRAFT',
    max_goals_per_employee         INTEGER,
    goal_setting_direction         VARCHAR(50),
    goal_approval_required         BOOLEAN,
    allow_goal_edit_after_approval BOOLEAN,
    allow_employee_goal_creation   BOOLEAN,
    allow_manager_goal_creation    BOOLEAN,
    require_goal_weight_validation BOOLEAN,
    updated_at                     TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Create financial_years table
DROP TABLE IF EXISTS financial_years CASCADE;
CREATE TABLE IF NOT EXISTS financial_years (
    financial_year_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL,
    status            VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED')),
    created_by        UUID REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by        UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_fy_dates CHECK (start_date <= end_date),
    CONSTRAINT uq_fy_org_name UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_fy_org_status ON financial_years(organization_id, status);

-- 2. Modify performance_configurations (Performance Cycles) table
ALTER TABLE performance_configurations DROP COLUMN IF EXISTS financial_year_id CASCADE;
ALTER TABLE performance_configurations
  ADD COLUMN IF NOT EXISTS financial_year_id UUID REFERENCES financial_years(financial_year_id) ON DELETE SET NULL;

-- Alter performance_configurations status constraint
ALTER TABLE performance_configurations DROP CONSTRAINT IF EXISTS performance_configurations_status_check;
ALTER TABLE performance_configurations ADD CONSTRAINT performance_configurations_status_check CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'));
ALTER TABLE performance_configurations ALTER COLUMN status SET DEFAULT 'DRAFT';

-- 3. Modify appraisal_cycles table
ALTER TABLE appraisal_cycles DROP COLUMN IF EXISTS financial_year_id CASCADE;
ALTER TABLE appraisal_cycles
  ADD COLUMN IF NOT EXISTS financial_year_id UUID REFERENCES financial_years(financial_year_id) ON DELETE SET NULL;

-- 4. Create join table for Appraisal Cycle and Performance Cycles Many-to-Many relationship dynamically
DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'appraisal_cycles' AND column_name = 'appraisal_cycle_id';

    IF col_type = 'uuid' THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS appraisal_cycle_performance_cycles (
            appraisal_cycle_id            UUID REFERENCES appraisal_cycles(appraisal_cycle_id) ON DELETE CASCADE,
            performance_configuration_id  UUID REFERENCES performance_configurations(performance_configuration_id) ON DELETE CASCADE,
            PRIMARY KEY (appraisal_cycle_id, performance_configuration_id)
        )';
    ELSE
        EXECUTE 'CREATE TABLE IF NOT EXISTS appraisal_cycle_performance_cycles (
            appraisal_cycle_id            INTEGER REFERENCES appraisal_cycles(appraisal_cycle_id) ON DELETE CASCADE,
            performance_configuration_id  UUID REFERENCES performance_configurations(performance_configuration_id) ON DELETE CASCADE,
            PRIMARY KEY (appraisal_cycle_id, performance_configuration_id)
        )';
    END IF;
END $$;

-- 5. Data Migration: Create default Financial Year and map existing configurations
DO $$
DECLARE
    org_rec RECORD;
    v_fy_id UUID;
BEGIN
    -- For each organization that has configurations/cycles, create a default FY 2026-27
    FOR org_rec IN 
        SELECT DISTINCT organization_id FROM performance_configurations
        UNION
        SELECT DISTINCT ca.organization_id FROM appraisal_cycles ac JOIN client_admins ca ON ac.client_admin_id = ca.client_admin_id
    LOOP
        -- Check if it already has a Financial Year
        SELECT financial_year_id INTO v_fy_id FROM financial_years WHERE organization_id = org_rec.organization_id LIMIT 1;
        
        IF v_fy_id IS NULL THEN
            INSERT INTO financial_years (organization_id, name, start_date, end_date, status)
            VALUES (org_rec.organization_id, 'FY 2026-27', '2026-04-01', '2027-03-31', 'ACTIVE')
            RETURNING financial_year_id INTO v_fy_id;
        END IF;

        -- Update performance configurations status and associate with default FY
        UPDATE performance_configurations
        SET financial_year_id = v_fy_id,
            status = CASE WHEN status = 'ACTIVE' THEN 'ACTIVE' ELSE 'COMPLETED' END
        WHERE organization_id = org_rec.organization_id AND financial_year_id IS NULL;

        -- Update appraisal cycles and associate with default FY
        UPDATE appraisal_cycles ac
        SET financial_year_id = v_fy_id
        FROM client_admins ca
        WHERE ac.client_admin_id = ca.client_admin_id 
          AND ca.organization_id = org_rec.organization_id 
          AND ac.financial_year_id IS NULL;

    END LOOP;
END $$;

-- Populate join table appraisal_cycle_performance_cycles for existing appraisals (based on date overlapping)
INSERT INTO appraisal_cycle_performance_cycles (appraisal_cycle_id, performance_configuration_id)
SELECT ac.appraisal_cycle_id, pc.performance_configuration_id
FROM appraisal_cycles ac
JOIN client_admins ca ON ac.client_admin_id = ca.client_admin_id
JOIN performance_configurations pc ON pc.organization_id = ca.organization_id
WHERE pc.start_date <= ac.period_end AND pc.end_date >= ac.period_start
ON CONFLICT DO NOTHING;
