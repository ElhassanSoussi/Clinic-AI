ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS spreadsheet_provider TEXT DEFAULT '';

UPDATE clinics
SET spreadsheet_provider = CASE
    WHEN COALESCE(google_sheet_id, '') <> '' THEN 'google'
    ELSE ''
END
WHERE COALESCE(spreadsheet_provider, '') = '';

ALTER TABLE clinics
    DROP CONSTRAINT IF EXISTS clinics_spreadsheet_provider_check;

ALTER TABLE clinics
    ADD CONSTRAINT clinics_spreadsheet_provider_check
    CHECK (spreadsheet_provider IN ('', 'google', 'excel'));

ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS excel_workbook_id TEXT DEFAULT '';

ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS excel_workbook_name TEXT DEFAULT '';

ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS excel_workbook_url TEXT DEFAULT '';

ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS microsoft_excel_refresh_token TEXT DEFAULT '';
