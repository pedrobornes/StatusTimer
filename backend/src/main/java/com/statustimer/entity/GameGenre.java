package com.statustimer.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum GameGenre {
    SHOOTER("Shooter"),
    RPG("RPG"),
    SURVIVAL("Survival"),
    ACTION("Action"),
    SPORTS_RACING("Sports/Racing"),
    STRATEGY("Strategy");

    private final String label;

    GameGenre(String label) {
        this.label = label;
    }

    @JsonValue
    public String getLabel() {
        return label;
    }

    @JsonCreator
    public static GameGenre fromValue(String value) {
        for (GameGenre genre : values()) {
            if (genre.label.equalsIgnoreCase(value) || genre.name().equalsIgnoreCase(value)) {
                return genre;
            }
        }

        throw new IllegalArgumentException("Unknown game genre: " + value);
    }
}
