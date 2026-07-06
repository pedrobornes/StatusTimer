package com.statustimer.integration;

import com.fasterxml.jackson.databind.JsonNode;

public final class IgdbGameCategories {

    public static final int MAIN_GAME = 0;

    private IgdbGameCategories() {
    }

    public static boolean isMainGame(JsonNode row) {
        if (row == null || row.isMissingNode()) {
            return false;
        }

        JsonNode categoryNode = row.get("category");
        if (categoryNode == null || categoryNode.isNull() || categoryNode.isMissingNode()) {
            return true;
        }

        return categoryNode.asInt() == MAIN_GAME;
    }
}
