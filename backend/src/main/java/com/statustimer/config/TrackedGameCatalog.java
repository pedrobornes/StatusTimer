package com.statustimer.config;

import java.util.Map;
import java.util.Optional;

public final class TrackedGameCatalog {

    public record GameAssetMetadata(
            String gameName,
            Integer appId,
            boolean featured
    ) {}

    private static final Map<String, GameAssetMetadata> BY_SLUG = Map.ofEntries(
            Map.entry("counter-strike-2", new GameAssetMetadata("Counter-Strike 2", 730, true)),
            Map.entry("valorant", new GameAssetMetadata("Valorant", null, true)),
            Map.entry("dota-2", new GameAssetMetadata("Dota 2", 570, true)),
            Map.entry("pubg", new GameAssetMetadata("PUBG: Battlegrounds", 578080, true)),
            Map.entry("fortnite", new GameAssetMetadata("Fortnite", null, true)),
            Map.entry("league-of-legends", new GameAssetMetadata("League of Legends", null, false)),
            Map.entry("teamfight-tactics", new GameAssetMetadata("Teamfight Tactics", null, false)),
            Map.entry("hearthstone", new GameAssetMetadata("Hearthstone", null, false)),
            Map.entry("world-of-warcraft", new GameAssetMetadata("World of Warcraft", null, false)),
            Map.entry("diablo-4", new GameAssetMetadata("Diablo IV", null, false)),
            Map.entry("warcraft-rumble", new GameAssetMetadata("Warcraft Rumble", null, false)),
            Map.entry("minecraft", new GameAssetMetadata("Minecraft", null, false)),
            Map.entry("roblox", new GameAssetMetadata("Roblox", null, false)),
            Map.entry("apex-legends", new GameAssetMetadata("Apex Legends", 1172470, false)),
            Map.entry("call-of-duty", new GameAssetMetadata("Call of Duty", 1938090, false)),
            Map.entry("grand-theft-auto-v", new GameAssetMetadata("Grand Theft Auto V", 3240220, false)),
            Map.entry("overwatch", new GameAssetMetadata("Overwatch", 2357570, false)),
            Map.entry("rainbow-six-siege", new GameAssetMetadata("Rainbow Six Siege", 359550, false)),
            Map.entry("rocket-league", new GameAssetMetadata("Rocket League", 252950, false)),
            Map.entry("destiny-2", new GameAssetMetadata("Destiny 2", 1085660, false)),
            Map.entry("rust", new GameAssetMetadata("Rust", 252490, false)),
            Map.entry("elden-ring", new GameAssetMetadata("Elden Ring", 1245620, false))
    );

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

    public static Integer resolveAppId(String slug) {
        return findBySlug(slug).map(GameAssetMetadata::appId).orElse(null);
    }

    public static Map<String, GameAssetMetadata> allEntries() {
        return BY_SLUG;
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
