-- Add Google Sheets, notification, and availability columns to clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS google_sheet_id TEXT DEFAULT '';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS google_sheet_tab TEXT DEFAULT 'Sheet1';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS notification_email TEXT DEFAULT '';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS availability_enabled BOOLEAN DEFAULT false;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS availability_sheet_tab TEXT DEFAULT 'Availability';
