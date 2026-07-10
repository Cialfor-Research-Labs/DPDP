from pydantic import BaseModel


class AuditCreateRequest(BaseModel):
    name: str
    tenant_id: str
    source_document_uri: str


class AuditSummary(BaseModel):
    id: str
    name: str
    status: str
