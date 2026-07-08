package com.statustimer.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import java.util.Map;
import org.junit.jupiter.api.Test;

class IgdbExternalLinksSupportTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void resolvesFilteredExternalLinks() throws Exception {
        ArrayNode websites = objectMapper.createArrayNode();
        websites.addObject()
                .put("url", "https://infinitynikki.infoldgames.com/en/home")
                .put("category", 1);
        websites.addObject()
                .put("url", "https://www.reddit.com/r/InfinityNikkiofficial")
                .put("category", 14);
        websites.addObject()
                .put("url", "https://www.youtube.com/@InfinityNikkiEN")
                .put("category", 9);
        websites.addObject()
                .put("url", "https://store.epicgames.com/en-US/p/infinity-nikki")
                .put("category", 16);

        ArrayNode externalGames = objectMapper.createArrayNode();
        externalGames.addObject()
                .put("uid", "3164330")
                .put("url", "https://store.steampowered.com/app/3164330");

        Map<String, String> links = IgdbExternalLinksSupport.resolveExternalLinks(
                websites,
                externalGames,
                3164330,
                "https://www.youtube.com/@InfinityNikkiEN"
        );

        assertEquals("https://infinitynikki.infoldgames.com/en/home", links.get("official"));
        assertEquals("https://www.reddit.com/r/InfinityNikkiofficial/", links.get("reddit"));
        assertTrue(links.containsKey("steam"));
        assertTrue(links.containsKey("epic"));
        assertTrue(links.containsKey("youtube"));
        assertEquals(5, links.size());
    }
}
