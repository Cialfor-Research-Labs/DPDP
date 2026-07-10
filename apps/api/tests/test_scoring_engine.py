import unittest
import sys
import os
import yaml

# Ensure project root is in the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from apps.api.scoring_engine import ScoringEngine, RecommendationEngine

class TestScoringAndRecommendationEngine(unittest.TestCase):
    def setUp(self):
        # Path to obligations yaml
        self.obligations_yaml_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), '../../../packages/knowledge-base/src/obligations.yaml'
        ))
        with open(self.obligations_yaml_path, "r", encoding="utf-8") as f:
            self.obligations_db = yaml.safe_load(f)

    def test_scoring_single_category(self):
        # 1. Setup evaluation results only for "general" category obligations
        # ob_s5_1_notice_consent has 4 items in obligations.yaml:
        # 3 are PRESENT, 1 is MISSING -> Score = 0.75
        # ob_s8_5_security_safeguards has 3 items in obligations.yaml:
        # All 3 are PRESENT -> Score = 1.0
        evaluation_results = {
            "ob_s5_1_notice_consent": {
                "Notice lists all categories of personal data to be collected.": "PRESENT",
                "Notice states the specific, explicit purpose for processing.": "PRESENT",
                "Notice contains clear instructions on how the Data Principal can withdraw consent.": "PRESENT",
                "Notice explains how to lodge a complaint with the Data Protection Board of India.": "MISSING"
            },
            "ob_s8_5_security_safeguards": {
                "Encryption of personal data at rest and in transit.": "PRESENT",
                "Access controls, MFA, and least-privilege policies.": "PRESENT",
                "Regular vulnerability scans and penetration testing.": "PRESENT"
            }
        }

        # Calculate scores
        results = ScoringEngine.calculate_scores(evaluation_results, self.obligations_db)

        # General category average = (0.75 + 1.0) / 2 = 0.875
        # Since only "general" category is active, active_weights_sum = 0.40.
        # Overall score = (0.875 * 0.40) / 0.40 * 100 = 87.5%
        self.assertAlmostEqual(results["overall_score"], 87.50, places=2)
        self.assertAlmostEqual(results["obligation_scores"]["ob_s5_1_notice_consent"], 0.75, places=2)
        self.assertAlmostEqual(results["obligation_scores"]["ob_s8_5_security_safeguards"], 1.00, places=2)
        self.assertAlmostEqual(results["category_scores"]["general"], 0.875, places=3)
        self.assertNotIn("children", results["category_scores"])

    def test_scoring_multi_category_re_normalization(self):
        # 2. Setup results for multiple active categories:
        # - general: ob_s5_1_notice_consent (all 4 PRESENT) -> Score = 1.0
        # - children: ob_s9_1_child_consent (both 2 PRESENT) -> Score = 1.0
        # - sdf: ob_s10_2_a_sdf_dpo (1 PRESENT, 1 MISSING) -> Score = 0.5
        # - cross_border: ob_s16_cross_border_transfer (1 MISSING) -> Score = 0.0
        # Inactive category: rights (s11) -> weight is ignored
        evaluation_results = {
            "ob_s5_1_notice_consent": {
                "Notice lists all categories of personal data to be collected.": "PRESENT",
                "Notice states the specific, explicit purpose for processing.": "PRESENT",
                "Notice contains clear instructions on how the Data Principal can withdraw consent.": "PRESENT",
                "Notice explains how to lodge a complaint with the Data Protection Board of India.": "PRESENT"
            },
            "ob_s9_1_child_consent": {
                "Age verification check is integrated into user onboarding.": "PRESENT",
                "Consent flow triggers parental email/phone verification for users under 18.": "PRESENT"
            },
            "ob_s10_2_a_sdf_dpo": {
                "Senior-level appointment letter for India-based DPO is documented.": "PRESENT",
                "DPO contact details are published on primary digital interfaces.": "MISSING"
            },
            "ob_s16_cross_border_transfer": {
                "Localization or mapping showing no data routed to restricted territories.": "MISSING"
            }
        }

        # Active weights: general (0.40) + children (0.15) + sdf (0.20) + cross_border (0.10) = 0.85
        # Weighted score sum: (1.0 * 0.40) + (1.0 * 0.15) + (0.5 * 0.20) + (0.0 * 0.10)
        #                     = 0.40 + 0.15 + 0.10 + 0.00 = 0.65
        # Rolled-up score = (0.65 / 0.85) * 100 = 76.4705% -> 76.47
        results = ScoringEngine.calculate_scores(evaluation_results, self.obligations_db)

        self.assertAlmostEqual(results["overall_score"], 76.47, places=2)
        self.assertEqual(results["category_scores"]["general"], 1.0)
        self.assertEqual(results["category_scores"]["children"], 1.0)
        self.assertEqual(results["category_scores"]["sdf"], 0.5)
        self.assertEqual(results["category_scores"]["cross_border"], 0.0)

    def test_recommendation_generation_and_citation_tracing(self):
        evaluation_results = {
            "ob_s5_1_notice_consent": {
                "Notice explains how to lodge a complaint with the Data Protection Board of India.": "MISSING"
            },
            "ob_s16_cross_border_transfer": {
                "Localization or mapping showing no data routed to restricted territories.": "INSUFFICIENT_EVIDENCE"
            }
        }

        engine = RecommendationEngine(api_key=None) # Tests offline/mock fallback path
        recommendations = engine.generate_recommendations(evaluation_results, self.obligations_db)

        self.assertEqual(len(recommendations), 2)
        
        # Spot-check Compliant Tracing to legal text
        rec_notice = next(r for r in recommendations if r["obligation_id"] == "ob_s5_1_notice_consent")
        self.assertEqual(rec_notice["section_citation"], "Section 5(1)")
        self.assertIn("Section 5(1)", rec_notice["remediation"])
        self.assertIn("complaint with the Data Protection Board of India", rec_notice["remediation"])

        rec_transfer = next(r for r in recommendations if r["obligation_id"] == "ob_s16_cross_border_transfer")
        self.assertEqual(rec_transfer["section_citation"], "Section 16")
        self.assertIn("Section 16", rec_transfer["remediation"])
        self.assertIn("no data routed to restricted territories", rec_transfer["remediation"])

if __name__ == '__main__':
    unittest.main()
