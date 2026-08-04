-- Add place_id column to office_locations table
ALTER TABLE office_locations ADD COLUMN IF NOT EXISTS place_id VARCHAR(255);
