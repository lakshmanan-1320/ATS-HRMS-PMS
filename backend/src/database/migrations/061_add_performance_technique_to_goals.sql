-- Migration 061: Add performance_technique column to goals table
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS performance_technique VARCHAR(50) DEFAULT 'KPI'
  CHECK (performance_technique IN (
    'KPI', 'CONTINUOUS_FEEDBACK', 'COMPETENCY_ASSESSMENT', 'SELF_ASSESSMENT',
    '360_FEEDBACK', 'OKR', 'MBO', 'BALANCED_SCORECARD', 'BELL_CURVE', 'PIP'
  ));

-- Index for fast lookup by performance technique
CREATE INDEX IF NOT EXISTS idx_goals_performance_technique ON goals(organization_id, performance_technique);
