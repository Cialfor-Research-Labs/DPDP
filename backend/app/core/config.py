from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DPDPA Compliance Engine API"
    api_prefix: str = "/api/v1"
    environment: str = "development"
    postgres_dsn: str = "postgresql://postgres:postgres@localhost:5432/dpdpa"
    redis_url: str = "redis://localhost:6379/0"
    temporal_host: str = "localhost:7233"
    keycloak_server_url: str = "http://localhost:8080"
    keycloak_realm: str = "dpdpa"
    minio_endpoint: str = "localhost:9000"
    vault_addr: str = "http://localhost:8200"
    embedding_provider: str = "local"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 256
    openai_api_key: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
