from pydantic import BaseModel


class ReportSummary(BaseModel):
    id: str
    audit_id: str
    status: str
    format: str
    score: int = 0
    chunk_count: int = 0
    review_count: int = 0
    generated_at: str = ""
