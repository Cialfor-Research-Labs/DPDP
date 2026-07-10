import unittest
import sys
import os
import json

# Ensure project root is in the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.modules.review.service import AuditLogManager, HumanReviewQueue

class TestHumanReviewQueue(unittest.TestCase):
    def setUp(self):
        self.audit_id = "test_audit_1001"
        self.log_path = AuditLogManager.get_log_path(self.audit_id)
        # Clean up any residual log file
        if os.path.exists(self.log_path):
            os.remove(self.log_path)

    def tearDown(self):
        # Clean up log file created during testing
        if os.path.exists(self.log_path):
            os.remove(self.log_path)

    def test_review_queue_and_override_pipeline(self):
        ob_id = "ob_s5_1_notice_consent"
        item_mismatch = "Notice lists all categories of personal data to be collected."
        item_agreement = "Notice states the specific, explicit purpose for processing."
        
        # 1. Log evaluation events (simulate checker-LLM run)
        # Item 1 is a mismatch -> resolved as HUMAN_REVIEW
        AuditLogManager.log_event(self.audit_id, "EVALUATION", {
            "obligation_id": ob_id,
            "item_text": item_mismatch,
            "rule_check_verdict": "INSUFFICIENT_EVIDENCE",
            "llm_verdict": "PRESENT",
            "resolved_verdict": "HUMAN_REVIEW",
            "raw_evidence": "Yes, we collect email."
        })
        
        # Item 2 is an agreement -> resolved as PRESENT
        AuditLogManager.log_event(self.audit_id, "EVALUATION", {
            "obligation_id": ob_id,
            "item_text": item_agreement,
            "rule_check_verdict": "PRESENT",
            "llm_verdict": "PRESENT",
            "resolved_verdict": "PRESENT",
            "raw_evidence": "We explicitly outline the specific purpose in the notice."
        })

        # 2. Retrieve review queue items (only the mismatch item should appear)
        review_items = HumanReviewQueue.get_items_for_review(self.audit_id)
        self.assertEqual(len(review_items), 1)
        self.assertEqual(review_items[0]["obligation_id"], ob_id)
        self.assertEqual(review_items[0]["item_text"], item_mismatch)
        self.assertEqual(review_items[0]["rule_check_verdict"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(review_items[0]["llm_verdict"], "PRESENT")

        # 3. Apply human override (resolve the mismatch)
        override_reason = "Verified email is listed in Section 2, which satisfies category description requirements."
        reviewer_name = "lead_auditor"
        
        updated_state = HumanReviewQueue.apply_override(
            audit_id=self.audit_id,
            obligation_id=ob_id,
            item_text=item_mismatch,
            override_verdict="PRESENT",
            reason=override_reason,
            reviewer=reviewer_name
        )

        # Assert override was applied to current state
        self.assertEqual(updated_state["resolved_verdict"], "PRESENT")
        self.assertIsNotNone(updated_state["override"])
        self.assertEqual(updated_state["override"]["verdict"], "PRESENT")
        self.assertEqual(updated_state["override"]["reason"], override_reason)
        self.assertEqual(updated_state["override"]["reviewer"], reviewer_name)

        # 4. Fetch review items again (queue should now be empty)
        updated_review_items = HumanReviewQueue.get_items_for_review(self.audit_id)
        self.assertEqual(len(updated_review_items), 0)

        # 5. Load the full log and reconstruct timeline history (verify immutability)
        full_log = AuditLogManager.load_log(self.audit_id)
        self.assertEqual(len(full_log["history"]), 3) # 2 EVALUATIONS + 1 OVERRIDE
        
        # Verify event order
        self.assertEqual(full_log["history"][0]["event_type"], "EVALUATION")
        self.assertEqual(full_log["history"][1]["event_type"], "EVALUATION")
        self.assertEqual(full_log["history"][2]["event_type"], "OVERRIDE")
        
        # Verify details preserved
        override_event_details = full_log["history"][2]["details"]
        self.assertEqual(override_event_details["override_verdict"], "PRESENT")
        self.assertEqual(override_event_details["reason"], override_reason)

if __name__ == '__main__':
    unittest.main()
