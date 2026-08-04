-- Alter manager_appraisals to add promotion and training recommendations
ALTER TABLE manager_appraisals
ADD COLUMN IF NOT EXISTS promotion_recommendation VARCHAR(100),
ADD COLUMN IF NOT EXISTS training_recommendation TEXT;
