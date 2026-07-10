from fastapi import APIRouter

from app.modules.reports.schemas import ReportSummary
from app.modules.reports.service import ReportService

router = APIRouter()
service = ReportService()


@router.get("", response_model=list[ReportSummary])
async def list_reports() -> list[ReportSummary]:
    return service.list_reports()
