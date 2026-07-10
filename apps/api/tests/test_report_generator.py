import unittest
import sys
import os
import yaml

# Ensure project root is in the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from apps.api.review_queue import AuditLogManager
from apps.api.scoring_engine import ScoringEngine, RecommendationEngine
from apps.api.report_generator import ReportGenerator

class TestReportGenerator(unittest.TestCase):
    def setUp(self):
        self.audit_id = "test_audit_8001"
        self.log_path = AuditLogManager.get_log_path(self.audit_id)
        self.report_path = ReportGenerator.get_report_path(self.audit_id)
        
        # Clean up files
        if os.path.exists(self.log_path):
            os.remove(self.log_path)
        if os.path.exists(self.report_path):
            os.remove(self.report_path)

        # Load raw obligations DB
        self.obligations_yaml_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), '../../../packages/knowledge-base/src/obligations.yaml'
        ))
        with open(self.obligations_yaml_path, "r", encoding="utf-8") as f:
            self.obligations_db = yaml.safe_load(f)

    def tearDown(self):
        # Clean up files
        if os.path.exists(self.log_path):
            os.remove(self.log_path)
        if os.path.exists(self.report_path):
            os.remove(self.report_path)

    def test_end_to_end_report_assembly(self):
        # 1. Log simulated evaluations
        # ob_s5_1_notice_consent: 3 PRESENT, 1 MISSING -> Score = 0.75
        notice_items = [
            ("Notice lists all categories of personal data to be collected.", "PRESENT", "Yes, we list email, phone, and name."),
            ("Notice states the specific, explicit purpose for processing.", "PRESENT", "The processing purpose is only for account registration."),
            ("Notice contains clear instructions on how the Data Principal can withdraw consent.", "PRESENT", "Click the withdraw button in settings."),
            ("Notice explains how to lodge a complaint with the Data Protection Board of India.", "MISSING", "We do not explain complaint lodging.")
        ]
        for item, verdict, evidence in notice_items:
            AuditLogManager.log_event(self.audit_id, "EVALUATION", {
                "obligation_id": "ob_s5_1_notice_consent",
                "item_text": item,
                "rule_check_verdict": verdict,
                "llm_verdict": verdict,
                "resolved_verdict": verdict,
                "raw_evidence": evidence
            })

        # ob_s8_5_security_safeguards: 3 PRESENT -> Score = 1.0
        sec_items = [
            ("Encryption of personal data at rest and in transit.", "PRESENT", "Encrypted using AES-256 and TLS 1.3."),
            ("Access controls, MFA, and least-privilege policies.", "PRESENT", "Required MFA for all admins."),
            ("Regular vulnerability scans and penetration testing.", "PRESENT", "Conduct scans monthly.")
        ]
        for item, verdict, evidence in sec_items:
            AuditLogManager.log_event(self.audit_id, "EVALUATION", {
                "obligation_id": "ob_s8_5_security_safeguards",
                "item_text": item,
                "rule_check_verdict": verdict,
                "llm_verdict": verdict,
                "resolved_verdict": verdict,
                "raw_evidence": evidence
            })

        # ob_s10_2_a_sdf_dpo (SDF obligation): 2 MISSING -> Score = 0.0
        sdf_items = [
            ("Senior-level appointment letter for India-based DPO is documented.", "MISSING", "We have not appointed an India DPO yet."),
            ("DPO contact details are published on primary digital interfaces.", "MISSING", "No details published.")
        ]
        for item, verdict, evidence in sdf_items:
            AuditLogManager.log_event(self.audit_id, "EVALUATION", {
                "obligation_id": "ob_s10_2_a_sdf_dpo",
                "item_text": item,
                "rule_check_verdict": verdict,
                "llm_verdict": verdict,
                "resolved_verdict": verdict,
                "raw_evidence": evidence
            })

        # 2. Compute Scores
        log_data = AuditLogManager.load_log(self.audit_id)
        scores = ScoringEngine.calculate_scores(log_data["current_state"], self.obligations_db)
        
        # Categories: general (s5_1, s8_5), sdf (s10_2)
        # general average: (0.75 + 1.0) / 2 = 0.875
        # sdf average: 0.0
        # Active weights: general (0.40) + sdf (0.20) = 0.60
        # Overall score = ((0.875 * 0.40) + (0.0 * 0.20)) / 0.60 * 100 = 58.33%
        self.assertAlmostEqual(scores["overall_score"], 58.33, places=2)

        # 3. Generate Recommendations
        rec_engine = RecommendationEngine(api_key=None)
        recommendations = rec_engine.generate_recommendations(log_data["current_state"], self.obligations_db)
        self.assertEqual(len(recommendations), 3) # 1 s5_1, 2 s10_2

        # 4. Assemble Report HTML
        path = ReportGenerator.assemble_report(self.audit_id, scores, recommendations)
        self.assertTrue(os.path.exists(path))
        self.assertEqual(path, self.report_path)

        # 5. Verify HTML structure & Dynamic elements
        with open(path, "r", encoding="utf-8") as f:
            html = f.read()

        # Scorecard check
        self.assertIn("58.33%", html)
        self.assertIn("General Obligations", html)
        self.assertIn("Sdf Obligations", html)
        self.assertIn("87.5%", html)

        # Gap register check
        self.assertIn("Section 5(1)", html)
        self.assertIn("Section 10(2)(a)", html)
        self.assertIn("badge-missing", html)
        self.assertIn("We have not appointed an India DPO yet.", html)

        # Auto-derived ROPA check (Should find Email, Phone, Name from s5(1) item 1 evidence)
        self.assertIn("Email", html)
        self.assertIn("Phone", html)
        self.assertIn("Name", html)
        self.assertIn("account registration", html)

        # RACI Matrix check
        self.assertIn("Deploy privacy notices and consent checkboxes", html)
        self.assertIn("DPO legal appointment and Board reporting", html)

        # Roadmap prioritization check
        # Section 10(2)(a) is SDF -> HIGH priority.
        # Section 5(1) is notice -> MEDIUM priority.
        self.assertIn("HIGH Priority", html)
        self.assertIn("MEDIUM Priority", html)
        
        print(f"\n[Phase 8] Successfully generated mock compliance audit report at: {path}")

if __name__ == '__main__':
    unittest.main()
