from __future__ import annotations

from app.modules.runtime import repository


class ScoringService:
    def score_audit(self, audit_id: str) -> dict[str, int | str | float]:
        chunks = repository.chunks.get(audit_id, [])
        reviews = repository.reviews.get(audit_id, [])
        if not chunks:
            return {
                "audit_id": audit_id,
                "status": "empty",
                "score": 0,
                "review_ratio": 0.0,
            }

        high_severity = sum(1 for review in reviews if review.severity == "high")
        score = max(0, 100 - (len(reviews) * 6) - (high_severity * 8))
        review_ratio = round(len(reviews) / len(chunks), 3)
        return {
            "audit_id": audit_id,
            "status": "calculated",
            "score": score,
            "review_ratio": review_ratio,
        }
