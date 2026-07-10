import unittest
import sys
import os
import yaml

# Ensure project root is in the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from apps.api.retrieval_mapper import RetrievalMapper

class TestRetrievalMapper(unittest.TestCase):
    def setUp(self):
        # Resolve path to obligations.yaml
        self.obligations_yaml_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), '../../../packages/knowledge-base/src/obligations.yaml'
        ))
        
        # Load obligations
        with open(self.obligations_yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        self.obligations = data.get("obligations", [])
        
        # Initialize mapper and load database
        self.mapper = RetrievalMapper()
        self.mapper.load_obligations(self.obligations)
        
        # Define labeled dataset (evidence chunk -> correct obligation ID)
        self.labeled_data = [
            # ob_s5_1_notice_consent
            ("Our signup interface has a visible privacy notification explaining what types of data we collect, including email address and location.", "ob_s5_1_notice_consent"),
            ("We display a clear notice describing the purpose of collection and explaining that users can revoke consent at any time.", "ob_s5_1_notice_consent"),
            ("The notice document is available in English as well as Hindi and other regional schedule languages.", "ob_s5_1_notice_consent"),
            
            # ob_s5_2_notice_pre_consent
            ("For users who registered before the DPDPA came into effect, we sent out a retroactive notice explaining historical consent status.", "ob_s5_2_notice_pre_consent"),
            ("We sent an email to all older users listing the personal data we process and detail how to complain to the Board.", "ob_s5_2_notice_pre_consent"),
            
            # ob_s6_1_consent_quality
            ("Our sign-up screen does not use pre-ticked checkboxes; consent is strictly given by clear affirmative action.", "ob_s6_1_consent_quality"),
            ("We offer users separate choices to opt into promotional emails versus core data sharing.", "ob_s6_1_consent_quality"),
            ("We do not force users to agree to optional analytics in order to browse the web store.", "ob_s6_1_consent_quality"),
            
            # ob_s8_5_security_safeguards
            ("We encrypt all user tables at rest using AES-256 and protect connections in transit via SSL/TLS.", "ob_s8_5_security_safeguards"),
            ("We enforce multi-factor authentication (MFA) and least privilege settings on all server configurations.", "ob_s8_5_security_safeguards"),
            ("Our team conducts quarterly penetration testing and regular vulnerability scans on the cloud instances.", "ob_s8_5_security_safeguards"),
            
            # ob_s8_6_breach_notification
            ("We have a cybersecurity response plan detailing how to notify the DPBI in the event of an data leak.", "ob_s8_6_breach_notification"),
            ("We have templates ready for informing both the Board and affected data principals about any database leak.", "ob_s8_6_breach_notification"),
            
            # ob_s9_1_child_consent
            ("If the registration age shows a user is under 18, we send a verification code to their parent's email for parental consent.", "ob_s9_1_child_consent"),
            ("We implement guardian validation mechanisms to verify consent when processing children's personal information.", "ob_s9_1_child_consent"),
            
            # ob_s10_2_a_sdf_dpo
            ("We appointed a senior, India-based Data Protection Officer who reports directly to the board of directors.", "ob_s10_2_a_sdf_dpo"),
            ("The contact info and email address of our Data Protection Officer is published on our help portal.", "ob_s10_2_a_sdf_dpo"),
            
            # ob_s11_rights_access
            ("Users can go to their profile settings and download a summary report showing all of their processed data.", "ob_s11_rights_access"),
            ("We list all subprocessors and external partners with whom we share customer databases.", "ob_s11_rights_access"),
            
            # ob_s16_cross_border_transfer
            ("We review our data hosting regions to ensure we do not transfer personal data to restricted blacklisted countries.", "ob_s16_cross_border_transfer")
        ]

    def test_top3_retrieval_accuracy(self):
        correct_retrievals = 0
        total_queries = len(self.labeled_data)
        
        print("\n--- Running Retrieval Mapper Accuracy Evaluation ---")
        for chunk, expected_id in self.labeled_data:
            # Query the top 3 matches
            results = self.mapper.retrieve(chunk, top_k=3)
            retrieved_ids = [r["id"] for r in results]
            
            is_correct = expected_id in retrieved_ids
            if is_correct:
                correct_retrievals += 1
                
            print(f"Query: '{chunk[:40]}...' -> Expected: {expected_id} | Got Top-3: {retrieved_ids} | Result: {'PASS' if is_correct else 'FAIL'}")
            
        accuracy = correct_retrievals / total_queries
        print(f"\nFinal Top-3 Retrieval Accuracy: {accuracy * 100:.2f}% ({correct_retrievals}/{total_queries})")
        
        # Assert accuracy is >= 90% (0.90)
        self.assertGreaterEqual(accuracy, 0.90, "Top-3 retrieval accuracy must be at least 90%.")

if __name__ == '__main__':
    unittest.main()
