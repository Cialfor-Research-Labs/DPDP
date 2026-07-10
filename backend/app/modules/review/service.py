import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

class AuditLogManager:
    @classmethod
    def get_backend_root(cls) -> str:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        return os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

    @classmethod
    def get_log_dir(cls) -> str:
        backend_root = cls.get_backend_root()
        log_dir = os.path.join(backend_root, "audit_logs")
        os.makedirs(log_dir, exist_ok=True)
        return log_dir

    @classmethod
    def get_log_path(cls, audit_id: str) -> str:
        return os.path.join(cls.get_log_dir(), f"audit_{audit_id}.json")

    @classmethod
    def load_log(cls, audit_id: str) -> Dict[str, Any]:
        path = cls.get_log_path(audit_id)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                try:
                    return json.load(f)
                except json.JSONDecodeError:
                    pass
        return {
            "audit_id": audit_id,
            "history": [],
            "current_state": {}
        }

    @classmethod
    def save_log(cls, audit_id: str, data: Dict[str, Any]) -> None:
        path = cls.get_log_path(audit_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def log_event(cls, audit_id: str, event_type: str, details: Dict[str, Any]) -> None:
        """
        Appends an event transition immutably to the history log.
        """
        log = cls.load_log(audit_id)
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        event = {
            "timestamp": timestamp,
            "event_type": event_type,
            "details": details
        }
        log["history"].append(event)
        
        # Update current state if it's an evaluation or override
        if event_type == "EVALUATION":
            ob_id = details.get("obligation_id")
            item_text = details.get("item_text")
            
            if ob_id not in log["current_state"]:
                log["current_state"][ob_id] = {}
                
            log["current_state"][ob_id][item_text] = {
                "rule_check_verdict": details.get("rule_check_verdict"),
                "llm_verdict": details.get("llm_verdict"),
                "resolved_verdict": details.get("resolved_verdict"),
                "raw_evidence": details.get("raw_evidence"),
                "override": None
            }
        elif event_type == "OVERRIDE":
            ob_id = details.get("obligation_id")
            item_text = details.get("item_text")
            
            if ob_id in log["current_state"] and item_text in log["current_state"][ob_id]:
                state = log["current_state"][ob_id][item_text]
                state["resolved_verdict"] = details.get("override_verdict")
                state["override"] = {
                    "verdict": details.get("override_verdict"),
                    "reason": details.get("reason"),
                    "reviewer": details.get("reviewer"),
                    "timestamp": timestamp
                }
                
        cls.save_log(audit_id, log)

class HumanReviewQueue:
    @staticmethod
    def get_items_for_review(audit_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all items that are currently in 'HUMAN_REVIEW' status
        (usually resulting from a mismatch between rules and LLM).
        """
        log = AuditLogManager.load_log(audit_id)
        review_items = []
        
        for ob_id, items in log.get("current_state", {}).items():
            for item_text, state in items.items():
                if state.get("resolved_verdict") == "HUMAN_REVIEW":
                    review_items.append({
                        "obligation_id": ob_id,
                        "item_text": item_text,
                        "rule_check_verdict": state.get("rule_check_verdict"),
                        "llm_verdict": state.get("llm_verdict"),
                        "raw_evidence": state.get("raw_evidence")
                    })
                    
        return review_items

    @staticmethod
    def apply_override(
        audit_id: str, 
        obligation_id: str, 
        item_text: str, 
        override_verdict: str, 
        reason: str, 
        reviewer: str = "human_reviewer"
    ) -> Dict[str, Any]:
        """
        Applies a reviewer override on a mismatch.
        Persists details immutably into the history and updates the current state.
        """
        log = AuditLogManager.load_log(audit_id)
        
        # Verify the item exists in state
        if obligation_id not in log["current_state"] or item_text not in log["current_state"][obligation_id]:
            raise ValueError(f"Checklist item '{item_text}' under obligation '{obligation_id}' not found in audit state.")
            
        # Log the override event
        details = {
            "obligation_id": obligation_id,
            "item_text": item_text,
            "override_verdict": override_verdict,
            "reason": reason,
            "reviewer": reviewer
        }
        AuditLogManager.log_event(audit_id, "OVERRIDE", details)
        
        # Reload and return updated item state
        updated_log = AuditLogManager.load_log(audit_id)
        return updated_log["current_state"][obligation_id][item_text]
