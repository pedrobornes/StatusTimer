"""Social platform status targets prepared for future harvester probes."""

from __future__ import annotations

from dataclasses import dataclass


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
)
