from __future__ import annotations

from pydantic import BaseModel, Field


class DocumentChunk(BaseModel):
    chunk_id: str
    audit_id: str
    page_start: int
    page_end: int
    section: str
    clause_ref: str | None = None
    chunk_type: str
    confidence: float = Field(ge=0.0, le=1.0)
    text: str


class DocumentPage(BaseModel):
    page_number: int
    text: str


class DocumentClause(BaseModel):
    clause_id: str
    audit_id: str
    page_number: int
    section: str
    clause_ref: str | None = None
    chunk_type: str
    confidence: float = Field(ge=0.0, le=1.0)
    text: str


class DocumentArtifact(BaseModel):
    source_document_uri: str
    source_file_name: str
    document_type: str = "pdf"
    page_count: int
    pages: list[DocumentPage]
    clauses: list[DocumentClause]
    chunks: list[DocumentChunk]
    embedding_provider: str
    embedding_model: str


class IngestionResult(BaseModel):
    audit_id: str
    source_document_uri: str
    source_file_name: str
    page_count: int
    clause_count: int
    chunk_count: int
    embedding_provider: str
    embedding_model: str
    clauses: list[DocumentClause]
    chunks: list[DocumentChunk]
