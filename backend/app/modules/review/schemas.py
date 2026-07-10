from pydantic import BaseModel


class ReviewItem(BaseModel):
    id: str
    obligation_id: str
    reason: str
    severity: str
