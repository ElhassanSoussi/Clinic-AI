ALTER TABLE IF EXISTS conversations
    ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'web_chat';

CREATE TABLE IF NOT EXISTS channel_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('web_chat', 'sms', 'whatsapp', 'missed_call', 'callback_request', 'manual')),
    provider TEXT DEFAULT '',
    connection_status TEXT NOT NULL DEFAULT 'not_connected' CHECK (connection_status IN ('not_connected', 'ready_for_setup', 'connected')),
    display_name TEXT DEFAULT '',
    contact_value TEXT DEFAULT '',
    automation_enabled BOOLEAN DEFAULT false,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (clinic_id, channel)
);

CREATE TABLE IF NOT EXISTS communication_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('web_chat', 'sms', 'whatsapp', 'missed_call', 'callback_request', 'manual')),
    direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound', 'internal')),
    event_type TEXT NOT NULL CHECK (event_type IN ('message', 'missed_call', 'text_back', 'callback_request', 'note')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'queued', 'attempted', 'completed', 'failed', 'dismissed')),
    customer_key TEXT DEFAULT '',
    customer_name TEXT DEFAULT '',
    customer_phone TEXT DEFAULT '',
    customer_email TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    content TEXT DEFAULT '',
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    waitlist_entry_id UUID REFERENCES waitlist_entries(id) ON DELETE SET NULL,
    follow_up_task_id UUID REFERENCES follow_up_tasks(id) ON DELETE SET NULL,
    provider TEXT DEFAULT '',
    external_id TEXT DEFAULT '',
    payload JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(clinic_id, channel);
CREATE INDEX IF NOT EXISTS idx_channel_connections_clinic_channel ON channel_connections(clinic_id, channel);
CREATE INDEX IF NOT EXISTS idx_communication_events_clinic_occurred ON communication_events(clinic_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_events_clinic_channel_status ON communication_events(clinic_id, channel, status);

DROP TRIGGER IF EXISTS tr_channel_connections_updated_at ON channel_connections;
CREATE TRIGGER tr_channel_connections_updated_at BEFORE UPDATE ON channel_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_communication_events_updated_at ON communication_events;
CREATE TRIGGER tr_communication_events_updated_at BEFORE UPDATE ON communication_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage own clinic channel connections" ON channel_connections;
CREATE POLICY "Authenticated users can manage own clinic channel connections"
    ON channel_connections FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage own clinic communication events" ON communication_events;
CREATE POLICY "Authenticated users can manage own clinic communication events"
    ON communication_events FOR ALL
    USING (true)
    WITH CHECK (true);
