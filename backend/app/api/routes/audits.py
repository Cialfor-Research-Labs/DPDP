import uuid
import logging
import json
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Core shared references
from app.core.shared import tracer, sessions, OBLIGATIONS_YAML_PATH, load_raw_obligations, vault_client, semantic_cache
from app.modules.vector.service import get_retrieval_mapper

# Modules imports
from app.modules.audits.service import InterviewEngine
from app.modules.workflows.llm_client import LLMClient
from app.modules.workflows.semantic_evaluator import LLMSemanticEvaluator
from app.modules.audits.deterministic_checker import DeterministicChecker
from app.modules.scoring.service import ScoringEngine

logger = logging.getLogger("dpdpa.api.audits")
router = APIRouter()

class InitializeRequest(BaseModel):
    role: str = "Data Fiduciary"
    domain: str = "general"
    processes_children_data: bool = False
    transfers_data_outside_india: bool = False
    has_data_breach: bool = False
    pre_existing_consent: bool = False
    bypass_onboarding: bool = False

class MessageRequest(BaseModel):
    session_id: str
    answer: str

def parse_onboarding_response(answer: str, llm_client: LLMClient) -> dict:
    text = answer.lower()
    
    # 1. Domain
    domain = "general"
    if any(k in text for k in ["finance", "bank", "wealth", "fintech", "loan", "card", "transaction"]):
        domain = "finance"
    elif any(k in text for k in ["education", "school", "college", "student", "edtech", "child", "children", "kid"]):
        domain = "education"
    elif any(k in text for k in ["health", "medical", "hospital", "biotech", "patient", "clinical", "doctor"]):
        domain = "healthcare"
        
    # 2. Role
    role = "Data Fiduciary"
    if any(k in text for k in ["significant", "sdf", "large fiduciary"]):
        role = "Significant Data Fiduciary"
    elif any(k in text for k in ["processor", "contractor", "service provider"]):
        role = "Data Processor"
        
    # 3. Flags
    processes_children_data = False
    if any(k in text for k in ["child", "children", "kid", "under 18", "minor", "school"]):
        processes_children_data = True
        
    transfers_data_outside_india = False
    if any(k in text for k in ["outside india", "cross-border", "overseas", "foreign", "transfer"]):
        transfers_data_outside_india = True
        
    has_data_breach = False
    if any(k in text for k in ["breach", "incident", "leak", "compromised", "hacked"]):
        has_data_breach = True
        
    pre_existing_consent = False
    if any(k in text for k in ["pre-existing", "legacy", "historical", "prior consent"]):
        pre_existing_consent = True

    default_result = {
        "role": role,
        "domain": domain,
        "processes_children_data": processes_children_data,
        "transfers_data_outside_india": transfers_data_outside_india,
        "has_data_breach": has_data_breach,
        "pre_existing_consent": pre_existing_consent
    }

    if not llm_client.api_key:
        return default_result

    headers = {
        "x-api-key": llm_client.api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    prompt = (
        f"You are a DPDPA 2023 auditor. Analyze the user's description of their organization and extract "
        f"compliance configuration parameters in a strict format.\n\n"
        f"User input: \"{answer}\"\n\n"
        f"Extract these exact parameters:\n"
        f"1. domain: strictly one of [finance, education, healthcare, general]\n"
        f"2. role: strictly one of [Data Fiduciary, Significant Data Fiduciary, Data Processor]\n"
        f"3. processes_children_data: strictly true or false (default false)\n"
        f"4. transfers_data_outside_india: strictly true or false (default false)\n"
        f"5. has_data_breach: strictly true or false (default false)\n"
        f"6. pre_existing_consent: strictly true or false (default false)\n\n"
        f"Output formatting: Return only a raw JSON object with these keys. No markdown block, no other text."
    )
    
    payload = {
        "model": "claude-3-5-sonnet-20240620",
        "max_tokens": 200,
        "messages": [{"role": "user", "content": prompt}]
    }
    
    try:
        response = httpx.post("https://api.anthropic.com/v1/messages", json=payload, headers=headers, timeout=10.0)
        if response.status_code == 200:
            parsed = json.loads(response.json()["content"][0]["text"].strip())
            return {
                "domain": str(parsed.get("domain", domain)).lower(),
                "role": str(parsed.get("role", role)),
                "processes_children_data": bool(parsed.get("processes_children_data", processes_children_data)),
                "transfers_data_outside_india": bool(parsed.get("transfers_data_outside_india", transfers_data_outside_india)),
                "has_data_breach": bool(parsed.get("has_data_breach", has_data_breach)),
                "pre_existing_consent": bool(parsed.get("pre_existing_consent", pre_existing_consent))
            }
    except Exception as e:
        logger.warning(f"Failed to parse onboarding response via Claude: {str(e)}. Using heuristics.")
        
    return default_result

@router.post("/initialize")
async def initialize_audit(req: InitializeRequest):
    with tracer.start_as_current_span("initialize_audit_span") as span:
        session_id = str(uuid.uuid4())
        span.set_attribute("audit_id", session_id)
        
        gating_params = {
            "role": req.role,
            "domain": req.domain.lower(),
            "consent_required": True,
            "processes_children_data": req.processes_children_data,
            "transfers_data_outside_india": req.transfers_data_outside_india,
            "has_data_breach": req.has_data_breach,
            "pre_existing_consent": req.pre_existing_consent
        }

        llm_client = LLMClient()

        if req.bypass_onboarding:
            try:
                engine = InterviewEngine(OBLIGATIONS_YAML_PATH, gating_params)
                questions = engine.generate_questions(llm_client)
            except Exception as e:
                logger.error(f"Failed to load obligations engine: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to load obligations engine: {str(e)}")

            sessions[session_id] = {
                "engine": engine,
                "questions": questions,
                "current_idx": 0,
                "eval_results": {},
                "gating_params": gating_params,
                "history": [],
                "is_configured": True
            }

            first_question = questions[0] if questions else None

            return {
                "session_id": session_id,
                "first_question": first_question,
                "total_questions": len(questions),
                "applicable_obligations": [o["id"] for o in engine.get_applicable_obligations()]
            }
        else:
            sessions[session_id] = {
                "engine": None,
                "questions": [],
                "current_idx": 0,
                "eval_results": {},
                "gating_params": gating_params,
                "history": [],
                "is_configured": False
            }

            return {
                "session_id": session_id,
                "first_question": None,
                "total_questions": 0,
                "applicable_obligations": []
            }

@router.post("/message")
async def process_answer(req: MessageRequest):
    with tracer.start_as_current_span("process_answer_span") as span:
        span.set_attribute("audit_id", req.session_id)
        
        session = sessions.get(req.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        llm_client = LLMClient()

        # Dynamic Onboarding & Tailoring
        if not session.get("is_configured", True):
            parsed_params = parse_onboarding_response(req.answer, llm_client)
            session["gating_params"].update(parsed_params)
            
            try:
                engine = InterviewEngine(OBLIGATIONS_YAML_PATH, session["gating_params"])
                session["engine"] = engine
                questions = engine.generate_questions(llm_client)
                session["questions"] = questions
                session["is_configured"] = True
            except Exception as e:
                logger.error(f"Failed to rebuild engine during onboarding: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to rebuild engine: {str(e)}")

            first_q = questions[0] if questions else None
            if first_q:
                ai_response = (
                    f"Understood! Tailoring a {len(questions)}-question compliance audit for the "
                    f"**{parsed_params['domain'].title()}** industry, acting as a **{parsed_params['role']}**.\n\n"
                    f"Let's begin with the first query:\n{first_q['question_text']}"
                )
                citation = first_q["section_citation"]
            else:
                ai_response = "Onboarding completed. No applicable DPDPA obligations found for these parameters."
                citation = "General"

            return {
                "verdict": "PRESENT",
                "obligation_status": "compliant",
                "citation": citation,
                "ai_response": ai_response,
                "obligation_id": None,
                "overall_score": 0,
                "total_questions": len(questions)
            }

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

        # Retrieve supporting document chunks from the precomputed embedding index.
        vector_mapper = get_retrieval_mapper()
        retrieved_chunks = vector_mapper.search_document_chunks(
            f"{q_data['question_text']} {req.answer}",
            top_k=3,
        )

        # Increment question index
        current_idx += 1
        session["current_idx"] = current_idx

        next_question = questions[current_idx] if current_idx < len(questions) else None

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
            "ai_response": final_reply,
            "retrieved_chunks": retrieved_chunks,
        }
