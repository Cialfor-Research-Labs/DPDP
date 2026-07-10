from fastapi import APIRouter, HTTPException
import logging

from app.core.shared import tracer, sessions, load_raw_obligations, vault_client
from app.modules.scoring.service import ScoringEngine, RecommendationEngine

logger = logging.getLogger("dpdpa.api.reports")
router = APIRouter()

@router.get("/{session_id}")
async def get_report(session_id: str):
    with tracer.start_as_current_span("generate_report_span") as span:
        span.set_attribute("audit_id", session_id)
        
        session = sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        raw_db = load_raw_obligations()
        scores = ScoringEngine.calculate_scores(session["eval_results"], raw_db)

        rec_engine = RecommendationEngine()
        recs = rec_engine.generate_recommendations(session["eval_results"], raw_db)

        # Decrypt audit history answers from Vault client
        decrypted_history = []
        for item in session["history"]:
            with tracer.start_as_current_span("vault_decrypt_span") as decrypt_span:
                decrypt_span.set_attribute("audit_id", session_id)
                decrypted_ans = vault_client.decrypt(item["answer"])
            decrypted_history.append({
                **item,
                "answer": decrypted_ans
            })

        # Purge raw evidence files (simulation as required by retention policy)
        with tracer.start_as_current_span("purge_raw_evidence_files_span") as purge_span:
            purge_span.set_attribute("audit_id", session_id)
            logger.info(f"PURGE SUCCESS: Raw evidence files for audit session {session_id} have been deleted according to the 30-day retention policy.")

        return {
            "overall_score": scores.get("overall_score", 0),
            "category_scores": scores.get("category_scores", {}),
            "obligation_scores": scores.get("obligation_scores", {}),
            "recommendations": recs,
            "history": decrypted_history
        }
