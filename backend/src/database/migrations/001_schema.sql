-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Super Admin profiles
CREATE TABLE IF NOT EXISTS super_admins (
    super_admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- SMTP settings (one row per client, id=1)
CREATE TABLE IF NOT EXISTS smtp_settings (
    id           INTEGER PRIMARY KEY DEFAULT 1,
    host         VARCHAR(255) NOT NULL,
    port         INTEGER NOT NULL DEFAULT 465,
    encryption   VARCHAR(10) NOT NULL DEFAULT 'ssl',
    username     VARCHAR(255) NOT NULL,
    password     VARCHAR(255) NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    from_name    VARCHAR(255) NOT NULL DEFAULT 'HR System',
    tested_at    TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    UUID REFERENCES super_admins(super_admin_id),
    actor_email VARCHAR(255),
    action      VARCHAR(100) NOT NULL,
    target      VARCHAR(255),
    metadata    JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default SMTP settings (Insight Technology)
INSERT INTO smtp_settings (id, host, port, encryption, username, password, from_address, from_name)
VALUES (
    1,
    'smtp.hostinger.com',
    465,
    'ssl',
    'noreply@insighttechnology.in',
    'Madhi@121096',
    'noreply@insighttechnology.in',
    'Insight Technology'
) ON CONFLICT (id) DO NOTHING;

-- Company Details (one row per client, id=1)
CREATE TABLE IF NOT EXISTS companies (
    id                  INTEGER PRIMARY KEY DEFAULT 1,
    name                VARCHAR(255),
    logo_base64         TEXT,
    industry            VARCHAR(100),
    company_size        VARCHAR(50),
    founded_year        SMALLINT,
    email               VARCHAR(255),
    phone               VARCHAR(50),
    website             VARCHAR(255),
    address             TEXT,
    city                VARCHAR(100),
    state               VARCHAR(100),
    pincode             VARCHAR(20),
    country             VARCHAR(100) DEFAULT 'India',
    gst_number          VARCHAR(20),
    pan_number          VARCHAR(20),
    cin_number          VARCHAR(30),
    tan_number          VARCHAR(20),
    fiscal_year_start   SMALLINT DEFAULT 4,
    payroll_day         SMALLINT DEFAULT 28,
    currency            VARCHAR(10) DEFAULT 'INR',
    work_days_per_week  SMALLINT DEFAULT 5,
    work_hours_per_day  SMALLINT DEFAULT 8,
    probation_months    SMALLINT DEFAULT 6,
    notice_days         SMALLINT DEFAULT 30,
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT companies_single_row CHECK (id = 1)
);

INSERT INTO companies (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Client Admins (one per tenant/client company)
CREATE TABLE IF NOT EXISTS client_admins (
    client_admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(50),
    company_name    VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'suspended')),
    plan            VARCHAR(30) NOT NULL DEFAULT 'professional'
                    CHECK (plan IN ('basic', 'professional', 'enterprise')),
    employee_limit  INTEGER DEFAULT 50,
    notes           TEXT,
    created_by      UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default Super Admin profile
INSERT INTO super_admins (email, full_name)
VALUES (
    'admin@insighttechnology.in',
    'Super Administrator'
) ON CONFLICT (email) DO NOTHING;
