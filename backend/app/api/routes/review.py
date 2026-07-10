from fastapi import APIRouter

from app.modules.review.schemas import ReviewItem
from app.modules.review.service import ReviewService

router = APIRouter()
service = ReviewService()


@router.get("/queue", response_model=list[ReviewItem])
async def get_review_queue() -> list[ReviewItem]:
    return service.get_queue()
