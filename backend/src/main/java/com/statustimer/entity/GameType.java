package com.statustimer.entity;

public enum GameType {
    MULTIPLAYER,
    SINGLE_PLAYER;

    public String toApiValue() {
        return switch (this) {
            case MULTIPLAYER -> "multiplayer";
            case SINGLE_PLAYER -> "single_player";
        };
    }

    public static GameType fromApiValue(String value) {
        if ("single_player".equalsIgnoreCase(value)) {
            return SINGLE_PLAYER;
        }
        return MULTIPLAYER;
    }
}
