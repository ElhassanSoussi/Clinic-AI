"""
Knowledge document service: upload, extract, chunk, embed, retrieve, delete.

Handles PDF and TXT files. Chunks text into ~400-token segments with overlap.
Uses OpenAI embeddings (text-embedding-3-small, 1536 dimensions).
Retrieval is scoped per clinic via the match_document_chunks RPC in Supabase.
"""

from __future__ import annotations

import io
import re
from typing import Any, Optional

from app.config import get_settings
from app.dependencies import get_supabase
from app.utils.logger import get_logger

logger = get_logger(__name__)

CHUNK_TARGET_TOKENS = 400
CHUNK_OVERLAP_TOKENS = 50
EMBEDDING_MODEL = "text-embedding-3-small"
STORAGE_BUCKET = "knowledge-documents"

# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def extract_text_from_pdf(file_bytes: bytes) -> str:
    from PyPDF2 import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n\n".join(pages)


def extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="replace")


def extract_text(file_bytes: bytes, file_type: str) -> str:
    if file_type == "pdf":
        return extract_text_from_pdf(file_bytes)
    if file_type == "txt":
        return extract_text_from_txt(file_bytes)
    raise ValueError(f"Unsupported file type: {file_type}")


# ---------------------------------------------------------------------------
# Text cleaning & chunking
# ---------------------------------------------------------------------------

def _clean_text(text: str) -> str:
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _estimate_tokens(text: str) -> int:
    try:
        import tiktoken
        enc = tiktoken.encoding_for_model("gpt-4o-mini")
        return len(enc.encode(text))
    except Exception:
        return len(text.split())


def chunk_text(text: str, target_tokens: int = CHUNK_TARGET_TOKENS, overlap_tokens: int = CHUNK_OVERLAP_TOKENS) -> list[str]:
    cleaned = _clean_text(text)
    if not cleaned:
        return []

    paragraphs = cleaned.split("\n\n")
    chunks: list[str] = []
    current_chunk: list[str] = []
    current_tokens = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        para_tokens = _estimate_tokens(para)

        if para_tokens > target_tokens:
            if current_chunk:
                chunks.append("\n\n".join(current_chunk))
                current_chunk = []
                current_tokens = 0
            sentences = re.split(r"(?<=[.!?])\s+", para)
            sent_chunk: list[str] = []
            sent_tokens = 0
            for sent in sentences:
                sent = sent.strip()
                if not sent:
                    continue
                st = _estimate_tokens(sent)
                if sent_tokens + st > target_tokens and sent_chunk:
                    chunks.append(" ".join(sent_chunk))
                    overlap_text = " ".join(sent_chunk[-2:]) if len(sent_chunk) >= 2 else ""
                    sent_chunk = [overlap_text, sent] if overlap_text else [sent]
                    sent_tokens = _estimate_tokens(" ".join(sent_chunk))
                else:
                    sent_chunk.append(sent)
                    sent_tokens += st
            if sent_chunk:
                chunks.append(" ".join(sent_chunk))
            continue

        if current_tokens + para_tokens > target_tokens and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            overlap_paras = current_chunk[-1:]
            current_chunk = list(overlap_paras) + [para]
            current_tokens = sum(_estimate_tokens(p) for p in current_chunk)
        else:
            current_chunk.append(para)
            current_tokens += para_tokens

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return [c for c in chunks if c.strip()]


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------

async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    from openai import AsyncOpenAI
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    batch_size = 100
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=batch,
        )
        for item in response.data:
            all_embeddings.append(item.embedding)

    return all_embeddings


async def generate_single_embedding(text: str) -> list[float]:
    embeddings = await generate_embeddings([text])
    return embeddings[0]


# ---------------------------------------------------------------------------
# Document lifecycle
# ---------------------------------------------------------------------------

def create_document_record(
    clinic_id: str,
    filename: str,
    file_type: str,
    file_size_bytes: int,
    storage_path: str,
) -> dict[str, Any]:
    db = get_supabase()
    result = (
        db.table("knowledge_documents")
        .insert({
            "clinic_id": clinic_id,
            "filename": filename,
            "file_type": file_type,
            "file_size_bytes": file_size_bytes,
            "storage_path": storage_path,
            "status": "uploaded",
        })
        .execute()
    )
    return result.data[0]


def update_document_status(
    document_id: str,
    status: str,
    *,
    error_message: str = "",
    chunk_count: int = 0,
) -> None:
    db = get_supabase()
    update_data: dict[str, Any] = {"status": status}
    if error_message:
        update_data["error_message"] = error_message
    if chunk_count:
        update_data["chunk_count"] = chunk_count
    db.table("knowledge_documents").update(update_data).eq("id", document_id).execute()


def list_documents(clinic_id: str) -> list[dict[str, Any]]:
    db = get_supabase()
    result = (
        db.table("knowledge_documents")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def get_document(clinic_id: str, document_id: str) -> Optional[dict[str, Any]]:
    db = get_supabase()
    result = (
        db.table("knowledge_documents")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("id", document_id)
        .maybe_single()
        .execute()
    )
    return result.data


def delete_document(clinic_id: str, document_id: str) -> bool:
    db = get_supabase()
    doc = get_document(clinic_id, document_id)
    if not doc:
        return False

    db.table("document_chunks").delete().eq("document_id", document_id).execute()

    if doc.get("storage_path"):
        try:
            db.storage.from_(STORAGE_BUCKET).remove([doc["storage_path"]])
        except Exception as exc:
            logger.warning("Failed to remove file from storage: %s", exc)

    db.table("knowledge_documents").delete().eq("id", document_id).eq("clinic_id", clinic_id).execute()
    return True


# ---------------------------------------------------------------------------
# Ingestion pipeline
# ---------------------------------------------------------------------------

async def ingest_document(clinic_id: str, document_id: str, file_bytes: bytes, file_type: str) -> None:
    update_document_status(document_id, "processing")
    try:
        raw_text = extract_text(file_bytes, file_type)
        if not raw_text.strip():
            update_document_status(document_id, "failed", error_message="No readable text found in the document.")
            return

        chunks = chunk_text(raw_text)
        if not chunks:
            update_document_status(document_id, "failed", error_message="Document produced no usable text chunks.")
            return

        logger.info("document_ingestion document_id=%s chunks=%d", document_id, len(chunks))

        embeddings = await generate_embeddings(chunks)

        db = get_supabase()
        rows = []
        for idx, (chunk_text_content, embedding) in enumerate(zip(chunks, embeddings)):
            rows.append({
                "clinic_id": clinic_id,
                "document_id": document_id,
                "chunk_index": idx,
                "content": chunk_text_content,
                "token_count": _estimate_tokens(chunk_text_content),
                "embedding": embedding,
            })

        batch_size = 50
        for i in range(0, len(rows), batch_size):
            db.table("document_chunks").insert(rows[i : i + batch_size]).execute()

        update_document_status(document_id, "ready", chunk_count=len(chunks))
        logger.info("document_ready document_id=%s chunks=%d", document_id, len(chunks))

    except Exception as exc:
        logger.error("document_ingestion_failed document_id=%s error=%s", document_id, exc)
        update_document_status(document_id, "failed", error_message=str(exc)[:500])


# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------

async def retrieve_relevant_chunks(
    clinic_id: str,
    query: str,
    max_results: int = 5,
    threshold: float = 0.7,
) -> list[dict[str, Any]]:
    try:
        query_embedding = await generate_single_embedding(query)
    except Exception as exc:
        logger.error("embedding_query_failed clinic_id=%s error=%s", clinic_id, exc)
        return []

    db = get_supabase()
    try:
        result = db.rpc(
            "match_document_chunks",
            {
                "query_embedding": query_embedding,
                "match_clinic_id": clinic_id,
                "match_count": max_results,
                "match_threshold": threshold,
            },
        ).execute()
        return result.data or []
    except Exception as exc:
        logger.warning("vector_search_failed clinic_id=%s error=%s", clinic_id, exc)
        return []


def get_manual_knowledge_context(clinic_id: str) -> str:
    db = get_supabase()
    try:
        result = (
            db.table("knowledge_sources")
            .select("title, content")
            .eq("clinic_id", clinic_id)
            .eq("status", "active")
            .order("updated_at", desc=True)
            .limit(20)
            .execute()
        )
    except Exception:
        return ""

    if not result.data:
        return ""

    lines = []
    for source in result.data:
        title = (source.get("title") or "").strip()
        content = (source.get("content") or "").strip()
        if title and content:
            lines.append(f"- {title}: {content}")
    return "\n".join(lines)


async def build_knowledge_context(clinic_id: str, user_message: str) -> str:
    """Build a combined knowledge context from manual notes + document retrieval."""
    parts: list[str] = []

    manual = get_manual_knowledge_context(clinic_id)
    if manual:
        parts.append(f"CUSTOM CLINIC KNOWLEDGE NOTES:\n{manual}")

    chunks = await retrieve_relevant_chunks(clinic_id, user_message)
    if chunks:
        chunk_lines = []
        for chunk in chunks:
            content = chunk.get("content", "").strip()
            if content:
                chunk_lines.append(f"- {content[:800]}")
        if chunk_lines:
            parts.append("RELEVANT CLINIC DOCUMENT EXCERPTS:\n" + "\n".join(chunk_lines))

    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Upload helper (Supabase Storage)
# ---------------------------------------------------------------------------

def upload_to_storage(clinic_id: str, filename: str, file_bytes: bytes, content_type: str) -> str:
    import uuid
    db = get_supabase()
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)
    storage_path = f"{clinic_id}/{uuid.uuid4().hex[:12]}_{safe_name}"

    try:
        db.storage.from_(STORAGE_BUCKET).upload(
            storage_path,
            file_bytes,
            file_options={"content-type": content_type},
        )
    except Exception as exc:
        if "Bucket not found" in str(exc):
            db.storage.create_bucket(STORAGE_BUCKET, options={"public": False})
            db.storage.from_(STORAGE_BUCKET).upload(
                storage_path,
                file_bytes,
                file_options={"content-type": content_type},
            )
        else:
            raise

    return storage_path


# ---------------------------------------------------------------------------
# Training overview enrichment
# ---------------------------------------------------------------------------

def get_document_stats(clinic_id: str) -> dict[str, Any]:
    db = get_supabase()
    try:
        docs = (
            db.table("knowledge_documents")
            .select("id, status, chunk_count, filename, file_type, created_at, updated_at")
            .eq("clinic_id", clinic_id)
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
    except Exception:
        docs = []

    ready = [d for d in docs if d.get("status") == "ready"]
    total_chunks = sum(d.get("chunk_count", 0) for d in ready)

    return {
        "documents": docs,
        "document_count": len(docs),
        "ready_count": len(ready),
        "processing_count": len([d for d in docs if d.get("status") == "processing"]),
        "failed_count": len([d for d in docs if d.get("status") == "failed"]),
        "total_chunks": total_chunks,
    }
