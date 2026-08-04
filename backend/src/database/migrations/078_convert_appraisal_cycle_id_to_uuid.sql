-- Migration 078: Convert appraisal_cycle_id to UUID in appraisal_cycles and all referencing tables

-- 1. Drop foreign key constraints and indexes
ALTER TABLE appraisal_cycle_performance_cycles DROP CONSTRAINT IF EXISTS appraisal_cycle_performance_cycles_appraisal_cycle_id_fkey;
ALTER TABLE self_appraisals DROP CONSTRAINT IF EXISTS self_appraisals_cycle_id_fkey;
ALTER TABLE manager_appraisals DROP CONSTRAINT IF EXISTS manager_appraisals_cycle_id_fkey;

DROP INDEX IF EXISTS idx_self_appraisals_cycle;
DROP INDEX IF EXISTS idx_manager_appraisals_cycle;

-- 2. Alter column types using temporary UUID columns to convert existing integer mappings safely
-- We will generate random UUIDs for existing appraisal_cycles, and update referencing tables to match the new UUIDs.

-- Create a lookup map temp column in appraisal_cycles
ALTER TABLE appraisal_cycles ADD COLUMN IF NOT EXISTS temp_uuid UUID DEFAULT gen_random_uuid();

-- Update self_appraisals cycle_id
ALTER TABLE self_appraisals ADD COLUMN temp_cycle_uuid UUID;
UPDATE self_appraisals sa
SET temp_cycle_uuid = ac.temp_uuid
FROM appraisal_cycles ac
WHERE sa.cycle_id = ac.appraisal_cycle_id;

-- Update manager_appraisals cycle_id
ALTER TABLE manager_appraisals ADD COLUMN temp_cycle_uuid UUID;
UPDATE manager_appraisals ma
SET temp_cycle_uuid = ac.temp_uuid
FROM appraisal_cycles ac
WHERE ma.cycle_id = ac.appraisal_cycle_id;

-- Update appraisal_cycle_performance_cycles appraisal_cycle_id
ALTER TABLE appraisal_cycle_performance_cycles ADD COLUMN temp_cycle_uuid UUID;
UPDATE appraisal_cycle_performance_cycles acpc
SET temp_cycle_uuid = ac.temp_uuid
FROM appraisal_cycles ac
WHERE acpc.appraisal_cycle_id = ac.appraisal_cycle_id;

-- 3. Perform primary key and column swaps
-- Drop old pk and check constraints
ALTER TABLE appraisal_cycles DROP CONSTRAINT IF EXISTS appraisal_cycles_pkey CASCADE;
ALTER TABLE appraisal_cycles DROP COLUMN IF EXISTS appraisal_cycle_id CASCADE;
ALTER TABLE appraisal_cycles RENAME COLUMN temp_uuid TO appraisal_cycle_id;
ALTER TABLE appraisal_cycles ADD PRIMARY KEY (appraisal_cycle_id);

-- Swap cycle_id in self_appraisals
ALTER TABLE self_appraisals DROP COLUMN IF EXISTS cycle_id CASCADE;
ALTER TABLE self_appraisals RENAME COLUMN temp_cycle_uuid TO cycle_id;
ALTER TABLE self_appraisals ALTER COLUMN cycle_id SET NOT NULL;
ALTER TABLE self_appraisals ADD CONSTRAINT self_appraisals_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES appraisal_cycles(appraisal_cycle_id) ON DELETE CASCADE;
ALTER TABLE self_appraisals ADD UNIQUE (cycle_id, employee_id);

-- Swap cycle_id in manager_appraisals
ALTER TABLE manager_appraisals DROP COLUMN IF EXISTS cycle_id CASCADE;
ALTER TABLE manager_appraisals RENAME COLUMN temp_cycle_uuid TO cycle_id;
ALTER TABLE manager_appraisals ALTER COLUMN cycle_id SET NOT NULL;
ALTER TABLE manager_appraisals ADD CONSTRAINT manager_appraisals_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES appraisal_cycles(appraisal_cycle_id) ON DELETE CASCADE;
ALTER TABLE manager_appraisals ADD UNIQUE (cycle_id, employee_id);

-- Swap appraisal_cycle_id in appraisal_cycle_performance_cycles
ALTER TABLE appraisal_cycle_performance_cycles DROP COLUMN IF EXISTS appraisal_cycle_id CASCADE;
ALTER TABLE appraisal_cycle_performance_cycles RENAME COLUMN temp_cycle_uuid TO appraisal_cycle_id;
ALTER TABLE appraisal_cycle_performance_cycles ALTER COLUMN appraisal_cycle_id SET NOT NULL;
ALTER TABLE appraisal_cycle_performance_cycles ADD CONSTRAINT appraisal_cycle_performance_cycles_appraisal_cycle_id_fkey FOREIGN KEY (appraisal_cycle_id) REFERENCES appraisal_cycles(appraisal_cycle_id) ON DELETE CASCADE;
ALTER TABLE appraisal_cycle_performance_cycles ADD PRIMARY KEY (appraisal_cycle_id, performance_configuration_id);

-- 4. Recreate Indexes
CREATE INDEX IF NOT EXISTS idx_self_appraisals_cycle ON self_appraisals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_manager_appraisals_cycle ON manager_appraisals(cycle_id);
