package com.statustimer.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NewsIndexabilitySupportTest {

    @Test
    void rejectsEmptyAndThinPlaceholderContent() {
        assertThat(NewsIndexabilitySupport.isIndexableNewsContent(null)).isFalse();
        assertThat(NewsIndexabilitySupport.isIndexableNewsContent("")).isFalse();
        assertThat(NewsIndexabilitySupport.isIndexableNewsContent(
                "Read the full announcement here."
        )).isFalse();
    }

    @Test
    void acceptsSubstantiveArticleBody() {
        String body = """
                Patch 3.1.0 brings balance changes across multiple classes,
                quality-of-life fixes for inventory management, and server
                stability improvements for peak-hour queues. Players should
                restart the client after downloading the update.
                """;

        assertThat(NewsIndexabilitySupport.isIndexableNewsContent(body)).isTrue();
    }

    @Test
    void stripsMarkdownNoiseBeforeMeasuringLength() {
        String thinWithImages = """
                ![cover](https://cdn.example/a.jpg)
                [Read more](https://example.com)
                Short teaser only.
                """;

        assertThat(NewsIndexabilitySupport.isIndexableNewsContent(thinWithImages)).isFalse();
    }
}
