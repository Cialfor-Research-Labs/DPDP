from __future__ import annotations

from app.modules.runtime import repository


class StorageService:
    def get_bucket_name(self) -> str:
        return "audit-artifacts"

    def save_audit_artifact(self, audit_id: str, artifact: dict) -> None:
        repository.artifacts[audit_id] = artifact

    def get_audit_artifact(self, audit_id: str) -> dict | None:
        return repository.artifacts.get(audit_id)
