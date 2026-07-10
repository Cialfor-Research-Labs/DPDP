import os
import httpx
from typing import Dict, Any, List, Optional

class ScoringEngine:
    # Default DPDPA category weights
    CATEGORY_WEIGHTS = {
        "general": 0.40,
        "children": 0.15,
        "sdf": 0.20,
        "rights": 0.15,
        "cross_border": 0.10
    }

    OBLIGATION_TO_CATEGORY = {
        "ob_s5_1_notice_consent": "general",
        "ob_s5_2_notice_pre_consent": "general",
        "ob_s6_1_consent_quality": "general",
        "ob_s8_5_security_safeguards": "general",
        "ob_s8_6_breach_notification": "general",
        "ob_s9_1_child_consent": "children",
        "ob_s10_2_a_sdf_dpo": "sdf",
        "ob_s11_rights_access": "rights",
        "ob_s16_cross_border_transfer": "cross_border"
    }

    @classmethod
    def calculate_scores(cls, evaluation_results: Dict[str, Dict[str, str]], obligations_db: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates compliance scores.
        - evaluation_results maps obligation_id -> {item_text: resolved_status}
        - obligations_db is the raw loaded dictionary of obligations
        Returns category-level and overall rolled-up score normalized by applicability.
        """
        obligation_scores = {}
        category_scores_list = {cat: [] for cat in cls.CATEGORY_WEIGHTS.keys()}

        for ob_id, item_results in evaluation_results.items():
            if not item_results:
                continue

            # Calculate obligation score: percentage of items that are PRESENT
            total_items = len(item_results)
            present_items = 0
            for val in item_results.values():
                status = val.get("resolved_verdict") if isinstance(val, dict) else val
                if status == "PRESENT":
                    present_items += 1
            ob_score = present_items / total_items if total_items > 0 else 0.0
            
            obligation_scores[ob_id] = ob_score

            # Add to its matching category
            cat = cls.OBLIGATION_TO_CATEGORY.get(ob_id)
            if cat in category_scores_list:
                category_scores_list[cat].append(ob_score)

        # Calculate category averages
        category_averages = {}
        active_weights_sum = 0.0

        for cat, scores in category_scores_list.items():
            if scores: # Category has active/applicable obligations in this audit
                cat_avg = sum(scores) / len(scores)
                category_averages[cat] = cat_avg
                active_weights_sum += cls.CATEGORY_WEIGHTS[cat]

        # Calculate overall normalized score
        overall_weighted_score = 0.0
        if active_weights_sum > 0.0:
            weighted_sum = 0.0
            for cat, avg in category_averages.items():
                weighted_sum += avg * cls.CATEGORY_WEIGHTS[cat]
            overall_weighted_score = (weighted_sum / active_weights_sum) * 100.0

        return {
            "obligation_scores": obligation_scores,
            "category_scores": category_averages,
            "overall_score": round(overall_weighted_score, 2)
        }

class RecommendationEngine:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")

    def generate_recommendations(self, evaluation_results: Dict[str, Dict[str, str]], obligations_db: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generates remediation recommendations for non-compliant items.
        Cites the specific obligation ID and section citation.
        """
        recommendations = []
        ob_map = {ob["id"]: ob for ob in obligations_db.get("obligations", [])}

        for ob_id, item_results in evaluation_results.items():
            ob_detail = ob_map.get(ob_id)
            if not ob_detail:
                continue

            citation = ob_detail.get("section_citation", "Unknown Section")
            obligation_text = ob_detail.get("obligation_text", "")

            for item_text, val in item_results.items():
                verdict = val.get("resolved_verdict") if isinstance(val, dict) else val
                if verdict == "PRESENT":
                    continue

                remediation_text = ""

                # Call live Claude Sonnet API if API key exists
                if self.api_key:
                    headers = {
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    }
                    prompt = (
                        f"Write a brief, highly actionable compliance recommendation (2 sentences max) addressing the following DPDPA 2023 gap:\n"
                        f"Obligation Text: {obligation_text}\n"
                        f"Section Citation: {citation}\n"
                        f"Specific Gap Checklist Item: {item_text}\n"
                        f"Auditor Answer Verdict Status: {verdict}\n\n"
                        f"Ensure your recommendation explicitly references {citation} and is specific to {item_text}. Do not use generic boilerplate."
                    )
                    payload = {
                        "model": "claude-3-5-sonnet-20240620",
                        "max_tokens": 150,
                        "messages": [{"role": "user", "content": prompt}]
                    }
                    try:
                        response = httpx.post("https://api.anthropic.com/v1/messages", json=payload, headers=headers, timeout=10.0)
                        if response.status_code == 200:
                            remediation_text = response.json()["content"][0]["text"].strip()
                    except Exception:
                        pass

                # Local fallback template if off-grid or API call fails
                if not remediation_text:
                    remediation_text = (
                        f"Remediation under {citation} is required to resolve the missing evidence for '{item_text}'. "
                        f"Action: Establish and document standard compliance protocols verifying that {item_text.lower().rstrip('.')} is fully implemented."
                    )

                recommendations.append({
                    "obligation_id": ob_id,
                    "section_citation": citation,
                    "item_text": item_text,
                    "verdict": verdict,
                    "remediation": remediation_text
                })

        return recommendations
