from pydantic import BaseModel


class ReviewItem(BaseModel):
    id: str
    audit_id: str
    obligation_id: str
    reason: str
    severity: str
    source_document_uri: str = ""
    chunk_id: str = ""
    evidence_snippet: str = ""
