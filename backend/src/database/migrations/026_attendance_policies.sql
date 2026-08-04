-- Create Attendance Policies Table
CREATE TABLE IF NOT EXISTS attendance_policies (
    attendance_policy_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id            UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name                       VARCHAR(150) NOT NULL,
    description                TEXT,
    policy_type                VARCHAR(20) NOT NULL, -- 'OFFICE', 'REMOTE', 'HYBRID'
    enable_location_validation BOOLEAN DEFAULT false,
    enable_shift_validation    BOOLEAN DEFAULT false,
    is_active                  BOOLEAN DEFAULT true,
    is_deleted                 BOOLEAN DEFAULT false,
    created_at                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- Create Index for performance and tenant querying
CREATE INDEX IF NOT EXISTS idx_attendance_policies_org_deleted
ON attendance_policies (organization_id, is_deleted);

-- Create Attendance Policy Assignments Table
CREATE TABLE IF NOT EXISTS attendance_policy_assignments (
    attendance_policy_assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id                        UUID NOT NULL REFERENCES attendance_policies(attendance_policy_id) ON DELETE CASCADE,
    employee_id                      UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    assignment_type                  VARCHAR(20) NOT NULL, -- 'DEPARTMENT', 'EMPLOYEE'
    effective_from                   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at                       TIMESTAMPTZ DEFAULT NOW()
);

-- Create Index for policy assignment queries
CREATE INDEX IF NOT EXISTS idx_policy_assignments_policy_emp
ON attendance_policy_assignments (policy_id, employee_id);

-- Alter Employees table to reference current attendance policy
ALTER TABLE employees ADD COLUMN IF NOT EXISTS attendance_policy_id UUID REFERENCES attendance_policies(attendance_policy_id) ON DELETE SET NULL;
