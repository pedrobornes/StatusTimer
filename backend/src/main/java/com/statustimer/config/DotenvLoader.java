package com.statustimer.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Loads {@code .env} from common local paths before Spring Boot starts.
 */
public final class DotenvLoader {

    private static final Map<String, String> SPRING_ALIASES = Map.of(
            "IGDB_CLIENT_ID", "igdb.client-id",
            "IGDB_CLIENT_SECRET", "igdb.client-secret",
            "IGDB_SEARCH_LIMIT", "igdb.search-limit",
            "APP_API_KEY", "app.security.api-key"
    );

    private DotenvLoader() {
    }

    public static void loadIfPresent() {
        Path envFile = resolveEnvFile();
        if (envFile == null) {
            return;
        }

        Map<String, String> properties = parseEnvFile(envFile);
        if (properties.isEmpty()) {
            return;
        }

        for (var alias : SPRING_ALIASES.entrySet()) {
            String value = properties.get(alias.getKey());
            if (value != null && !value.isBlank()) {
                properties.putIfAbsent(alias.getValue(), value);
            }
        }

        properties.forEach((key, value) -> {
            if (value == null || value.isBlank()) {
                return;
            }

            System.setProperty(key, value);
        });
    }

    private static Path resolveEnvFile() {
        String userDir = System.getProperty("user.dir", ".").trim();
        List<Path> candidates = List.of(
                Path.of(userDir, ".env"),
                Path.of(".env"),
                Path.of("backend", ".env"),
                Path.of(userDir, "backend", ".env")
        );

        for (Path candidate : candidates) {
            Path normalized = candidate.normalize();
            if (Files.isRegularFile(normalized)) {
                return normalized;
            }
        }

        return null;
    }

    private static Map<String, String> parseEnvFile(Path envFile) {
        Map<String, String> properties = new LinkedHashMap<>();

        try {
            List<String> lines = Files.readAllLines(envFile, StandardCharsets.UTF_8);
            for (String rawLine : lines) {
                String line = rawLine.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }

                int separator = line.indexOf('=');
                if (separator <= 0) {
                    continue;
                }

                String key = line.substring(0, separator).trim();
                String value = stripOptionalQuotes(line.substring(separator + 1).trim());
                if (!key.isEmpty()) {
                    properties.put(key, value);
                }
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to read " + envFile.toAbsolutePath(), exception);
        }

        return properties;
    }

    private static String stripOptionalQuotes(String value) {
        if (value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
                return value.substring(1, value.length() - 1);
            }
        }

        return value;
    }
}
