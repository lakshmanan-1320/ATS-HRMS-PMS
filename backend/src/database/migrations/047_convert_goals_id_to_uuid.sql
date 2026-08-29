-- Migration 047: Convert goals table primary key id (serial) to goal_id (UUID) and update all referencing foreign keys dynamically

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Drop trigger on goals table
    DROP TRIGGER IF EXISTS trg_parent_goal_progress ON goals;

    -- 2. Drop all FK constraints referencing goals table
    FOR r IN (
        SELECT DISTINCT tc.table_schema, tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'goals'
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I;', r.table_schema, r.table_name, r.constraint_name);
    END LOOP;

    -- 3. Drop sequence default on id column before altering type if id exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'goals' AND column_name = 'id'
    ) THEN
        ALTER TABLE goals ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE goals RENAME COLUMN id TO goal_id;
        ALTER TABLE goals ALTER COLUMN goal_id SET DATA TYPE UUID USING gen_random_uuid();
        ALTER TABLE goals ALTER COLUMN goal_id SET DEFAULT gen_random_uuid();
    END IF;

    -- 4. Convert parent_goal_id in goals table to UUID
    ALTER TABLE goals ALTER COLUMN parent_goal_id SET DATA TYPE UUID USING NULL;
    ALTER TABLE goals ADD CONSTRAINT goals_parent_goal_id_fkey FOREIGN KEY (parent_goal_id) REFERENCES goals(goal_id) ON DELETE SET NULL;

    -- 5. Convert foreign key columns in all referencing tables to UUID and re-add FKs
    FOR r IN (
        SELECT DISTINCT kcu.table_schema, kcu.table_name, kcu.column_name
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = kcu.constraint_name
        WHERE ccu.table_name = 'goals' AND kcu.table_name != 'goals'
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I SET DATA TYPE UUID USING NULL;', r.table_schema, r.table_name, r.column_name);
        EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES goals(goal_id) ON DELETE CASCADE;', 
                       r.table_schema, r.table_name, r.table_name || '_' || r.column_name || '_fkey', r.column_name);
    END LOOP;

    -- 6. Explicitly ensure goal_completion_requests.goal_id is UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goal_completion_requests' AND column_name = 'goal_id') THEN
      ALTER TABLE goal_completion_requests ALTER COLUMN goal_id SET DATA TYPE UUID USING NULL;
      ALTER TABLE goal_completion_requests DROP CONSTRAINT IF EXISTS goal_completion_requests_goal_id_fkey;
      ALTER TABLE goal_completion_requests ADD CONSTRAINT goal_completion_requests_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES goals(goal_id) ON DELETE CASCADE;
    END IF;

    -- 7. Recreate trigger on goals table if trigger function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_update_parent_goal_progress') THEN
      CREATE TRIGGER trg_parent_goal_progress 
      AFTER INSERT OR UPDATE OF progress, weight, status ON goals 
      FOR EACH ROW EXECUTE FUNCTION fn_update_parent_goal_progress();
    END IF;
END $$;
