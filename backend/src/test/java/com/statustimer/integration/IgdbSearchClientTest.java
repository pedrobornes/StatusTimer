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
                    "platforms": [6],
                    "cover": { "image_id": "coabc123" }
                  },
                  {
                    "id": 999,
                    "name": "Rust Mod",
                    "slug": "rust-mod",
                    "category": 5,
                    "platforms": [6],
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
        assertThat(body).contains("where game_type = (0,8,9,10,11);");
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
                    "platforms": [6],
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

    @Test
    void lookupByIdQueriesStableGameId() throws Exception {
        String payload = """
                [
                  {
                    "id": 337738,
                    "name": "Assassin's Creed Black Flag Resynced",
                    "slug": "assassins-creed-black-flag-resynced",
                    "category": 0,
                    "platforms": [6],
                    "cover": { "image_id": "coabc123" }
                  }
                ]
                """;

        when(apiClient.isConfigured()).thenReturn(true);
        when(apiClient.postGamesQuery(anyString()))
                .thenReturn(Optional.of(new ObjectMapper().readTree(payload)));

        Optional<IgdbSearchClient.IgdbGameMatch> match = searchClient.lookupById(337738);

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(apiClient).postGamesQuery(bodyCaptor.capture());

        assertThat(bodyCaptor.getValue()).contains("where id = 337738;");
        assertThat(match).isPresent();
        assertThat(match.get().igdbId()).isEqualTo(337738L);
        assertThat(match.get().igdbSlug()).isEqualTo("assassins-creed-black-flag-resynced");
    }

    @Test
    void lookupBySteamAppIdQueriesExternalGames() throws Exception {
        String payload = """
                [
                  {
                    "id": 337738,
                    "name": "Assassin's Creed Black Flag Resynced",
                    "slug": "assassins-creed-black-flag-resynced",
                    "category": 0,
                    "platforms": [6],
                    "external_games": [
                      { "uid": "3751950", "category": 1 }
                    ]
                  }
                ]
                """;

        when(apiClient.isConfigured()).thenReturn(true);
        when(apiClient.postGamesQuery(anyString()))
                .thenReturn(Optional.of(new ObjectMapper().readTree(payload)));

        Optional<IgdbSearchClient.IgdbGameMatch> match = searchClient.lookupBySteamAppId(3751950);

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(apiClient).postGamesQuery(bodyCaptor.capture());

        assertThat(bodyCaptor.getValue()).contains("external_games.category = 1");
        assertThat(bodyCaptor.getValue()).contains("external_games.uid = \"3751950\"");
        assertThat(match).isPresent();
        assertThat(match.get().steamAppId()).isEqualTo(3751950);
    }
}
