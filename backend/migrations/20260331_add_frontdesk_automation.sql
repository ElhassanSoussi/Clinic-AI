ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS follow_up_automation_enabled BOOLEAN DEFAULT false;

ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS follow_up_delay_minutes INTEGER DEFAULT 45;

ALTER TABLE follow_up_tasks
    ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_clinic_auto_generated
    ON follow_up_tasks(clinic_id, auto_generated, status);
