package com.statustimer.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GameDisplayNameUtilsTest {

    @Test
    void normalizeDisplayNameStripsTrademarkNoise() {
        assertThat(GameDisplayNameUtils.normalizeDisplayName("Apex Legends TM"))
                .isEqualTo("Apex Legends");
        assertThat(GameDisplayNameUtils.normalizeDisplayName("Apex Legends™"))
                .isEqualTo("Apex Legends");
    }
}
