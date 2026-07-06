package com.statustimer.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.config.IgdbProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest
@ActiveProfiles("local")
class IgdbSearchClientIntegrationTest {

    @Autowired
    private Environment environment;

    @Autowired
    private IgdbProperties igdbProperties;

    @Autowired
    private IgdbSearchClient igdbSearchClient;

    @DynamicPropertySource
    static void loadLocalDotenv(DynamicPropertyRegistry registry) throws IOException {
        Path envFile = resolveEnvFile();
        if (envFile == null) {
            return;
        }

        for (String rawLine : Files.readAllLines(envFile, StandardCharsets.UTF_8)) {
            String line = rawLine.trim();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }

            int separator = line.indexOf('=');
            if (separator <= 0) {
                continue;
            }

            String key = line.substring(0, separator).trim();
            String value = line.substring(separator + 1).trim();
            if (key.isEmpty()) {
                continue;
            }

            registry.add(key, () -> value);
            if ("IGDB_CLIENT_ID".equals(key)) {
                registry.add("igdb.client-id", () -> value);
            }
            if ("IGDB_CLIENT_SECRET".equals(key)) {
                registry.add("igdb.client-secret", () -> value);
            }
            if ("IGDB_SEARCH_LIMIT".equals(key)) {
                registry.add("igdb.search-limit", () -> value);
            }
        }
    }

    private static Path resolveEnvFile() {
        List<Path> candidates = List.of(
                Path.of(".env"),
                Path.of("backend", ".env")
        );

        for (Path candidate : candidates) {
            if (Files.isRegularFile(candidate)) {
                return candidate;
            }
        }

        return null;
    }

    @Test
    void igdbIsConfiguredFromDotenv() {
        assertThat(environment.getProperty("IGDB_CLIENT_ID"))
                .as("backend/.env should expose IGDB_CLIENT_ID")
                .isNotBlank();
        assertThat(igdbProperties.isConfigured())
                .as("IGDB credentials should load from backend/.env")
                .isTrue();
    }

    @Test
    void searchReturnsMainGameResults() {
        assertThat(igdbSearchClient.isConfigured()).isTrue();

        var matches = igdbSearchClient.search("Hades", 3);

        assertThat(matches)
                .as("IGDB search should return main games with category = 0 filter")
                .isNotEmpty();
        assertThat(matches.getFirst().name()).containsIgnoringCase("hades");
        assertThat(matches.getFirst().logoUrl()).contains("images.igdb.com");
    }
}
