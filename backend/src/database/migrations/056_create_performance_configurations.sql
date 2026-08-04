-- Migration 056: Create performance_configurations table
CREATE TABLE IF NOT EXISTS performance_configurations (
    performance_configuration_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id                UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Cycle Details
    cycle_name                     VARCHAR(255) NOT NULL,
    cycle_type                     VARCHAR(50) NOT NULL CHECK (cycle_type IN ('ANNUAL', 'HALF_YEARLY', 'QUARTERLY', 'MONTHLY')),
    start_date                     DATE NOT NULL,
    end_date                       DATE NOT NULL,
    
    -- Goal Configurations
    goal_setting_direction         VARCHAR(50) NOT NULL CHECK (goal_setting_direction IN ('TOP_DOWN', 'BOTTOM_UP', 'HYBRID')),
    review_frequency               VARCHAR(50) NOT NULL CHECK (review_frequency IN ('WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY')),
    goal_approval_required         BOOLEAN NOT NULL DEFAULT TRUE,
    allow_goal_edit_after_approval BOOLEAN NOT NULL DEFAULT FALSE,
    allow_employee_goal_creation   BOOLEAN NOT NULL DEFAULT TRUE,
    allow_manager_goal_creation     BOOLEAN NOT NULL DEFAULT TRUE,
    require_goal_weight_validation BOOLEAN NOT NULL DEFAULT TRUE,
    max_goals_per_employee         INTEGER NOT NULL DEFAULT 5,
    goal_submission_deadline       DATE NULL,
    
    -- Status & Audit Columns
    status                         VARCHAR(20) NOT NULL DEFAULT 'INACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_by                     UUID REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by                     UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_dates CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_perf_config_org_status ON performance_configurations(organization_id, status);
