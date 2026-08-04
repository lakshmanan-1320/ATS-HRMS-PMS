-- Migration 066: Create Performance Technique Configurations Table

CREATE TABLE IF NOT EXISTS performance_technique_configurations (
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  technique VARCHAR(50) NOT NULL,
  configuration_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, technique)
);

-- Seed default configurations for all existing organizations
INSERT INTO performance_technique_configurations (organization_id, technique, configuration_json)
SELECT 
  organization_id, 
  'CONTINUOUS_FEEDBACK', 
  '{"reflection": {"enabled": true, "weight": 20}, "manager_feedback": {"enabled": true, "weight": 20}, "verified_action_items": {"enabled": true, "weight": 40}, "goal_closure": {"enabled": true, "weight": 20}}'::jsonb
FROM organizations
ON CONFLICT (organization_id, technique) DO NOTHING;
