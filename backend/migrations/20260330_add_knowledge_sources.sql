CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'manual_note' CHECK (source_type IN ('manual_note', 'document_upload')),
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_clinic ON knowledge_sources(clinic_id);

DROP TRIGGER IF EXISTS tr_knowledge_sources_updated_at ON knowledge_sources;
CREATE TRIGGER tr_knowledge_sources_updated_at BEFORE UPDATE ON knowledge_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read own clinic knowledge sources" ON knowledge_sources;
CREATE POLICY "Authenticated users can read own clinic knowledge sources"
    ON knowledge_sources FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage own clinic knowledge sources" ON knowledge_sources;
CREATE POLICY "Authenticated users can manage own clinic knowledge sources"
    ON knowledge_sources FOR ALL
    USING (true)
    WITH CHECK (true);
