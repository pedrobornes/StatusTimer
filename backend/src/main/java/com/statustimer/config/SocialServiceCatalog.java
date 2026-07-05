package com.statustimer.config;

import java.util.Map;
import java.util.Optional;

public final class SocialServiceCatalog {

    public record SocialServiceDefinition(
            String slug,
            String serviceName,
            String probeHost
    ) {}

    private static final Map<String, SocialServiceDefinition> BY_SLUG = Map.of(
            "whatsapp",
            new SocialServiceDefinition("whatsapp", "WhatsApp", "web.whatsapp.com"),
            "instagram",
            new SocialServiceDefinition("instagram", "Instagram", "www.instagram.com"),
            "facebook",
            new SocialServiceDefinition("facebook", "Facebook", "www.facebook.com"),
            "tiktok",
            new SocialServiceDefinition("tiktok", "TikTok", "www.tiktok.com"),
            "twitch",
            new SocialServiceDefinition("twitch", "Twitch", "www.twitch.tv")
    );

    private SocialServiceCatalog() {
    }

    public static Optional<SocialServiceDefinition> findBySlug(String slug) {
        return Optional.ofNullable(BY_SLUG.get(slug));
    }

    public static Map<String, SocialServiceDefinition> all() {
        return BY_SLUG;
    }
}
