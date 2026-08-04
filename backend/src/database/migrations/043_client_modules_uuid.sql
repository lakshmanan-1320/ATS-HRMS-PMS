-- Migration 043: Change client_module_id from SERIAL/INTEGER to UUID in client_modules table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'client_modules' AND column_name = 'client_module_id' AND data_type = 'integer'
    ) THEN
        -- Add temporary UUID column
        ALTER TABLE client_modules ADD COLUMN new_client_module_id UUID DEFAULT gen_random_uuid();
        
        -- Populate new UUID values
        UPDATE client_modules SET new_client_module_id = gen_random_uuid() WHERE new_client_module_id IS NULL;
        
        -- Drop old integer column & constraints
        ALTER TABLE client_modules DROP CONSTRAINT IF EXISTS client_modules_pkey;
        ALTER TABLE client_modules DROP COLUMN client_module_id;
        
        -- Rename new column to client_module_id & set as PRIMARY KEY
        ALTER TABLE client_modules RENAME COLUMN new_client_module_id TO client_module_id;
        ALTER TABLE client_modules ADD PRIMARY KEY (client_module_id);
    END IF;
END $$;
