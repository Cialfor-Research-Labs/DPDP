from app.modules.reports.schemas import ReportSummary


class ReportService:
    def list_reports(self) -> list[ReportSummary]:
        return [
            ReportSummary(
                id="report-001",
                audit_id="audit-001",
                status="generated",
                format="pdf",
            )
        ]
