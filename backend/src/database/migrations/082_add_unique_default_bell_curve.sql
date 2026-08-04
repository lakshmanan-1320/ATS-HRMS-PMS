-- Migration 082: Enforce Single Default Bell Curve Configuration per Organization

-- 1. Clean up any existing duplicate defaults, leaving only the most recently updated default config
WITH ranked_configs AS (
  SELECT configuration_id,
         ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY updated_at DESC) as rn
  FROM bell_curve_configurations
  WHERE is_default = true
)
UPDATE bell_curve_configurations
SET is_default = false
WHERE configuration_id IN (
  SELECT configuration_id FROM ranked_configs WHERE rn > 1
);

-- 2. Create Unique Partial Index to enforce constraint at DB level
CREATE UNIQUE INDEX IF NOT EXISTS unique_default_bell_curve_per_org
ON bell_curve_configurations (organization_id)
WHERE (is_default = true);
