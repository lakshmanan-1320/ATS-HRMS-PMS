-- Migration: 011_holidays.sql
-- Create holidays table, constraints, and performance indexes

CREATE TABLE IF NOT EXISTS holidays (
    holiday_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_name             VARCHAR(150) NOT NULL,
    holiday_date             DATE NOT NULL,
    holiday_type             VARCHAR(30) NOT NULL,
    description              TEXT,
    is_active                BOOLEAN DEFAULT TRUE,
    is_deleted               BOOLEAN DEFAULT FALSE,
    created_by_admin_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW(),
    
    -- Holiday type constraint (PUBLIC or OPTIONAL)
    CONSTRAINT chk_holiday_type CHECK (holiday_type IN ('PUBLIC', 'OPTIONAL')),
    
    -- Ensure consistency: a holiday cannot be active and deleted at the same time
    CONSTRAINT chk_holiday_active_delete CHECK (NOT (is_active = true AND is_deleted = true))
);

-- Partial unique index to enforce one holiday per date (MVP constraint) for non-deleted holidays
CREATE UNIQUE INDEX IF NOT EXISTS holidays_date_uidx 
ON holidays (holiday_date) 
WHERE is_deleted = false;

-- Performance indexes
CREATE INDEX IF NOT EXISTS holidays_type_idx ON holidays (holiday_type);
CREATE INDEX IF NOT EXISTS holidays_active_idx ON holidays (is_active);
