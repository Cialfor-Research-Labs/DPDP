import unittest
import sys
import os

# Ensure project root is in the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.modules.auth.service import KeycloakUser
from app.modules.storage.database import TenantDataBroker

class TestMultiTenancyAndRBAC(unittest.TestCase):
    def setUp(self):
        self.broker = TenantDataBroker()
        
        # Define users for Tenant Alpha
        self.alice_auditor = KeycloakUser("alice", "tenant_alpha", ["auditor"])
        self.charlie_viewer = KeycloakUser("charlie", "tenant_alpha", ["client-viewer"])
        self.david_reviewer = KeycloakUser("david", "tenant_alpha", ["reviewer"])

        # Define users for Tenant Beta
        self.bob_auditor = KeycloakUser("bob", "tenant_beta", ["auditor"])

    def test_tenant_isolation_boundaries(self):
        audit_id = "audit_alpha_001"
        
        # 1. Tenant Alpha Auditor creates and updates their audit
        # Creation should succeed
        audit = self.broker.create_audit(self.alice_auditor, audit_id, "Tenant Alpha Compliance Review")
        self.assertEqual(audit["tenant_id"], "tenant_alpha")
        
        # Evidence save should succeed
        self.broker.save_evidence(
            self.alice_auditor, 
            audit_id, 
            "ob_s8_5_security_safeguards", 
            "Encryption of personal data at rest and in transit.", 
            "AES-256 enabled on all database storage clusters."
        )

        # 2. Cross-tenant access validation (Bob from Tenant Beta attempts query)
        # Bob tries to query Tenant Alpha's audit (must be rejected)
        with self.assertRaises(PermissionError) as context:
            self.broker.get_audit(self.bob_auditor, audit_id)
        self.assertIn("Cross-tenant access forbidden", str(context.exception))

        # Bob tries to write evidence to Tenant Alpha's audit (must be rejected)
        with self.assertRaises(PermissionError) as context:
            self.broker.save_evidence(
                self.bob_auditor, 
                audit_id, 
                "ob_s8_5_security_safeguards", 
                "Encryption of personal data at rest and in transit.", 
                "Attempted hack injection"
            )
        self.assertIn("Cross-tenant access forbidden", str(context.exception))

    def test_rbac_role_controls(self):
        audit_id = "audit_alpha_002"
        self.broker.create_audit(self.alice_auditor, audit_id, "Tenant Alpha Operations Audit")

        # 1. Read-only User (Client Viewer) checks
        # Charlie (client-viewer) can read the audit details (within same tenant)
        record = self.broker.get_audit(self.charlie_viewer, audit_id)
        self.assertEqual(record["audit_id"], audit_id)

        # Charlie tries to edit evidence (must fail - write prohibited)
        with self.assertRaises(PermissionError) as context:
            self.broker.save_evidence(
                self.charlie_viewer,
                audit_id,
                "ob_s5_1_notice_consent",
                "Notice lists all categories of personal data to be collected.",
                "Yes, name/email."
            )
        self.assertIn("does not have any of the required roles", str(context.exception))

        # 2. Auditor User (Alice) checks
        # Alice (auditor) tries to perform a review override (must fail - override prohibited for auditor)
        with self.assertRaises(PermissionError) as context:
            self.broker.apply_manual_override(
                self.alice_auditor,
                audit_id,
                "ob_s5_1_notice_consent",
                "Notice lists all categories of personal data to be collected.",
                "PRESENT"
            )
        self.assertIn("does not have any of the required roles: ['reviewer']", str(context.exception))

        # 3. Reviewer User (David) checks
        # David (reviewer) overrides the verdict (must succeed)
        updated_record = self.broker.apply_manual_override(
            self.david_reviewer,
            audit_id,
            "ob_s5_1_notice_consent",
            "Notice lists all categories of personal data to be collected.",
            "PRESENT"
        )
        verdict_key = "ob_s5_1_notice_consent:Notice lists all categories of personal data to be collected."
        self.assertEqual(updated_record["resolved_verdicts"][verdict_key], "PRESENT")

if __name__ == '__main__':
    unittest.main()
