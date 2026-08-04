-- Migration: Create Shifts and Schedules Tables

-- 1. Create Shifts Table
CREATE TABLE IF NOT EXISTS attendance_shifts (
    shift_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    shift_name                VARCHAR(150) NOT NULL,
    shift_code                VARCHAR(20) NOT NULL,
    start_time                TIME NOT NULL,
    end_time                  TIME NOT NULL,
    grace_minutes             INTEGER NOT NULL DEFAULT 15,
    early_exit_grace_minutes  INTEGER NOT NULL DEFAULT 5,
    minimum_hours             NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    color_code                VARCHAR(20) DEFAULT '#3b82f6',
    is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Index for shifts by organization
CREATE INDEX IF NOT EXISTS idx_attendance_shifts_org ON attendance_shifts(organization_id);

-- 2. Create Shift Assignments Table (Historical Timeline)
CREATE TABLE IF NOT EXISTS shift_assignments (
    shift_assignment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id                  UUID NOT NULL REFERENCES attendance_shifts(shift_id) ON DELETE CASCADE,
    employee_id               UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    effective_from            DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uidx_employee_effective_date UNIQUE (employee_id, effective_from)
);

-- Indexes for assignments
CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee ON shift_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift ON shift_assignments(shift_id);

-- 3. Alter Employees Table to Add cached current shift reference
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES attendance_shifts(shift_id) ON DELETE SET NULL;

-- 4. Alter Attendance Punches Table to record punch compliance and shift metadata
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES attendance_shifts(shift_id) ON DELETE SET NULL;
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS attendance_result VARCHAR(50);
