-- Create Attendance Regularization & Adjustment Tables

-- 1. Create Regularization Settings Table
CREATE TABLE IF NOT EXISTS attendance_regularization_settings (
    regularization_setting_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id                UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    max_requests_allowed           INTEGER DEFAULT 3,
    request_period                 VARCHAR(20) DEFAULT 'MONTH', -- MONTH, QUARTER, YEAR
    regularization_window_days     INTEGER DEFAULT 7,
    reason_required                BOOLEAN DEFAULT TRUE,
    enable_partial_day_permissions BOOLEAN DEFAULT FALSE,
    allow_future_regularization    BOOLEAN DEFAULT FALSE,
    allow_missed_punch             BOOLEAN DEFAULT TRUE,
    allow_attendance_correction    BOOLEAN DEFAULT TRUE,
    allow_late_coming_permission   BOOLEAN DEFAULT TRUE,
    allow_early_exit_permission    BOOLEAN DEFAULT TRUE,
    allow_temporary_exit_permission BOOLEAN DEFAULT TRUE,
    is_active                      BOOLEAN DEFAULT TRUE,
    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uidx_org_regularization_settings UNIQUE (organization_id)
);

-- Index for settings querying
CREATE INDEX IF NOT EXISTS idx_regularization_settings_org ON attendance_regularization_settings(organization_id);

-- 2. Create Regularization Requests Table
CREATE TABLE IF NOT EXISTS attendance_regularization_requests (
    regularization_request_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id                UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id                    UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    attendance_date                DATE NOT NULL,
    request_category               VARCHAR(30) NOT NULL, -- REGULARIZATION, PERMISSION
    request_type                   VARCHAR(50) NOT NULL, -- MISSING_PUNCH_IN, MISSING_PUNCH_OUT, ATTENDANCE_CORRECTION, LATE_COMING_PERMISSION, EARLY_EXIT_PERMISSION, TEMPORARY_EXIT_PERMISSION
    requested_check_in             TIMESTAMPTZ NULL,
    requested_check_out            TIMESTAMPTZ NULL,
    reason                         TEXT NULL,
    approval_status                VARCHAR(30) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED
    approved_by                    UUID NULL REFERENCES employees(employee_id) ON DELETE SET NULL,
    approved_at                    TIMESTAMPTZ NULL,
    manager_comments               TEXT NULL,
    rejection_reason               TEXT NULL,
    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for requests querying
CREATE INDEX IF NOT EXISTS idx_reg_requests_org ON attendance_regularization_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_reg_requests_emp ON attendance_regularization_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_reg_requests_status ON attendance_regularization_requests(approval_status);

-- Unique index to prevent duplicate pending requests for the same date per employee
CREATE UNIQUE INDEX IF NOT EXISTS uidx_reg_requests_pending
ON attendance_regularization_requests (employee_id, attendance_date)
WHERE approval_status = 'PENDING';

-- 3. Alter Attendance Punches Table to support non-destructive regularizations
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS regularized_check_in TIMESTAMPTZ NULL;
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS regularized_check_out TIMESTAMPTZ NULL;
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS is_regularized BOOLEAN DEFAULT FALSE;
