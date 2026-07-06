"""Environment-driven configuration for the StatusTimer harvester script."""

from functools import cached_property

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    backend_base_url: str = "http://localhost:8080"
    backend_api_key: str = "your-local-secret-key"
    mysql_host: str = "localhost"
    mysql_port: int = 3307
    mysql_database: str = "statustimer"
    mysql_user: str = "root"
    mysql_password: str = "root"
    database_url: str | None = Field(
        default=None,
        description="Optional SQLAlchemy URL override (mysql+pymysql://...)",
    )
    request_timeout_seconds: int = 15
    request_retry_max_attempts: int = 3
    request_retry_delay_seconds: int = 5
    harvest_interval_seconds: int = 300
    http_rate_limit_per_minute: int = 20
    http_jitter_min_seconds: float = 0.3
    http_jitter_max_seconds: float = 1.5
    http_circuit_failure_threshold: int = 3
    http_circuit_open_seconds: int = 300
    dedup_state_file: str = ".harvest_state/processed_hashes.json"
    feed_lookback_days: int = 7
    steam_news_max_items: int = 10
    steam_news_top_n: int = 15
    context_store_dir: str = ".harvest_state/context"
    context_chunk_max_chars: int = 480
    context_chunk_overlap_chars: int = 80
    context_max_chunks_per_game: int = 200
    context_search_limit: int = 8

    igdb_client_id: str = ""
    igdb_client_secret: str = ""
    igdb_releases_limit: int = 25
    igdb_min_hype: int = 10
    igdb_catalog_enrich_limit: int = 25
    igdb_search_limit: int = 8
    steam_api_key: str = ""
    riot_api_key: str = ""
    steam_charts_top_n: int = 50

    twitch_client_id: str = ""
    twitch_client_secret: str = ""
    twitch_top_n: int = 100

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

    @cached_property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url

        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
            "?charset=utf8mb4"
        )


settings = Settings()
