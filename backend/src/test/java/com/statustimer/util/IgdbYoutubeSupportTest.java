package com.statustimer.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import java.util.List;
import org.junit.jupiter.api.Test;

class IgdbYoutubeSupportTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void resolvesChannelAndVideoIdsFromWebsites() throws Exception {
        ArrayNode websites = objectMapper.createArrayNode();
        websites.addObject().put("url", "https://www.youtube.com/@InfinityNikkiEN");
        websites.addObject().put("url", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");

        IgdbYoutubeSupport.YoutubeWebsiteData data =
                IgdbYoutubeSupport.resolveFromWebsites(websites);

        assertEquals("https://www.youtube.com/@InfinityNikkiEN", data.channelUrl());
        assertEquals(List.of("dQw4w9WgXcQ"), data.videoIds());
    }

    @Test
    void mergeVideoIdsPreservesOrderAndDedupes() {
        List<String> merged = IgdbYoutubeSupport.mergeVideoIds(
                List.of("abc123video01"),
                List.of("dQw4w9WgXcQ", "abc123video01")
        );

        assertEquals(List.of("abc123video01", "dQw4w9WgXcQ"), merged);
        assertTrue(IgdbYoutubeSupport.isChannelUrl("https://www.youtube.com/@InfinityNikkiEN"));
    }
}
