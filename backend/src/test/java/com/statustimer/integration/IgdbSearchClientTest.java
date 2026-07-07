package com.statustimer.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.statustimer.config.IgdbProperties;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class IgdbSearchClientTest {

    @Mock
    private IgdbApiClient apiClient;

    private IgdbSearchClient searchClient;

    @BeforeEach
    void setUp() {
        IgdbProperties properties = new IgdbProperties();
        properties.setSearchLimit(5);
        searchClient = new IgdbSearchClient(apiClient, properties);
    }

    @Test
    void searchQueryFiltersMainGamesOnly() throws Exception {
        String payload = """
                [
                  {
                    "id": 252490,
                    "name": "Rust",
                    "slug": "rust",
                    "category": 0,
                    "cover": { "image_id": "coabc123" }
                  },
                  {
                    "id": 999,
                    "name": "Rust Mod",
                    "slug": "rust-mod",
                    "category": 5,
                    "cover": { "image_id": "comod123" }
                  }
                ]
                """;

        when(apiClient.isConfigured()).thenReturn(true);
        when(apiClient.postGamesQuery(anyString()))
                .thenReturn(Optional.of(new ObjectMapper().readTree(payload)));

        List<IgdbSearchClient.IgdbGameMatch> matches = searchClient.search("Rust", 3);

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(apiClient).postGamesQuery(bodyCaptor.capture());

        String body = bodyCaptor.getValue();
        assertThat(body).contains("game_type");
        assertThat(body).contains("where game_type = 0;");
        assertThat(body).contains("search \"Rust\";");
        assertThat(matches).hasSize(1);
        assertThat(matches.getFirst().name()).isEqualTo("Rust");
        assertThat(matches.getFirst().igdbSlug()).isEqualTo("rust");
    }

    @Test
    void steamAppIdRequiresSteamExternalCategory() throws Exception {
        String payload = """
                [
                  {
                    "id": 252490,
                    "name": "Rust",
                    "slug": "rust",
                    "category": 0,
                    "external_games": [
                      { "uid": "252490" },
                      { "uid": "0000", "category": 2 },
                      { "uid": "252490", "category": 1 }
                    ]
                  }
                ]
                """;

        when(apiClient.isConfigured()).thenReturn(true);
        when(apiClient.postGamesQuery(anyString()))
                .thenReturn(Optional.of(new ObjectMapper().readTree(payload)));

        List<IgdbSearchClient.IgdbGameMatch> matches = searchClient.search("Rust", 3);

        assertThat(matches).hasSize(1);
        assertThat(matches.getFirst().steamAppId()).isEqualTo(252490);
    }
}
