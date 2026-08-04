-- Rename existing manager column to prevent duplicate columns
ALTER TABLE employees RENAME COLUMN manager_id TO manager_employee_id;
ALTER TABLE employees ADD CONSTRAINT chk_manager_self CHECK (manager_employee_id != employee_id);

-- Leave Types Table
CREATE TABLE IF NOT EXISTS leave_types (
    leave_type_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_type_name          VARCHAR(100) NOT NULL,
    leave_type_code          VARCHAR(20) UNIQUE NOT NULL,
    description              TEXT,
    annual_quota_days        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    is_paid_leave            BOOLEAN DEFAULT true,
    requires_attachment      BOOLEAN DEFAULT false,
    allows_half_day          BOOLEAN DEFAULT true,
    allows_negative_balance  BOOLEAN DEFAULT false,
    max_consecutive_days     INTEGER NULL,
    is_active                BOOLEAN DEFAULT true,
    created_by_admin_user_id UUID,
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Leave Balances Table (Simplified)
CREATE TABLE IF NOT EXISTS employee_leave_balances (
    leave_balance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id      UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id    UUID NOT NULL REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    financial_year   INTEGER NOT NULL,
    allocated_days   NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    used_days        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_employee_leave_fy UNIQUE (employee_id, leave_type_id, financial_year)
);

-- Leave Requests Table (Future-proofed attachment support)
CREATE TABLE IF NOT EXISTS leave_requests (
    leave_request_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id            UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    manager_employee_id    UUID NOT NULL REFERENCES employees(employee_id),
    leave_type_id          UUID NOT NULL REFERENCES leave_types(leave_type_id),
    start_date             DATE NOT NULL,
    end_date               DATE NOT NULL,
    total_leave_days       NUMERIC(5,2) NOT NULL,
    session_type           VARCHAR(20) DEFAULT 'FULL_DAY', -- 'FULL_DAY', 'FIRST_HALF', 'SECOND_HALF'
    leave_reason           TEXT,
    attachment_url         TEXT,
    file_id                UUID NULL,
    attachment_type        VARCHAR(50) NULL,
    current_status         VARCHAR(30) DEFAULT 'PENDING', -- 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
    approved_by_employee_id UUID REFERENCES employees(employee_id),
    approved_at            TIMESTAMPTZ,
    rejection_reason       TEXT,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS leave_request_audit_logs (
    audit_log_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id           UUID NOT NULL REFERENCES leave_requests(leave_request_id) ON DELETE CASCADE,
    previous_status            VARCHAR(30),
    new_status                 VARCHAR(30) NOT NULL,
    action_taken_by_employee_id UUID REFERENCES employees(employee_id),
    action_remarks             TEXT,
    created_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_leaves_emp_status ON leave_requests (employee_id, current_status);
CREATE INDEX IF NOT EXISTS idx_leaves_mgr_status ON leave_requests (manager_employee_id, current_status);
