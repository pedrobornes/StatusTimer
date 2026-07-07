package com.statustimer.integration;

import com.fasterxml.jackson.databind.JsonNode;

public final class IgdbGameCategories {

    public static final int MAIN_GAME = 0;
    public static final int MAIN_GAME_TYPE = 0;

    private IgdbGameCategories() {
    }

    public static boolean isMainGame(JsonNode row) {
        if (row == null || row.isMissingNode()) {
            return false;
        }

        JsonNode gameTypeNode = row.get("game_type");
        if (gameTypeNode != null && !gameTypeNode.isNull() && !gameTypeNode.isMissingNode()) {
            return gameTypeNode.asInt() == MAIN_GAME_TYPE;
        }

        JsonNode categoryNode = row.get("category");
        if (categoryNode == null || categoryNode.isNull() || categoryNode.isMissingNode()) {
            return true;
        }

        return categoryNode.asInt() == MAIN_GAME;
    }
}
