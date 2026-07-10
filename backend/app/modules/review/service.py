from __future__ import annotations

from app.modules.review.schemas import ReviewItem
from app.modules.runtime import repository


class ReviewService:
    def get_queue(self) -> list[ReviewItem]:
        queue: list[ReviewItem] = []
        for audit_reviews in repository.reviews.values():
            for review in audit_reviews:
                queue.append(
                    ReviewItem(
                        id=review.id,
                        audit_id=review.audit_id,
                        obligation_id=review.obligation_id,
                        reason=review.reason,
                        severity=review.severity,
                        source_document_uri=review.source_document_uri,
                        chunk_id=review.chunk_id,
                        evidence_snippet=review.evidence_snippet,
                    )
                )
        severity_order = {"high": 0, "medium": 1, "low": 2}
        queue.sort(key=lambda item: (severity_order.get(item.severity, 3), item.id))
        return queue
