"""Environment-driven configuration for the StatusTimer harvester script."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    backend_base_url: str = "http://localhost:8080"
    backend_api_key: str = "your-local-secret-key"
    request_timeout_seconds: int = 15
    request_retry_max_attempts: int = 3
    request_retry_delay_seconds: int = 5
    harvest_interval_seconds: int = 300
    dedup_state_file: str = ".harvest_state/processed_hashes.json"
    feed_lookback_days: int = 7
    steam_news_max_items: int = 10
    context_store_dir: str = ".harvest_state/context"
    context_chunk_max_chars: int = 480
    context_chunk_overlap_chars: int = 80
    context_max_chunks_per_game: int = 200
    context_search_limit: int = 8

    igdb_client_id: str = ""
    igdb_client_secret: str = ""
    steam_api_key: str = ""
    riot_api_key: str = ""

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "deepseek-coder-v2:16b"
    ollama_enabled: bool = True
    ollama_timeout_seconds: int = 120
    incident_fallback_message: str = "NO_ACTIONABLE_STATUS_INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
