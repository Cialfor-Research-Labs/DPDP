from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DPDPA Compliance Engine API"
    api_prefix: str = "/api/v1"
    environment: str = "development"
    postgres_dsn: str = "postgresql://postgres:postgres@127.0.0.1:5432/dpdpa"
    redis_url: str = "redis://127.0.0.1:6379/0"
    temporal_host: str = "127.0.0.1:7233"
    keycloak_server_url: str = "http://127.0.0.1:8080"
    keycloak_realm: str = "dpdpa"
    minio_endpoint: str = "127.0.0.1:9000"
    vault_addr: str = "http://127.0.0.1:8200"
    anthropic_api_key: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
