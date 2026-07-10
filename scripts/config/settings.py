"""Environment-driven configuration for the StatusTimer harvester script."""

from functools import cached_property
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _SCRIPTS_DIR / ".env"


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
    backend_request_timeout_seconds: int = 60
    steam_404_blacklist_threshold: int = 5
    steam_blacklist_rescan_days: int = 7
    request_retry_max_attempts: int = 3
    request_retry_delay_seconds: int = 5
    batch_size_release_sync: int = 50
    batch_size_catalog_sync: int = 50
    batch_size_dynamic_catalog_sync: int = 50
    batch_size_telemetry_sync: int = 50
    harvest_interval_seconds: int = 300
    on_demand_poll_interval_seconds: int = 30
    http_rate_limit_per_minute: int = 20
    http_jitter_min_seconds: float = 0.3
    http_jitter_max_seconds: float = 1.5
    http_circuit_failure_threshold: int = 3
    http_circuit_open_seconds: int = 300
    phase_circuit_failure_threshold: int = 3
    phase_circuit_open_seconds: int = 600
    twitch_batch_size: int = 5
    twitch_batch_pause_seconds: float = 1.2
    twitch_circuit_failure_threshold: int = 2
    twitch_circuit_open_seconds: int = 600
    twitch_games_lookup_batch_size: int = 20
    twitch_viewer_enrich_tier1_max_rank: int = 25
    twitch_viewer_enrich_tier2_max_rank: int = 50
    twitch_metrics_max_tier3_per_cycle: int = 5
    dedup_state_file: str = ".harvest_state/processed_hashes.json"
    tier_rank_history_file: str = ".harvest_state/tier_rank_history.json"
    tier_trend_state_file: str = ".harvest_state/tier_trend_state.json"
    tier_rank_history_keep_days: int = 14
    tier_trend_lookback_days: int = 3
    tier_trend_promote_top_rank: int = 20
    tier_trend_demote_below_rank: int = 50
    tier_trend_promotion_days: int = 7
    tier_rebalance_interval_days: int = 3
    tier_rebalance_force_monday: bool = True
    feed_lookback_days: int = 7
    news_max_ingest_age_days: int = 30
    steam_news_max_items: int = 10
    steam_news_top_n: int = 15
    steam_news_min_content_chars: int = 120
    riot_news_max_items: int = 10
    riot_news_min_content_chars: int = 120
    blizzard_news_max_items: int = 10
    blizzard_news_min_content_chars: int = 120
    epic_news_max_items: int = 10
    epic_news_min_content_chars: int = 120
    enable_reddit_news: bool = False
    reddit_news_max_items: int = 8
    reddit_news_top_n: int = 12
    reddit_news_min_content_chars: int = 80

    igdb_client_id: str = ""
    igdb_client_secret: str = ""
    igdb_releases_limit: int = 25
    igdb_min_hype: int = 10
    igdb_catalog_enrich_limit: int = 25
    steam_store_enrich_limit: int = 40
    igdb_search_limit: int = 8
    steam_api_key: str = ""
    riot_api_key: str = ""
    steam_charts_top_n: int = 50

    twitch_client_id: str = ""
    twitch_client_secret: str = ""
    twitch_top_n: int = 100

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
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
