-- Migration: Create HR Policies Table
-- Stores company policies with structured HTML content, plain text for RAG readiness, and uploaded document links.

CREATE TABLE IF NOT EXISTS hr_policies (
    policy_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    category        VARCHAR(100) NOT NULL CHECK (category IN (
                        'Attendance & Working Hours',
                        'Leave & Employee Conduct',
                        'IT & Data Security',
                        'Benefits & Compensation',
                        'General'
                    )),
    summary         TEXT,
    content_html    TEXT NOT NULL,
    content_text    TEXT NOT NULL,
    keywords        TEXT[] DEFAULT '{}',
    document_url    TEXT NOT NULL,
    document_name   VARCHAR(255) NOT NULL,
    document_size   INTEGER NOT NULL DEFAULT 0,
    version_number  VARCHAR(20) NOT NULL DEFAULT '1.0',
    effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    is_published    BOOLEAN NOT NULL DEFAULT false,
    published_at    TIMESTAMPTZ,
    ai_status       VARCHAR(20) DEFAULT 'pending' CHECK (ai_status IN ('pending', 'indexed', 'failed')),
    ai_indexed_at   TIMESTAMPTZ,
    created_by      UUID REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by      UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tenant isolation, category filtering, and lifecycle state lookup
CREATE INDEX IF NOT EXISTS idx_hr_policies_lookup 
ON hr_policies(organization_id, category, is_active, is_published);
