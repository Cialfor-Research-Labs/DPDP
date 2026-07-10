import unittest
import sys
import os

# Ensure the project root is in the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from apps.api.deterministic_checker import DeterministicChecker

class TestDeterministicChecker(unittest.TestCase):
    def setUp(self):
        self.security_obligation = {
            "id": "ob_s8_5_security_safeguards",
            "section_citation": "Section 8(5)",
            "chapter": "Chapter II",
            "obligation_text": "Implement reasonable security safeguards to prevent personal data breach.",
            "applicability_conditions": {"role": "Data Fiduciary"},
            "evidence_checklist": [
                {
                    "item": "Encryption of personal data at rest and in transit.",
                    "positive_keywords": ["encryption", "encrypt", "ssl", "tls"],
                    "negative_keywords": ["unencrypted", "plaintext", "no encryption"]
                },
                {
                    "item": "Access controls, MFA, and least-privilege policies.",
                    "positive_keywords": ["access control", "mfa", "least-privilege", "multi-factor"],
                    "negative_keywords": ["no access control", "no mfa", "shared password"]
                },
                {
                    "item": "Regular vulnerability scans and penetration testing.",
                    "positive_keywords": ["scan", "penetration", "pentest", "vulnerability"],
                    "negative_keywords": ["no testing", "never scanned"]
                }
            ],
            "exemption_refs": [],
            "penalty_ref": "Section 33, Schedule (Sr No 2)",
            "version": 1
        }

    def test_clear_pass_answer(self):
        # Auditor response covers all items positively
        answer = "We encrypt all personal data using TLS and AES-256 encryption. We enforce strict access control and MFA for all employees. We also perform weekly vulnerability scans and pentests."
        results = DeterministicChecker.evaluate_obligation(answer, self.security_obligation)
        
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0]["status"], "PRESENT")
        self.assertEqual(results[1]["status"], "PRESENT")
        self.assertEqual(results[2]["status"], "PRESENT")

    def test_clear_fail_answer(self):
        # Auditor response explicitly fails some or all items
        answer = "We do not encrypt our database and we have no access control or MFA enabled yet. However, we did run a vulnerability scan last month."
        results = DeterministicChecker.evaluate_obligation(answer, self.security_obligation)
        
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0]["status"], "MISSING")  # "do not encrypt" -> negated
        self.assertEqual(results[1]["status"], "MISSING")  # "no access control" -> negated
        self.assertEqual(results[2]["status"], "PRESENT")  # "vulnerability scan" -> present

    def test_deliberately_ambiguous_answer(self):
        # Auditor response is vague or unrelated
        answer = "We are currently looking into our security setups and everything is going fine."
        results = DeterministicChecker.evaluate_obligation(answer, self.security_obligation)
        
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0]["status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(results[1]["status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(results[2]["status"], "INSUFFICIENT_EVIDENCE")

    def test_empty_or_too_short_answer(self):
        # Extremely short answer
        answer = "Yes."
        results = DeterministicChecker.evaluate_obligation(answer, self.security_obligation)
        
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0]["status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(results[1]["status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(results[2]["status"], "INSUFFICIENT_EVIDENCE")

if __name__ == '__main__':
    unittest.main()
