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
    void parseMetadataExtractsSteamReviewSignals() throws Exception {
        String body = """
                {
                  "730": {
                    "success": true,
                    "data": {
                      "recommendations": {
                        "total": 5000000
                      },
                      "reviews": {
                        "review_score": 9,
                        "total_reviews": 4800000
                      },
                      "platforms": {
                        "windows": true
                      }
                    }
                  }
                }
                """;

        var metadata = invokeParse(body, 730);

        assertTrue(metadata.isPresent());
        assertEquals(4_800_000, metadata.get().reviewCount());
        assertEquals(90, metadata.get().reviewScorePercent());
    }

    @Test
    void parseMetadataDetectsAdultOnlySteamListing() throws Exception {
        String body = """
                {
                  "1234": {
                    "success": true,
                    "data": {
                      "release_date": {
                        "coming_soon": false,
                        "date": "1 Jan, 2024"
                      },
                      "content_descriptors": {
                        "ids": [3],
                        "notes": null
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

    @Test
    void parseMetadataDoesNotFlagViolentAgeRestrictedGames() throws Exception {
        String body = """
                {
                  "1091500": {
                    "success": true,
                    "data": {
                      "required_age": "18",
                      "release_date": {
                        "coming_soon": false,
                        "date": "9 Dec, 2020"
                      },
                      "content_descriptors": {
                        "ids": [2, 5],
                        "notes": null
                      },
                      "genres": [{"description": "Action"}]
                    }
                  }
                }
                """;

        var metadata = invokeParse(body, 1091500);

        assertTrue(metadata.isPresent());
        org.junit.jupiter.api.Assertions.assertFalse(metadata.get().adultContent());
    }

    @Test
    void parseMetadataExtractsSteamCategoryIds() throws Exception {
        String body = """
                {
                  "1245620": {
                    "success": true,
                    "data": {
                      "release_date": {
                        "coming_soon": false,
                        "date": "25 Feb, 2022"
                      },
                      "categories": [
                        {"id": 2, "description": "Single-player"},
                        {"id": 22, "description": "Steam Achievements"}
                      ],
                      "genres": [{"description": "Action"}]
                    }
                  }
                }
                """;

        var metadata = invokeParse(body, 1245620);

        assertTrue(metadata.isPresent());
        assertEquals(java.util.List.of(2, 22), metadata.get().categoryIds());
    }

    @Test
    void parseMetadataDoesNotFlagMainstreamMatureGamesWithIncidentalSexualThemes() throws Exception {
        String body = """
                {
                  "271590": {
                    "success": true,
                    "data": {
                      "required_age": "17",
                      "release_date": {
                        "coming_soon": false,
                        "date": "14 Apr, 2015"
                      },
                      "content_descriptors": {
                        "ids": [5],
                        "notes": null
                      },
                      "genres": [{"description": "Action"}]
                    }
                  }
                }
                """;

        var metadata = invokeParse(body, 271590);

        assertTrue(metadata.isPresent());
        org.junit.jupiter.api.Assertions.assertFalse(metadata.get().adultContent());
    }

    @Test
    void parseMetadataDoesNotFlagGamesWithSomeNudityDescriptor() throws Exception {
        String body = """
                {
                  "1091500": {
                    "success": true,
                    "data": {
                      "required_age": "17",
                      "release_date": {
                        "coming_soon": false,
                        "date": "9 Dec, 2020"
                      },
                      "content_descriptors": {
                        "ids": [1, 2, 5],
                        "notes": "Contains nudity and sexual material."
                      },
                      "genres": [{"description": "RPG"}]
                    }
                  }
                }
                """;

        var metadata = invokeParse(body, 1091500);

        assertTrue(metadata.isPresent());
        org.junit.jupiter.api.Assertions.assertFalse(metadata.get().adultContent());
    }

    @Test
    void parseMetadataDetectsFrequentSexualContentDescriptor() throws Exception {
        String body = """
                {
                  "1202690": {
                    "success": true,
                    "data": {
                      "release_date": {
                        "coming_soon": false,
                        "date": "1 Jan, 2024"
                      },
                      "content_descriptors": {
                        "ids": [1, 2, 3, 4, 5],
                        "notes": "Nudity and sex scenes."
                      },
                      "genres": [{"description": "Simulation"}]
                    }
                  }
                }
                """;

        var metadata = invokeParse(body, 1202690);

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
