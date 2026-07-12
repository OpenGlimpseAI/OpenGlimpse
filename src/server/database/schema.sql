CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS programmes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id    UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delegates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    badge           TEXT,
    photo_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS programme_delegates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id    UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    delegate_id     UUID NOT NULL REFERENCES delegates(id) ON DELETE CASCADE,
    route_id        UUID REFERENCES routes(id) ON DELETE SET NULL,
    notes           TEXT DEFAULT '',
    UNIQUE (programme_id, delegate_id)
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id    UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    delegate_id     UUID NOT NULL REFERENCES delegates(id) ON DELETE CASCADE,
    status          TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    method          TEXT NOT NULL CHECK (method IN ('auto', 'manual')),
    checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_in_by   UUID,
    notes           TEXT DEFAULT '',
    UNIQUE (programme_id, delegate_id)
);

CREATE TABLE IF NOT EXISTS ready_to_depart (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id    UUID NOT NULL UNIQUE REFERENCES programmes(id) ON DELETE CASCADE,
    ready           BOOLEAN NOT NULL DEFAULT false,
    toggled_by      UUID,
    toggled_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS staff (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    photo_url       TEXT,
    role            TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scan_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id    UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    delegate_id     UUID,
    confidence      REAL,
    status          TEXT NOT NULL CHECK (status IN ('verified', 'unverified')),
    unverified_reason TEXT,
    bounding_box_id TEXT,
    scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id    UUID,
    sender_id       UUID NOT NULL,
    text            TEXT NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offline_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id         TEXT NOT NULL UNIQUE,
    device_id       TEXT NOT NULL,
    programme_id    UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    payload         JSONB NOT NULL,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed       BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_routes_programme ON routes(programme_id);
CREATE INDEX IF NOT EXISTS idx_pd_programme ON programme_delegates(programme_id);
CREATE INDEX IF NOT EXISTS idx_pd_delegate ON programme_delegates(delegate_id);
CREATE INDEX IF NOT EXISTS idx_attendance_programme ON attendance_records(programme_id);
CREATE INDEX IF NOT EXISTS idx_attendance_delegate ON attendance_records(delegate_id);
CREATE INDEX IF NOT EXISTS idx_scans_programme ON scan_events(programme_id);
CREATE INDEX IF NOT EXISTS idx_offline_scan_id ON offline_queue(scan_id);
