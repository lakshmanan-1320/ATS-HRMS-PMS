CREATE TABLE IF NOT EXISTS geo_fence_zones (
    geo_fence_zone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    zone_name         VARCHAR(150) NOT NULL,
    latitude          NUMERIC(10, 7) NOT NULL,
    longitude         NUMERIC(10, 7) NOT NULL,
    radius_meters     INTEGER NOT NULL DEFAULT 100,
    is_active         BOOLEAN DEFAULT true,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS geo_fence_zones_org_active_idx
ON geo_fence_zones (organization_id, is_active);

CREATE TABLE IF NOT EXISTS attendance_punches (
    attendance_punch_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id              UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    attendance_date          DATE NOT NULL,
    check_in_time            TIMESTAMPTZ NOT NULL,
    check_out_time           TIMESTAMPTZ,
    check_in_latitude        NUMERIC(10, 7) NOT NULL,
    check_in_longitude       NUMERIC(10, 7) NOT NULL,
    check_out_latitude       NUMERIC(10, 7),
    check_out_longitude      NUMERIC(10, 7),
    check_in_selfie_url      TEXT,
    check_out_selfie_url     TEXT,
    geo_fence_zone_id        UUID REFERENCES geo_fence_zones(geo_fence_zone_id) ON DELETE SET NULL,
    zone_name                VARCHAR(150),
    distance_meters          INTEGER,
    is_within_fence          BOOLEAN,
    work_duration_minutes    INTEGER,
    device_info              JSONB DEFAULT '{}'::jsonb,
    check_in_idempotency_key VARCHAR(120),
    check_out_idempotency_key VARCHAR(120),
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_punches_employee_date_uidx
ON attendance_punches (employee_id, attendance_date);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_punches_check_in_idempotency_uidx
ON attendance_punches (employee_id, check_in_idempotency_key)
WHERE check_in_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_punches_check_out_idempotency_uidx
ON attendance_punches (employee_id, check_out_idempotency_key)
WHERE check_out_idempotency_key IS NOT NULL;
