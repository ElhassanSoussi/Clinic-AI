-- Add onboarding and branding columns to clinics table
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS assistant_name TEXT DEFAULT '';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#0d9488';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
