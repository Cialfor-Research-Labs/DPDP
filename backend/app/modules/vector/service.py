from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from app.core.config import settings
from app.modules.runtime import ChunkRecord, repository, utcnow
from app.modules.vector.schemas import (
    DocumentArtifact,
    DocumentClause,
    DocumentChunk,
    DocumentPage,
    IngestionResult,
)


WORD_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9'/-]*")
CLAUSE_PATTERN = re.compile(r"^(\d+(?:\.\d+)*)\s+(.+)$")
HEADING_PATTERN = re.compile(r"^(?:[A-Z][A-Z0-9 ,:/&()\-]{5,}|(?:\d+(?:\.\d+)*\s+[A-Z].+))$")
DATA_ROOT = Path(__file__).resolve().parents[4] / "data"
ARTIFACT_DIR = DATA_ROOT / "artifacts"
EMBEDDINGS_DIR = DATA_ROOT / "embeddings"


class VectorService:
    def __init__(self) -> None:
        self.embedding_provider = settings.embedding_provider.lower().strip()
        self.embedding_model = settings.embedding_model
        self.embedding_dimensions = max(64, settings.embedding_dimensions)

    def get_backend_name(self) -> str:
        return "in-memory-vector-store"

    def ingest_document(
        self,
        audit_id: str,
        source_document_uri: str,
        document_type: str = "pdf",
    ) -> IngestionResult:
        source_path = self._resolve_source_path(source_document_uri)
        source_file_name = source_path.name
        pages = self._extract_pages(source_path)
        clauses = self._build_clauses(audit_id, source_document_uri, pages)
        chunks = self._build_chunks(audit_id, source_document_uri, pages)
        artifact = DocumentArtifact(
            source_document_uri=source_document_uri,
            source_file_name=source_file_name,
            document_type=document_type,
            page_count=len(pages),
            pages=[DocumentPage(**page) for page in pages],
            clauses=[DocumentClause(**clause) for clause in clauses],
            chunks=[DocumentChunk(**self._chunk_to_dict(chunk)) for chunk in chunks],
            embedding_provider=self.embedding_provider,
            embedding_model=self.embedding_model,
        )

        artifact_payload = json.loads(artifact.model_dump_json())
        embedding_payload = self._build_embedding_payload(
            audit_id=audit_id,
            source_document_uri=source_document_uri,
            source_file_name=source_file_name,
            document_type=document_type,
            pages=pages,
            clauses=clauses,
            chunks=chunks,
        )

        repository.artifacts[audit_id] = artifact_payload
        repository.chunks[audit_id] = chunks
        self._persist_json(ARTIFACT_DIR / f"{audit_id}.json", artifact_payload)
        self._persist_json(EMBEDDINGS_DIR / f"{audit_id}.json", embedding_payload)

        return IngestionResult(
            audit_id=audit_id,
            source_document_uri=source_document_uri,
            source_file_name=source_file_name,
            page_count=len(pages),
            clause_count=len(clauses),
            chunk_count=len(chunks),
            embedding_provider=self.embedding_provider,
            embedding_model=self.embedding_model,
            clauses=[DocumentClause(**clause) for clause in clauses],
            chunks=[DocumentChunk(**self._chunk_to_dict(chunk)) for chunk in chunks],
        )

    def search(self, audit_id: str, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        chunks = repository.chunks.get(audit_id, [])
        if not chunks:
            return []

        query_vector = self._embed_text(query)
        scored = []
        for chunk in chunks:
            score = self._cosine_similarity(query_vector, chunk.embedding)
            scored.append(
                {
                    "chunk_id": chunk.chunk_id,
                    "audit_id": chunk.audit_id,
                    "score": round(score, 4),
                    "section": chunk.section,
                    "clause_ref": chunk.clause_ref,
                    "chunk_type": chunk.chunk_type,
                    "confidence": round(chunk.confidence, 3),
                    "text": chunk.text,
                }
            )
        scored.sort(key=lambda item: item["score"], reverse=True)
        return scored[:top_k]

    def _resolve_source_path(self, source_document_uri: str) -> Path:
        if source_document_uri.startswith("file://"):
            parsed = urlparse(source_document_uri)
            raw_path = unquote(parsed.path)
            if parsed.netloc:
                raw_path = f"//{parsed.netloc}{raw_path}"
            path = Path(raw_path)
            if re.match(r"^/[A-Za-z]:/", str(path)):
                path = Path(str(path)[1:])
        else:
            path = Path(source_document_uri)

        if not path.exists():
            raise FileNotFoundError(f"Source document not found: {source_document_uri}")

        return path

    def _extract_pages(self, source_path: Path) -> list[dict[str, Any]]:
        if source_path.suffix.lower() != ".pdf":
            text = source_path.read_text(encoding="utf-8")
            return [{"page_number": 1, "text": text}]

        try:
            import fitz  # type: ignore

            document = fitz.open(source_path.as_posix())
            pages: list[dict[str, Any]] = []
            for page_number, page in enumerate(document, start=1):
                pages.append(
                    {
                        "page_number": page_number,
                        "text": page.get_text("text").strip(),
                    }
                )
            document.close()
            return pages
        except Exception:
            try:
                from pypdf import PdfReader  # type: ignore

                reader = PdfReader(source_path.as_posix())
                pages = []
                for page_number, page in enumerate(reader.pages, start=1):
                    pages.append(
                        {
                            "page_number": page_number,
                            "text": (page.extract_text() or "").strip(),
                        }
                    )
                return pages
            except Exception as exc:
                raise RuntimeError(
                    "Unable to extract PDF text. Install pymupdf or pypdf for PDF parsing."
                ) from exc

    def _build_chunks(
        self,
        audit_id: str,
        source_document_uri: str,
        pages: list[dict[str, Any]],
    ) -> list[ChunkRecord]:
        chunks: list[ChunkRecord] = []
        for page in pages:
            page_number = int(page["page_number"])
            paragraphs = self._paragraphs_from_page(page["text"])
            active_section = ""
            for paragraph in paragraphs:
                section = self._infer_section(paragraph, active_section)
                if self._looks_like_heading(paragraph):
                    active_section = paragraph.strip()
                    continue

                clause_ref, body = self._split_clause_reference(paragraph)
                if not body:
                    continue

                for chunk_text in self._split_long_text(body):
                    chunk_type, confidence = self._classify_chunk(chunk_text, clause_ref)
                    embedding = self._embed_text(chunk_text)
                    chunk_id = repository.next_id("chunk")
                    chunk = ChunkRecord(
                        chunk_id=chunk_id,
                        audit_id=audit_id,
                        page_start=page_number,
                        page_end=page_number,
                        section=section,
                        clause_ref=clause_ref,
                        chunk_type=chunk_type,
                        text=chunk_text,
                        confidence=confidence,
                        embedding=embedding,
                        metadata={
                            "source_document_uri": source_document_uri,
                            "created_at": utcnow(),
                        },
                    )
                    chunks.append(chunk)
        return chunks

    def _build_clauses(
        self,
        audit_id: str,
        source_document_uri: str,
        pages: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        clauses: list[dict[str, Any]] = []
        for page in pages:
            page_number = int(page["page_number"])
            paragraphs = self._paragraphs_from_page(page["text"])
            active_section = ""
            for paragraph in paragraphs:
                if self._looks_like_heading(paragraph):
                    active_section = paragraph.strip()
                    continue

                clause_ref, body = self._split_clause_reference(paragraph)
                if not body:
                    continue

                clause_type, confidence = self._classify_chunk(body, clause_ref)
                clauses.append(
                    {
                        "clause_id": repository.next_id("clause"),
                        "audit_id": audit_id,
                        "page_number": page_number,
                        "section": active_section or clause_ref or "Unclassified",
                        "clause_ref": clause_ref,
                        "chunk_type": clause_type,
                        "confidence": confidence,
                        "text": body,
                        "metadata": {
                            "source_document_uri": source_document_uri,
                            "created_at": utcnow(),
                        },
                    }
                )
        return clauses

    def _paragraphs_from_page(self, page_text: str) -> list[str]:
        normalized = page_text.replace("\r", "\n")
        paragraphs = [part.strip() for part in re.split(r"\n\s*\n", normalized) if part.strip()]
        if paragraphs:
            return paragraphs
        lines = [line.strip() for line in normalized.split("\n") if line.strip()]
        return lines

    def _looks_like_heading(self, paragraph: str) -> bool:
        candidate = paragraph.strip()
        return bool(candidate) and len(candidate) <= 120 and bool(HEADING_PATTERN.match(candidate))

    def _infer_section(self, paragraph: str, active_section: str) -> str:
        if self._looks_like_heading(paragraph):
            return paragraph.strip()

        if active_section:
            return active_section

        clause_ref, _ = self._split_clause_reference(paragraph)
        return clause_ref or "Unclassified"

    def _split_clause_reference(self, paragraph: str) -> tuple[str | None, str]:
        cleaned = paragraph.strip()
        match = CLAUSE_PATTERN.match(cleaned)
        if match:
            return match.group(1), match.group(2).strip()
        return None, cleaned

    def _split_long_text(self, text: str, max_words: int = 180, overlap_words: int = 30) -> list[str]:
        words = WORD_PATTERN.findall(text)
        if not words:
            return [text.strip()] if text.strip() else []

        if len(words) <= max_words:
            return [text.strip()]

        chunks: list[str] = []
        start = 0
        while start < len(words):
            end = min(len(words), start + max_words)
            chunk_words = words[start:end]
            chunks.append(" ".join(chunk_words))
            if end == len(words):
                break
            start = max(0, end - overlap_words)
        return chunks

    def _classify_chunk(self, text: str, clause_ref: str | None) -> tuple[str, float]:
        lower = text.lower()
        if re.search(r"\b(shall|must|required to|is required to)\b", lower):
            return "obligation", 0.95
        if re.search(r"\b(definition|means|includes|refers to)\b", lower):
            return "definition", 0.9
        if re.search(r"\b(exception|except|unless|however)\b", lower):
            return "exception", 0.85
        if re.search(r"\b(fine|penalty|punishable|offence|offense)\b", lower):
            return "penalty", 0.9
        if re.search(r"\b(may|can|permitted|allowed)\b", lower):
            return "permission", 0.7
        if clause_ref:
            return "clause", 0.72
        return "context", 0.55

    def _embed_text(self, text: str) -> list[float]:
        if self.embedding_provider == "openai":
            try:
                from openai import OpenAI  # type: ignore

                if not settings.openai_api_key:
                    raise RuntimeError("OPENAI_API_KEY is not configured.")

                client = OpenAI(api_key=settings.openai_api_key)
                response = client.embeddings.create(
                    model=self.embedding_model,
                    input=text,
                )
                return list(response.data[0].embedding)
            except Exception:
                return self._local_embedding(text)
        return self._local_embedding(text)

    def _local_embedding(self, text: str) -> list[float]:
        dimensions = self.embedding_dimensions
        vector = [0.0] * dimensions
        tokens = WORD_PATTERN.findall(text.lower())
        if not tokens:
            return vector

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            bucket = int.from_bytes(digest[:4], "big") % dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[bucket] += sign

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [round(value / norm, 8) for value in vector]

    def _cosine_similarity(self, left: list[float], right: list[float]) -> float:
        if not left or not right:
            return 0.0
        size = min(len(left), len(right))
        numerator = sum(left[index] * right[index] for index in range(size))
        left_norm = math.sqrt(sum(value * value for value in left[:size]))
        right_norm = math.sqrt(sum(value * value for value in right[:size]))
        if left_norm == 0 or right_norm == 0:
            return 0.0
        return numerator / (left_norm * right_norm)

    def _chunk_to_dict(self, chunk: ChunkRecord) -> dict[str, Any]:
        return {
            "chunk_id": chunk.chunk_id,
            "audit_id": chunk.audit_id,
            "page_start": chunk.page_start,
            "page_end": chunk.page_end,
            "section": chunk.section,
            "clause_ref": chunk.clause_ref,
            "chunk_type": chunk.chunk_type,
            "confidence": chunk.confidence,
            "text": chunk.text,
        }

    def _build_embedding_payload(
        self,
        audit_id: str,
        source_document_uri: str,
        source_file_name: str,
        document_type: str,
        pages: list[dict[str, Any]],
        clauses: list[dict[str, Any]],
        chunks: list[ChunkRecord],
    ) -> dict[str, Any]:
        return {
            "audit_id": audit_id,
            "source_document_uri": source_document_uri,
            "source_file_name": source_file_name,
            "document_type": document_type,
            "page_count": len(pages),
            "clause_count": len(clauses),
            "embedding_provider": self.embedding_provider,
            "embedding_model": self.embedding_model,
            "embedding_dimensions": len(chunks[0].embedding) if chunks else self.embedding_dimensions,
            "generated_at": utcnow(),
            "clauses": [
                {
                    "clause_id": clause["clause_id"],
                    "audit_id": clause["audit_id"],
                    "page_number": clause["page_number"],
                    "section": clause["section"],
                    "clause_ref": clause["clause_ref"],
                    "chunk_type": clause["chunk_type"],
                    "confidence": clause["confidence"],
                    "text": clause["text"],
                    "metadata": clause["metadata"],
                }
                for clause in clauses
            ],
            "chunks": [
                {
                    "chunk_id": chunk.chunk_id,
                    "audit_id": chunk.audit_id,
                    "page_start": chunk.page_start,
                    "page_end": chunk.page_end,
                    "section": chunk.section,
                    "clause_ref": chunk.clause_ref,
                    "chunk_type": chunk.chunk_type,
                    "confidence": chunk.confidence,
                    "text": chunk.text,
                    "embedding": chunk.embedding,
                    "metadata": chunk.metadata,
                }
                for chunk in chunks
            ],
        }

    def _persist_json(self, path: Path, payload: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
