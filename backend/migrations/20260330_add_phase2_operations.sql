ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false;

ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS reminder_lead_hours INTEGER DEFAULT 24;

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS appointment_status TEXT DEFAULT 'request_open';

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS appointment_starts_at TIMESTAMPTZ;

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS appointment_ends_at TIMESTAMPTZ;

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS reminder_status TEXT DEFAULT 'not_ready';

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS reminder_scheduled_for TIMESTAMPTZ;

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS reminder_note TEXT DEFAULT '';

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false;

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS deposit_amount_cents INTEGER;

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'not_required';

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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'leads_deposit_status_check'
    ) THEN
        ALTER TABLE leads
        ADD CONSTRAINT leads_deposit_status_check
        CHECK (deposit_status IN ('not_required', 'pending', 'paid', 'waived'));
    END IF;
END
$$;

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

CREATE INDEX IF NOT EXISTS idx_leads_appointment_status ON leads(clinic_id, appointment_status);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_clinic_status ON follow_up_tasks(clinic_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_clinic_status ON waitlist_entries(clinic_id, status, created_at);

DROP TRIGGER IF EXISTS tr_follow_up_tasks_updated_at ON follow_up_tasks;
CREATE TRIGGER tr_follow_up_tasks_updated_at BEFORE UPDATE ON follow_up_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_waitlist_entries_updated_at ON waitlist_entries;
CREATE TRIGGER tr_waitlist_entries_updated_at BEFORE UPDATE ON waitlist_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

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
