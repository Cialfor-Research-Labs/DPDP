import unittest
import sys
import os
import json
import yaml

# Ensure project root is in the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from apps.api.deterministic_checker import DeterministicChecker
from apps.api.semantic_evaluator import LLMSemanticEvaluator, GroundTruthVerifier

class TestSemanticEvaluatorAndVerifier(unittest.TestCase):
    def setUp(self):
        # Resolve paths
        self.golden_dataset_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), '../../../packages/knowledge-base/src/golden_dataset.json'
        ))
        self.obligations_yaml_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), '../../../packages/knowledge-base/src/obligations.yaml'
        ))

        # Load golden dataset
        with open(self.golden_dataset_path, "r", encoding="utf-8") as f:
            self.golden_triples = json.load(f)

        # Load obligations database
        with open(self.obligations_yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        self.obligations = {o["id"]: o for o in data.get("obligations", [])}

        # Initialize LLM evaluator and verifier
        self.evaluator = LLMSemanticEvaluator(mock_mode=True)
        self.verifier = GroundTruthVerifier()

    def test_golden_dataset_evaluation(self):
        total_cases = len(self.golden_triples)
        self.assertEqual(total_cases, 30, "Golden dataset must contain exactly 30 triples.")

        correct_deterministic = 0
        correct_llm = 0
        correct_resolved = 0
        disagreements_routed_to_review = 0
        total_disagreements = 0

        print("\n--- Running Golden Dataset Evaluator & Verifier Test ---")
        
        for item in self.golden_triples:
            ob_id = item["obligation_id"]
            item_text = item["item_text"]
            question = item["question"]
            answer = item["answer"]
            
            exp_det = item["expected_deterministic_verdict"]
            exp_llm = item["expected_llm_verdict"]
            exp_res = item["expected_resolved_verdict"]

            # 1. Fetch obligation keywords for the item
            ob = self.obligations.get(ob_id)
            self.assertIsNotNone(ob, f"Obligation {ob_id} not found in database.")
            
            pos_kws = []
            neg_kws = []
            for rule in ob.get("evidence_checklist", []):
                if rule.get("item") == item_text:
                    pos_kws = rule.get("positive_keywords", [])
                    neg_kws = rule.get("negative_keywords", [])
                    break
            
            # 2. Run Deterministic Checker
            det_verdict = DeterministicChecker.evaluate_item(answer, item_text, pos_kws, neg_kws)
            
            # 3. Run LLM Semantic Evaluator
            # If the obligation ID is ob_s10_2_a_sdf_dpo (DPO appointment), mark as high risk to test direct Sonnet escalation routing
            risk = "high" if ob_id == "ob_s10_2_a_sdf_dpo" else "medium"
            llm_result = self.evaluator.evaluate_answer(question, answer, item_text, obligation_risk=risk)
            llm_verdict = llm_result["verdict"]
            model_used = llm_result["model_used"]
            
            # Verify direct high-risk escalation
            if risk == "high":
                self.assertEqual(model_used, "claude-sonnet", f"High risk obligation {ob_id} did not route directly to Claude Sonnet.")
            else:
                self.assertTrue(model_used in ["gemma2-9b", "claude-sonnet"], f"Model {model_used} not expected for medium risk.")

            # 4. Run Ground-Truth Verifier (Reconciliation)
            resolved_verdict = self.verifier.reconcile(det_verdict, llm_verdict)

            # Evaluate matches
            is_det_correct = (det_verdict == exp_det)
            is_llm_correct = (llm_verdict == exp_llm)
            is_res_correct = (resolved_verdict == exp_res)

            if is_det_correct:
                correct_deterministic += 1
            if is_llm_correct:
                correct_llm += 1
            if is_res_correct:
                correct_resolved += 1

            if exp_det != exp_llm:
                total_disagreements += 1
                if resolved_verdict == "HUMAN_REVIEW":
                    disagreements_routed_to_review += 1

            print(f"ID {item['id']}: Q: '{question[:25]}...' | Answer: '{answer[:25]}...'")
            print(f"  Det: {det_verdict} (exp {exp_det}) | LLM: {llm_verdict} via {model_used} (exp {exp_llm}) | Resolved: {resolved_verdict} (exp {exp_res})")
            print(f"  Match: Det={is_det_correct}, LLM={is_llm_correct}, Resolved={is_res_correct}")

        print("\n--- Final Metrics ---")
        det_acc = (correct_deterministic / total_cases) * 100
        llm_acc = (correct_llm / total_cases) * 100
        res_acc = (correct_resolved / total_cases) * 100
        
        print(f"Deterministic Checker Accuracy: {det_acc:.2f}% ({correct_deterministic}/{total_cases})")
        print(f"LLM Assessor Accuracy: {llm_acc:.2f}% ({correct_llm}/{total_cases})")
        print(f"Resolved (System) Accuracy: {res_acc:.2f}% ({correct_resolved}/{total_cases})")
        print(f"Disagreements Mapped: {total_disagreements}")
        print(f"Disagreements Correctly Routed to HUMAN_REVIEW: {disagreements_routed_to_review}/{total_disagreements}")

        self.assertEqual(correct_resolved, total_cases, "All resolved verdicts must match their expected outputs.")
        self.assertEqual(disagreements_routed_to_review, total_disagreements, "All checker/LLM disagreements must route to HUMAN_REVIEW.")

if __name__ == '__main__':
    unittest.main()
