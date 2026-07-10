from fastapi import APIRouter

from app.modules.audits.schemas import AuditCreateRequest, AuditSummary
from app.modules.audits.service import AuditService

router = APIRouter()
service = AuditService()


@router.get("", response_model=list[AuditSummary])
async def list_audits() -> list[AuditSummary]:
    return service.list_audits()


@router.post("", response_model=AuditSummary)
async def create_audit(payload: AuditCreateRequest) -> AuditSummary:
    return service.create_audit(payload)
