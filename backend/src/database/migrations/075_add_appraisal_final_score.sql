-- Alter manager_appraisals to add final_score numeric column
ALTER TABLE manager_appraisals
ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2);
