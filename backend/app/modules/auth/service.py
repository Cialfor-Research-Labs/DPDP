from typing import List

class KeycloakUser:
    def __init__(self, username: str, tenant_id: str, roles: List[str]):
        self.username = username
        self.tenant_id = tenant_id
        self.roles = roles

class RBACGuard:
    @staticmethod
    def check_access(user: KeycloakUser, required_roles: List[str], target_tenant_id: str) -> None:
        """
        Enforces both Role-Based Access Control and Multi-Tenancy boundaries.
        """
        # 1. Enforce Multi-Tenancy isolation
        if user.tenant_id != target_tenant_id:
            raise PermissionError(f"Access Denied: Cross-tenant access forbidden for tenant '{user.tenant_id}' on resource owned by '{target_tenant_id}'")

        # 2. Enforce RBAC roles check
        if not any(role in user.roles for role in required_roles):
            raise PermissionError(f"Access Denied: User '{user.username}' does not have any of the required roles: {required_roles}")
