package com.statustimer.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ManualProtectedCatalogPolicyTest {

    @Test
    void detectsProtectedTitleSpinoffSlugs() {
        assertThat(ManualProtectedCatalogPolicy.isProtectedTitleSpinoff("fortnite-2")).isTrue();
        assertThat(ManualProtectedCatalogPolicy.isProtectedTitleSpinoff("fortnite-2-love-on-the-battlefield"))
                .isTrue();
        assertThat(ManualProtectedCatalogPolicy.isProtectedTitleSpinoff("valorant-mobile")).isTrue();
        assertThat(ManualProtectedCatalogPolicy.isProtectedTitleSpinoff("counter-strike-2-source")).isTrue();
    }

    @Test
    void keepsCanonicalProtectedSlugs() {
        assertThat(ManualProtectedCatalogPolicy.isProtectedTitleSpinoff("fortnite")).isFalse();
        assertThat(ManualProtectedCatalogPolicy.isProtectedSlug("fortnite")).isTrue();
        assertThat(ManualProtectedCatalogPolicy.isExactProtectedTitleQuery("fortnite")).isTrue();
        assertThat(ManualProtectedCatalogPolicy.isExactProtectedTitleQuery("fortnite 2")).isFalse();
    }
}
