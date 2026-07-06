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
