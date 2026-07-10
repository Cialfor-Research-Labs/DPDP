from app.modules.audits.schemas import AuditCreateRequest, AuditSummary


class AuditService:
    def list_audits(self) -> list[AuditSummary]:
        return [
            AuditSummary(
                id="audit-001",
                name="Sample Vendor Assessment",
                status="running",
            )
        ]

    def create_audit(self, payload: AuditCreateRequest) -> AuditSummary:
        return AuditSummary(id="audit-new", name=payload.name, status="queued")
