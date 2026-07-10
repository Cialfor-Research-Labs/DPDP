from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ChunkRecord:
    chunk_id: str
    audit_id: str
    page_start: int
    page_end: int
    section: str
    clause_ref: str | None
    chunk_type: str
    text: str
    confidence: float
    embedding: list[float]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AuditRecord:
    id: str
    name: str
    tenant_id: str
    source_document_uri: str
    status: str
    created_at: str
    updated_at: str
    chunk_count: int = 0
    review_count: int = 0
    document_profile: dict[str, Any] = field(default_factory=dict)


@dataclass
class ReviewRecord:
    id: str
    audit_id: str
    obligation_id: str
    reason: str
    severity: str
    source_document_uri: str = ""
    chunk_id: str = ""
    evidence_snippet: str = ""


@dataclass
class ReportRecord:
    id: str
    audit_id: str
    status: str
    format: str
    score: int = 0
    chunk_count: int = 0
    review_count: int = 0
    generated_at: str = ""


@dataclass
class InMemoryRepository:
    audits: dict[str, AuditRecord] = field(default_factory=dict)
    chunks: dict[str, list[ChunkRecord]] = field(default_factory=dict)
    reviews: dict[str, list[ReviewRecord]] = field(default_factory=dict)
    reports: dict[str, ReportRecord] = field(default_factory=dict)
    artifacts: dict[str, dict[str, Any]] = field(default_factory=dict)
    counters: dict[str, int] = field(
        default_factory=lambda: {
            "audit": 0,
            "chunk": 0,
            "review": 0,
            "report": 0,
        }
    )

    def next_id(self, prefix: str) -> str:
        self.counters[prefix] = self.counters.get(prefix, 0) + 1
        return f"{prefix}-{self.counters[prefix]:03d}"


repository = InMemoryRepository()
