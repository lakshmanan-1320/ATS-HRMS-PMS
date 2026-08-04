-- Define User Role Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'client_admin', 'employee', 'manager', 'hr');
    END IF;
END$$;

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id             UUID REFERENCES employees(employee_id) ON DELETE CASCADE,
    email                   VARCHAR(255) NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    role                    user_role NOT NULL,
    is_active               BOOLEAN DEFAULT true,
    attendance_enabled      BOOLEAN DEFAULT true,
    password_reset_required BOOLEAN DEFAULT false,
    password_changed_at     TIMESTAMPTZ,
    last_login_at           TIMESTAMPTZ,
    failed_login_attempts   INT DEFAULT 0,
    locked_until            TIMESTAMPTZ,
    created_by              UUID REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by              UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_org_employee UNIQUE (organization_id, employee_id),
    CONSTRAINT unique_org_email UNIQUE (organization_id, email)
);

-- Index for global users email uniqueness (Super Admins)
CREATE UNIQUE INDEX IF NOT EXISTS unique_global_email_idx ON users (email) WHERE organization_id IS NULL;

-- Index to ensure each employee only has one login account
CREATE UNIQUE INDEX IF NOT EXISTS unique_employee_login_idx ON users (employee_id) WHERE employee_id IS NOT NULL;

-- Create OTPs Table
CREATE TABLE IF NOT EXISTS user_otps (
    otp_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    otp_hash    TEXT NOT NULL,
    purpose     VARCHAR(50) NOT NULL, -- 'login', 'password_reset'
    attempts    INT DEFAULT 0,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default Super Admin credentials into users
INSERT INTO users (email, password_hash, role, is_active)
VALUES (
    'admin@insighttechnology.in',
    '$2b$12$hJxT41kooMUhgDhjr5Crp.mNa53kdGBDfLTG8FvIB0cgPJvFyB2i6', -- bcrypt of 'Password123'
    'super_admin',
    true
) ON CONFLICT (email) WHERE organization_id IS NULL DO NOTHING;
