from __future__ import annotations

from app.modules.reports.schemas import ReportSummary
from app.modules.runtime import repository


class ReportService:
    def list_reports(self) -> list[ReportSummary]:
        reports = sorted(repository.reports.values(), key=lambda item: item.generated_at, reverse=True)
        return [
            ReportSummary(
                id=report.id,
                audit_id=report.audit_id,
                status=report.status,
                format=report.format,
                score=report.score,
                chunk_count=report.chunk_count,
                review_count=report.review_count,
                generated_at=report.generated_at,
            )
            for report in reports
        ]
