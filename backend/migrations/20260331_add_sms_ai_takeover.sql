ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS manual_takeover BOOLEAN DEFAULT false;
