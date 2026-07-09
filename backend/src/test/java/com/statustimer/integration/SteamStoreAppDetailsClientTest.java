package com.statustimer.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class SteamStoreAppDetailsClientTest {

    private final SteamStoreAppDetailsClient client =
            new SteamStoreAppDetailsClient(new ObjectMapper());

    @Test
    void parseMetadataDoesNotExposeSteamImageAssets() throws Exception {
        String body = """
                {
                  "359550": {
                    "success": true,
                    "data": {
                      "capsule_image": "https://cdn.example/capsule_231x87.jpg",
                      "capsule_imagev5": "https://cdn.example/capsule_184x69.jpg",
                      "header_image": "https://cdn.example/header.jpg",
                      "release_date": {
                        "coming_soon": false,
                        "date": "1 Dec, 2015"
                      },
                      "genres": [{"description": "Action"}]
                    }
                  }
                }
                """;

        var metadata = invokeParse(body, 359550);

        assertTrue(metadata.isPresent());
        org.junit.jupiter.api.Assertions.assertNull(metadata.get().logoUrl());
        org.junit.jupiter.api.Assertions.assertNull(metadata.get().coverUrl());
    }

    @Test
    void parseMetadataExtractsStoreListingFields() throws Exception {
        String body = """
                {
                  "570": {
                    "success": true,
                    "data": {
                      "short_description": "Every day, millions of players enter the battle.",
                      "is_free": true,
                      "platforms": {
                        "windows": true,
                        "mac": true,
                        "linux": true
                      },
                      "price_overview": {
                        "currency": "USD",
                        "final": 0
                      },
                      "release_date": {
                        "coming_soon": false,
                        "date": "9 Jul, 2013"
                      },
                      "genres": [{"description": "Action"}]
                    }
                  }
                }
                """;

        var metadata = invokeParse(body, 570);

        assertTrue(metadata.isPresent());
        assertEquals("Every day, millions of players enter the battle.", metadata.get().shortDescription());
        assertEquals(0, metadata.get().priceFinal());
        assertEquals("USD", metadata.get().currency());
        assertTrue(metadata.get().windows());
        assertTrue(metadata.get().mac());
        assertTrue(metadata.get().linux());
        assertTrue(metadata.get().freeToPlay());
    }

    @Test
    void parseMetadataDetectsAdultOnlySteamListing() throws Exception {
        String body = """
                {
                  "1234": {
                    "success": true,
                    "data": {
                      "required_age": "18",
                      "release_date": {
                        "coming_soon": false,
                        "date": "1 Jan, 2024"
                      },
                      "genres": [{"description": "Simulation"}]
                    }
                  }
                }
                """;

        var metadata = invokeParse(body, 1234);

        assertTrue(metadata.isPresent());
        assertTrue(metadata.get().adultContent());
    }

    private java.util.Optional<SteamStoreAppDetailsClient.SteamAppMetadata> invokeParse(
            String body,
            int appId
    ) throws Exception {
        var method = SteamStoreAppDetailsClient.class.getDeclaredMethod(
                "parseMetadata",
                String.class,
                int.class
        );
        method.setAccessible(true);
        @SuppressWarnings("unchecked")
        java.util.Optional<SteamStoreAppDetailsClient.SteamAppMetadata> result =
                (java.util.Optional<SteamStoreAppDetailsClient.SteamAppMetadata>) method.invoke(
                        client,
                        body,
                        appId
                );
        return result;
    }
}
