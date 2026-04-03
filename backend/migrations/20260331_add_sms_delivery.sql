ALTER TABLE IF EXISTS communication_events
    ADD COLUMN IF NOT EXISTS provider_message_id TEXT DEFAULT '';

ALTER TABLE IF EXISTS communication_events
    ADD COLUMN IF NOT EXISTS failure_reason TEXT DEFAULT '';

ALTER TABLE IF EXISTS communication_events
    ADD COLUMN IF NOT EXISTS skipped_reason TEXT DEFAULT '';

ALTER TABLE IF EXISTS communication_events
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS communication_events
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'communication_events_event_type_check'
    ) THEN
        ALTER TABLE communication_events
            DROP CONSTRAINT communication_events_event_type_check;
    END IF;
END $$;

ALTER TABLE communication_events
    ADD CONSTRAINT communication_events_event_type_check
    CHECK (event_type IN ('message', 'missed_call', 'text_back', 'callback_request', 'note', 'reminder'));

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'communication_events_status_check'
    ) THEN
        ALTER TABLE communication_events
            DROP CONSTRAINT communication_events_status_check;
    END IF;
END $$;

ALTER TABLE communication_events
    ADD CONSTRAINT communication_events_status_check
    CHECK (status IN ('new', 'queued', 'attempted', 'sent', 'delivered', 'failed', 'skipped', 'completed', 'dismissed'));
