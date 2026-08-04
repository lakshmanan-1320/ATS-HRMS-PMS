-- Create system settings table for global configurations
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key   VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_by    UUID,
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default configuration settings
INSERT INTO system_settings (setting_key, setting_value) VALUES
('regularization_monthly_limit', '5'),
('regularization_window_days', '7'),
('allow_holiday_regularization', 'false')
ON CONFLICT (setting_key) DO NOTHING;

-- Alter check_in coordinates to allow NULL (since regularized punches don't require geo inputs)
ALTER TABLE attendance_punches ALTER COLUMN check_in_latitude DROP NOT NULL;
ALTER TABLE attendance_punches ALTER COLUMN check_in_longitude DROP NOT NULL;

-- Add tracking columns to attendance_punches for original times and sources
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS original_check_in_time TIMESTAMPTZ;
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS original_check_out_time TIMESTAMPTZ;
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS attendance_source VARCHAR(50) DEFAULT 'WEB';
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS regularization_id UUID;

-- Create Attendance Regularizations request table
CREATE TABLE IF NOT EXISTS attendance_regularizations (
    regularization_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id            UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    manager_employee_id    UUID NOT NULL REFERENCES employees(employee_id),
    attendance_date        DATE NOT NULL,
    regularization_type    VARCHAR(50) NOT NULL, -- MISSED_CHECKIN, MISSED_CHECKOUT, WRONG_PUNCH_TIME, MARK_AS_PRESENT, MARK_AS_ABSENT
    requested_checkin_time TIMESTAMPTZ NULL,
    requested_checkout_time TIMESTAMPTZ NULL,
    reason                 TEXT NOT NULL,
    current_status         VARCHAR(30) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    approved_by_employee_id UUID REFERENCES employees(employee_id),
    approved_at            TIMESTAMPTZ,
    rejection_reason       TEXT,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Associate punches regularization tracking back to regularization requests
ALTER TABLE attendance_punches 
ADD CONSTRAINT fk_punches_regularization 
FOREIGN KEY (regularization_id) REFERENCES attendance_regularizations(regularization_id) 
ON DELETE SET NULL;

-- Create Attendance Regularizations status transition audit logs
CREATE TABLE IF NOT EXISTS attendance_regularization_logs (
    log_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regularization_id      UUID NOT NULL REFERENCES attendance_regularizations(regularization_id) ON DELETE CASCADE,
    previous_status        VARCHAR(30),
    new_status             VARCHAR(30) NOT NULL,
    action_taken_by_employee_id UUID REFERENCES employees(employee_id),
    action_remarks         TEXT,
    created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index to enforce only one active pending request per date per employee
CREATE UNIQUE INDEX IF NOT EXISTS regularization_active_idx 
ON attendance_regularizations (employee_id, attendance_date) 
WHERE current_status = 'PENDING';

-- Performance index queries
CREATE INDEX IF NOT EXISTS idx_regularizations_emp_status ON attendance_regularizations (employee_id, current_status);
CREATE INDEX IF NOT EXISTS idx_regularizations_mgr_status ON attendance_regularizations (manager_employee_id, current_status);
