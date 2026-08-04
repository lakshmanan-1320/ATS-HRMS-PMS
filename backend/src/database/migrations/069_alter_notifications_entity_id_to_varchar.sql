-- Migration 069: Alter notifications entity_id to VARCHAR to support UUIDs
ALTER TABLE notifications ALTER COLUMN entity_id TYPE VARCHAR(255) USING entity_id::VARCHAR;
