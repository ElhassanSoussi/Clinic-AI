-- Atomic increment for monthly_leads_used to prevent race conditions
CREATE OR REPLACE FUNCTION increment_monthly_leads(clinic_id_input UUID)
RETURNS void AS $$
BEGIN
    UPDATE clinics
    SET monthly_leads_used = COALESCE(monthly_leads_used, 0) + 1
    WHERE id = clinic_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
