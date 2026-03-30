-- Add slot persistence support for availability-backed bookings
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
