package com.statustimer.config;

import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class KnownSteamAppRegistry {

    private static final Map<String, Integer> APP_ID_BY_SLUG = Map.ofEntries(
            Map.entry("counter-strike-2", 730),
            Map.entry("call-of-duty-warzone", 1962663),
            Map.entry("mecha-chameleon", 4704690),
            Map.entry("meccha-chameleon", 4704690),
            Map.entry("infinity-nikki", 3164330),
            Map.entry("assassin-s-creed-black-flag-resynced", 3751950),
            Map.entry("arma-reforger", 1874880),
            Map.entry("sea-of-thieves", 1172620),
            Map.entry("resident-evil-village", 1196590),
            Map.entry("path-of-exile", 238960),
            Map.entry("path-of-exile-2", 2694490),
            Map.entry("fallout-new-vegas", 22380),
            Map.entry("alone-in-the-dark", 1310410)
    );

    public Optional<Integer> resolveAppId(String slug) {
        if (slug == null || slug.isBlank()) {
            return Optional.empty();
        }

        return Optional.ofNullable(APP_ID_BY_SLUG.get(slug));
    }
}
