from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from app.modules.review.service import HumanReviewQueue

router = APIRouter()

class OverrideRequest(BaseModel):
    audit_id: str
    obligation_id: str
    item_text: str
    override_verdict: str
    reason: str
    reviewer: str = "human_reviewer"

@router.get("/{audit_id}")
async def list_review_items(audit_id: str):
    return HumanReviewQueue.get_items_for_review(audit_id)

@router.post("/override")
async def apply_override(req: OverrideRequest):
    try:
        return HumanReviewQueue.apply_override(
            audit_id=req.audit_id,
            obligation_id=req.obligation_id,
            item_text=req.item_text,
            override_verdict=req.override_verdict,
            reason=req.reason,
            reviewer=req.reviewer
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
