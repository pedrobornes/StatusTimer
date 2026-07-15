package com.statustimer.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.dto.response.GameCatalogSearchResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.config.IndexabilityProperties;
import com.statustimer.repository.GameRepository;
import com.statustimer.service.GameCatalogService;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("local")
@Transactional
class ForzaSearchRegressionTest {

    @Autowired
    private IgdbSearchClient igdbSearchClient;

    @Autowired
    private GameCatalogService gameCatalogService;

    @Autowired
    private GameRepository gameRepository;

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
    void igdbSearchFindsForzaHorizon5() {
        assertThat(igdbSearchClient.isConfigured()).isTrue();

        var matches = igdbSearchClient.search("forza horizon 5", 5);

        assertThat(matches)
                .as("IGDB should return Forza Horizon 5 for a direct title search")
                .anyMatch(match -> match.name().toLowerCase().contains("forza"));
    }

    @Test
    void catalogSearchFindsForzaHorizon5() {
        List<GameCatalogSearchResponse> results = gameCatalogService.search("forza horizon 5");

        assertThat(results)
                .as("Public catalog search should surface Forza Horizon 5")
                .anyMatch(result -> result.gameName().toLowerCase().contains("forza"));
    }

    @Test
    void catalogSearchHidesPreviouslyQuarantinedGameUntilReconciled() {
        gameRepository.save(Game.builder()
                .slug("forza-horizon-5")
                .gameName("Forza Horizon 5")
                .steamAppId(1551360)
                .steamAdultContent(false)
                .staleReason(IndexabilityProperties.STALE_REASON_MATURE_CONTENT)
                .lifecycleState(LifecycleState.CATALOG)
                .build());

        List<GameCatalogSearchResponse> results = gameCatalogService.search("forza horizon 5");

        assertThat(results)
                .as("Read-only search must not surface quarantined catalog rows")
                .noneMatch(result -> "forza-horizon-5".equals(result.slug()));
    }
}
