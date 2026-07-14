import unittest
import sys
import os

# Ensure project root is in the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.modules.audits.service import InterviewEngine
from app.modules.workflows.llm_client import LLMClient

class TestInterviewEngine(unittest.TestCase):
    def setUp(self):
        # Resolve path to obligations.yaml
        self.obligations_yaml_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), '../../../packages/knowledge-base/src/obligations.yaml'
        ))
        self.llm_client = LLMClient() # Defaults to fallback offline mode

    def test_scenario_a_basic_data_fiduciary(self):
        # Gating params for a standard Data Fiduciary with no special data or transfers
        gating_params = {
            "role": "Data Fiduciary",
            "consent_required": True,
            "processes_children_data": False,
            "transfers_data_outside_india": False,
            "has_data_breach": False,
            "pre_existing_consent": False
        }
        
        engine = InterviewEngine(self.obligations_yaml_path, gating_params)
        applicable_obs = engine.get_applicable_obligations()
        
        # We expect the general obligations to be returned
        applicable_ids = [o["id"] for o in applicable_obs]
        
        # Verify that general obligations exist
        self.assertIn("ob_s5_1_notice_consent", applicable_ids)
        self.assertIn("ob_s6_1_consent_quality", applicable_ids)
        self.assertIn("ob_s8_5_security_safeguards", applicable_ids)
        self.assertIn("ob_s11_rights_access", applicable_ids)
        
        # Verify that specialized/conditional obligations are skipped
        self.assertNotIn("ob_s5_2_notice_pre_consent", applicable_ids)
        self.assertNotIn("ob_s8_6_breach_notification", applicable_ids)
        self.assertNotIn("ob_s9_1_child_consent", applicable_ids)
        self.assertNotIn("ob_s10_2_a_sdf_dpo", applicable_ids)
        self.assertNotIn("ob_s16_cross_border_transfer", applicable_ids)
        
        # Generate questions and verify structure
        questions = engine.generate_questions(self.llm_client)
        self.assertTrue(len(questions) > 0)
        
        # Verify that all generated questions belong to the applicable obligations
        for q in questions:
            self.assertIn(q["obligation_id"], applicable_ids)

    def test_scenario_b_highly_regulated_sdf(self):
        # Gating params for a Significant Data Fiduciary processing children's data and cross-border transfers
        gating_params = {
            "role": "Significant Data Fiduciary",
            "consent_required": True,
            "processes_children_data": True,
            "transfers_data_outside_india": True,
            "has_data_breach": True,
            "pre_existing_consent": True
        }
        
        engine = InterviewEngine(self.obligations_yaml_path, gating_params)
        applicable_obs = engine.get_applicable_obligations()
        applicable_ids = [o["id"] for o in applicable_obs]
        
        # Under these gating settings, every single obligation in obligations.yaml should match
        self.assertIn("ob_s5_1_notice_consent", applicable_ids)
        self.assertIn("ob_s5_2_notice_pre_consent", applicable_ids)
        self.assertIn("ob_s6_1_consent_quality", applicable_ids)
        self.assertIn("ob_s8_5_security_safeguards", applicable_ids)
        self.assertIn("ob_s8_6_breach_notification", applicable_ids)
        self.assertIn("ob_s9_1_child_consent", applicable_ids)
        self.assertIn("ob_s10_2_a_sdf_dpo", applicable_ids)
        self.assertIn("ob_s11_rights_access", applicable_ids)
        self.assertIn("ob_s16_cross_border_transfer", applicable_ids)
        
        # Total expected: Capped at a maximum of 10 questions
        self.assertEqual(len(questions), 10)

    def test_domain_prioritization(self):
        # Scenario 1: Education domain prioritizing child consent
        edu_params = {
            "role": "Significant Data Fiduciary",
            "domain": "education",
            "processes_children_data": True
        }
        engine_edu = InterviewEngine(self.obligations_yaml_path, edu_params)
        q_edu = engine_edu.generate_questions(self.llm_client)
        # Verify ob_s9_1_child_consent appears at the very beginning of the question set
        self.assertEqual(q_edu[0]["obligation_id"], "ob_s9_1_child_consent")

        # Scenario 2: Finance domain prioritizing security safeguards
        fin_params = {
            "role": "Significant Data Fiduciary",
            "domain": "finance",
            "processes_children_data": True
        }
        engine_fin = InterviewEngine(self.obligations_yaml_path, fin_params)
        q_fin = engine_fin.generate_questions(self.llm_client)
        # Verify ob_s8_5_security_safeguards appears at the very beginning
        self.assertEqual(q_fin[0]["obligation_id"], "ob_s8_5_security_safeguards")

if __name__ == '__main__':
    unittest.main()
