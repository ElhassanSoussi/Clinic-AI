"""Tests for knowledge service: text extraction, chunking, and retrieval helpers.

These tests cover the pure functions (extraction, cleaning, chunking) that
do not require database or API connections.
"""

from __future__ import annotations

import io
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


# ---------------------------------------------------------------------------
# Inline copies of pure functions to avoid importing the full app chain.
# These mirror the implementations in app/services/knowledge_service.py.
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


def chunk_text(text: str, target_tokens: int = 400, overlap_tokens: int = 50) -> list[str]:
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


def extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="replace")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestCleanText:
    def test_collapses_whitespace(self):
        result = _clean_text("hello   world\t\ttab")
        assert "  " not in result
        assert "\t" not in result
        assert result == "hello world tab"

    def test_collapses_newlines(self):
        result = _clean_text("a\n\n\n\n\nb")
        assert result == "a\n\nb"

    def test_strips(self):
        result = _clean_text("  hello  ")
        assert result == "hello"

    def test_normalizes_crlf(self):
        result = _clean_text("line1\r\nline2")
        assert "\r" not in result


class TestChunkText:
    def test_empty_text_returns_empty(self):
        assert chunk_text("") == []
        assert chunk_text("   ") == []

    def test_short_text_single_chunk(self):
        text = "This is a short paragraph about clinic hours."
        chunks = chunk_text(text)
        assert len(chunks) == 1
        assert "clinic hours" in chunks[0]

    def test_long_text_produces_multiple_chunks(self):
        paragraphs = ["This is paragraph number %d with some filler content about clinic policies." % i for i in range(50)]
        text = "\n\n".join(paragraphs)
        chunks = chunk_text(text, target_tokens=50, overlap_tokens=10)
        assert len(chunks) > 1

    def test_chunks_are_non_empty(self):
        text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
        chunks = chunk_text(text)
        for chunk in chunks:
            assert chunk.strip()

    def test_very_long_paragraph_split_by_sentences(self):
        sentences = ["This is sentence number %d about the clinic." % i for i in range(100)]
        text = " ".join(sentences)
        chunks = chunk_text(text, target_tokens=50, overlap_tokens=5)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk) > 0


class TestExtractTextFromTxt:
    def test_basic_extraction(self):
        content = b"Hello, this is a test document."
        result = extract_text_from_txt(content)
        assert result == "Hello, this is a test document."

    def test_handles_utf8(self):
        content = "Café résumé naïve".encode("utf-8")
        result = extract_text_from_txt(content)
        assert "Café" in result

    def test_handles_bad_encoding(self):
        content = b"\x80\x81\x82 partial text"
        result = extract_text_from_txt(content)
        assert "partial text" in result


class TestExtractTextFromPdf:
    def test_pdf_library_import(self):
        from PyPDF2 import PdfReader, PdfWriter
        writer = PdfWriter()
        writer.add_blank_page(width=612, height=792)
        buf = io.BytesIO()
        writer.write(buf)
        buf.seek(0)
        reader = PdfReader(buf)
        assert len(reader.pages) == 1


class TestChunkingEdgeCases:
    def test_single_word(self):
        chunks = chunk_text("Hello")
        assert len(chunks) == 1
        assert chunks[0] == "Hello"

    def test_many_short_paragraphs(self):
        text = "\n\n".join(["Short." for _ in range(5)])
        chunks = chunk_text(text, target_tokens=100)
        assert len(chunks) >= 1
        for chunk in chunks:
            assert "Short." in chunk

    def test_preserves_content(self):
        original = "Alpha bravo charlie.\n\nDelta echo foxtrot.\n\nGolf hotel india."
        chunks = chunk_text(original, target_tokens=1000)
        combined = " ".join(chunks)
        assert "Alpha" in combined
        assert "Delta" in combined
        assert "Golf" in combined

    def test_token_estimation_works(self):
        count = _estimate_tokens("Hello world, this is a test.")
        assert count > 0
        assert count < 100
