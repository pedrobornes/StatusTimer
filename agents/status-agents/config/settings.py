"""Environment-driven configuration for StatusTimer agents."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    backend_base_url: str = "http://localhost:8080"
    backend_api_key: str = "your-local-secret-key"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "deepseek-coder-v2:16b"
    request_timeout_seconds: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
