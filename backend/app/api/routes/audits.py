from fastapi import APIRouter, HTTPException

from app.modules.audits.schemas import AuditCreateRequest, AuditDetail, AuditSummary
from app.modules.audits.service import AuditService
from app.modules.vector.schemas import DocumentChunk

router = APIRouter()
service = AuditService()


@router.get("", response_model=list[AuditSummary])
async def list_audits() -> list[AuditSummary]:
    return service.list_audits()


@router.post("", response_model=AuditSummary)
async def create_audit(payload: AuditCreateRequest) -> AuditSummary:
    return service.create_audit(payload)


@router.get("/{audit_id}", response_model=AuditDetail)
async def get_audit(audit_id: str) -> AuditDetail:
    try:
        return service.get_audit(audit_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{audit_id}/chunks", response_model=list[DocumentChunk])
async def get_audit_chunks(audit_id: str) -> list[DocumentChunk]:
    try:
        return service.get_chunks(audit_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
