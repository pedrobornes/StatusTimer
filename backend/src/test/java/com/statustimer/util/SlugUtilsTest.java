package com.statustimer.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SlugUtilsTest {

    @Test
    void toSlugNormalizesApostropheTitles() {
        assertThat(SlugUtils.toSlug("Assassin's Creed Black Flag Resynced"))
                .isEqualTo("assassin-s-creed-black-flag-resynced");
    }

    @Test
    void toIgdbPossessiveSlugVariantMapsApostropheSlugToIgdbStyle() {
        assertThat(SlugUtils.toIgdbPossessiveSlugVariant("assassin-s-creed-black-flag-resynced"))
                .contains("assassins-creed-black-flag-resynced");
    }

    @Test
    void toIgdbPossessiveSlugVariantLeavesUnrelatedSlugsUntouched() {
        assertThat(SlugUtils.toIgdbPossessiveSlugVariant("counter-strike-2")).isEmpty();
    }

    @Test
    void normalizeCatalogSlugStripsTrademarkSuffixes() {
        assertThat(SlugUtils.normalizeCatalogSlug("apex-legends-tm")).isEqualTo("apex-legends");
    }

    @Test
    void normalizeCatalogSlugPreservesSingleLetterRomanSuffixes() {
        assertThat(SlugUtils.normalizeCatalogSlug("grand-theft-auto-v")).isEqualTo("grand-theft-auto-v");
    }

    @Test
    void toIgdbDisambiguatedSlugVariantRestoresCollapsedIgdbSuffix() {
        assertThat(SlugUtils.toIgdbDisambiguatedSlugVariant("guild-wars-3-1"))
                .contains("guild-wars-3--1");
        assertThat(SlugUtils.toIgdbDisambiguatedSlugVariant("fable-1"))
                .contains("fable--1");
        assertThat(SlugUtils.toIgdbDisambiguatedSlugVariant("guild-wars-3--1")).isEmpty();
    }
}
