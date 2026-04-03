ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS deposit_checkout_session_id TEXT DEFAULT '';

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS deposit_payment_intent_id TEXT DEFAULT '';

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS deposit_requested_at TIMESTAMPTZ;

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;

UPDATE leads
SET deposit_status = CASE
    WHEN deposit_status = 'pending' THEN 'requested'
    WHEN deposit_status IN ('not_required', 'required', 'requested', 'paid', 'failed', 'expired', 'waived') THEN deposit_status
    ELSE 'not_required'
END
WHERE COALESCE(deposit_status, '') NOT IN ('not_required', 'required', 'requested', 'paid', 'failed', 'expired', 'waived');

ALTER TABLE leads
    DROP CONSTRAINT IF EXISTS leads_deposit_status_check;

ALTER TABLE leads
    ADD CONSTRAINT leads_deposit_status_check
    CHECK (deposit_status IN ('not_required', 'required', 'requested', 'paid', 'failed', 'expired', 'waived'));

ALTER TABLE communication_events
    DROP CONSTRAINT IF EXISTS communication_events_event_type_check;

ALTER TABLE communication_events
    ADD CONSTRAINT communication_events_event_type_check
    CHECK (event_type IN ('message', 'missed_call', 'text_back', 'callback_request', 'note', 'reminder', 'deposit_request'));
