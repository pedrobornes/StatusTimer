package com.statustimer.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;

class IgdbSearchClientSteamLinkTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void resolveSteamAppIdUsesStoreUrlWhenCategoryMissing() throws Exception {
    IgdbSearchClient client = new IgdbSearchClient(null, null);
    Method method = IgdbSearchClient.class.getDeclaredMethod(
            "resolveSteamAppId",
            com.fasterxml.jackson.databind.JsonNode.class
    );
    method.setAccessible(true);

    var externalGames = objectMapper.readTree(
            """
            [
              {
                "uid": "3164330",
                "url": "https://store.steampowered.com/app/3164330"
              }
            ]
            """
    );

    Integer appId = (Integer) method.invoke(client, externalGames);
    assertEquals(3164330, appId);
  }

  @Test
  void resolveSteamAppIdIgnoresNonSteamUrls() throws Exception {
    IgdbSearchClient client = new IgdbSearchClient(null, null);
    Method method = IgdbSearchClient.class.getDeclaredMethod(
            "resolveSteamAppId",
            com.fasterxml.jackson.databind.JsonNode.class
    );
    method.setAccessible(true);

    var externalGames = objectMapper.readTree(
            """
            [
              {
                "uid": "10004842",
                "url": "https://store.playstation.com/en-us/concept/10004842"
              }
            ]
            """
    );

    Integer appId = (Integer) method.invoke(client, externalGames);
    assertNull(appId);
  }
}
