CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    job_type TEXT NOT NULL CHECK (
        job_type IN (
            'lead_notification_email',
            'spreadsheet_append_lead',
            'spreadsheet_update_lead_status',
            'spreadsheet_reserve_slot',
            'retry_communication_event'
        )
    ),
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

CREATE INDEX IF NOT EXISTS idx_background_jobs_status_available
    ON background_jobs(status, available_at);

CREATE INDEX IF NOT EXISTS idx_background_jobs_clinic_status
    ON background_jobs(clinic_id, status, available_at);

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

ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage own clinic background jobs" ON background_jobs;
CREATE POLICY "Authenticated users can manage own clinic background jobs"
    ON background_jobs FOR ALL
    USING (true)
    WITH CHECK (true);
