package com.statustimer.config;

import java.util.Map;
import java.util.Optional;

public final class TrackedGameCatalog {

    public record GameAssetMetadata(
            String gameName,
            Integer appId,
            String logoUrl,
            String coverUrl,
            boolean featured
    ) {}

    private static final Map<String, GameAssetMetadata> BY_SLUG = Map.ofEntries(
            Map.entry("counter-strike-2", new GameAssetMetadata("Counter-Strike 2", 730, null, null, true)),
            Map.entry(
                    "valorant",
                    new GameAssetMetadata(
                            "Valorant",
                            null,
                            "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/7b76209193f1bfe190d3ae6ef8728328870be9c3-736x138.png?accountingTag=VAL",
                            "/images/games/valorant-cover.jpg",
                            true
                    )
            ),
            Map.entry("dota-2", new GameAssetMetadata("Dota 2", 570, null, null, true)),
            Map.entry("pubg", new GameAssetMetadata("PUBG: Battlegrounds", 578080, null, null, true)),
            Map.entry(
                    "gta-vi",
                    new GameAssetMetadata(
                            "Grand Theft Auto VI",
                            null,
                            "/images/games/gta-vi-logo.png",
                            "/images/games/gta-vi-cover.jpg",
                            true
                    )
            ),
            Map.entry(
                    "fortnite",
                    new GameAssetMetadata(
                            "Fortnite",
                            null,
                            "https://cdn2.unrealengine.com/en-og-logo-egs-logo-350x100-350x100-ba7b388d26a7.png",
                            "https://cdn2.unrealengine.com/en-fn-og-41-10-c1s9-egs-launcher-blade-2560x1440-2560x1440-d42b9403bb49.jpg",
                            true
                    )
            ),
            Map.entry(
                    "league-of-legends",
                    new GameAssetMetadata(
                            "League of Legends",
                            null,
                            "https://static.developer.riotgames.com/img/logo.png",
                            null,
                            false
                    )
            ),
            Map.entry("minecraft", new GameAssetMetadata("Minecraft", null, null, null, false)),
            Map.entry("roblox", new GameAssetMetadata("Roblox", null, null, null, false)),
            Map.entry("apex-legends", new GameAssetMetadata("Apex Legends", 1172470, null, null, false)),
            Map.entry("call-of-duty", new GameAssetMetadata("Call of Duty", 1938090, null, null, false)),
            Map.entry("gta-v", new GameAssetMetadata("Grand Theft Auto V", 271590, null, null, false)),
            Map.entry("overwatch-2", new GameAssetMetadata("Overwatch 2", null, null, null, false)),
            Map.entry("rainbow-six-siege", new GameAssetMetadata("Rainbow Six Siege", 359550, null, null, false)),
            Map.entry("rocket-league", new GameAssetMetadata("Rocket League", 252950, null, null, false)),
            Map.entry("destiny-2", new GameAssetMetadata("Destiny 2", 1085660, null, null, false)),
            Map.entry("rust", new GameAssetMetadata("Rust", 252490, null, null, false)),
            Map.entry("elden-ring", new GameAssetMetadata("Elden Ring", 1245620, null, null, false))
    );

    private static final String STEAM_CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";

    private TrackedGameCatalog() {
    }

    public static Optional<GameAssetMetadata> findBySlug(String slug) {
        return Optional.ofNullable(BY_SLUG.get(slug));
    }

    public static boolean isFeatured(String slug) {
        return findBySlug(slug).map(GameAssetMetadata::featured).orElse(false);
    }

    public static String resolveGameName(String slug) {
        return findBySlug(slug)
                .map(GameAssetMetadata::gameName)
                .orElseGet(() -> formatSlugLabel(slug));
    }

    public static String resolveLogoUrl(String slug, Integer appId, String logoUrl) {
        if (logoUrl != null && !logoUrl.isBlank() && !isBrokenRiotDarkroomUrl(logoUrl)) {
            return logoUrl;
        }

        GameAssetMetadata metadata = BY_SLUG.get(slug);
        if (metadata != null && metadata.logoUrl() != null) {
            return metadata.logoUrl();
        }

        Integer resolvedAppId = appId != null ? appId : metadata != null ? metadata.appId() : null;
        if (resolvedAppId != null) {
            return STEAM_CDN + "/" + resolvedAppId + "/capsule_184x69.jpg";
        }

        return null;
    }

    public static String resolveCoverUrl(String slug, Integer appId, String coverUrl) {
        if (coverUrl != null && !coverUrl.isBlank() && !isBrokenRiotDarkroomUrl(coverUrl)) {
            return coverUrl;
        }

        GameAssetMetadata metadata = BY_SLUG.get(slug);
        if (metadata != null && metadata.coverUrl() != null) {
            return metadata.coverUrl();
        }

        Integer resolvedAppId = appId != null ? appId : metadata != null ? metadata.appId() : null;
        if (resolvedAppId != null) {
            return STEAM_CDN + "/" + resolvedAppId + "/library_hero.jpg";
        }

        return null;
    }

    public static Integer resolveAppId(String slug) {
        return findBySlug(slug).map(GameAssetMetadata::appId).orElse(null);
    }

    private static boolean isBrokenRiotDarkroomUrl(String url) {
        return url.contains("riotgames.com/darkroom/original");
    }

    private static String formatSlugLabel(String slug) {
        String[] words = slug.split("-");
        StringBuilder builder = new StringBuilder();
        for (String word : words) {
            if (word.isBlank()) {
                continue;
            }
            if (!builder.isEmpty()) {
                builder.append(' ');
            }
            builder.append(Character.toUpperCase(word.charAt(0)));
            if (word.length() > 1) {
                builder.append(word.substring(1));
            }
        }
        return builder.isEmpty() ? slug : builder.toString();
    }
}
