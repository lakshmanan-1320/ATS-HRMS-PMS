-- Drop old audit_logs table to replace it with the new enterprise-grade centralized table
DROP TABLE IF EXISTS audit_logs CASCADE;

CREATE TABLE audit_logs (
    audit_log_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID NOT NULL,
    actor_user_id         UUID NOT NULL,
    actor_employee_id     UUID NULL,
    actor_name            VARCHAR(150) NOT NULL,
    actor_email           VARCHAR(255) NOT NULL,
    actor_role            VARCHAR(50) NOT NULL,
    module_name           VARCHAR(80) NOT NULL,
    action_name           VARCHAR(80) NOT NULL,
    entity_name           VARCHAR(80) NOT NULL,
    entity_id             UUID NULL,
    old_data              JSONB NULL,
    new_data              JSONB NULL,
    ip_address            INET NULL,
    user_agent            TEXT NULL,
    browser_name          VARCHAR(100) NULL,
    operating_system      VARCHAR(100) NULL,
    device_type           VARCHAR(50) NULL,
    request_url           TEXT NULL,
    http_method           VARCHAR(10) NULL,
    request_status        VARCHAR(20) NULL,
    response_status_code  INTEGER NULL,
    request_id            UUID NULL,
    execution_time_ms     INTEGER NULL,
    success               BOOLEAN DEFAULT TRUE,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Optimization indexes for dynamic searches and multi-tenant performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_name ON audit_logs(module_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
