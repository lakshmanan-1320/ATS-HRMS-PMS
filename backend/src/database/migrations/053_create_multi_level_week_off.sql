-- Migration: 053_create_multi_level_week_off.sql

-- 1. Drop existing week_off_settings table to avoid conflict with schema updates
DROP TABLE IF EXISTS week_off_settings CASCADE;
DROP TABLE IF EXISTS week_off_global_configs CASCADE;

-- 2. Create global week-off toggles table
CREATE TABLE IF NOT EXISTS week_off_global_configs (
    organization_id            UUID PRIMARY KEY REFERENCES organizations(organization_id) ON DELETE CASCADE,
    enable_generic_week_off    BOOLEAN NOT NULL DEFAULT TRUE,
    enable_department_week_off  BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create week-off settings table (with effective dates and human-readable names)
CREATE TABLE IF NOT EXISTS week_off_settings (
    week_off_setting_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    rule_name            VARCHAR(100) NOT NULL,
    scope                VARCHAR(30) NOT NULL CHECK (scope IN ('ORGANIZATION', 'DEPARTMENT')),
    scope_id             UUID, -- NULL or department_id
    effective_from       DATE NOT NULL,
    effective_to         DATE, -- NULL if open-ended
    is_enabled           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create week-off days table (with alternate week numbers and OFF type enums)
CREATE TABLE IF NOT EXISTS week_off_days (
    week_off_day_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_off_setting_id UUID NOT NULL REFERENCES week_off_settings(week_off_setting_id) ON DELETE CASCADE,
    weekday             INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Sunday, 6=Saturday
    week_number         VARCHAR(20) NOT NULL CHECK (week_number IN ('ALL', '1ST', '2ND', '3RD', '4TH', '5TH')),
    off_type            VARCHAR(20) NOT NULL CHECK (off_type IN ('FULL', 'HALF', 'WORKING')),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Unique constraints index to prevent overlapping active rules of the same scope/scope_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_week_off_settings_active_scope
ON week_off_settings (organization_id, scope, COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid))
WHERE effective_to IS NULL AND is_enabled = TRUE;
