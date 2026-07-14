import os
import yaml
from typing import Dict, Any, List
from app.modules.workflows.llm_client import LLMClient

class InterviewEngine:
    def __init__(self, obligations_path: str, gating_params: Dict[str, Any]):
        """
        gating_params expected keys:
        - role: "Data Fiduciary" or "Significant Data Fiduciary" or "Data Processor"
        - processes_children_data: bool
        - transfers_data_outside_india: bool
        - has_data_breach: bool
        - pre_existing_consent: bool
        """
        self.obligations_path = obligations_path
        self.gating_params = gating_params
        self.obligations = self._load_obligations()

    def _load_obligations(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.obligations_path):
            raise FileNotFoundError(f"Obligations database not found at {self.obligations_path}")
        with open(self.obligations_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("obligations", [])

    def is_applicable(self, conditions: Dict[str, Any]) -> bool:
        """
        Checks if an obligation applies to the current session parameters.
        - If role is 'Significant Data Fiduciary', it inherits 'Data Fiduciary' obligations.
        - If conditions require processes_children_data=true, session must have it set to true.
        - Unspecified conditions are assumed to match.
        """
        session_role = self.gating_params.get("role")
        session_children = self.gating_params.get("processes_children_data", False)
        session_transfers = self.gating_params.get("transfers_data_outside_india", False)
        session_breach = self.gating_params.get("has_data_breach", False)
        session_pre_consent = self.gating_params.get("pre_existing_consent", False)

        for key, value in conditions.items():
            if key == "role":
                if value == "Data Fiduciary":
                    if session_role not in ["Data Fiduciary", "Significant Data Fiduciary"]:
                        return False
                elif value == "Significant Data Fiduciary":
                    if session_role != "Significant Data Fiduciary":
                        return False
                else:
                    if session_role != value:
                        return False
            elif key == "processes_children_data":
                if session_children != value:
                    return False
            elif key == "transfers_data_outside_india":
                if session_transfers != value:
                    return False
            elif key == "has_data_breach":
                if session_breach != value:
                    return False
            elif key == "pre_existing_consent":
                if session_pre_consent != value:
                    return False
            else:
                if self.gating_params.get(key) != value:
                    return False

        return True

    def get_applicable_obligations(self) -> List[Dict[str, Any]]:
        applicable = []
        for o in self.obligations:
            conds = o.get("applicability_conditions", {})
            if self.is_applicable(conds):
                applicable.append(o)
        return applicable

    def generate_questions(self, llm_client: LLMClient) -> List[Dict[str, Any]]:
        domain = self.gating_params.get("domain", "general").lower()
        
        domain_priorities = {
            "finance": [
                "ob_s8_5_security_safeguards",
                "ob_s8_6_breach_notification",
                "ob_s11_rights_access",
                "ob_s6_1_consent_quality",
                "ob_s5_1_notice_consent",
                "ob_s16_cross_border_transfer"
            ],
            "education": [
                "ob_s9_1_child_consent",
                "ob_s5_1_notice_consent",
                "ob_s6_1_consent_quality",
                "ob_s11_rights_access",
                "ob_s8_5_security_safeguards"
            ],
            "healthcare": [
                "ob_s8_5_security_safeguards",
                "ob_s5_1_notice_consent",
                "ob_s9_1_child_consent",
                "ob_s11_rights_access",
                "ob_s6_1_consent_quality"
            ],
            "general": [
                "ob_s5_1_notice_consent",
                "ob_s6_1_consent_quality",
                "ob_s11_rights_access",
                "ob_s8_5_security_safeguards",
                "ob_s16_cross_border_transfer"
            ]
        }
        
        priorities = domain_priorities.get(domain, domain_priorities["general"])
        applicable_obligations = self.get_applicable_obligations()
        
        # Sort obligations based on priorities
        def get_priority_key(ob):
            ob_id = ob.get("id")
            if ob_id in priorities:
                return priorities.index(ob_id)
            return 99
            
        applicable_obligations.sort(key=get_priority_key)
        
        # Group checklist items by obligation
        grouped_items = []
        for o in applicable_obligations:
            ob_id = o.get("id")
            citation = o.get("section_citation")
            ob_text = o.get("obligation_text", "")
            checklist = o.get("evidence_checklist", [])
            
            ob_items = []
            for idx, item_data in enumerate(checklist):
                item_text = item_data.get("item") if isinstance(item_data, dict) else item_data
                ob_items.append({
                    "obligation_id": ob_id,
                    "section_citation": citation,
                    "item_index": idx,
                    "item_text": item_text,
                    "ob_text": ob_text
                })
            if ob_items:
                grouped_items.append(ob_items)
                
        # Interleave items round-robin style to ensure compliance diversity
        interleaved_items = []
        max_len = max(len(grp) for grp in grouped_items) if grouped_items else 0
        for i in range(max_len):
            for grp in grouped_items:
                if i < len(grp):
                    interleaved_items.append(grp[i])
                    
        # Slice to a maximum of 10 questions
        final_items = interleaved_items[:10]
        
        questions = []
        for item in final_items:
            phrased_q = llm_client.phrase_question(item["ob_text"], item["item_text"])
            questions.append({
                "obligation_id": item["obligation_id"],
                "section_citation": item["section_citation"],
                "item_index": item["item_index"],
                "item_text": item["item_text"],
                "question_text": phrased_q
            })
            
        return questions

class AuditService:
    def list_audits(self) -> list[Any]:
        # Return mock / active running session details if needed
        return []

    def create_audit(self, payload: Any) -> Any:
        return {}
