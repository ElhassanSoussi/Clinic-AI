-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge documents: uploaded files tracked with processing state
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'txt')),
    file_size_bytes INTEGER DEFAULT 0,
    storage_path TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
    error_message TEXT DEFAULT '',
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_clinic ON knowledge_documents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_clinic_status ON knowledge_documents(clinic_id, status);

-- Document chunks: text segments with vector embeddings for retrieval
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE NOT NULL,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    token_count INTEGER DEFAULT 0,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_clinic ON document_chunks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id);

-- HNSW index for fast approximate nearest-neighbor search on embeddings
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- RLS
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages knowledge_documents" ON knowledge_documents;
CREATE POLICY "Service role manages knowledge_documents"
    ON knowledge_documents FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages document_chunks" ON document_chunks;
CREATE POLICY "Service role manages document_chunks"
    ON document_chunks FOR ALL
    USING (true)
    WITH CHECK (true);

-- Updated_at triggers
DROP TRIGGER IF EXISTS tr_knowledge_documents_updated_at ON knowledge_documents;
CREATE TRIGGER tr_knowledge_documents_updated_at BEFORE UPDATE ON knowledge_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Also update the knowledge_sources status constraint to include 'processing' and 'failed'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_sources_status_check'
    ) THEN
        ALTER TABLE knowledge_sources
            DROP CONSTRAINT knowledge_sources_status_check;
    END IF;
END
$$;

ALTER TABLE knowledge_sources
    ADD CONSTRAINT knowledge_sources_status_check
    CHECK (status IN ('active', 'pending', 'processing', 'failed'));

-- Vector similarity search function scoped to clinic
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(1536),
    match_clinic_id UUID,
    match_count INTEGER DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    chunk_index INTEGER,
    content TEXT,
    similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        dc.id,
        dc.document_id,
        dc.chunk_index,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    INNER JOIN knowledge_documents kd ON kd.id = dc.document_id
    WHERE dc.clinic_id = match_clinic_id
      AND kd.status = 'ready'
      AND dc.embedding IS NOT NULL
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
$$;
