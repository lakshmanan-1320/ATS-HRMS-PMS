-- Create Office Locations Table
CREATE TABLE IF NOT EXISTS office_locations (
    office_location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    location_name      VARCHAR(150) NOT NULL,
    address            TEXT,
    latitude           DECIMAL(10,8) NOT NULL,
    longitude          DECIMAL(11,8) NOT NULL,
    radius_meters      INTEGER NOT NULL,
    is_active          BOOLEAN DEFAULT TRUE,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Index for organization querying
CREATE INDEX IF NOT EXISTS idx_office_locations_org ON office_locations(organization_id);

-- Create Attendance Policy Locations Mapping Table
CREATE TABLE IF NOT EXISTS attendance_policy_locations (
    attendance_policy_location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_policy_id          UUID NOT NULL REFERENCES attendance_policies(attendance_policy_id) ON DELETE CASCADE,
    office_location_id            UUID NOT NULL REFERENCES office_locations(office_location_id) ON DELETE CASCADE,
    created_at                    TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uidx_policy_location UNIQUE (attendance_policy_id, office_location_id)
);

-- Alter attendance_punches to add new fields and allow NULL coordinates
ALTER TABLE attendance_punches ALTER COLUMN check_in_latitude DROP NOT NULL;
ALTER TABLE attendance_punches ALTER COLUMN check_in_longitude DROP NOT NULL;

ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS location_status VARCHAR(30) DEFAULT 'LOCATION_NOT_VERIFIED';
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS gps_accuracy NUMERIC(8,2);
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS distance_from_office NUMERIC(10,2);
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS location_source VARCHAR(30) DEFAULT 'UNKNOWN';
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS matched_office_location_id UUID REFERENCES office_locations(office_location_id) ON DELETE SET NULL;
