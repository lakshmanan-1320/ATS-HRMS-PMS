-- Migration 062: Create Continuous Feedback tables (feedback_entries, feedback_reflections, feedback_action_items, feedback_praises)

-- 1. feedback_entries
CREATE TABLE IF NOT EXISTS feedback_entries (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('COACHING', 'CONSTRUCTIVE', 'GENERAL')),
    feedback_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_entries_goal ON feedback_entries(goal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_org ON feedback_entries(organization_id);

-- 2. feedback_reflections
CREATE TABLE IF NOT EXISTS feedback_reflections (
    reflection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    what_i_learned TEXT NULL,
    challenges_faced TEXT NULL,
    support_needed TEXT NULL,
    next_steps TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_reflections_goal ON feedback_reflections(goal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_reflections_org ON feedback_reflections(organization_id);

-- 3. feedback_action_items
CREATE TABLE IF NOT EXISTS feedback_action_items (
    action_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    due_date DATE NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
    verified_by_manager BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_action_items_goal ON feedback_action_items(goal_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_action_items_org ON feedback_action_items(organization_id);

-- 4. feedback_praises
CREATE TABLE IF NOT EXISTS feedback_praises (
    praise_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
    from_user UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    to_user UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    visibility VARCHAR(20) DEFAULT 'PUBLIC' CHECK (visibility IN ('PRIVATE', 'PUBLIC')),
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'GREAT_LEADERSHIP', 'EXCELLENT_COLLABORATION', 'PROBLEM_SOLVER', 'CUSTOMER_APPRECIATION', 'INNOVATION'
    )),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_praises_goal ON feedback_praises(goal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_praises_org ON feedback_praises(organization_id);
