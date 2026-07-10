from pydantic import BaseModel


class ReportSummary(BaseModel):
    id: str
    audit_id: str
    status: str
    format: str
