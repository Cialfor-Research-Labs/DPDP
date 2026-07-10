class ScoringService:
    def score_audit(self, audit_id: str) -> dict[str, str]:
        return {
            "audit_id": audit_id,
            "status": "placeholder",
        }
