from __future__ import annotations

from app.modules.audits.schemas import AuditCreateRequest, AuditDetail, AuditSummary
from app.modules.reports.schemas import ReportSummary
from app.modules.review.schemas import ReviewItem
from app.modules.runtime import AuditRecord, ReportRecord, ReviewRecord, repository, utcnow
from app.modules.scoring.service import ScoringService
from app.modules.storage.service import StorageService
from app.modules.vector.schemas import DocumentChunk
from app.modules.vector.service import VectorService


class AuditService:
    def __init__(self) -> None:
        self.vector_service = VectorService()
        self.storage_service = StorageService()
        self.scoring_service = ScoringService()

    def list_audits(self) -> list[AuditSummary]:
        audits = sorted(repository.audits.values(), key=lambda item: item.created_at, reverse=True)
        return [self._to_summary(record) for record in audits]

    def create_audit(self, payload: AuditCreateRequest) -> AuditSummary:
        audit_id = repository.next_id("audit")
        now = utcnow()
        record = AuditRecord(
            id=audit_id,
            name=payload.name,
            tenant_id=payload.tenant_id,
            source_document_uri=payload.source_document_uri,
            status="processing",
            created_at=now,
            updated_at=now,
        )
        repository.audits[audit_id] = record

        try:
            ingestion_result = self.vector_service.ingest_document(
                audit_id=audit_id,
                source_document_uri=payload.source_document_uri,
                document_type=payload.document_type,
            )
            reviews = self._build_reviews(audit_id, ingestion_result.chunks, payload.source_document_uri)
            repository.reviews[audit_id] = reviews
            self.storage_service.save_audit_artifact(
                audit_id,
                repository.artifacts.get(audit_id, {}),
            )
            score_result = self.scoring_service.score_audit(audit_id)
            report = ReportRecord(
                id=repository.next_id("report"),
                audit_id=audit_id,
                status="ready",
                format="summary",
                score=score_result["score"],
                chunk_count=ingestion_result.chunk_count,
                review_count=len(reviews),
                generated_at=utcnow(),
            )
            repository.reports[audit_id] = report

            record.status = "review" if reviews else "completed"
            record.chunk_count = ingestion_result.chunk_count
            record.review_count = len(reviews)
            record.document_profile = {
                "source_file_name": ingestion_result.source_file_name,
                "page_count": ingestion_result.page_count,
                "embedding_provider": ingestion_result.embedding_provider,
                "embedding_model": ingestion_result.embedding_model,
            }
            record.updated_at = utcnow()
            return self._to_summary(record)
        except Exception:
            record.status = "failed"
            record.updated_at = utcnow()
            raise

    def get_audit(self, audit_id: str) -> AuditDetail:
        record = repository.audits.get(audit_id)
        if not record:
            raise KeyError(f"Audit not found: {audit_id}")
        chunks = [DocumentChunk(**self._chunk_to_dict(chunk)) for chunk in repository.chunks.get(audit_id, [])]
        reviews = [ReviewItem(**self._review_to_dict(item)) for item in repository.reviews.get(audit_id, [])]
        report_record = repository.reports.get(audit_id)
        report = self._report_to_schema(report_record) if report_record else None
        return AuditDetail(
            **self._to_summary(record).model_dump(),
            document_profile=record.document_profile,
            chunks=chunks,
            reviews=reviews,
            report=report,
        )

    def get_chunks(self, audit_id: str) -> list[DocumentChunk]:
        return [DocumentChunk(**self._chunk_to_dict(chunk)) for chunk in repository.chunks.get(audit_id, [])]

    def _build_reviews(
        self,
        audit_id: str,
        chunks: list,
        source_document_uri: str,
    ) -> list[ReviewRecord]:
        review_items: list[ReviewRecord] = []
        for chunk in chunks:
            severity = "medium"
            if chunk.chunk_type in {"exception", "penalty"}:
                severity = "high"
            elif chunk.chunk_type in {"context", "permission"}:
                severity = "low"

            if chunk.chunk_type in {"obligation", "exception", "penalty"} or chunk.confidence < 0.7:
                review_items.append(
                    ReviewRecord(
                        id=repository.next_id("review"),
                        audit_id=audit_id,
                        obligation_id=chunk.clause_ref or chunk.chunk_id,
                        reason=f"Captured as {chunk.chunk_type} evidence for DPDP review.",
                        severity=severity,
                        source_document_uri=source_document_uri,
                        chunk_id=chunk.chunk_id,
                        evidence_snippet=chunk.text[:240],
                    )
                )
        return review_items

    def _to_summary(self, record: AuditRecord) -> AuditSummary:
        return AuditSummary(
            id=record.id,
            name=record.name,
            tenant_id=record.tenant_id,
            status=record.status,
            source_document_uri=record.source_document_uri,
            chunk_count=record.chunk_count,
            review_count=record.review_count,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    def _report_to_schema(self, record: ReportRecord | None) -> ReportSummary | None:
        if record is None:
            return None
        return ReportSummary(
            id=record.id,
            audit_id=record.audit_id,
            status=record.status,
            format=record.format,
            score=record.score,
            chunk_count=record.chunk_count,
            review_count=record.review_count,
            generated_at=record.generated_at,
        )

    def _chunk_to_dict(self, chunk) -> dict:
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

    def _review_to_dict(self, review: ReviewRecord) -> dict:
        return {
            "id": review.id,
            "audit_id": review.audit_id,
            "obligation_id": review.obligation_id,
            "reason": review.reason,
            "severity": review.severity,
            "source_document_uri": review.source_document_uri,
            "chunk_id": review.chunk_id,
            "evidence_snippet": review.evidence_snippet,
        }
