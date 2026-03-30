-- Add is_live flag for explicit Go Live activation
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;
