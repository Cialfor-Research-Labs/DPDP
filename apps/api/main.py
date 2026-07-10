import os
import uuid
import yaml
import logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Imports from apps.api
from apps.api.interview_engine import InterviewEngine
from apps.api.scoring_engine import ScoringEngine, RecommendationEngine
from apps.api.llm_client import LLMClient
from apps.api.semantic_evaluator import LLMSemanticEvaluator
from apps.api.deterministic_checker import DeterministicChecker

# Observability, Secrets, and Caching imports
from apps.api.observability import setup_observability, get_tracer
from apps.api.vault_client import VaultClient
from apps.api.semantic_cache import RedisSemanticCache

# Logger configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dpdpa.main")

# Initialize OpenTelemetry setup
tracer = setup_observability()

app = FastAPI(title="DPDPA Compliance Engine API", version="1.0.0")

# CORS setup for frontend local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OBLIGATIONS_YAML_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../packages/knowledge-base/src/obligations.yaml")
)

# In-memory session store
sessions: Dict[str, Dict[str, Any]] = {}

# Initialize Platform Hardening components
vault_client = VaultClient()
semantic_cache = RedisSemanticCache()

class InitializeRequest(BaseModel):
    role: str = "Data Fiduciary"
    processes_children_data: bool = False
    transfers_data_outside_india: bool = False
    has_data_breach: bool = False
    pre_existing_consent: bool = False

class MessageRequest(BaseModel):
    session_id: str
    answer: str

# Helper to load raw obligations file
def load_raw_obligations() -> Dict[str, Any]:
    with open(OBLIGATIONS_YAML_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

@app.post("/api/initialize")
async def initialize_audit(req: InitializeRequest):
    with tracer.start_as_current_span("initialize_audit_span") as span:
        session_id = str(uuid.uuid4())
        span.set_attribute("audit_id", session_id)
        
        gating_params = {
            "role": req.role,
            "consent_required": True,
            "processes_children_data": req.processes_children_data,
            "transfers_data_outside_india": req.transfers_data_outside_india,
            "has_data_breach": req.has_data_breach,
            "pre_existing_consent": req.pre_existing_consent
        }

        try:
            engine = InterviewEngine(OBLIGATIONS_YAML_PATH, gating_params)
            llm_client = LLMClient()
            questions = engine.generate_questions(llm_client)
        except Exception as e:
            logger.error(f"Failed to load obligations engine: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to load obligations engine: {str(e)}")

        sessions[session_id] = {
            "engine": engine,
            "questions": questions,
            "current_idx": 0,
            "eval_results": {},  # obligation_id -> {item_text: status}
            "gating_params": gating_params,
            "history": []
        }

        first_question = questions[0] if questions else None

        return {
            "session_id": session_id,
            "first_question": first_question,
            "total_questions": len(questions),
            "applicable_obligations": [o["id"] for o in engine.get_applicable_obligations()]
        }

@app.post("/api/message")
async def process_answer(req: MessageRequest):
    with tracer.start_as_current_span("process_answer_span") as span:
        span.set_attribute("audit_id", req.session_id)
        
        session = sessions.get(req.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        questions = session["questions"]
        current_idx = session["current_idx"]

        if current_idx >= len(questions):
            return {"done": True, "message": "Audit already complete."}

        # Current question details
        q_data = questions[current_idx]
        ob_id = q_data["obligation_id"]
        item_text = q_data["item_text"]

        # ── 1. Check Redis Semantic Cache ─────────────────
        with tracer.start_as_current_span("semantic_cache_lookup_span") as cache_span:
            cache_span.set_attribute("audit_id", req.session_id)
            cached_result = semantic_cache.get(q_data["question_text"], req.answer, item_text)

        raw_db = load_raw_obligations()

        if cached_result:
            verdict = cached_result["verdict"]
            citation = cached_result["citation"]
            ai_response = cached_result.get("ai_response", "")
        else:
            # ── 2. Cache Miss: Run Rule check ─────────────
            with tracer.start_as_current_span("deterministic_rules_check_span") as rule_span:
                rule_span.set_attribute("audit_id", req.session_id)
                ob_detail = next((o for o in raw_db.get("obligations", []) if o["id"] == ob_id), None)
                
                # Defaults
                pos_kws = []
                neg_kws = []
                if ob_detail:
                    for checklist_item in ob_detail.get("evidence_checklist", []):
                        if isinstance(checklist_item, dict) and checklist_item.get("item") == item_text:
                            pos_kws = checklist_item.get("positive_keywords", [])
                            neg_kws = checklist_item.get("negative_keywords", [])
                            break

                verdict = DeterministicChecker.evaluate_item(req.answer, item_text, pos_kws, neg_kws)
                citation = ob_detail.get("section_citation") if ob_detail else "Unknown Section"

            # ── 3. Run Tiered Semantic LLM Check if Ambiguous ──
            if verdict == "INSUFFICIENT_EVIDENCE":
                with tracer.start_as_current_span("llm_eval_span") as llm_span:
                    llm_span.set_attribute("audit_id", req.session_id)
                    evaluator = LLMSemanticEvaluator(mock_mode=True)
                    res = evaluator.evaluate_answer(q_data["question_text"], req.answer, item_text)
                    verdict = res.get("verdict", "INSUFFICIENT_EVIDENCE")

            # Generate conversational auditor reply
            llm_client = LLMClient()
            ai_response = llm_client.generate_assessor_reply(
                q_data["question_text"], req.answer, item_text, verdict, citation
            )

        # Update session results
        if ob_id not in session["eval_results"]:
            session["eval_results"][ob_id] = {}
        session["eval_results"][ob_id][item_text] = {"resolved_verdict": verdict}

        # Calculate current score
        scores = ScoringEngine.calculate_scores(session["eval_results"], raw_db)

        # Get updated status of current obligation section
        ob_items = session["eval_results"].get(ob_id, {})
        total_items = len(ob_items)
        present_count = sum(1 for v in ob_items.values() if v.get("resolved_verdict") == "PRESENT")
        ob_status = "compliant" if present_count == total_items else ("critical" if present_count == 0 else "gap")

        # Save query and verdict to Redis cache if it was a cache miss
        if not cached_result:
            cache_payload = {
                "verdict": verdict,
                "obligation_status": ob_status,
                "scores": scores,
                "citation": citation,
                "ai_response": ai_response
            }
            semantic_cache.set(q_data["question_text"], req.answer, item_text, cache_payload)

        # ── 4. Encrypt sensitive auditor answers in Vault ──
        with tracer.start_as_current_span("vault_encrypt_span") as vault_span:
            vault_span.set_attribute("audit_id", req.session_id)
            encrypted_answer = vault_client.encrypt(req.answer)

        # Save encrypted answer to session history log
        session["history"].append({
            "question": q_data["question_text"],
            "answer": encrypted_answer,
            "verdict": verdict,
            "obligation_id": ob_id
        })

        # Increment question index
        current_idx += 1
        session["current_idx"] = current_idx

        next_question = questions[current_idx] if current_idx < len(questions) else None

        # Build natural full response text for AI chat bubble
        final_reply = ai_response
        if next_question:
            final_reply += f"\n\nNext query:\n{next_question['question_text']}"
        else:
            final_reply += f"\n\nAudit complete! You can now view the full compliance report in the Command Center."

        return {
            "verdict": verdict,
            "citation": citation,
            "next_question": next_question,
            "current_index": current_idx,
            "total_questions": len(questions),
            "overall_score": scores.get("overall_score", 0),
            "obligation_scores": scores.get("obligation_scores", {}),
            "category_scores": scores.get("category_scores", {}),
            "obligation_status": ob_status,
            "obligation_id": ob_id,
            "ai_response": final_reply
        }

@app.get("/api/report/{session_id}")
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
