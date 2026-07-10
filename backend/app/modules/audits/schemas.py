from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.modules.reports.schemas import ReportSummary
from app.modules.review.schemas import ReviewItem
from app.modules.vector.schemas import DocumentChunk


class AuditCreateRequest(BaseModel):
    name: str
    tenant_id: str
    source_document_uri: str
    document_type: str = "pdf"


class AuditSummary(BaseModel):
    id: str
    name: str
    tenant_id: str
    status: str
    source_document_uri: str
    chunk_count: int = 0
    review_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None


class AuditDetail(AuditSummary):
    document_profile: dict[str, Any] = Field(default_factory=dict)
    chunks: list[DocumentChunk] = Field(default_factory=list)
    reviews: list[ReviewItem] = Field(default_factory=list)
    report: ReportSummary | None = None
