package com.statustimer.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Loads {@code .env} from common local paths into Spring's environment so credentials
 * (IGDB, DB, API keys) work without exporting OS variables manually.
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "dotenv";

    private static final Map<String, String> SPRING_ALIASES = Map.of(
            "IGDB_CLIENT_ID", "igdb.client-id",
            "IGDB_CLIENT_SECRET", "igdb.client-secret",
            "IGDB_SEARCH_LIMIT", "igdb.search-limit",
            "APP_API_KEY", "app.security.api-key"
    );

    @Override
    public void postProcessEnvironment(
            ConfigurableEnvironment environment,
            SpringApplication application
    ) {
        Path envFile = resolveEnvFile();
        if (envFile == null) {
            System.err.println("[dotenv] No .env file found (user.dir="
                    + System.getProperty("user.dir") + ")");
            return;
        }

        Map<String, Object> properties = parseEnvFile(envFile);
        if (properties.isEmpty()) {
            System.err.println("[dotenv] .env is empty: " + envFile.toAbsolutePath());
            return;
        }

        System.err.println("[dotenv] Loaded " + properties.size() + " entries from "
                + envFile.toAbsolutePath());

        for (var alias : SPRING_ALIASES.entrySet()) {
            Object value = properties.get(alias.getKey());
            if (value != null) {
                properties.putIfAbsent(alias.getValue(), value);
            }
        }

        properties.forEach((key, value) -> {
            if (value == null || value.toString().isBlank()) {
                return;
            }

            System.setProperty(key, value.toString());
        });

        environment.getPropertySources().addFirst(
                new MapPropertySource(PROPERTY_SOURCE_NAME, properties)
        );
    }

    private Path resolveEnvFile() {
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

    private Map<String, Object> parseEnvFile(Path envFile) {
        Map<String, Object> properties = new LinkedHashMap<>();

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

    private String stripOptionalQuotes(String value) {
        if (value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
                return value.substring(1, value.length() - 1);
            }
        }

        return value;
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
