package com.statustimer.integration;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Set;

public final class IgdbGameCategories {

    public static final int MAIN_GAME = 0;
    public static final int MAIN_GAME_TYPE = 0;
    public static final int REMAKE_GAME_TYPE = 8;
    public static final int REMASTER_GAME_TYPE = 9;
    public static final int EXPANDED_GAME_TYPE = 10;
    public static final int PORT_GAME_TYPE = 11;

    /**
     * IGDB {@code game_type} values that represent full, surfaceable catalog titles.
     * Remakes/remasters (e.g. Assassin's Creed Black Flag Resynced) are excluded when
     * only {@code game_type = 0} is accepted.
     */
    public static final Set<Integer> CATALOG_GAME_TYPES = Set.of(
            MAIN_GAME_TYPE,
            REMAKE_GAME_TYPE,
            REMASTER_GAME_TYPE,
            EXPANDED_GAME_TYPE,
            PORT_GAME_TYPE
    );

    public static final String CATALOG_GAME_TYPE_FILTER = "(0,8,9,10,11)";

    private IgdbGameCategories() {
    }

    public static boolean isCatalogGame(JsonNode row) {
        if (row == null || row.isMissingNode()) {
            return false;
        }

        JsonNode gameTypeNode = row.get("game_type");
        if (gameTypeNode != null && !gameTypeNode.isNull() && !gameTypeNode.isMissingNode()) {
            return CATALOG_GAME_TYPES.contains(gameTypeNode.asInt());
        }

        JsonNode categoryNode = row.get("category");
        if (categoryNode == null || categoryNode.isNull() || categoryNode.isMissingNode()) {
            return true;
        }

        return categoryNode.asInt() == MAIN_GAME;
    }

    public static boolean isMainGame(JsonNode row) {
        return isCatalogGame(row);
    }
}
