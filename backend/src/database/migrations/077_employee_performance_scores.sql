-- Migration 077: Create employee_performance_scores table

CREATE TABLE IF NOT EXISTS employee_performance_scores (
    employee_performance_score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    performance_configuration_id UUID NOT NULL REFERENCES performance_configurations(performance_configuration_id) ON DELETE CASCADE,
    performance_score NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT employee_performance_scores_unique UNIQUE (employee_id, performance_configuration_id)
);
