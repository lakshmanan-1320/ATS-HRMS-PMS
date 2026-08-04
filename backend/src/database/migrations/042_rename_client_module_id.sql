-- Migration 042: Rename 'id' column to 'client_module_id' in 'client_modules' table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'client_modules' AND column_name = 'id'
    ) THEN
        ALTER TABLE client_modules RENAME COLUMN id TO client_module_id;
    END IF;
END $$;
