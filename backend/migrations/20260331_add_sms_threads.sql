ALTER TABLE IF EXISTS communication_events
    ADD COLUMN IF NOT EXISTS thread_key TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_communication_events_clinic_thread_key
    ON communication_events(clinic_id, thread_key, occurred_at DESC);
