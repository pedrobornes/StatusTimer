"""Environment-driven configuration for the StatusTimer harvester script."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    backend_base_url: str = "http://localhost:8080"
    backend_api_key: str = "your-local-secret-key"
    request_timeout_seconds: int = 15
    request_retry_max_attempts: int = 3
    request_retry_delay_seconds: int = 5
    harvest_interval_seconds: int = 300

    igdb_client_id: str = ""
    igdb_client_secret: str = ""
    steam_api_key: str = ""

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "deepseek-coder-v2:16b"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
