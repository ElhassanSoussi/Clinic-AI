-- Clinic AI Front Desk — Database Schema
-- Run this in Supabase SQL Editor to create all tables.

-- Clinics
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    greeting_message TEXT DEFAULT 'Welcome! How can I help you today?',
    fallback_message TEXT DEFAULT 'I can help collect your information so the clinic can follow up with you directly.',
    business_hours JSONB DEFAULT '{
        "monday": "9:00 AM - 5:00 PM",
        "tuesday": "9:00 AM - 5:00 PM",
        "wednesday": "9:00 AM - 5:00 PM",
        "thursday": "9:00 AM - 5:00 PM",
        "friday": "9:00 AM - 5:00 PM",
        "saturday": "Closed",
        "sunday": "Closed"
    }'::jsonb,
    services JSONB DEFAULT '["General Consultation"]'::jsonb,
    faq JSONB DEFAULT '[]'::jsonb,
    spreadsheet_provider TEXT DEFAULT '' CHECK (spreadsheet_provider IN ('', 'google', 'excel')),
    google_sheet_id TEXT DEFAULT '',
    google_sheet_tab TEXT DEFAULT 'Sheet1',
    excel_workbook_id TEXT DEFAULT '',
    excel_workbook_name TEXT DEFAULT '',
    excel_workbook_url TEXT DEFAULT '',
    microsoft_excel_refresh_token TEXT DEFAULT '',
    notifications_enabled BOOLEAN DEFAULT false,
    notification_email TEXT DEFAULT '',
    availability_enabled BOOLEAN DEFAULT false,
    availability_sheet_tab TEXT DEFAULT 'Availability',
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_lead_hours INTEGER DEFAULT 24,
    follow_up_automation_enabled BOOLEAN DEFAULT false,
    follow_up_delay_minutes INTEGER DEFAULT 45,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step INTEGER DEFAULT 0,
    assistant_name TEXT DEFAULT '',
    primary_color TEXT DEFAULT '#0d9488',
    logo_url TEXT DEFAULT '',
    is_live BOOLEAN DEFAULT false,
    plan TEXT DEFAULT 'trial',
    subscription_status TEXT DEFAULT 'trialing',
    stripe_customer_id TEXT DEFAULT '',
    stripe_subscription_id TEXT DEFAULT '',
    trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
    monthly_lead_limit INTEGER DEFAULT 25,
    monthly_leads_used INTEGER DEFAULT 0,
    leads_reset_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leads / Appointment Requests
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT DEFAULT '',
    patient_email TEXT DEFAULT '',
    reason_for_visit TEXT DEFAULT '',
    preferred_datetime_text TEXT DEFAULT '',
    slot_row_index INTEGER,
    slot_source TEXT DEFAULT 'manual' CHECK (slot_source IN ('manual', 'availability')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'booked', 'closed')),
    appointment_status TEXT DEFAULT 'request_open' CHECK (appointment_status IN ('request_open', 'confirmed', 'cancel_requested', 'reschedule_requested', 'cancelled', 'completed', 'no_show')),
    appointment_starts_at TIMESTAMPTZ,
    appointment_ends_at TIMESTAMPTZ,
    reminder_status TEXT DEFAULT 'not_ready' CHECK (reminder_status IN ('not_ready', 'ready', 'scheduled', 'sent')),
    reminder_scheduled_for TIMESTAMPTZ,
    reminder_note TEXT DEFAULT '',
    deposit_required BOOLEAN DEFAULT false,
    deposit_amount_cents INTEGER,
    deposit_status TEXT DEFAULT 'not_required' CHECK (deposit_status IN ('not_required', 'required', 'requested', 'paid', 'failed', 'expired', 'waived')),
    deposit_checkout_session_id TEXT DEFAULT '',
    deposit_payment_intent_id TEXT DEFAULT '',
    deposit_requested_at TIMESTAMPTZ,
    deposit_paid_at TIMESTAMPTZ,
    source TEXT DEFAULT 'web_chat',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    channel TEXT DEFAULT 'web_chat',
    manual_takeover BOOLEAN DEFAULT false,
    last_intent TEXT DEFAULT 'general',
    summary TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conversation Messages
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'manual_note' CHECK (source_type IN ('manual_note', 'document_upload')),
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS follow_up_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    source_key TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('abandoned_conversation', 'new_lead_stale', 'follow_up_needed', 'cancel_request', 'reschedule_request', 'no_show_risk')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'snoozed', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    title TEXT NOT NULL,
    detail TEXT DEFAULT '',
    customer_key TEXT DEFAULT '',
    customer_name TEXT DEFAULT '',
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    auto_generated BOOLEAN DEFAULT false,
    due_at TIMESTAMPTZ DEFAULT now(),
    note TEXT DEFAULT '',
    last_action_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (clinic_id, source_key)
);

CREATE TABLE IF NOT EXISTS waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    customer_key TEXT DEFAULT '',
    patient_name TEXT NOT NULL,
    patient_phone TEXT DEFAULT '',
    patient_email TEXT DEFAULT '',
    service_requested TEXT DEFAULT '',
    preferred_times TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'contacted', 'booked', 'closed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

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
    thread_key TEXT DEFAULT '',
    channel TEXT NOT NULL CHECK (channel IN ('web_chat', 'sms', 'whatsapp', 'missed_call', 'callback_request', 'manual')),
    direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound', 'internal')),
    event_type TEXT NOT NULL CHECK (event_type IN ('message', 'missed_call', 'text_back', 'callback_request', 'note', 'reminder', 'deposit_request')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'queued', 'attempted', 'sent', 'delivered', 'failed', 'skipped', 'completed', 'dismissed')),
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
    provider_message_id TEXT DEFAULT '',
    failure_reason TEXT DEFAULT '',
    skipped_reason TEXT DEFAULT '',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    payload JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('lead_notification_email', 'spreadsheet_append_lead', 'spreadsheet_update_lead_status', 'spreadsheet_reserve_slot', 'retry_communication_event')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    payload JSONB DEFAULT '{}'::jsonb,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    available_at TIMESTAMPTZ DEFAULT now(),
    locked_at TIMESTAMPTZ,
    last_error TEXT DEFAULT '',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clinic ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_leads_clinic ON leads(clinic_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_appointment_status ON leads(clinic_id, appointment_status);
CREATE INDEX IF NOT EXISTS idx_conversations_clinic ON conversations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(clinic_id, channel);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_clinic ON knowledge_sources(clinic_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_clinic_status ON follow_up_tasks(clinic_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_clinic_status ON waitlist_entries(clinic_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_channel_connections_clinic_channel ON channel_connections(clinic_id, channel);
CREATE INDEX IF NOT EXISTS idx_communication_events_clinic_occurred ON communication_events(clinic_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_events_clinic_channel_status ON communication_events(clinic_id, channel, status);
CREATE INDEX IF NOT EXISTS idx_communication_events_clinic_thread_key ON communication_events(clinic_id, thread_key, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status_available ON background_jobs(status, available_at);
CREATE INDEX IF NOT EXISTS idx_background_jobs_clinic_status ON background_jobs(clinic_id, status, available_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers (idempotent)
DROP TRIGGER IF EXISTS tr_clinics_updated_at ON clinics;
CREATE TRIGGER tr_clinics_updated_at BEFORE UPDATE ON clinics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_users_updated_at ON users;
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_leads_updated_at ON leads;
CREATE TRIGGER tr_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_conversations_updated_at ON conversations;
CREATE TRIGGER tr_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_knowledge_sources_updated_at ON knowledge_sources;
CREATE TRIGGER tr_knowledge_sources_updated_at BEFORE UPDATE ON knowledge_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_follow_up_tasks_updated_at ON follow_up_tasks;
CREATE TRIGGER tr_follow_up_tasks_updated_at BEFORE UPDATE ON follow_up_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_waitlist_entries_updated_at ON waitlist_entries;
CREATE TRIGGER tr_waitlist_entries_updated_at BEFORE UPDATE ON waitlist_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_channel_connections_updated_at ON channel_connections;
CREATE TRIGGER tr_channel_connections_updated_at BEFORE UPDATE ON channel_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_communication_events_updated_at ON communication_events;
CREATE TRIGGER tr_communication_events_updated_at BEFORE UPDATE ON communication_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_background_jobs_updated_at ON background_jobs;
CREATE TRIGGER tr_background_jobs_updated_at BEFORE UPDATE ON background_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION enqueue_lead_created_background_jobs()
RETURNS TRIGGER AS $$
DECLARE
    clinic_row RECORD;
BEGIN
    SELECT
        spreadsheet_provider,
        google_sheet_id,
        excel_workbook_id,
        notifications_enabled
    INTO clinic_row
    FROM clinics
    WHERE id = NEW.clinic_id;

    IF COALESCE(clinic_row.spreadsheet_provider, '') <> ''
        OR COALESCE(clinic_row.google_sheet_id, '') <> ''
        OR COALESCE(clinic_row.excel_workbook_id, '') <> ''
    THEN
        INSERT INTO background_jobs (clinic_id, job_type, payload)
        VALUES (
            NEW.clinic_id,
            'spreadsheet_append_lead',
            jsonb_build_object('lead_id', NEW.id)
        );
    END IF;

    IF COALESCE(clinic_row.notifications_enabled, false) THEN
        INSERT INTO background_jobs (clinic_id, job_type, payload)
        VALUES (
            NEW.clinic_id,
            'lead_notification_email',
            jsonb_build_object('lead_id', NEW.id)
        );
    END IF;

    IF NEW.slot_row_index IS NOT NULL THEN
        INSERT INTO background_jobs (clinic_id, job_type, payload)
        VALUES (
            NEW.clinic_id,
            'spreadsheet_reserve_slot',
            jsonb_build_object('lead_id', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enqueue_lead_status_background_jobs()
RETURNS TRIGGER AS $$
DECLARE
    clinic_row RECORD;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    SELECT
        spreadsheet_provider,
        google_sheet_id,
        excel_workbook_id
    INTO clinic_row
    FROM clinics
    WHERE id = NEW.clinic_id;

    IF COALESCE(clinic_row.spreadsheet_provider, '') <> ''
        OR COALESCE(clinic_row.google_sheet_id, '') <> ''
        OR COALESCE(clinic_row.excel_workbook_id, '') <> ''
    THEN
        INSERT INTO background_jobs (clinic_id, job_type, payload)
        VALUES (
            NEW.clinic_id,
            'spreadsheet_update_lead_status',
            jsonb_build_object('lead_id', NEW.id, 'status', NEW.status)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_leads_enqueue_created_jobs ON leads;
CREATE TRIGGER tr_leads_enqueue_created_jobs
    AFTER INSERT ON leads
    FOR EACH ROW EXECUTE FUNCTION enqueue_lead_created_background_jobs();

DROP TRIGGER IF EXISTS tr_leads_enqueue_status_jobs ON leads;
CREATE TRIGGER tr_leads_enqueue_status_jobs
    AFTER UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION enqueue_lead_status_background_jobs();

-- Row Level Security (enable but keep permissive for service-role access)
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

-- Service-role policies (backend uses service key, bypasses RLS automatically)
-- Public read for clinics by slug (for chat widget)
DROP POLICY IF EXISTS "Public can read clinics by slug" ON clinics;
CREATE POLICY "Public can read clinics by slug"
    ON clinics FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public can read conversation_messages" ON conversation_messages;
CREATE POLICY "Public can read conversation_messages"
    ON conversation_messages FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public can insert conversation_messages" ON conversation_messages;
CREATE POLICY "Public can insert conversation_messages"
    ON conversation_messages FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read conversations" ON conversations;
CREATE POLICY "Public can read conversations"
    ON conversations FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public can insert conversations" ON conversations;
CREATE POLICY "Public can insert conversations"
    ON conversations FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update conversations" ON conversations;
CREATE POLICY "Public can update conversations"
    ON conversations FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Public can insert leads" ON leads;
CREATE POLICY "Public can insert leads"
    ON leads FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read own clinic leads" ON leads;
CREATE POLICY "Authenticated users can read own clinic leads"
    ON leads FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can read own clinic knowledge sources" ON knowledge_sources;
CREATE POLICY "Authenticated users can read own clinic knowledge sources"
    ON knowledge_sources FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage own clinic knowledge sources" ON knowledge_sources;
CREATE POLICY "Authenticated users can manage own clinic knowledge sources"
    ON knowledge_sources FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage own clinic follow up tasks" ON follow_up_tasks;
CREATE POLICY "Authenticated users can manage own clinic follow up tasks"
    ON follow_up_tasks FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage own clinic waitlist entries" ON waitlist_entries;
CREATE POLICY "Authenticated users can manage own clinic waitlist entries"
    ON waitlist_entries FOR ALL
    USING (true)
    WITH CHECK (true);

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

DROP POLICY IF EXISTS "Authenticated users can manage own clinic background jobs" ON background_jobs;
CREATE POLICY "Authenticated users can manage own clinic background jobs"
    ON background_jobs FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update own clinic leads" ON leads;
CREATE POLICY "Authenticated users can update own clinic leads"
    ON leads FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Users can insert profile" ON users;
CREATE POLICY "Users can insert profile"
    ON users FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Clinics can be inserted" ON clinics;
CREATE POLICY "Clinics can be inserted"
    ON clinics FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Clinics can be updated" ON clinics;
CREATE POLICY "Clinics can be updated"
    ON clinics FOR UPDATE
    USING (true);

-- Backfill support for older deployments created before slot columns existed
ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS slot_row_index INTEGER;

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS slot_source TEXT DEFAULT 'manual';

ALTER TABLE IF EXISTS conversations
    ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'web_chat';

ALTER TABLE IF EXISTS clinics
    ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS clinics
    ADD COLUMN IF NOT EXISTS reminder_lead_hours INTEGER DEFAULT 24;

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS appointment_status TEXT DEFAULT 'request_open';

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS appointment_starts_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS appointment_ends_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS reminder_status TEXT DEFAULT 'not_ready';

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS reminder_scheduled_for TIMESTAMPTZ;

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS reminder_note TEXT DEFAULT '';

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS deposit_amount_cents INTEGER;

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'not_required';

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS deposit_checkout_session_id TEXT DEFAULT '';

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS deposit_payment_intent_id TEXT DEFAULT '';

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS deposit_requested_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'leads_deposit_status_check'
    ) THEN
        ALTER TABLE leads
            DROP CONSTRAINT leads_deposit_status_check;
    END IF;
END
$$;

UPDATE leads
SET deposit_status = CASE
    WHEN deposit_status = 'pending' THEN 'requested'
    WHEN deposit_status IN ('not_required', 'required', 'requested', 'paid', 'failed', 'expired', 'waived') THEN deposit_status
    ELSE 'not_required'
END
WHERE COALESCE(deposit_status, '') NOT IN ('not_required', 'required', 'requested', 'paid', 'failed', 'expired', 'waived');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'leads_slot_source_check'
    ) THEN
        ALTER TABLE leads
        ADD CONSTRAINT leads_slot_source_check
        CHECK (slot_source IN ('manual', 'availability'));
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'leads_appointment_status_check'
    ) THEN
        ALTER TABLE leads
        ADD CONSTRAINT leads_appointment_status_check
        CHECK (appointment_status IN ('request_open', 'confirmed', 'cancel_requested', 'reschedule_requested', 'cancelled', 'completed', 'no_show'));
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'leads_reminder_status_check'
    ) THEN
        ALTER TABLE leads
        ADD CONSTRAINT leads_reminder_status_check
        CHECK (reminder_status IN ('not_ready', 'ready', 'scheduled', 'sent'));
    END IF;
END
$$;

ALTER TABLE leads
    ADD CONSTRAINT leads_deposit_status_check
    CHECK (deposit_status IN ('not_required', 'required', 'requested', 'paid', 'failed', 'expired', 'waived'));

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'communication_events_event_type_check'
    ) THEN
        ALTER TABLE communication_events
            DROP CONSTRAINT communication_events_event_type_check;
    END IF;
END
$$;

ALTER TABLE communication_events
    ADD CONSTRAINT communication_events_event_type_check
    CHECK (event_type IN ('message', 'missed_call', 'text_back', 'callback_request', 'note', 'reminder', 'deposit_request'));

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'communication_events_status_check'
    ) THEN
        ALTER TABLE communication_events
            DROP CONSTRAINT communication_events_status_check;
    END IF;
END
$$;

ALTER TABLE communication_events
    ADD CONSTRAINT communication_events_status_check
    CHECK (status IN ('new', 'queued', 'attempted', 'sent', 'delivered', 'failed', 'skipped', 'completed', 'dismissed'));

-- Events: lightweight tracking for demo engagement
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    session_id TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert events" ON events;
CREATE POLICY "Public can insert events"
    ON events FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read events" ON events;
CREATE POLICY "Authenticated can read events"
    ON events FOR SELECT
    USING (true);

-- Sales leads: inbound interest from contact / book-a-demo
CREATE TABLE IF NOT EXISTS sales_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    clinic_name TEXT DEFAULT '',
    email TEXT NOT NULL,
    phone TEXT DEFAULT '',
    message TEXT DEFAULT '',
    source TEXT DEFAULT 'contact_form',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_leads_created ON sales_leads(created_at);

ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert sales_leads" ON sales_leads;
CREATE POLICY "Public can insert sales_leads"
    ON sales_leads FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read sales_leads" ON sales_leads;
CREATE POLICY "Authenticated can read sales_leads"
    ON sales_leads FOR SELECT
    USING (true);
