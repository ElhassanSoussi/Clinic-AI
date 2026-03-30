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
    google_sheet_id TEXT DEFAULT '',
    google_sheet_tab TEXT DEFAULT 'Sheet1',
    notifications_enabled BOOLEAN DEFAULT false,
    notification_email TEXT DEFAULT '',
    availability_enabled BOOLEAN DEFAULT false,
    availability_sheet_tab TEXT DEFAULT 'Availability',
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clinic ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_leads_clinic ON leads(clinic_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_clinic ON conversations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON conversation_messages(conversation_id);

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

-- Row Level Security (enable but keep permissive for service-role access)
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

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
