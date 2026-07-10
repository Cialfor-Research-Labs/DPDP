from app.modules.review.schemas import ReviewItem


class ReviewService:
    def get_queue(self) -> list[ReviewItem]:
        return [
            ReviewItem(
                id="review-001",
                obligation_id="obl-101",
                reason="Ambiguous classification",
                severity="high",
            )
        ]
