from typing import Dict, Any, List
from app.modules.auth.service import KeycloakUser, RBACGuard

class TenantDataBroker:
    """
    Simulates a secure database broker enforcing Row-Level Security (RLS)
    programmatically based on the Keycloak user's tenant context and roles.
    """
    def __init__(self):
        # In-memory mock database of audits
        # key: audit_id -> value: audit metadata dict
        self._audits: Dict[str, Dict[str, Any]] = {}

    def create_audit(self, user: KeycloakUser, audit_id: str, description: str) -> Dict[str, Any]:
        # Enforce RBAC write access for tenant
        # Auditors and Reviewers can create audits, Client-Viewers cannot
        RBACGuard.check_access(user, ["auditor", "reviewer"], user.tenant_id)

        if audit_id in self._audits:
            raise ValueError(f"Audit with ID '{audit_id}' already exists.")

        audit_record = {
            "audit_id": audit_id,
            "tenant_id": user.tenant_id,
            "created_by": user.username,
            "description": description,
            "evidence": {},
            "resolved_verdicts": {}
        }
        self._audits[audit_id] = audit_record
        return audit_record

    def get_audit(self, user: KeycloakUser, audit_id: str) -> Dict[str, Any]:
        if audit_id not in self._audits:
            raise KeyError(f"Audit with ID '{audit_id}' not found.")

        record = self._audits[audit_id]
        
        # Enforce Multi-Tenancy read access and RBAC
        # All roles (auditor, reviewer, client-viewer) can read within their tenant
        RBACGuard.check_access(user, ["auditor", "reviewer", "client-viewer"], record["tenant_id"])
        
        return record

    def save_evidence(self, user: KeycloakUser, audit_id: str, obligation_id: str, item_text: str, evidence: str) -> Dict[str, Any]:
        record = self.get_audit(user, audit_id) # Inherently checks read access & tenant
        
        # Enforce RBAC write access for updates
        # Only auditor and reviewer can update/save evidence
        RBACGuard.check_access(user, ["auditor", "reviewer"], record["tenant_id"])

        record["evidence"][f"{obligation_id}:{item_text}"] = evidence
        return record

    def apply_manual_override(self, user: KeycloakUser, audit_id: str, obligation_id: str, item_text: str, override_verdict: str) -> Dict[str, Any]:
        record = self.get_audit(user, audit_id) # Inherently checks read access & tenant
        
        # Enforce strict RBAC: Only a "reviewer" can override compliance verdicts
        # Auditors and Client-Viewers are strictly prohibited
        RBACGuard.check_access(user, ["reviewer"], record["tenant_id"])

        record["resolved_verdicts"][f"{obligation_id}:{item_text}"] = override_verdict
        return record
