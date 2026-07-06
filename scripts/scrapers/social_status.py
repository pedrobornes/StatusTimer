"""Social platform connectivity probes for the harvester."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from models.service_status import ServiceStatusPayload
from scrapers.status import probe_tcp_latency

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MonitoredSocialTarget:
    slug: str
    service_name: str
    probe_host: str
    probe_port: int = 443


MONITORED_SOCIAL_TARGETS: tuple[MonitoredSocialTarget, ...] = (
    MonitoredSocialTarget("whatsapp", "WhatsApp", "web.whatsapp.com"),
    MonitoredSocialTarget("instagram", "Instagram", "www.instagram.com"),
    MonitoredSocialTarget("facebook", "Facebook", "www.facebook.com"),
    MonitoredSocialTarget("tiktok", "TikTok", "www.tiktok.com"),
    MonitoredSocialTarget("twitch", "Twitch", "www.twitch.tv"),
    MonitoredSocialTarget("youtube", "YouTube", "www.youtube.com"),
    MonitoredSocialTarget("x", "X", "x.com"),
)


def probe_social_target(target: MonitoredSocialTarget) -> bool:
    """Return True when a TCP connection to the platform edge succeeds."""
    latency_ms = probe_tcp_latency(target.probe_host, target.probe_port)
    if latency_ms is None:
        logger.info(
            "Social probe offline: %s (%s:%s)",
            target.service_name,
            target.probe_host,
            target.probe_port,
        )
        return False

    logger.debug(
        "Social probe online: %s (%s:%s) in %sms",
        target.service_name,
        target.probe_host,
        target.probe_port,
        latency_ms,
    )
    return True


def fetch_social_status_payloads() -> list[ServiceStatusPayload]:
    """Build social status upserts from lightweight TCP connectivity probes."""
    checked_at = datetime.now(UTC)

    return [
        ServiceStatusPayload(
            service_name=target.service_name,
            service_slug=target.slug,
            is_up=probe_social_target(target),
            last_checked=checked_at,
        )
        for target in MONITORED_SOCIAL_TARGETS
    ]
